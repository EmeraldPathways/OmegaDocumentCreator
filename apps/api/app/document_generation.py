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
from app.html_sanitizer import sanitize_preview_html
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


def _calculate_age_from_date_of_birth(value: str) -> str:
    try:
        year, month, day = [int(part) for part in value.split("-")]
        date_of_birth = datetime(year, month, day)
    except ValueError:
        return ""

    today = datetime.now(UTC)
    age = today.year - date_of_birth.year - (
        (today.month, today.day) < (date_of_birth.month, date_of_birth.day)
    )
    return str(age)


def _normalize_phi_deferred_period(value: str) -> str:
    if value.startswith("13"):
        return "13"
    if value.startswith("26"):
        return "26"
    if value.startswith("52"):
        return "52"
    return value


def _is_pensions_workflow_snapshot(workflow_snapshot: dict[str, Any]) -> bool:
    markers = [
        _get_snapshot_value(workflow_snapshot, "workflowKind", "workflow_kind"),
        _get_snapshot_value(workflow_snapshot, "quoteDocumentType", "quote_document_type"),
        _get_snapshot_value(workflow_snapshot, "statementDocumentType", "statement_document_type"),
    ]
    if any("pension" in marker.lower() for marker in markers if marker):
        return True

    return bool(
        _get_snapshot_value(
            workflow_snapshot,
            "pensionRetirementAge",
            "pensionRequired",
            "monthlyContribution",
        )
    )


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


def build_pension_request_payload(settings: AppSettings, workflow_snapshot: dict[str, Any]) -> dict[str, Any]:
    request_fields = [
        {
            "label": "Age",
            "value": _get_snapshot_value(workflow_snapshot, "pensionAge", "age")
            or _calculate_age_from_date_of_birth(_get_snapshot_value(workflow_snapshot, "dateOfBirth", "date_of_birth")),
        },
        {"label": "Gender", "value": _get_snapshot_value(workflow_snapshot, "gender", "pensionGender")},
        {"label": "RetirementAge", "value": _get_snapshot_value(workflow_snapshot, "pensionRetirementAge", "retirementAge")},
        {"label": "SpousesPension", "value": _get_snapshot_value(workflow_snapshot, "spousesPension") or "No"},
        {"label": "PensionEscalation", "value": _get_snapshot_value(workflow_snapshot, "pensionEscalation") or "0"},
        {"label": "NetGrowth", "value": _get_snapshot_value(workflow_snapshot, "pensionNetGrowth") or "6"},
        {"label": "PremiumEscalation", "value": _get_snapshot_value(workflow_snapshot, "pensionPremiumEscalation") or "5"},
        {"label": "Inflation", "value": _get_snapshot_value(workflow_snapshot, "pensionInflation") or "3"},
        {"label": "ExistingFund", "value": _get_snapshot_value(workflow_snapshot, "pensionExistingFund") or "0"},
        {"label": "PensionRequired", "value": _get_snapshot_value(workflow_snapshot, "pensionRequired")},
        {"label": "MonthlyContribution", "value": _get_snapshot_value(workflow_snapshot, "monthlyContribution")},
    ]

    missing_fields = [
        field["label"]
        for field in request_fields
        if field["label"] in {"Age", "Gender", "RetirementAge", "PensionRequired", "MonthlyContribution"}
        and not field["value"]
    ]
    if missing_fields:
        raise ValueError(f"Missing pension request fields: {', '.join(missing_fields)}")

    if not all(
        [
            settings.pension_endpoint_url,
            settings.pension_request_from,
            settings.pension_request_from_code,
        ]
    ):
        raise RuntimeError("Pension integration is not configured.")

    xml = (
        "<Inputs>"
        "<Authentication>"
        f"<RequestFrom>{escape(settings.pension_request_from)}</RequestFrom>"
        f"<RequestFromCode>{escape(settings.pension_request_from_code)}</RequestFromCode>"
        "</Authentication>"
        "<Parameters>"
        f"<Age>{escape(request_fields[0]['value'])}</Age>"
        f"<Gender>{escape(request_fields[1]['value'])}</Gender>"
        f"<RetirementAge>{escape(request_fields[2]['value'])}</RetirementAge>"
        f"<SpousesPension>{escape(request_fields[3]['value'])}</SpousesPension>"
        f"<PensionEscalation>{escape(request_fields[4]['value'])}</PensionEscalation>"
        f"<NetGrowth>{escape(request_fields[5]['value'])}</NetGrowth>"
        f"<PremiumEscalation>{escape(request_fields[6]['value'])}</PremiumEscalation>"
        f"<Inflation>{escape(request_fields[7]['value'])}</Inflation>"
        f"<ExistingFund>{escape(request_fields[8]['value'])}</ExistingFund>"
        f"<PensionRequired>{escape(request_fields[9]['value'])}</PensionRequired>"
        f"<MonthlyContribution>{escape(request_fields[10]['value'])}</MonthlyContribution>"
        "</Parameters>"
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

    for company in root.findall("./Outputs/Quotes/Company"):
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


def _first_present_text(node: ET.Element, *paths: str) -> str:
    for path in paths:
        value = (node.findtext(path) or "").strip()
        if value:
            return value
    return ""


def submit_pension_request(settings: AppSettings, workflow_snapshot: dict[str, Any]) -> dict[str, Any]:
    payload = build_pension_request_payload(settings, workflow_snapshot)
    body = urlencode({"xml": payload["xml"]}).encode("utf-8")
    request = Request(
        settings.pension_endpoint_url,
        data=body,
        headers={"Content-Type": "application/x-www-form-urlencoded"},
        method="POST",
    )

    with urlopen(request, timeout=20) as response:
        xml_result = response.read().decode("utf-8")

    root = ET.fromstring(xml_result)
    errors_text = (root.findtext("Errors") or root.findtext("Results/Errors") or "").strip()
    quote_results: list[dict[str, str]] = []

    for quote_type in root.findall("./Outputs/Quotes/Type"):
        policy_type = (quote_type.findtext("Desc") or "").strip()
        for company in quote_type.findall("./Company"):
            quote_results.append(
                {
                    "provider_name": _first_present_text(company, "Name"),
                    "policy_type": policy_type,
                    "level_premium": _first_present_text(
                        company,
                        "Premium",
                        "MonthlyContribution",
                        "Contribution",
                        "Level",
                        "SLevel",
                        "SMortgage",
                        "JLevel",
                        "JMortgage",
                        "DLevel",
                    ),
                    "escalation_3_premium": "",
                    "escalation_5_premium": "",
                }
            )

    if not quote_results:
        for company in root.findall("./Outputs/Quotes/Company"):
            quote_results.append(
                {
                    "provider_name": _first_present_text(company, "Name"),
                    "policy_type": _first_present_text(company, "Type", "Desc"),
                    "level_premium": _first_present_text(
                        company,
                        "Premium",
                        "MonthlyContribution",
                        "Contribution",
                        "Level",
                    ),
                    "escalation_3_premium": "",
                    "escalation_5_premium": "",
                }
            )

    if not quote_results:
        summary_premium = _first_present_text(
            root,
            "./Outputs/Summary/MonthlyContribution",
            "./Outputs/Summary/Premium",
            "./Summary/MonthlyContribution",
            "./Summary/Premium",
        )
        if summary_premium:
            quote_results.append(
                {
                    "provider_name": "Pension Calculator",
                    "policy_type": "Projection",
                    "level_premium": summary_premium,
                    "escalation_3_premium": "",
                    "escalation_5_premium": "",
                }
            )

    return {
        "provider": "BestAdvice",
        "request_type": "Pension",
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
    generated_by_email: str | None = None,
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
        user_repo = UserRepository(db)
        preview_title = str(generated_document.get("title") or document_type)
        preview_html = sanitize_preview_html(str(generated_document.get("generated_html") or ""))
        doc_name = f"{client_name}_{replace_spaces(document_type, '_')}"
        generated_by_user = user_repo.get_by_email(generated_by_email) if generated_by_email else None
        next_version = doc_repo.next_version_for(str(client_model.id), document_type)

        doc_model = DocumentModel(
            client_id=client_model.id,
            document_type=document_type,
            document_name=doc_name,
            status="draft",
            version=next_version,
            preview_title=preview_title,
            preview_html=preview_html,
            generated_by=generated_by_user.id if generated_by_user else None,
        )
        doc_repo.add(doc_model)
        db.commit()
        generated_document["document_id"] = str(doc_model.id)

        return generated_document
    finally:
        db.close()


def replace_spaces(value: str, replacement: str) -> str:
    return value.replace(" ", replacement)


def build_statement_quote_requests(
    *,
    settings: AppSettings,
    workflow_snapshot: dict[str, Any],
) -> list[dict[str, Any]]:
    warnings: list[str] = []
    return _build_quote_requests_for_snapshot(
        settings=settings,
        workflow_snapshot=workflow_snapshot,
        warnings=warnings,
    )


def _build_quote_requests_for_snapshot(
    *,
    settings: AppSettings,
    document_type: str | None = None,
    workflow_snapshot: dict[str, Any],
    warnings: list[str],
) -> list[dict[str, Any]]:
    normalized_document_type = (document_type or "").strip().lower()
    is_pensions_workflow = "pension" in normalized_document_type or _is_pensions_workflow_snapshot(workflow_snapshot)

    try:
        if is_pensions_workflow:
            return [submit_pension_request(settings, workflow_snapshot)]
        return [submit_phi_request(settings, workflow_snapshot)]
    except Exception as exc:
        warnings.append(f"{'Pension' if is_pensions_workflow else 'PHI'} integration failed: {exc}")
        return [
            {
                "provider": "BestAdvice",
                "request_type": "Pension" if is_pensions_workflow else "Phi",
                "status": "failed",
                "requested_at": datetime.now(UTC).isoformat(),
                "request_fields": [],
                "quote_results": [],
                "errors": [str(exc)],
            }
        ]


def _build_integration_requests(
    *,
    settings: AppSettings,
    document_type: str,
    workflow_snapshot: dict[str, Any],
    warnings: list[str],
) -> list[dict[str, Any]]:
    if document_type not in {"Statement of Suitability", "Pensions Statement"}:
        return []
    return _build_quote_requests_for_snapshot(
        settings=settings,
        document_type=document_type,
        workflow_snapshot=workflow_snapshot,
        warnings=warnings,
    )


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
