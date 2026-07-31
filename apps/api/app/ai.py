from __future__ import annotations

from html import escape
from typing import Any

from pydantic import BaseModel, ConfigDict, Field

from app.config import AppSettings


class GeneratedSectionOutput(BaseModel):
    model_config = ConfigDict(extra="forbid")

    title: str = Field(min_length=1)
    body: str = Field(min_length=1)


class GeneratedDocumentOutput(BaseModel):
    model_config = ConfigDict(extra="forbid")

    title: str = Field(min_length=1)
    summary: str = Field(min_length=1)
    sections: list[GeneratedSectionOutput] = Field(min_length=1)
    warnings: list[str] = Field(default_factory=list)


_PROMPT_ALLOWED_FIELDS = {
    "full_name",
    "fullName",
    "clientName",
    "date_of_birth",
    "dateOfBirth",
    "gender",
    "smoker_status",
    "smokerStatus",
    "occupation",
    "employment_status",
    "income_salary",
    "incomeSalary",
    "town_city",
    "townCity",
    "county",
    "email",
    "mobile_number",
    "mobileNumber",
    "work_phone",
    "workPhone",
    "personal_circumstances",
    "personalCircumstances",
    "financial_situation",
    "financialSituation",
    "needs_objectives",
    "needsObjectives",
    "recommendation_summary",
    "recommendationSummary",
    "product_type",
    "productType",
    "provider",
    "provider_name",
    "providerName",
    "recommended_cover",
    "recommendedCover",
    "deferred_period",
    "deferredPeriod",
    "cover_age",
    "coverAge",
    "phiOccupationalClass",
    "phiIndexation",
    "letter_date",
    "letterDate",
    "advisor_name",
    "advisorName",
    "pensionAge",
    "pensionGender",
    "pensionRetirementAge",
    "pensionRequired",
    "monthlyContribution",
    "spousesPension",
    "pensionEscalation",
    "pensionNetGrowth",
    "pensionPremiumEscalation",
    "pensionInflation",
    "pensionExistingFund",
}


def _filtered_prompt_fields(workflow_snapshot: dict[str, Any]) -> list[tuple[str, str]]:
    filtered: list[tuple[str, str]] = []
    for key, value in workflow_snapshot.items():
        if key not in _PROMPT_ALLOWED_FIELDS:
            continue
        if value is None:
            continue
        normalized = str(value).strip()
        if not normalized:
            continue
        filtered.append((key, normalized))
    return filtered


def build_document_prompt(
    *,
    client_name: str,
    client_reference: str,
    document_type: str,
    template_id: str,
    workflow_snapshot: dict[str, Any],
) -> str:
    filtered_fields = _filtered_prompt_fields(workflow_snapshot)
    if filtered_fields:
        fields = "\n".join(f"- {key}: {value}" for key, value in filtered_fields)
    else:
        fields = "- No approved workflow fields were available."
    return (
        "You are generating a professional financial advice document draft.\n"
        f"Client: {client_name} ({client_reference})\n"
        f"Document type: {document_type}\n"
        f"Template: {template_id}\n"
        "Use the workflow data below. Write concise, factual, client-ready copy. "
        "Do not use markdown bullets unless the content genuinely requires a list. "
        "Keep warnings specific and compliance-oriented.\n"
        f"Workflow data:\n{fields}"
    )


def generate_document_content(*, settings: AppSettings, prompt: str) -> dict[str, Any] | None:
    if not settings.ai_enabled:
        return None
    if settings.ai_provider.lower() != "gemini":
        return None
    if not settings.ai_api_key or not settings.ai_model:
        return None

    try:
        client = _create_gemini_client(settings.ai_api_key)
        response = client.models.generate_content(
            model=settings.ai_model,
            contents=prompt,
            config={
                "temperature": settings.ai_temperature,
                "system_instruction": (
                    "Generate structured JSON for an advice document draft. "
                    "Return clear section titles, plain text section bodies, and concise warnings."
                ),
                "response_mime_type": "application/json",
                "response_schema": GeneratedDocumentOutput,
            },
        )
        parsed = _extract_structured_output(response)
        if parsed is None:
            return None
    except Exception:
        return None

    return _normalize_generated_document(parsed)


def _create_gemini_client(api_key: str):
    from google import genai

    return genai.Client(api_key=api_key)


def _extract_structured_output(response: Any) -> GeneratedDocumentOutput | None:
    parsed = getattr(response, "parsed", None)
    if isinstance(parsed, GeneratedDocumentOutput):
        return parsed
    if isinstance(parsed, dict):
        return GeneratedDocumentOutput.model_validate(parsed)

    text = getattr(response, "text", None)
    if not text:
        return None

    return GeneratedDocumentOutput.model_validate_json(text)


def _normalize_generated_document(document: GeneratedDocumentOutput) -> dict[str, Any]:
    sections = [
        {
            "id": f"section-{index + 1}",
            "title": section.title.strip(),
            "bodyHtml": _paragraph_html(section.body),
        }
        for index, section in enumerate(document.sections)
    ]
    generated_html = (
        f"<h1>{escape(document.title.strip())}</h1>"
        f"<p>{escape(document.summary.strip())}</p>"
        + "".join(
            f"<h2>{escape(section.title.strip())}</h2>{_paragraph_html(section.body)}" for section in document.sections
        )
    )

    return {
        "title": document.title.strip(),
        "summary": document.summary.strip(),
        "sections": sections,
        "warnings": [warning.strip() for warning in document.warnings if warning.strip()],
        "generated_html": generated_html,
    }


def _paragraph_html(text: str) -> str:
    paragraphs = [segment.strip() for segment in text.replace("\r\n", "\n").split("\n\n") if segment.strip()]
    if not paragraphs:
        return "<p></p>"
    return "".join(f"<p>{escape(paragraph)}</p>" for paragraph in paragraphs)
