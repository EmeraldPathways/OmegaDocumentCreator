from __future__ import annotations

from datetime import date, UTC, datetime
from uuid import UUID

from sqlalchemy.orm import Session

from app.models import (
    EmploymentDetail,
    FactFind,
    LifeSeriousIllnessDetail,
    ProtectionDetail,
    StatementOfSuitability,
    TermsOfBusiness,
)

# ---------------------------------------------------------------------------
# Each frontend field maps to exactly ONE DB column in ONE table.
# Overlaps removed -- get() and save() must agree on which table owns each field.
# ---------------------------------------------------------------------------

_FACT_FIND_MAP: list[tuple[str, str]] = [
    ("personal_circumstances", "personalCircumstances"),
    ("financial_situation", "financialSituation"),
    ("needs_objectives", "needsObjectives"),
    ("execution_only_confirmation", "executionOnlyConfirmation"),
    ("terms_reviewed_received", "termsReviewedReceived"),
    ("marketing_consent", "agreeToMarketing"),
    ("contact_phone", "contactByPhone"),
    ("contact_sms", "contactBySms"),
    ("contact_email", "contactByEmail"),
    ("contact_post", "contactByPost"),
    ("pep_confirmation", "pepConfirmation"),
    ("gender", "gender"),
    ("smoker_status", "smokerStatus"),
    ("phi_occupational_class", "phiOccupationalClass"),
    ("phi_indexation", "phiIndexation"),
    ("business_source", "businessSource"),
    ("recommendation_understood", "recommendationAcknowledged"),
]

_TERMS_MAP: list[tuple[str, str]] = [
    ("version", "termsVersion"),
    ("issued_date", "termsIssuedDate"),
    ("received_by_client", "termsClientReceived"),
    ("reviewed_by_client", "termsClientReviewed"),
    ("delivery_method", "termsDeliveryMethod"),
    ("notes", "termsNotes"),
]

_STATEMENT_MAP: list[tuple[str, str]] = [
    ("letter_date", "letterDate"),
    ("statement_type", "statementType"),
    ("provider_name", "provider"),
    ("product_type", "productType"),
    ("personal_circumstances", "factFindUpdatePersonalCircumstances"),
    ("financial_situation", "factFindUpdateFinancialSituation"),
    ("needs_objectives", "factFindUpdateNeedsAndObjectives"),
    ("recommendation_summary", "coverSummary"),
    ("recommended_cover", "recommendedCover"),
    ("deferred_period", "deferredPeriod"),
    ("cover_to_age", "coverAge"),
    ("gross_monthly_premium", "premium"),
    ("net_monthly_cost", "netMonthlyCost"),
    ("advisor_name", "advisorName"),
    ("paid_by", "paidBy"),
    ("affordability_discussed", "affordabilityDiscussed"),
    ("client_happy_to_proceed", "clientHappyToProceed"),
    ("client_declaration_accepted", "clientDeclarationAccepted"),
    ("client_signature_date", "clientSignatureDate"),
    ("discount_applied", "discountApplied"),
    ("tax_relief_percentage", "taxReliefPercentage"),
]

_EMPLOYMENT_MAP: list[tuple[str, str]] = [
    ("occupation", "occupation"),
    ("employment_status", "employmentStatus"),
    ("employer_name", "employerName"),
    ("income_salary", "income"),
    ("work_address", "clientWorkAddressLine1"),
    ("sick_pay_entitlement", "sickPayEntitlement"),
    ("sick_pay_duration", "sickPayDuration"),
    ("notes", "employmentNotes"),
]

_PROTECTION_MAP: list[tuple[str, str]] = [
    ("has_income_protection", "servicesRequestedIncomeProtection"),
    ("provider", "incomeProtectionDeferredProvider"),
    ("current_weekly_cover", "incomeProtectionDeferredCurrentWeeklyCover"),
    ("current_annual_cover", "incomeProtectionDeferredAnnualCover"),
    ("monthly_premium", "incomeProtectionDeferredMonthlyPremium"),
    ("policy_owner", "policyOwner"),
    ("notes", "protectionNotes"),
]

_LIFE_SI_DETAIL_FIELDS = {
    "mortgageProtection",
    "personalInsurance",
    "keymanInsurance",
    "partnershipInsurance",
}

_LIFE_SI_MAP: list[tuple[str, str]] = [
    ("self_life_cover", "selfLifeInsuranceAmount"),
    ("self_serious_illness_cover", "selfSeriousIllnessAmount"),
    ("partner_life_cover", "partnerLifeInsuranceAmount"),
    ("partner_serious_illness_cover", "partnerSeriousIllnessAmount"),
    ("notes", "lifeSiNotes"),
]

_WORKFLOW_META_MARKER = "_omega_workflow_meta"

_KNOWN_FRONTEND_KEYS = {
    "factFindStatus",
    "statementStatus",
    *(front_key for _, front_key in _FACT_FIND_MAP),
    *(front_key for _, front_key in _TERMS_MAP),
    *(front_key for _, front_key in _STATEMENT_MAP),
    *(front_key for _, front_key in _EMPLOYMENT_MAP),
    *(front_key for _, front_key in _PROTECTION_MAP),
    *(front_key for _, front_key in _LIFE_SI_MAP),
}


def _model_to_dict(model: object, mapping: list[tuple[str, str]]) -> dict[str, object]:
    result: dict[str, object] = {}
    for db_col, front_key in mapping:
        val = getattr(model, db_col, None)
        if val is None:
            result[front_key] = ""
            continue
        if isinstance(val, bool):
            result[front_key] = "Yes" if val else "No"
        elif isinstance(val, (date, datetime)):
            result[front_key] = val.isoformat()
        else:
            result[front_key] = str(val).strip()
    return result


def _coerce_bool(value: object) -> bool | None:
    s = str(value).strip().lower()
    if s in ("yes", "true", "1"):
        return True
    if s in ("no", "false", "0"):
        return False
    return None


def _coerce_decimal(value: object) -> str:
    s = str(value).strip()
    if not s:
        return ""
    try:
        from decimal import Decimal

        return str(Decimal(s.replace(",", "")))
    except Exception:
        return ""


def _as_clean_string(value: object) -> str:
    return str(value).strip() if value is not None else ""


def _normalize_saved_quote_request_fields(value: object) -> list[dict[str, str]]:
    if not isinstance(value, list):
        return []

    fields: list[dict[str, str]] = []
    for raw_field in value:
        if not isinstance(raw_field, dict):
            continue
        fields.append(
            {
                "label": _as_clean_string(raw_field.get("label")),
                "value": _as_clean_string(raw_field.get("value")),
            }
        )
    return fields


def _normalize_saved_quote_results(value: object) -> list[dict[str, str]]:
    if not isinstance(value, list):
        return []

    results: list[dict[str, str]] = []
    for raw_quote in value:
        if not isinstance(raw_quote, dict):
            continue
        results.append(
            {
                "providerName": _as_clean_string(raw_quote.get("providerName")),
                "policyType": _as_clean_string(raw_quote.get("policyType")),
                "levelPremium": _as_clean_string(raw_quote.get("levelPremium")),
                "escalation3Premium": _as_clean_string(raw_quote.get("escalation3Premium")),
                "escalation5Premium": _as_clean_string(raw_quote.get("escalation5Premium")),
            }
        )
    return results


def _normalize_saved_quote_sections(value: object) -> list[dict[str, str]]:
    if not isinstance(value, list):
        return []

    sections: list[dict[str, str]] = []
    for raw_section in value:
        if not isinstance(raw_section, dict):
            continue
        sections.append(
            {
                "id": _as_clean_string(raw_section.get("id")),
                "title": _as_clean_string(raw_section.get("title")),
                "bodyHtml": _as_clean_string(raw_section.get("bodyHtml")),
                "summary": _as_clean_string(raw_section.get("summary")),
            }
        )
    return sections


def _normalize_saved_quote_requests(value: object) -> list[dict[str, object]]:
    if not isinstance(value, list):
        return []

    requests: list[dict[str, object]] = []
    for raw_request in value:
        if not isinstance(raw_request, dict):
            continue
        errors = raw_request.get("errors")
        requests.append(
            {
                "provider": _as_clean_string(raw_request.get("provider")),
                "requestType": _as_clean_string(raw_request.get("requestType")),
                "status": "failed" if _as_clean_string(raw_request.get("status")).lower() == "failed" else "sent",
                "requestedAt": _as_clean_string(raw_request.get("requestedAt")),
                "requestFields": _normalize_saved_quote_request_fields(raw_request.get("requestFields")),
                "quoteResults": _normalize_saved_quote_results(raw_request.get("quoteResults")),
                "errors": [str(error).strip() for error in errors] if isinstance(errors, list) else [],
            }
        )
    return requests


def _normalize_saved_quotes(value: object) -> list[dict[str, object]]:
    if not isinstance(value, list):
        return []

    snapshots: list[dict[str, object]] = []
    for raw_snapshot in value:
        if not isinstance(raw_snapshot, dict):
            continue

        document_type = _as_clean_string(raw_snapshot.get("documentType"))
        snapshots.append(
            {
                "id": _as_clean_string(raw_snapshot.get("id")),
                "name": _as_clean_string(raw_snapshot.get("name")),
                "documentType": "Pensions Quote" if document_type == "Pensions Quote" else "Quote",
                "selectedTemplateId": _as_clean_string(raw_snapshot.get("selectedTemplateId")),
                "createdAt": _as_clean_string(raw_snapshot.get("createdAt")),
                "updatedAt": _as_clean_string(raw_snapshot.get("updatedAt")),
                "provider": _as_clean_string(raw_snapshot.get("provider")),
                "integrationRequests": _normalize_saved_quote_requests(raw_snapshot.get("integrationRequests")),
                "generationStatus": (
                    "failed"
                    if _as_clean_string(raw_snapshot.get("generationStatus")).lower() == "failed"
                    else "generating"
                    if _as_clean_string(raw_snapshot.get("generationStatus")).lower() == "generating"
                    else "completed"
                    if _as_clean_string(raw_snapshot.get("generationStatus")).lower() == "completed"
                    else "idle"
                ),
                "lastGeneratedHtml": _as_clean_string(raw_snapshot.get("lastGeneratedHtml")),
                "lastGeneratedSections": _normalize_saved_quote_sections(raw_snapshot.get("lastGeneratedSections")),
                "editedHtml": _as_clean_string(raw_snapshot.get("editedHtml")),
                "quoteAnnualCoverAmount": _as_clean_string(raw_snapshot.get("quoteAnnualCoverAmount")),
                "quoteCoverToAge": _as_clean_string(raw_snapshot.get("quoteCoverToAge")),
                "quoteDeferredPeriod": _as_clean_string(raw_snapshot.get("quoteDeferredPeriod")),
                "quoteOccupationClass": _as_clean_string(raw_snapshot.get("quoteOccupationClass")),
                "quotePhiIndexation": _as_clean_string(raw_snapshot.get("quotePhiIndexation")),
                "quoteSmoker": _as_clean_string(raw_snapshot.get("quoteSmoker")),
                "quotePensionGender": _as_clean_string(raw_snapshot.get("quotePensionGender")),
                "quotePensionRetirementAge": _as_clean_string(raw_snapshot.get("quotePensionRetirementAge")),
                "quotePensionSpousesPension": _as_clean_string(raw_snapshot.get("quotePensionSpousesPension")),
                "quotePensionEscalation": _as_clean_string(raw_snapshot.get("quotePensionEscalation")),
                "quotePensionNetGrowth": _as_clean_string(raw_snapshot.get("quotePensionNetGrowth")),
                "quotePensionPremiumEscalation": _as_clean_string(raw_snapshot.get("quotePensionPremiumEscalation")),
                "quotePensionInflation": _as_clean_string(raw_snapshot.get("quotePensionInflation")),
                "quotePensionExistingFund": _as_clean_string(raw_snapshot.get("quotePensionExistingFund")),
                "quotePensionRequired": _as_clean_string(raw_snapshot.get("quotePensionRequired")),
                "quotePensionMonthlyContribution": _as_clean_string(raw_snapshot.get("quotePensionMonthlyContribution")),
                "zurichDiscountActive": _as_clean_string(raw_snapshot.get("zurichDiscountActive")),
            }
        )
    return snapshots


def _normalize_meta_workflow_fields(value: object) -> dict[str, object]:
    if not isinstance(value, dict):
        return {}

    normalized: dict[str, object] = {}
    for key, raw_value in value.items():
        if not isinstance(key, str) or not key.strip():
            continue
        normalized[key] = raw_value
    return normalized


def _extract_workflow_meta(value: object) -> tuple[list[dict[str, object]], dict[str, object]]:
    if isinstance(value, list):
        for entry in value:
            if not isinstance(entry, dict):
                continue
            meta_payload = entry.get(_WORKFLOW_META_MARKER)
            if not isinstance(meta_payload, dict):
                continue
            return (
                _normalize_saved_quotes(meta_payload.get("savedQuotes")),
                _normalize_meta_workflow_fields(meta_payload.get("workflowFields")),
            )
        return (_normalize_saved_quotes(value), {})

    if isinstance(value, dict):
        return (
            _normalize_saved_quotes(value.get("savedQuotes")),
            _normalize_meta_workflow_fields(value.get("workflowFields")),
        )

    return ([], {})


def _build_workflow_meta_payload(*, saved_quotes: list[dict[str, object]], workflow_fields: dict[str, object]) -> list[dict[str, object]]:
    return [
        {
            _WORKFLOW_META_MARKER: {
                "savedQuotes": _normalize_saved_quotes(saved_quotes),
                "workflowFields": _normalize_meta_workflow_fields(workflow_fields),
            }
        }
    ]


def _extract_unmapped_workflow_fields(data: dict[str, object]) -> dict[str, object]:
    return {
        key: value
        for key, value in data.items()
        if isinstance(key, str) and (key not in _KNOWN_FRONTEND_KEYS or key in _LIFE_SI_DETAIL_FIELDS)
    }


class WorkflowRepository:
    """Persist income-protection workflow state to normalized DB tables."""

    def __init__(self, db: Session) -> None:
        self._db = db

    # ------------------------------------------------------------------
    # Get
    # ------------------------------------------------------------------

    def get(self, client_id: UUID) -> dict[str, object]:
        result: dict[str, object] = {}

        ff = self._db.query(FactFind).filter(FactFind.client_id == client_id).first()
        if ff is not None:
            result.update(_model_to_dict(ff, _FACT_FIND_MAP))
            result["factFindStatus"] = ff.status

        tob = self._db.query(TermsOfBusiness).filter(TermsOfBusiness.client_id == client_id).first()
        if tob is not None:
            result.update(_model_to_dict(tob, _TERMS_MAP))

        sos = self._db.query(StatementOfSuitability).filter(StatementOfSuitability.client_id == client_id).first()
        if sos is not None:
            result.update(_model_to_dict(sos, _STATEMENT_MAP))
            result["statementStatus"] = sos.status
            saved_quotes, workflow_fields = _extract_workflow_meta(sos.recommendation_reasons)
            result["savedQuotes"] = saved_quotes
            result.update(workflow_fields)

        emp = self._db.query(EmploymentDetail).filter(EmploymentDetail.client_id == client_id).first()
        if emp is not None:
            result.update(_model_to_dict(emp, _EMPLOYMENT_MAP))

        prot = self._db.query(ProtectionDetail).filter(ProtectionDetail.client_id == client_id).first()
        if prot is not None:
            result.update(_model_to_dict(prot, _PROTECTION_MAP))

        life = self._db.query(LifeSeriousIllnessDetail).filter(LifeSeriousIllnessDetail.client_id == client_id).first()
        if life is not None:
            result.update(_model_to_dict(life, _LIFE_SI_MAP))

        return result

    # ------------------------------------------------------------------
    # Save
    # ------------------------------------------------------------------

    def save(self, client_id: UUID, data: dict[str, object]) -> None:
        self._save_fact_find(client_id, data)
        self._save_terms(client_id, data)
        self._save_statement(client_id, data)
        self._save_employment(client_id, data)
        self._save_protection(client_id, data)
        self._save_life_si(client_id, data)
        self._db.flush()

    # ------------------------------------------------------------------
    # Per-table upsert helpers
    # ------------------------------------------------------------------

    def _save_fact_find(self, client_id: UUID, data: dict[str, object]) -> None:
        ff = self._db.query(FactFind).filter(FactFind.client_id == client_id).first()
        if ff is None:
            ff = FactFind(client_id=client_id, status="draft")
            self._db.add(ff)
        for db_col, front_key in _FACT_FIND_MAP:
            if front_key in data:
                raw = data[front_key]
                if isinstance(raw, bool):
                    setattr(ff, db_col, raw)
                elif db_col in (
                    "execution_only_confirmation",
                    "terms_reviewed_received",
                    "marketing_consent",
                    "contact_phone",
                    "contact_sms",
                    "contact_email",
                    "contact_post",
                    "pep_confirmation",
                    "recommendation_understood",
                ):
                    setattr(ff, db_col, _coerce_bool(raw))
                else:
                    setattr(ff, db_col, str(raw).strip() or None)

    def _save_terms(self, client_id: UUID, data: dict[str, object]) -> None:
        tob = self._db.query(TermsOfBusiness).filter(TermsOfBusiness.client_id == client_id).first()
        if tob is None:
            tob = TermsOfBusiness(client_id=client_id, version="January 2026")
            self._db.add(tob)
        for db_col, front_key in _TERMS_MAP:
            if front_key in data:
                raw = data[front_key]
                if isinstance(raw, bool):
                    setattr(tob, db_col, raw)
                elif db_col in ("received_by_client", "reviewed_by_client"):
                    setattr(tob, db_col, _coerce_bool(raw))
                elif db_col == "issued_date" and raw:
                    try:
                        setattr(tob, "issued_date", date.fromisoformat(str(raw)[:10]))
                    except (ValueError, TypeError):
                        setattr(tob, "issued_date", None)
                else:
                    setattr(tob, db_col, str(raw).strip() or None)

    def _save_statement(self, client_id: UUID, data: dict[str, object]) -> None:
        sos = self._db.query(StatementOfSuitability).filter(StatementOfSuitability.client_id == client_id).first()
        if sos is None:
            sos = StatementOfSuitability(client_id=client_id, status="draft")
            self._db.add(sos)
        for db_col, front_key in _STATEMENT_MAP:
            if front_key in data:
                raw = data[front_key]
                if isinstance(raw, bool):
                    setattr(sos, db_col, raw)
                elif db_col in (
                    "affordability_discussed",
                    "client_happy_to_proceed",
                    "client_declaration_accepted",
                ):
                    setattr(sos, db_col, _coerce_bool(raw))
                elif db_col in ("letter_date", "client_signature_date") and raw:
                    try:
                        setattr(sos, db_col, date.fromisoformat(str(raw)[:10]))
                    except (ValueError, TypeError):
                        pass
                elif db_col in (
                    "recommended_cover",
                    "gross_monthly_premium",
                    "discount_applied",
                    "tax_relief_percentage",
                    "net_monthly_cost",
                ):
                    setattr(sos, db_col, _coerce_decimal(raw) or None)
                else:
                    setattr(sos, db_col, str(raw).strip() or None)
        existing_saved_quotes, existing_workflow_fields = _extract_workflow_meta(sos.recommendation_reasons)
        saved_quotes = (
            _normalize_saved_quotes(data["savedQuotes"])
            if "savedQuotes" in data
            else existing_saved_quotes
        )
        workflow_fields = {
            **existing_workflow_fields,
            **_extract_unmapped_workflow_fields(data),
        }
        sos.recommendation_reasons = _build_workflow_meta_payload(
            saved_quotes=saved_quotes,
            workflow_fields=workflow_fields,
        )

    def _save_employment(self, client_id: UUID, data: dict[str, object]) -> None:
        emp = self._db.query(EmploymentDetail).filter(EmploymentDetail.client_id == client_id).first()
        if emp is None:
            emp = EmploymentDetail(client_id=client_id)
            self._db.add(emp)
        for db_col, front_key in _EMPLOYMENT_MAP:
            if front_key in data:
                raw = data[front_key]
                if db_col == "income_salary":
                    setattr(emp, db_col, _coerce_decimal(raw) or None)
                else:
                    setattr(emp, db_col, str(raw).strip() or None)

    def _save_protection(self, client_id: UUID, data: dict[str, object]) -> None:
        prot = self._db.query(ProtectionDetail).filter(ProtectionDetail.client_id == client_id).first()
        if prot is None:
            prot = ProtectionDetail(client_id=client_id)
            self._db.add(prot)
        for db_col, front_key in _PROTECTION_MAP:
            if front_key in data:
                raw = data[front_key]
                if db_col in ("current_weekly_cover", "current_annual_cover", "monthly_premium"):
                    setattr(prot, db_col, _coerce_decimal(raw) or None)
                elif db_col == "has_income_protection":
                    setattr(prot, db_col, _coerce_bool(raw) if raw else None)
                else:
                    setattr(prot, db_col, str(raw).strip() or None)

    def _save_life_si(self, client_id: UUID, data: dict[str, object]) -> None:
        life = self._db.query(LifeSeriousIllnessDetail).filter(LifeSeriousIllnessDetail.client_id == client_id).first()
        if life is None:
            life = LifeSeriousIllnessDetail(client_id=client_id)
            self._db.add(life)
        for db_col, front_key in _LIFE_SI_MAP:
            if front_key in data:
                raw = data[front_key]
                if db_col in (
                    "self_life_cover",
                    "self_serious_illness_cover",
                    "partner_life_cover",
                    "partner_serious_illness_cover",
                ):
                    setattr(life, db_col, _coerce_decimal(raw) or None)
                else:
                    setattr(life, db_col, str(raw).strip() or None)
