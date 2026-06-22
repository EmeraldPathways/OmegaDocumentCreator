from __future__ import annotations

from datetime import UTC, datetime
from html import escape
from typing import Any
from urllib.parse import urlencode
from urllib.request import Request, urlopen
import xml.etree.ElementTree as ET

from fastapi import HTTPException

from app.ai import build_document_prompt, generate_document_content
from app.config import AppSettings
from app.db import get_session
from app.models import Document as DocumentModel
from app.repositories.clients import ClientRepository
from app.repositories.documents import DocumentRepository
from app.repositories.users import UserRepository


def _get_snapshot_value(workflow_snapshot: dict[str, Any], *keys: str) -> str:
    for key in keys:
        value = workflow_snapshot.get(key)
        if value is None:
            continue
        normalized = str(value).strip()
        if normalized:
            return normalized
    return ""


def _format_phi_date(value: str) -> str:
    parts = value.split("-")
    if len(parts) == 3:
        return f"{parts[2]}/{parts[1]}/{parts[0]}"
    return value


def _normalize_phi_deferred_period(value: str) -> str:
    if value.startswith("13"):
        return "13"
    if value.startswith("26"):
        return "26"
    if value.startswith("52"):
        return "52"
    return value


def build_phi_request_payload(settings: AppSettings, workflow_snapshot: dict[str, Any]) -> dict[str, Any]:
    request_fields = [
        {"label": "DOB", "value": _format_phi_date(_get_snapshot_value(workflow_snapshot, "dateOfBirth", "date_of_birth"))},
        {"label": "Sex", "value": _get_snapshot_value(workflow_snapshot, "gender")},
        {"label": "Smoker", "value": _get_snapshot_value(workflow_snapshot, "smokerStatus")},
        {"label": "NRA", "value": _get_snapshot_value(workflow_snapshot, "coverAge", "cover_age")},
        {"label": "AnnualAmount", "value": _get_snapshot_value(workflow_snapshot, "recommendedCover", "recommended_cover")},
        {
            "label": "DeferredPeriod",
            "value": _normalize_phi_deferred_period(_get_snapshot_value(workflow_snapshot, "deferredPeriod", "deferred_period")),
        },
        {"label": "OccupationalClass", "value": _get_snapshot_value(workflow_snapshot, "phiOccupationalClass")},
        {"label": "Indexation", "value": _get_snapshot_value(workflow_snapshot, "phiIndexation")},
    ]

    missing_fields = [field["label"] for field in request_fields if not field["value"]]
    if missing_fields:
        raise ValueError(f"Missing PHI request fields: {', '.join(missing_fields)}")

    if not all(
        [
            settings.phi_endpoint_url,
            settings.phi_username,
            settings.phi_password,
            settings.phi_request_from,
            settings.phi_request_from_code,
        ]
    ):
        raise RuntimeError("PHI integration is not configured.")

    xml = (
        "<Inputs>"
        "<Authentication>"
        f"<Username>{escape(settings.phi_username)}</Username>"
        f"<Password>{escape(settings.phi_password)}</Password>"
        f"<RequestFrom>{escape(settings.phi_request_from)}</RequestFrom>"
        f"<RequestFromCode>{escape(settings.phi_request_from_code)}</RequestFromCode>"
        "</Authentication>"
        "<RequestType>Phi</RequestType>"
        "<Life1>"
        f"<DOB>{escape(request_fields[0]['value'])}</DOB>"
        f"<Sex>{escape(request_fields[1]['value'])}</Sex>"
        f"<Smoker>{escape(request_fields[2]['value'])}</Smoker>"
        "</Life1>"
        "<Plan>"
        f"<NRA>{escape(request_fields[3]['value'])}</NRA>"
        f"<AnnualAmount>{escape(request_fields[4]['value'])}</AnnualAmount>"
        f"<DeferredPeriod>{escape(request_fields[5]['value'])}</DeferredPeriod>"
        f"<OccupationalClass>{escape(request_fields[6]['value'])}</OccupationalClass>"
        f"<Indexation>{escape(request_fields[7]['value'])}</Indexation>"
        "</Plan>"
        "</Inputs>"
    )

    return {"xml": xml, "request_fields": request_fields}


def submit_phi_request(settings: AppSettings, workflow_snapshot: dict[str, Any]) -> dict[str, Any]:
    payload = build_phi_request_payload(settings, workflow_snapshot)
    body = urlencode({"xml": payload["xml"]}).encode("utf-8")
    request = Request(
        settings.phi_endpoint_url,
        data=body,
        headers={"Content-Type": "application/x-www-form-urlencoded"},
        method="POST",
    )

    with urlopen(request, timeout=20) as response:
        xml_result = response.read().decode("utf-8")

    root = ET.fromstring(xml_result)
    errors_text = (root.findtext("Errors") or "").strip()
    quote_results: list[dict[str, str]] = []

    for company in root.findall("./Quotes/Company"):
        quote_results.append(
            {
                "provider_name": (company.findtext("Name") or "").strip(),
                "policy_type": (company.findtext("Type") or "").strip(),
                "level_premium": (company.findtext("Level") or "").strip(),
                "escalation_3_premium": (company.findtext("Esc3") or "").strip(),
                "escalation_5_premium": (company.findtext("Esc5") or "").strip(),
            }
        )

    return {
        "provider": "BestAdvice",
        "request_type": "Phi",
        "status": "failed" if errors_text else "sent",
        "requested_at": datetime.now(UTC).isoformat(),
        "request_fields": payload["request_fields"],
        "quote_results": quote_results,
        "errors": [errors_text] if errors_text else [],
    }


def generate_document(
    *,
    settings: AppSettings,
    client_reference: str,
    document_type: str,
    template_id: str,
    workflow_snapshot: dict[str, Any],
) -> dict[str, Any]:
    db = get_session()
    try:
        client_repo = ClientRepository(db)
        client_model = client_repo.get_by_reference(client_reference)
        if not client_model:
            raise HTTPException(status_code=404, detail="Client not found")

        client_name = str(
            workflow_snapshot.get("full_name")
            or workflow_snapshot.get("fullName")
            or getattr(client_model, "full_name", None)
            or f"{getattr(client_model, 'first_name', '')} {getattr(client_model, 'surname', '')}".strip()
            or client_reference
        )
        prompt = build_document_prompt(
            client_name=client_name,
            client_reference=client_reference,
            document_type=document_type,
            template_id=template_id,
            workflow_snapshot=workflow_snapshot,
        )
        ai_result = generate_document_content(settings=settings, prompt=prompt)
        generated_document = ai_result or _seeded_document(
            client_name=client_name,
            client_reference=client_reference,
            document_type=document_type,
            template_id=template_id,
            workflow_snapshot=workflow_snapshot,
        )
        generated_document["sections"] = _normalize_sections(generated_document.get("sections"))
        warnings = [str(warning) for warning in generated_document.get("warnings", [])]
        integration_requests = _build_integration_requests(
            settings=settings,
            document_type=document_type,
            workflow_snapshot=workflow_snapshot,
            warnings=warnings,
        )
        generated_document["warnings"] = warnings
        generated_document["integration_requests"] = integration_requests

        # Persist generated document metadata + frozen HTML snapshot
        doc_repo = DocumentRepository(db)
        preview_title = str(generated_document.get("title") or document_type)
        preview_html = str(generated_document.get("generated_html") or "")
        doc_name = f"{client_name}_{replace_spaces(document_type, '_')}"

        doc_model = DocumentModel(
            client_id=client_model.id,
            document_type=document_type,
            document_name=doc_name,
            status="draft",
            version="1",
            preview_title=preview_title,
            preview_html=preview_html,
            generated_by=None,
        )
        doc_repo.add(doc_model)
        db.commit()
        generated_document["document_id"] = str(doc_model.id)

        return generated_document
    finally:
        db.close()


def replace_spaces(value: str, replacement: str) -> str:
    return value.replace(" ", replacement)


def _build_integration_requests(
    *,
    settings: AppSettings,
    document_type: str,
    workflow_snapshot: dict[str, Any],
    warnings: list[str],
) -> list[dict[str, Any]]:
    if document_type != "Statement of Suitability":
        return []

    try:
        return [submit_phi_request(settings, workflow_snapshot)]
    except Exception as exc:
        warnings.append(f"PHI integration failed: {exc}")
        return [
            {
                "provider": "BestAdvice",
                "request_type": "Phi",
                "status": "failed",
                "requested_at": datetime.now(UTC).isoformat(),
                "request_fields": [],
                "quote_results": [],
                "errors": [str(exc)],
            }
        ]


def _normalize_sections(raw_sections: Any) -> list[dict[str, Any]]:
    sections: list[dict[str, Any]] = []

    for index, raw_section in enumerate(raw_sections or []):
        if not isinstance(raw_section, dict):
            continue

        title = str(raw_section.get("title") or raw_section.get("heading") or f"Section {index + 1}")
        body_html = str(raw_section.get("bodyHtml") or raw_section.get("body_html") or raw_section.get("body") or "")
        normalized_section = {
            "id": str(raw_section.get("id") or f"section-{index + 1}"),
            "title": title,
            "bodyHtml": body_html,
        }
        if raw_section.get("summary"):
            normalized_section["summary"] = str(raw_section["summary"])
        sections.append(normalized_section)

    return sections


def _seeded_document(
    *,
    client_name: str,
    client_reference: str,
    document_type: str,
    template_id: str,
    workflow_snapshot: dict[str, Any],
) -> dict[str, Any]:
    product_type = str(workflow_snapshot.get("product_type") or workflow_snapshot.get("productType") or "Income Protection")
    provider = str(workflow_snapshot.get("provider") or "Recommended provider")
    recommended_cover = str(workflow_snapshot.get("recommended_cover") or workflow_snapshot.get("recommendedCover") or "Coverage to be confirmed")
    needs_objectives = str(
        workflow_snapshot.get("needs_objectives")
        or workflow_snapshot.get("needsObjectives")
        or "Protect the client against a loss of earned income."
    )

    title = f"{document_type} for {client_name}"
    summary = (
        f"This seeded draft summarises the {product_type.lower()} recommendation for {client_name} "
        f"with key workflow details included for review."
    )
    sections = [
        {
            "id": "client-overview",
            "title": "Client overview",
            "bodyHtml": f"<p>{escape(client_name)} is being reviewed under template {escape(template_id)}.</p>",
        },
        {
            "id": "recommendation",
            "title": "Recommendation",
            "bodyHtml": f"<p>{escape(provider)} is proposed with cover of {escape(recommended_cover)}.</p>",
        },
        {
            "id": "needs-objectives",
            "title": "Needs and objectives",
            "bodyHtml": f"<p>{escape(needs_objectives)}</p>",
        },
    ]
    warnings = [
        "Seeded fallback content is being used because live AI generation is unavailable.",
    ]
    generated_html = (
        f"<h1>{escape(title)}</h1>"
        f"<p>{escape(summary)}</p>"
        "<h2>Client overview</h2>"
        f"<p>{escape(client_name)} is being reviewed under template {escape(template_id)}.</p>"
        "<h2>Recommendation</h2>"
        f"<p>{escape(provider)} is proposed with cover of {escape(recommended_cover)}.</p>"
        "<h2>Needs and objectives</h2>"
        f"<p>{escape(needs_objectives)}</p>"
    )

    return {
        "client_reference": client_reference,
        "document_type": document_type,
        "template_id": template_id,
        "title": title,
        "summary": summary,
        "sections": sections,
        "warnings": warnings,
        "generated_html": generated_html,
        "integration_requests": [],
    }
