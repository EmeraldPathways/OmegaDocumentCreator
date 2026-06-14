from __future__ import annotations

from html import escape
from typing import Any

from fastapi import HTTPException

from app.ai import build_document_prompt, generate_document_content
from app.config import AppSettings
from app.store import get_client, save_generated_document_draft


def generate_document(
    *,
    settings: AppSettings,
    client_reference: str,
    document_type: str,
    template_id: str,
    workflow_snapshot: dict[str, Any],
) -> dict[str, Any]:
    client = get_client(client_reference)
    if not client:
        raise HTTPException(status_code=404, detail="Client not found")

    client_name = str(
        workflow_snapshot.get("full_name")
        or client.get("full_name")
        or f"{client.get('first_name', '')} {client.get('surname', '')}".strip()
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
    save_generated_document_draft(
        client_reference=client_reference,
        document_type=document_type,
        template_id=template_id,
        title=str(generated_document.get("title") or document_type),
        summary=str(generated_document.get("summary") or ""),
        sections=generated_document["sections"],
        warnings=[str(warning) for warning in generated_document.get("warnings", [])],
        generated_html=str(generated_document.get("generated_html") or ""),
    )
    return generated_document


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
    product_type = str(workflow_snapshot.get("product_type") or "Income Protection")
    provider = str(workflow_snapshot.get("provider") or "Recommended provider")
    recommended_cover = str(workflow_snapshot.get("recommended_cover") or "Coverage to be confirmed")
    needs_objectives = str(
        workflow_snapshot.get("needs_objectives") or "Protect the client against a loss of earned income."
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
    }
