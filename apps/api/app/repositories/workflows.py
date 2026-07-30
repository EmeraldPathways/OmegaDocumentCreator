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

_LIFE_SI_MAP: list[tuple[str, str]] = [
    ("mortgage_protection", "mortgageProtection"),
    ("personal_insurance", "personalInsurance"),
    ("keyman_insurance", "keymanInsurance"),
    ("partnership_insurance", "partnershipInsurance"),
    ("self_life_cover", "selfLifeInsuranceAmount"),
    ("self_serious_illness_cover", "selfSeriousIllnessAmount"),
    ("partner_life_cover", "partnerLifeInsuranceAmount"),
    ("partner_serious_illness_cover", "partnerSeriousIllnessAmount"),
    ("notes", "lifeSiNotes"),
]


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
                elif db_col in (
                    "mortgage_protection",
                    "personal_insurance",
                    "keyman_insurance",
                    "partnership_insurance",
                ):
                    setattr(life, db_col, _coerce_bool(raw))
                else:
                    setattr(life, db_col, str(raw).strip() or None)
