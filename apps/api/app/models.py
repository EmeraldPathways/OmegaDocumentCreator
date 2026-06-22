from __future__ import annotations

import uuid
from datetime import UTC, date, datetime
from decimal import Decimal

from sqlalchemy import Boolean, Date, DateTime, ForeignKey, Index, Numeric, Text
from sqlalchemy.dialects.postgresql import JSONB, UUID
from sqlalchemy.orm import DeclarativeBase, Mapped, mapped_column


class Base(DeclarativeBase):
    pass


def _new_uuid() -> uuid.UUID:
    return uuid.uuid4()


def _utcnow() -> datetime:
    return datetime.now(UTC)


# ---------------------------------------------------------------------------
# MVP schema tables matching 0001_initial.sql
# ---------------------------------------------------------------------------


class Session(Base):
    __tablename__ = "sessions"

    id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), primary_key=True, default=_new_uuid)
    user_email: Mapped[str] = mapped_column(Text, nullable=False)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), nullable=False, default=_utcnow)
    expires_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), nullable=False)

    __table_args__ = (Index("idx_sessions_user_email", "user_email"), Index("idx_sessions_expires_at", "expires_at"))


class User(Base):
    __tablename__ = "users"

    id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), primary_key=True, default=_new_uuid)
    first_name: Mapped[str] = mapped_column(Text, nullable=False)
    last_name: Mapped[str] = mapped_column(Text, nullable=False)
    email: Mapped[str] = mapped_column(Text, nullable=False, unique=True)
    password_hash: Mapped[str] = mapped_column(Text, nullable=False)
    role: Mapped[str] = mapped_column(Text, nullable=False)
    status: Mapped[str] = mapped_column(Text, nullable=False)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), nullable=False, default=_utcnow)
    updated_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), nullable=False, default=_utcnow, onupdate=_utcnow)
    last_login_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)


class Client(Base):
    __tablename__ = "clients"

    id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), primary_key=True, default=_new_uuid)
    client_reference: Mapped[str] = mapped_column(Text, nullable=False, unique=True)
    first_name: Mapped[str] = mapped_column(Text, nullable=False)
    surname: Mapped[str] = mapped_column(Text, nullable=False)
    full_name: Mapped[str] = mapped_column(Text, nullable=False)
    title: Mapped[str | None] = mapped_column(Text, nullable=True)
    marital_status: Mapped[str | None] = mapped_column(Text, nullable=True)
    date_of_birth: Mapped[date | None] = mapped_column(Date, nullable=True)
    home_address_line_1: Mapped[str | None] = mapped_column(Text, nullable=True)
    home_address_line_2: Mapped[str | None] = mapped_column(Text, nullable=True)
    town_city: Mapped[str | None] = mapped_column(Text, nullable=True)
    county: Mapped[str | None] = mapped_column(Text, nullable=True)
    eircode: Mapped[str | None] = mapped_column(Text, nullable=True)
    mobile_number: Mapped[str | None] = mapped_column(Text, nullable=True)
    work_phone: Mapped[str | None] = mapped_column(Text, nullable=True)
    email: Mapped[str | None] = mapped_column(Text, nullable=True)
    partner_name: Mapped[str | None] = mapped_column(Text, nullable=True)
    partner_address: Mapped[str | None] = mapped_column(Text, nullable=True)
    status: Mapped[str] = mapped_column(Text, nullable=False)
    created_by: Mapped[uuid.UUID | None] = mapped_column(UUID(as_uuid=True), ForeignKey("users.id"), nullable=True)
    updated_by: Mapped[uuid.UUID | None] = mapped_column(UUID(as_uuid=True), ForeignKey("users.id"), nullable=True)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), nullable=False, default=_utcnow)
    updated_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), nullable=False, default=_utcnow, onupdate=_utcnow)
    archived_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)


class Dependant(Base):
    __tablename__ = "dependants"

    id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), primary_key=True, default=_new_uuid)
    client_id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), ForeignKey("clients.id", ondelete="CASCADE"), nullable=False)
    name: Mapped[str] = mapped_column(Text, nullable=False)
    date_of_birth: Mapped[date | None] = mapped_column(Date, nullable=True)
    notes: Mapped[str | None] = mapped_column(Text, nullable=True)

    __table_args__ = (Index("idx_dependants_client_id", "client_id"),)


class EmploymentDetail(Base):
    __tablename__ = "employment_details"

    id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), primary_key=True, default=_new_uuid)
    client_id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), ForeignKey("clients.id", ondelete="CASCADE"), nullable=False, unique=True)
    occupation: Mapped[str | None] = mapped_column(Text, nullable=True)
    employment_status: Mapped[str | None] = mapped_column(Text, nullable=True)
    employer_name: Mapped[str | None] = mapped_column(Text, nullable=True)
    income_salary: Mapped[Decimal | None] = mapped_column(Numeric(12, 2), nullable=True)
    work_address: Mapped[str | None] = mapped_column(Text, nullable=True)
    sick_pay_entitlement: Mapped[str | None] = mapped_column(Text, nullable=True)
    sick_pay_duration: Mapped[str | None] = mapped_column(Text, nullable=True)
    notes: Mapped[str | None] = mapped_column(Text, nullable=True)


class ProtectionDetail(Base):
    __tablename__ = "protection_details"

    id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), primary_key=True, default=_new_uuid)
    client_id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), ForeignKey("clients.id", ondelete="CASCADE"), nullable=False, unique=True)
    has_income_protection: Mapped[bool | None] = mapped_column(Boolean, nullable=True)
    provider: Mapped[str | None] = mapped_column(Text, nullable=True)
    deferred_period: Mapped[str | None] = mapped_column(Text, nullable=True)
    current_weekly_cover: Mapped[Decimal | None] = mapped_column(Numeric(12, 2), nullable=True)
    current_annual_cover: Mapped[Decimal | None] = mapped_column(Numeric(12, 2), nullable=True)
    monthly_premium: Mapped[Decimal | None] = mapped_column(Numeric(12, 2), nullable=True)
    cover_to_age: Mapped[str | None] = mapped_column(Text, nullable=True)
    policy_owner: Mapped[str | None] = mapped_column(Text, nullable=True)
    notes: Mapped[str | None] = mapped_column(Text, nullable=True)


class LifeSeriousIllnessDetail(Base):
    __tablename__ = "life_serious_illness_details"

    id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), primary_key=True, default=_new_uuid)
    client_id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), ForeignKey("clients.id", ondelete="CASCADE"), nullable=False, unique=True)
    mortgage_protection: Mapped[bool | None] = mapped_column(Boolean, nullable=True)
    personal_insurance: Mapped[bool | None] = mapped_column(Boolean, nullable=True)
    keyman_insurance: Mapped[bool | None] = mapped_column(Boolean, nullable=True)
    partnership_insurance: Mapped[bool | None] = mapped_column(Boolean, nullable=True)
    self_life_cover: Mapped[Decimal | None] = mapped_column(Numeric(12, 2), nullable=True)
    self_serious_illness_cover: Mapped[Decimal | None] = mapped_column(Numeric(12, 2), nullable=True)
    partner_life_cover: Mapped[Decimal | None] = mapped_column(Numeric(12, 2), nullable=True)
    partner_serious_illness_cover: Mapped[Decimal | None] = mapped_column(Numeric(12, 2), nullable=True)
    notes: Mapped[str | None] = mapped_column(Text, nullable=True)


class FactFind(Base):
    __tablename__ = "fact_find"

    id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), primary_key=True, default=_new_uuid)
    client_id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), ForeignKey("clients.id", ondelete="CASCADE"), nullable=False, unique=True)
    personal_circumstances: Mapped[str | None] = mapped_column(Text, nullable=True)
    financial_situation: Mapped[str | None] = mapped_column(Text, nullable=True)
    needs_objectives: Mapped[str | None] = mapped_column(Text, nullable=True)
    execution_only_confirmation: Mapped[bool | None] = mapped_column(Boolean, nullable=True)
    terms_reviewed_received: Mapped[bool | None] = mapped_column(Boolean, nullable=True)
    marketing_consent: Mapped[bool | None] = mapped_column(Boolean, nullable=True)
    contact_phone: Mapped[bool | None] = mapped_column(Boolean, nullable=True)
    contact_sms: Mapped[bool | None] = mapped_column(Boolean, nullable=True)
    contact_email: Mapped[bool | None] = mapped_column(Boolean, nullable=True)
    contact_post: Mapped[bool | None] = mapped_column(Boolean, nullable=True)
    pep_confirmation: Mapped[bool | None] = mapped_column(Boolean, nullable=True)
    business_source: Mapped[str | None] = mapped_column(Text, nullable=True)
    recommendation_understood: Mapped[bool | None] = mapped_column(Boolean, nullable=True)
    status: Mapped[str] = mapped_column(Text, nullable=False)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), nullable=False, default=_utcnow)
    updated_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), nullable=False, default=_utcnow, onupdate=_utcnow)


class Document(Base):
    __tablename__ = "documents"

    id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), primary_key=True, default=_new_uuid)
    client_id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), ForeignKey("clients.id", ondelete="CASCADE"), nullable=False)
    document_type: Mapped[str] = mapped_column(Text, nullable=False)
    document_name: Mapped[str] = mapped_column(Text, nullable=False)
    docx_file_path: Mapped[str | None] = mapped_column(Text, nullable=True)
    pdf_file_path: Mapped[str | None] = mapped_column(Text, nullable=True)
    generated_by: Mapped[uuid.UUID | None] = mapped_column(UUID(as_uuid=True), ForeignKey("users.id"), nullable=True)
    generated_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), nullable=False, default=_utcnow)
    version: Mapped[str | None] = mapped_column(Text, nullable=True)
    status: Mapped[str] = mapped_column(Text, nullable=False)
    # Durable snapshot fields for generated history (Phase 1 migration follow-up)
    preview_title: Mapped[str | None] = mapped_column(Text, nullable=True)
    preview_html: Mapped[str | None] = mapped_column(Text, nullable=True)

    __table_args__ = (Index("idx_documents_client_id", "client_id"),)


class TermsOfBusiness(Base):
    __tablename__ = "terms_of_business"

    id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), primary_key=True, default=_new_uuid)
    client_id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), ForeignKey("clients.id", ondelete="CASCADE"), nullable=False, unique=True)
    version: Mapped[str] = mapped_column(Text, nullable=False)
    issued_date: Mapped[date | None] = mapped_column(Date, nullable=True)
    issued_by: Mapped[uuid.UUID | None] = mapped_column(UUID(as_uuid=True), ForeignKey("users.id"), nullable=True)
    received_by_client: Mapped[bool | None] = mapped_column(Boolean, nullable=True)
    reviewed_by_client: Mapped[bool | None] = mapped_column(Boolean, nullable=True)
    delivery_method: Mapped[str | None] = mapped_column(Text, nullable=True)
    notes: Mapped[str | None] = mapped_column(Text, nullable=True)
    generated_document_id: Mapped[uuid.UUID | None] = mapped_column(UUID(as_uuid=True), ForeignKey("documents.id", ondelete="SET NULL"), nullable=True)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), nullable=False, default=_utcnow)
    updated_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), nullable=False, default=_utcnow, onupdate=_utcnow)


class StatementOfSuitability(Base):
    __tablename__ = "statement_of_suitability"

    id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), primary_key=True, default=_new_uuid)
    client_id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), ForeignKey("clients.id", ondelete="CASCADE"), nullable=False, unique=True)
    letter_date: Mapped[date | None] = mapped_column(Date, nullable=True)
    statement_type: Mapped[str | None] = mapped_column(Text, nullable=True)
    provider_name: Mapped[str | None] = mapped_column(Text, nullable=True)
    product_type: Mapped[str | None] = mapped_column(Text, nullable=True)
    personal_circumstances: Mapped[str | None] = mapped_column(Text, nullable=True)
    financial_situation: Mapped[str | None] = mapped_column(Text, nullable=True)
    needs_objectives: Mapped[str | None] = mapped_column(Text, nullable=True)
    recommendation_summary: Mapped[str | None] = mapped_column(Text, nullable=True)
    recommended_cover: Mapped[Decimal | None] = mapped_column(Numeric(12, 2), nullable=True)
    deferred_period: Mapped[str | None] = mapped_column(Text, nullable=True)
    cover_to_age: Mapped[str | None] = mapped_column(Text, nullable=True)
    gross_monthly_premium: Mapped[Decimal | None] = mapped_column(Numeric(12, 2), nullable=True)
    discount_applied: Mapped[Decimal | None] = mapped_column(Numeric(12, 2), nullable=True)
    tax_relief_percentage: Mapped[Decimal | None] = mapped_column(Numeric(5, 2), nullable=True)
    net_monthly_cost: Mapped[Decimal | None] = mapped_column(Numeric(12, 2), nullable=True)
    paid_by: Mapped[str | None] = mapped_column(Text, nullable=True)
    affordability_discussed: Mapped[bool | None] = mapped_column(Boolean, nullable=True)
    client_happy_to_proceed: Mapped[bool | None] = mapped_column(Boolean, nullable=True)
    recommendation_reasons: Mapped[list[dict[str, object]]] = mapped_column(JSONB, nullable=False, default=list)
    advisor_name: Mapped[str | None] = mapped_column(Text, nullable=True)
    client_declaration_accepted: Mapped[bool | None] = mapped_column(Boolean, nullable=True)
    client_signature_date: Mapped[date | None] = mapped_column(Date, nullable=True)
    status: Mapped[str] = mapped_column(Text, nullable=False)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), nullable=False, default=_utcnow)
    updated_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), nullable=False, default=_utcnow, onupdate=_utcnow)


class File(Base):
    __tablename__ = "files"

    id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), primary_key=True, default=_new_uuid)
    client_id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), ForeignKey("clients.id", ondelete="CASCADE"), nullable=False)
    original_filename: Mapped[str] = mapped_column(Text, nullable=False)
    stored_filename: Mapped[str] = mapped_column(Text, nullable=False)
    file_path: Mapped[str] = mapped_column(Text, nullable=False)
    file_type: Mapped[str | None] = mapped_column(Text, nullable=True)
    category: Mapped[str] = mapped_column(Text, nullable=False)
    uploaded_by: Mapped[uuid.UUID | None] = mapped_column(UUID(as_uuid=True), ForeignKey("users.id"), nullable=True)
    uploaded_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), nullable=False, default=_utcnow)
    status: Mapped[str] = mapped_column(Text, nullable=False)
    notes: Mapped[str | None] = mapped_column(Text, nullable=True)

    __table_args__ = (Index("idx_files_client_id", "client_id"),)


class AuditLog(Base):
    __tablename__ = "audit_logs"

    id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), primary_key=True, default=_new_uuid)
    user_id: Mapped[uuid.UUID | None] = mapped_column(UUID(as_uuid=True), ForeignKey("users.id"), nullable=True)
    client_id: Mapped[uuid.UUID | None] = mapped_column(UUID(as_uuid=True), ForeignKey("clients.id", ondelete="SET NULL"), nullable=True)
    action: Mapped[str] = mapped_column(Text, nullable=False)
    entity_type: Mapped[str] = mapped_column(Text, nullable=False)
    entity_id: Mapped[str] = mapped_column(Text, nullable=False)
    details: Mapped[dict[str, object]] = mapped_column(JSONB, nullable=False, default=dict)
    ip_address: Mapped[str | None] = mapped_column(Text, nullable=True)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), nullable=False, default=_utcnow)

    __table_args__ = (
        Index("idx_audit_logs_user_id", "user_id"),
        Index("idx_audit_logs_client_id", "client_id"),
        Index("idx_audit_logs_created_at", "created_at"),
    )


# ---------------------------------------------------------------------------
# Phase 1 migration follow-up: backup_runs table
# ---------------------------------------------------------------------------


class BackupRun(Base):
    __tablename__ = "backup_runs"

    id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), primary_key=True, default=_new_uuid)
    status: Mapped[str] = mapped_column(Text, nullable=False)
    triggered_by: Mapped[uuid.UUID | None] = mapped_column(UUID(as_uuid=True), ForeignKey("users.id"), nullable=True)
    database_backup: Mapped[str | None] = mapped_column(Text, nullable=True)
    files_backup: Mapped[str | None] = mapped_column(Text, nullable=True)
    documents_backup: Mapped[str | None] = mapped_column(Text, nullable=True)
    error_message: Mapped[str | None] = mapped_column(Text, nullable=True)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), nullable=False, default=_utcnow)

    __table_args__ = (Index("idx_backup_runs_created_at", "created_at"),)


# ---------------------------------------------------------------------------
# Phase 1 migration follow-up: restore_attempts table
# ---------------------------------------------------------------------------


class RestoreAttempt(Base):
    __tablename__ = "restore_attempts"

    id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), primary_key=True, default=_new_uuid)
    backup_run_id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), ForeignKey("backup_runs.id", ondelete="CASCADE"), nullable=False)
    status: Mapped[str] = mapped_column(Text, nullable=False)  # "dry_run_passed", "executed", "failed"
    mode: Mapped[str] = mapped_column(Text, nullable=False)  # "dry_run" or "execute"
    started_by: Mapped[uuid.UUID | None] = mapped_column(UUID(as_uuid=True), ForeignKey("users.id"), nullable=True)
    dump_file: Mapped[str | None] = mapped_column(Text, nullable=True)
    error_message: Mapped[str | None] = mapped_column(Text, nullable=True)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), nullable=False, default=_utcnow)

    __table_args__ = (Index("idx_restore_attempts_backup_run_id", "backup_run_id"),)