from __future__ import annotations

import json
import secrets
import tempfile
import uuid
import zipfile
from contextlib import asynccontextmanager
from datetime import UTC, datetime, timedelta
from pathlib import Path
from urllib.parse import quote
from uuid import UUID

from fastapi import FastAPI, HTTPException, Request
from fastapi.responses import FileResponse, JSONResponse, Response
from fastapi.middleware.cors import CORSMiddleware
from fastapi.middleware.trustedhost import TrustedHostMiddleware
from pydantic import BaseModel
from sqlalchemy import text
from starlette.background import BackgroundTask
from starlette.middleware.sessions import SessionMiddleware

import app.db as app_db
from app.config import get_settings
from app.db import get_engine, get_session
from app.document_generation import build_statement_quote_requests, generate_document
from app.domain.clients import ClientRecord, ClientStatus, build_client_storage_slug
from app.domain.users import UserRole, UserStatus
from app.html_sanitizer import sanitize_preview_html
from app.models import AuditLog
from app.models import BackupRun as BackupRunModel
from app.models import RestoreAttempt as RestoreAttemptModel
from app.models import Document as DocumentModel
from app.models import File as FileModel
from app.models import Session as SessionModel
from app.repositories.audit_logs import AuditLogRepository
from app.repositories.backups import BackupRepository
from app.repositories.clients import ClientRepository
from app.repositories.documents import DocumentRepository
from app.repositories.files import FileRepository
from app.repositories.sessions import SessionRepository
from app.repositories.users import UserRepository
from app.repositories.workflows import WorkflowRepository
from app.security import hash_password, is_session_expired, verify_password
from app.services.backups import create_backup_manifest
from app.services.restore import RestoreValidationError, dry_run_restore, execute_restore, load_manifest, validate_restore
from app.services.storage_reconciliation import build_storage_reconciliation_report, repair_storage_reconciliation_report
from app.services.storage import (
    DEFAULT_CLIENT_WORKFLOWS,
    DOCUMENT_BUCKET,
    FILE_BUCKET,
    ClientStorage,
    normalize_workflow_slug,
    safe_download_name,
    workflow_slug_for_document_type,
)

settings = get_settings()

RESTORE_APPROVAL_WINDOW_MINUTES = 10

app = FastAPI(title="Omega Document Creator API", version="0.1.0")
app.db = app_db

# ---------------------------------------------------------------------------
# Remote-access middleware (Phase 8)
# ---------------------------------------------------------------------------

# CORS: only applied when CORS_ORIGINS is configured
if settings.cors_origins:
    app.add_middleware(
        CORSMiddleware,
        allow_origins=list(settings.cors_origins),
        allow_credentials=True,
        allow_methods=["*"],
        allow_headers=["*"],
    )

# Session cookie security
app.add_middleware(
    SessionMiddleware,
    secret_key=settings.session_secret,
    https_only=settings.cookie_secure,
    same_site=settings.cookie_samesite,
)

# Proxy-aware handling (trusted proxy count for X-Forwarded-* headers)
if settings.trusted_proxy_count > 0:
    import uvicorn  # noqa: F811
# The FastAPI/Starlette approach uses server-level proxy configuration.
# For production behind a reverse proxy, set `--proxy-headers` on uvicorn
# or TRUSTED_PROXY_COUNT / FORWARDED_ALLOW_IPS via uvicorn config.

# ---------------------------------------------------------------------------
# CSRF middleware — enforce origin checks on state-changing requests
# ---------------------------------------------------------------------------


@app.middleware("http")
async def _csrf_middleware(request: Request, call_next: object) -> object:
    from fastapi.responses import JSONResponse
    try:
        _csrf_check(request)
    except HTTPException as exc:
        return JSONResponse(status_code=exc.status_code, content={"detail": exc.detail})
    return await call_next(request)


# ---------------------------------------------------------------------------
# Startup / shutdown helpers (wired via lifespan below)
# ---------------------------------------------------------------------------


def _startup_configuration_errors() -> list[str]:
    errors: list[str] = []
    local_default_urls = {
        "http://127.0.0.1:3007",
        "http://localhost:3007",
        "http://office-server.local",
    }

    if settings.environment == "development":
        return errors

    if settings.session_secret == "development-only":
        errors.append("SESSION_SECRET must be changed from the default for non-development environments.")

    if not settings.app_url or settings.app_url.rstrip("/") in local_default_urls:
        errors.append("APP_URL must be set to the deployed base URL for non-development environments.")

    if settings.remote_access_mode != "local_only":
        if not settings.app_url.startswith("https://"):
            errors.append("APP_URL must use https:// when REMOTE_ACCESS_MODE is not local_only.")
        if not settings.cookie_secure:
            errors.append("COOKIE_SECURE must be true when REMOTE_ACCESS_MODE is not local_only.")
        if not settings.cors_origins:
            errors.append("CORS_ORIGINS must be configured when REMOTE_ACCESS_MODE is not local_only.")
        if not settings.csrf_trusted_origins:
            errors.append("CSRF_TRUSTED_ORIGINS must be configured when REMOTE_ACCESS_MODE is not local_only.")

    return errors


def _startup_configuration_warnings() -> list[str]:
    warnings: list[str] = []

    if settings.environment != "development" and settings.trusted_proxy_count <= 0:
        warnings.append("TRUSTED_PROXY_COUNT is 0 - assuming no reverse proxy. Set it to match production proxy configuration.")

    return warnings


def _startup_db_check() -> None:
    """Verify database connectivity and start scheduler if enabled."""
    import logging

    logger = logging.getLogger("omega.startup")

    startup_errors = _startup_configuration_errors()
    startup_warnings = _startup_configuration_warnings()
    for warning in startup_warnings:
        logger.warning(warning)
    if startup_errors:
        for error in startup_errors:
            logger.error(error)
        raise RuntimeError("Unsafe startup configuration")

    # Check storage availability
    from pathlib import Path
    storage_root = Path(settings.file_storage_path)
    storage_backup = Path(settings.backup_path)
    if not storage_root.is_dir():
        logger.error("FILE_STORAGE_PATH %s does not exist or is not a directory.", storage_root)
    else:
        logger.info("File storage verified: %s", storage_root)
    if not storage_backup.is_dir():
        logger.error("BACKUP_PATH %s does not exist or is not a directory.", storage_backup)
    else:
        logger.info("Backup storage verified: %s", storage_backup)

    # Verify DB
    try:
        engine = get_engine()
        with engine.connect() as conn:
            conn.execute(text("SELECT 1"))
        logger.info("Database connection verified.")

        db = get_session()
        try:
            # Clean up expired sessions on startup
            from app.repositories.sessions import SessionRepository as StartupSessionRepo
            session_repo = StartupSessionRepo(db)
            removed = session_repo.cleanup_expired()
            if removed > 0:
                logger.info("Cleaned up %d expired session(s) on startup.", removed)

            repo = UserRepository(db)
            if repo.count() == 0:
                _bootstrap_first_admin(repo)
                logger.info("Bootstrapped first admin user from ADMIN_EMAIL and ADMIN_PASSWORD.")
            db.commit()
        finally:
            db.close()
    except Exception:
        logger.exception("Database connection failed during startup. Live routes require PostgreSQL and readiness checks will fail.")

    # Start backup scheduler if configured
    if settings.backup_schedule_enabled:
        from app.services.scheduler import start_scheduler

        start_scheduler(
            interval_minutes=settings.backup_schedule_interval_minutes,
            backup_path=settings.backup_path,
            file_storage_path=settings.file_storage_path,
            database_url=settings.database_url,
            pg_dump_bin=settings.pg_dump_bin,
        )


def _shutdown_scheduler() -> None:
    """Stop the backup scheduler when the app shuts down."""
    from app.services.scheduler import stop_scheduler

    stop_scheduler()


def _bootstrap_first_admin(repo: UserRepository) -> dict[str, str | bool | None]:
    user_model = repo.create(
        first_name="Omega",
        last_name="Admin",
        email=settings.admin_email,
        password_hash=hash_password(settings.admin_password),
        role=UserRole.ADMIN,
    )
    return repo.to_response(user_model)


def _restore_execution_supported() -> bool:
    return settings.environment == "development"


@asynccontextmanager
async def _app_lifespan(inner_app: FastAPI) -> None:  # type: ignore[valid-type]
    """Lifespan context manager replacing deprecated @app.on_event hooks."""
    _startup_db_check()
    yield
    _shutdown_scheduler()


app.router.lifespan_context = _app_lifespan


# ---------------------------------------------------------------------------
# Request models
# ---------------------------------------------------------------------------


class LoginRequest(BaseModel):
    email: str
    password: str


class ChangePasswordRequest(BaseModel):
    current_password: str
    new_password: str


class AdminUserCreateRequest(BaseModel):
    first_name: str
    last_name: str
    email: str
    password: str
    role: UserRole


class AdminUserUpdateRequest(BaseModel):
    first_name: str
    last_name: str
    role: UserRole
    status: UserStatus | None = None
    force_password_change: bool | None = None


class AdminUserResetPasswordRequest(BaseModel):
    password: str
    force_password_change: bool = True


class ClientCreateRequest(BaseModel):
    first_name: str
    surname: str
    email: str
    mobile_number: str
    marital_status: str
    date_of_birth: str
    title: str = ""
    town_city: str = ""
    county: str = ""
    home_address_line_1: str = ""
    home_address_line_2: str = ""
    work_phone: str = ""
    eircode: str = ""
    partner_name: str = ""
    partner_address: str = ""
    dependants: list[dict[str, str]] = []
    assigned_to: str | None = None


class ClientUpdateRequest(BaseModel):
    first_name: str | None = None
    surname: str | None = None
    email: str | None = None
    mobile_number: str | None = None
    marital_status: str | None = None
    date_of_birth: str | None = None
    title: str | None = None
    town_city: str | None = None
    county: str | None = None
    home_address_line_1: str | None = None
    home_address_line_2: str | None = None
    work_phone: str | None = None
    eircode: str | None = None
    partner_name: str | None = None
    partner_address: str | None = None
    dependants: list[dict[str, str]] | None = None
    assigned_to: str | None = None


class DocumentGenerationRequest(BaseModel):
    client_reference: str
    document_type: str
    template_id: str
    workflow_snapshot: dict[str, object]


class StatementQuoteRequest(BaseModel):
    client_reference: str
    workflow_snapshot: dict[str, object]


class RestoreConfirmRequest(BaseModel):
    confirm: str  # must be "yes-do-restore-now" to proceed
    confirmation_token: str | None = None


class AdminSettingsRequest(BaseModel):
    admin_email: str
    app_url: str
    backup_path: str
    file_storage_path: str
    remote_access_mode: str
    session_timeout_minutes: int
    ai_enabled: bool = False
    ai_model: str = "gemini-2.0-flash"
    ai_api_key: str | None = None
    clear_ai_api_key: bool = False


class AdminPathTestRequest(BaseModel):
    path: str


class StorageRepairRequest(BaseModel):
    execute: bool = False


# ---------------------------------------------------------------------------
# Auth helpers (DB-backed)
# ---------------------------------------------------------------------------


def _current_user(request: Request) -> dict[str, object]:
    session_id = request.session.get("session_id")
    if not session_id:
        raise HTTPException(status_code=401, detail="Authentication required")

    if is_session_expired(request.session.get("last_seen_at"), settings.session_timeout_minutes):
        request.session.clear()
        raise HTTPException(status_code=401, detail="Session expired")

    db = get_session()
    try:
        # Validate exact persisted session row
        session_repo = SessionRepository(db)
        session_row = session_repo.get_valid_by_id(session_id)
        if session_row is None:
            request.session.clear()
            raise HTTPException(status_code=401, detail="Session expired or invalidated")

        repo = UserRepository(db)
        user_model = repo.get_by_email(session_row.user_email)
        if not user_model:
            request.session.clear()
            raise HTTPException(status_code=401, detail="Authentication required")
        if user_model.status != UserStatus.ACTIVE.value:
            request.session.clear()
            raise HTTPException(status_code=403, detail="User account disabled")

        session_repo.extend_expiry(session_row, settings.session_timeout_minutes)
        request.session["last_seen_at"] = datetime.now(UTC).isoformat()
        db.commit()
        return repo.to_response(user_model)
    finally:
        db.close()


def _require_admin(request: Request) -> dict[str, str]:
    user = _current_user(request)
    if not _is_admin_user(user):
        raise HTTPException(status_code=403, detail="Admin access required")
    return user


def _normalized_email(value: str | None) -> str:
    return (value or "").strip().lower()


def _is_admin_user(user: dict[str, str]) -> bool:
    return user.get("role") == UserRole.ADMIN.value


def _resolve_record_access_policy(user: dict[str, str]) -> str:
    if _is_admin_user(user):
        return "admin"
    if user.get("role") == UserRole.MANAGER.value:
        return "global"
    return "own"


def _has_global_record_access(user: dict[str, str]) -> bool:
    return _resolve_record_access_policy(user) in {"admin", "global"}


def _can_create_client(user: dict[str, str]) -> bool:
    return bool(_normalized_email(user.get("email")))


def _resolve_user_email_by_id(db: object, user_id: uuid.UUID | None) -> str:
    if user_id is None:
        return ""
    user_repo = UserRepository(db)
    user_model = user_repo.get_by_id(user_id)
    return _normalized_email(user_model.email if user_model else "")


def _can_access_owner_email(user: dict[str, str], owner_email: str) -> bool:
    user_email = _normalized_email(user.get("email"))
    record_owner = _normalized_email(owner_email)
    policy = _resolve_record_access_policy(user)
    if policy in {"admin", "global"}:
        return True
    return bool(record_owner) and record_owner == user_email


def _can_access_client_emails(user: dict[str, str], *emails: str) -> bool:
    for email in emails:
        if _can_access_owner_email(user, email):
            return True
    return False


def _can_access_client_record(user: dict[str, str], db: object, client: ClientRecord | object) -> bool:
    if _has_global_record_access(user):
        return True
    owner_email = _resolve_user_email_by_id(db, getattr(client, "created_by", None))
    assigned_email = _resolve_user_email_by_id(db, getattr(client, "assigned_to", None))
    return _can_access_client_emails(user, owner_email, assigned_email)


def _require_client_access(
    user: dict[str, str],
    db: object,
    client_reference: str,
) -> object:
    client_repo = ClientRepository(db)
    client = client_repo.get_by_reference(client_reference)
    if not client:
        raise HTTPException(status_code=404, detail="Client not found")
    if not _can_access_client_record(user, db, client):
        raise HTTPException(status_code=403, detail="Access denied for this client")
    return client


def _resolve_storage_workflow_slug(*, workflow_hint: str | None = None, document_type: str | None = None) -> str:
    if workflow_hint and workflow_hint.strip():
        return normalize_workflow_slug(workflow_hint)
    return workflow_slug_for_document_type(document_type)


def _storage_year_for_client(client: object) -> int:
    client_reference = str(getattr(client, "client_reference", "") or "")
    parts = client_reference.split("-")
    if len(parts) >= 3 and parts[1].isdigit():
        return int(parts[1])
    created_at = getattr(client, "created_at", None)
    created_year = getattr(created_at, "year", None)
    if created_year is not None:
        return int(created_year)
    return datetime.now(UTC).year


def _ensure_client_storage_contract(client: object) -> None:
    ClientStorage(settings.file_storage_path).ensure_client_year_contract(
        _build_client_slug_from_model(client),
        _storage_year_for_client(client),
        workflow_slugs=DEFAULT_CLIENT_WORKFLOWS,
    )


def _attachment_headers(filename: str) -> dict[str, str]:
    safe_name = safe_download_name(filename)
    encoded_name = quote(safe_name, safe="")
    return {"Content-Disposition": f"attachment; filename*=UTF-8''{encoded_name}"}


def _parse_uuid_or_404(raw_value: str, *, detail: str) -> UUID:
    try:
        return UUID(raw_value)
    except ValueError as exc:
        raise HTTPException(status_code=404, detail=detail) from exc


def _issue_restore_approval(request: Request, backup_id: str) -> dict[str, str]:
    expires_at = datetime.now(UTC) + timedelta(minutes=RESTORE_APPROVAL_WINDOW_MINUTES)
    token = secrets.token_urlsafe(24)
    approvals = request.session.get("restore_approvals")
    if not isinstance(approvals, dict):
        approvals = {}
    approvals[backup_id] = {"token": token, "expires_at": expires_at.isoformat()}
    request.session["restore_approvals"] = approvals
    return {"confirmation_token": token, "confirmation_expires_at": expires_at.isoformat()}


def _consume_restore_approval(request: Request, backup_id: str, confirmation_token: str | None) -> bool:
    if not confirmation_token:
        return False
    approvals = request.session.get("restore_approvals")
    if not isinstance(approvals, dict):
        return False
    approval = approvals.get(backup_id)
    if not isinstance(approval, dict):
        return False
    token = str(approval.get("token") or "")
    expires_at = str(approval.get("expires_at") or "")
    try:
        expires_at_dt = datetime.fromisoformat(expires_at)
    except ValueError:
        expires_at_dt = None
    valid = token == confirmation_token and expires_at_dt is not None and expires_at_dt > datetime.now(UTC)
    approvals.pop(backup_id, None)
    request.session["restore_approvals"] = approvals
    return valid


# ---------------------------------------------------------------------------
# CSRF protection for state-changing routes (same-origin SPA)
# ---------------------------------------------------------------------------

_CSRF_SAFE_METHODS = {"GET", "HEAD", "OPTIONS"}


def _csrf_check(request: Request) -> None:
    """Reject cross-origin state-changing requests for cookie-session endpoints.

    By default only APP_URL is trusted.  CSRF_TRUSTED_ORIGINS allows
    additional origins (e.g. a Vite dev-server proxy on a different port
    during local development).  The frontend SPA normally runs on the same
    origin so its requests carry an Origin header matching APP_URL.
    Browsers strip the Origin header on same-origin redirects, so we also
    accept a missing Origin when the Referer header is same-origin.
    """
    if request.method in _CSRF_SAFE_METHODS:
        return

    origin = request.headers.get("origin")
    referer = request.headers.get("referer")

    trusted_origins: list[str] = [settings.app_url.rstrip("/")]
    if settings.csrf_trusted_origins:
        trusted_origins.extend(settings.csrf_trusted_origins)

    def _is_trusted_origin(value: str) -> bool:
        v = value.rstrip("/")
        return any(v == t or v.startswith(t + "/") or v.startswith(t + ":") for t in trusted_origins)

    if origin is not None:
        if not _is_trusted_origin(origin):
            raise HTTPException(status_code=403, detail="Cross-origin request blocked")
        return

    # No Origin header – check Referer for same-origin fallback
    if referer is not None and _is_trusted_origin(referer):
        return

    # Neither header present and method is state-changing – block
    if origin is None and referer is None:
        raise HTTPException(status_code=403, detail="Missing origin header")


# ---------------------------------------------------------------------------
# Audit helper
# ---------------------------------------------------------------------------


def _log_audit(request: Request, *, db: object, action: str, entity_type: str, entity_id: str, details: dict[str, object] | None = None, client_id: str | None = None, user_email: str | None = None) -> None:
    """Persist an audit log entry in PostgreSQL."""
    from app.models import AuditLog as AuditLogModel

    user_repo = UserRepository(db)
    audit_repo = AuditLogRepository(db)

    resolved_email = user_email or request.session.get("user_email")
    user_model = user_repo.get_by_email(resolved_email) if resolved_email else None

    entry = AuditLogModel(
        user_id=user_model.id if user_model else None,
        client_id=client_id,
        action=action,
        entity_type=entity_type,
        entity_id=entity_id,
        details=details or {},
        ip_address=request.client.host if request.client else None,
    )
    audit_repo.add(entry)


# ---------------------------------------------------------------------------
# Health
# ---------------------------------------------------------------------------


def _check_db_connectivity() -> dict[str, object]:
    """Return DB connectivity status for readiness checks."""
    try:
        engine = get_engine()
        with engine.connect() as conn:
            conn.execute(text("SELECT 1"))
        return {"database": "available"}
    except Exception:
        return {"database": "unavailable"}


def _check_storage_availability() -> dict[str, object]:
    """Return storage availability status for readiness checks."""
    result: dict[str, object] = {}
    storage_root = Path(settings.file_storage_path)
    backup_root = Path(settings.backup_path)
    result["file_storage"] = "available" if storage_root.is_dir() else "unavailable"
    result["backup_storage"] = "available" if backup_root.is_dir() else "unavailable"
    return result


@app.get("/health")
def healthcheck() -> dict[str, object]:
    return {
        "status": "ok",
        "app_url": settings.app_url,
        "environment": settings.environment,
        "remote_access_mode": settings.remote_access_mode,
    }


@app.get("/ready")
def readiness() -> JSONResponse:
    db_status = _check_db_connectivity()
    storage_status = _check_storage_availability()
    db_available = db_status.get("database") == "available"
    storage_available = (
        storage_status.get("file_storage") != "unavailable"
        and storage_status.get("backup_storage") != "unavailable"
    )
    ready = db_available and storage_available
    return JSONResponse(
        status_code=200 if ready else 503,
        content={
            "ready": ready,
            "checks": {
                **db_status,
                **storage_status,
            },
        },
    )


# ---------------------------------------------------------------------------
# Auth routes (DB-backed users; cookie-session login)
# ---------------------------------------------------------------------------


# Lightweight in-memory failed-login rate limiter (per IP, 5 failures / minute)
_LOGIN_RATE_WINDOW: dict[str, tuple[float, int]] = {}


def _check_login_rate(client_ip: str) -> None:
    """Raise 429 if the failed-login rate limit has been exceeded."""
    now = datetime.now(UTC).timestamp()
    window_start, count = _LOGIN_RATE_WINDOW.get(client_ip, (0.0, 0))
    if now - window_start > 60:
        _LOGIN_RATE_WINDOW.pop(client_ip, None)
        return
    if count >= 5:
        raise HTTPException(status_code=429, detail="Too many login attempts. Try again later.")


def _record_login_failure(client_ip: str) -> None:
    now = datetime.now(UTC).timestamp()
    window_start, count = _LOGIN_RATE_WINDOW.get(client_ip, (now, 0))
    if now - window_start > 60:
        window_start, count = now, 0
    _LOGIN_RATE_WINDOW[client_ip] = (window_start, count + 1)


def _clear_login_failures(client_ip: str) -> None:
    _LOGIN_RATE_WINDOW.pop(client_ip, None)


@app.post("/auth/login")
def login(payload: LoginRequest, request: Request) -> dict[str, dict[str, object]]:
    client_ip = request.client.host if request.client else "unknown"
    _check_login_rate(client_ip)
    db = get_session()
    try:
        user_repo = UserRepository(db)
        user_model = user_repo.get_by_email(payload.email)

        if not user_model or not verify_password(payload.password, user_model.password_hash):
            _record_login_failure(client_ip)
            # Log failed attempt
            try:
                _log_audit(
                    request, db=db,
                    action="login_failed",
                    entity_type="auth",
                    entity_id=payload.email,
                    details={"reason": "invalid_credentials", "ip": client_ip},
                    user_email=payload.email,
                )
                db.commit()
            except Exception:
                db.rollback()
            raise HTTPException(status_code=401, detail="Invalid credentials")

        if user_model.status != UserStatus.ACTIVE.value:
            _record_login_failure(client_ip)
            try:
                _log_audit(
                    request, db=db,
                    action="login_disabled_user",
                    entity_type="auth",
                    entity_id=payload.email,
                    details={"reason": "user_disabled", "ip": client_ip},
                    user_email=payload.email,
                )
                db.commit()
            except Exception:
                db.rollback()
            raise HTTPException(status_code=403, detail="User account disabled")

        _clear_login_failures(client_ip)
        user_repo.record_login(user_model)

        # Persist a server-side session row and store its ID in the cookie
        session_repo = SessionRepository(db)
        session_row = session_repo.create(user_model.email, settings.session_timeout_minutes)
        db.commit()

        request.session["session_id"] = str(session_row.id)
        request.session["user_email"] = user_model.email
        request.session["last_seen_at"] = datetime.now(UTC).isoformat()

        _log_audit(
            request, db=db,
            action="login_success",
            entity_type="auth",
            entity_id=user_model.email,
            details={"ip": client_ip},
            user_email=user_model.email,
        )
        db.commit()

        return {"user": user_repo.to_response(user_model)}
    finally:
        db.close()


@app.post("/auth/logout")
def logout(request: Request) -> dict[str, str]:
    session_id = request.session.get("session_id")
    request.session.clear()
    if session_id:
        db = get_session()
        try:
            session_repo = SessionRepository(db)
            session_repo.delete_by_id(session_id)
            db.commit()
        finally:
            db.close()
    return {"status": "logged_out"}


@app.get("/auth/me")
def me(request: Request) -> dict[str, dict[str, object]]:
    return {"user": _current_user(request)}


@app.post("/auth/change-password")
def change_password(payload: ChangePasswordRequest, request: Request) -> dict[str, dict[str, object]]:
    user = _current_user(request)
    db = get_session()
    try:
        user_repo = UserRepository(db)
        session_repo = SessionRepository(db)
        user_model = user_repo.get_by_email(str(user.get("email")))
        if user_model is None:
            request.session.clear()
            raise HTTPException(status_code=401, detail="Authentication required")
        if not verify_password(payload.current_password, user_model.password_hash):
            raise HTTPException(status_code=401, detail="Current password is incorrect")

        user_repo.reset_password_by_id(
            user_model.id,
            password_hash=hash_password(payload.new_password),
            force_password_change=False,
        )
        session_repo.delete_by_user_email(user_model.email)
        session_row = session_repo.create(user_model.email, settings.session_timeout_minutes)
        request.session["session_id"] = str(session_row.id)
        request.session["user_email"] = user_model.email
        request.session["last_seen_at"] = datetime.now(UTC).isoformat()

        _log_audit(
            request, db=db,
            action="password_changed",
            entity_type="auth",
            entity_id=user_model.email,
            details={"force_password_change_cleared": True},
            user_email=user_model.email,
        )
        db.commit()
        refreshed_user = user_repo.get_by_id(user_model.id)
        if refreshed_user is None:
            raise HTTPException(status_code=401, detail="Authentication required")
        return {"user": user_repo.to_response(refreshed_user)}
    finally:
        db.close()


@app.get("/users/assignable")
def assignable_users(request: Request) -> dict[str, list[dict[str, object]]]:
    _current_user(request)
    db = get_session()
    try:
        repo = UserRepository(db)
        items = [
            repo.to_response(user_model)
            for user_model in repo.list_all()
            if user_model.status == UserStatus.ACTIVE.value
        ]
        db.commit()
        return {"items": items}
    finally:
        db.close()


# ---------------------------------------------------------------------------
# Client routes (DB-backed)
# ---------------------------------------------------------------------------


@app.get("/clients")
def clients(request: Request) -> dict[str, list[dict[str, object]]]:
    user = _current_user(request)
    db = get_session()
    try:
        repo = ClientRepository(db)
        all_clients = repo.list_all()
        for client in all_clients:
            _ensure_client_storage_contract(client)
        items = [repo._to_list_item(c) for c in all_clients if _can_access_client_record(user, db, c)]
        db.commit()
        return {"items": items}
    finally:
        db.close()


@app.post("/clients", status_code=201)
def create_client_record(payload: ClientCreateRequest, request: Request) -> dict[str, dict[str, object]]:
    user = _current_user(request)
    if not _can_create_client(user):
        raise HTTPException(status_code=403, detail="Access denied for creating clients")
    db = get_session()
    try:
        repo = ClientRepository(db)
        item = repo.create(
            first_name=payload.first_name,
            surname=payload.surname,
            email=payload.email,
            mobile_number=payload.mobile_number,
            marital_status=payload.marital_status,
            date_of_birth=payload.date_of_birth,
            title=payload.title,
            town_city=payload.town_city,
            county=payload.county,
            home_address_line_1=payload.home_address_line_1,
            home_address_line_2=payload.home_address_line_2,
            work_phone=payload.work_phone,
            eircode=payload.eircode,
            partner_name=payload.partner_name,
            partner_address=payload.partner_address,
            dependants=payload.dependants,
            created_by_email=user["email"],
            assigned_to_email=payload.assigned_to,
        )
        client_ref = item.get("client_reference", "")
        client_model = repo.get_by_reference(client_ref) if client_ref else None
        if client_model is not None:
            _ensure_client_storage_contract(client_model)
        _log_audit(
            request, db=db,
            action="client_created",
            entity_type="client",
            entity_id=client_ref,
            client_id=client_model.id if client_model else None,
            details={"full_name": f"{payload.first_name} {payload.surname}"},
        )
        db.commit()
        return {"item": item}
    finally:
        db.close()


@app.get("/clients/{client_reference}")
def client_detail(client_reference: str, request: Request) -> dict[str, dict[str, object]]:
    user = _current_user(request)
    db = get_session()
    try:
        repo = ClientRepository(db)
        client = _require_client_access(user, db, client_reference)
        _ensure_client_storage_contract(client)
        item = repo._to_detail_response(client)
        db.commit()
        return {"item": item}
    finally:
        db.close()


@app.patch("/clients/{client_reference}")
def update_client_record(
    client_reference: str, payload: ClientUpdateRequest, request: Request
) -> dict[str, dict[str, object]]:
    user = _current_user(request)
    db = get_session()
    try:
        repo = ClientRepository(db)
        _require_client_access(user, db, client_reference)
        updates = {key: value for key, value in payload.model_dump().items() if value is not None}
        item = repo.update(client_reference, updates, updated_by_email=user["email"])
        if not item:
            raise HTTPException(status_code=404, detail="Client not found")
        client_model = repo.get_by_reference(client_reference)
        if client_model is not None:
            _ensure_client_storage_contract(client_model)
        _log_audit(
            request, db=db,
            action="client_updated",
            entity_type="client",
            entity_id=client_reference,
            details={"updated_fields": list(updates.keys())},
        )
        db.commit()
        return {"item": item}
    finally:
        db.close()


@app.patch("/clients/{client_reference}/archive")
def archive_client_record(client_reference: str, request: Request) -> dict[str, dict[str, object]]:
    user = _require_admin(request)
    db = get_session()
    try:
        repo = ClientRepository(db)
        item = repo.archive(client_reference, updated_by_email=user["email"])
        if not item:
            raise HTTPException(status_code=404, detail="Client not found")
        _log_audit(
            request, db=db,
            action="client_archived",
            entity_type="client",
            entity_id=client_reference,
        )
        db.commit()
        return {"item": item}
    finally:
        db.close()


# ---------------------------------------------------------------------------
# Workflow routes (Phase 3 DB-backed)
# ---------------------------------------------------------------------------


@app.get("/clients/{client_reference}/workflow")
def get_workflow(client_reference: str, request: Request) -> dict[str, dict[str, object]]:
    user = _current_user(request)
    db = get_session()
    try:
        client = _require_client_access(user, db, client_reference)
        workflow_repo = WorkflowRepository(db)
        fields = workflow_repo.get(client.id)
        db.commit()
        return {"item": fields}
    finally:
        db.close()


@app.put("/clients/{client_reference}/workflow")
def save_workflow(client_reference: str, payload: dict[str, object], request: Request) -> dict[str, dict[str, str]]:
    user = _current_user(request)
    db = get_session()
    try:
        client = _require_client_access(user, db, client_reference)
        workflow_repo = WorkflowRepository(db)
        try:
            workflow_repo.save(client.id, payload)
            _log_audit(
                request, db=db,
                action="workflow_saved",
                entity_type="workflow",
                entity_id=client_reference,
                client_id=client.id,
            )
            db.commit()
        except Exception:
            db.rollback()
            raise HTTPException(status_code=500, detail="Workflow save failed")
        return {"item": {"client_reference": client_reference, "saved": "ok"}}
    finally:
        db.close()


# ---------------------------------------------------------------------------
# Document routes (Phase 5 DB-backed)
# ---------------------------------------------------------------------------


def _document_to_response(doc: DocumentModel) -> dict[str, object]:
    return {
        "id": str(doc.id),
        "client_id": str(doc.client_id),
        "document_type": doc.document_type,
        "document_name": doc.document_name,
        "docx_file_path": doc.docx_file_path,
        "pdf_file_path": doc.pdf_file_path,
        "generated_by": str(doc.generated_by) if doc.generated_by else None,
        "generated_at": doc.generated_at.isoformat() if doc.generated_at else None,
        "version": doc.version,
        "status": doc.status,
        "preview_title": doc.preview_title,
        "preview_html": doc.preview_html,
    }


@app.post("/documents/generate")
def generate_document_record(
    payload: DocumentGenerationRequest, request: Request
) -> dict[str, dict[str, object] | list[dict[str, str]]]:
    current_user = _current_user(request)
    db = get_session()
    try:
        client = _require_client_access(current_user, db, payload.client_reference)
        item = generate_document(
            settings=settings,
            client_reference=payload.client_reference,
            document_type=payload.document_type,
            template_id=payload.template_id,
            workflow_snapshot=payload.workflow_snapshot,
            generated_by_email=str(current_user.get("email") or ""),
        )
        _log_audit(
            request, db=db,
            action="document_generated",
            entity_type="document",
            entity_id=str(item.get("document_id", payload.client_reference)),
            client_id=client.id if client else None,
            details={"document_type": payload.document_type, "template_id": payload.template_id},
        )
        db.commit()
        return {"item": item}
    finally:
        db.close()


@app.post("/documents/statement-quote")
def generate_statement_quote(
    payload: StatementQuoteRequest, request: Request
) -> dict[str, dict[str, object] | list[dict[str, object]]]:
    current_user = _current_user(request)
    db = get_session()
    try:
        client = _require_client_access(current_user, db, payload.client_reference)
        integration_requests = build_statement_quote_requests(
            settings=settings,
            workflow_snapshot=payload.workflow_snapshot,
        )
        _log_audit(
            request, db=db,
            action="statement_quote_generated",
            entity_type="document",
            entity_id=payload.client_reference,
            client_id=client.id if client else None,
            details={"document_type": "Statement of Suitability"},
        )
        db.commit()
        return {"item": {"integration_requests": integration_requests}}
    finally:
        db.close()


@app.get("/clients/{client_reference}/documents")
def list_documents(client_reference: str, request: Request) -> dict[str, list[dict[str, object]]]:
    user = _current_user(request)
    db = get_session()
    try:
        client = _require_client_access(user, db, client_reference)
        doc_repo = DocumentRepository(db)
        docs = doc_repo.list_by_client(client.id)
        items = [_document_to_response(d) for d in docs]
        db.commit()
        return {"items": items}
    finally:
        db.close()


@app.post("/clients/{client_reference}/documents", status_code=201)
async def create_document_record(client_reference: str, request: Request) -> dict[str, dict[str, object]]:
    current_user = _current_user(request)
    db = get_session()
    stored_artifact_relative_path: str | None = None
    try:
        client = _require_client_access(current_user, db, client_reference)
        doc_repo = DocumentRepository(db)
        user_repo = UserRepository(db)
        user_model = user_repo.get_by_email(current_user["email"])

        content_type = request.headers.get("content-type", "")
        uploaded = None
        if content_type.startswith("multipart/form-data"):
            form = await request.form()
            payload = {
                "document_id": form.get("document_id"),
                "document_type": form.get("document_type"),
                "document_name": form.get("document_name"),
                "version": form.get("version"),
                "status": form.get("status"),
                "preview_title": form.get("preview_title"),
                "preview_html": form.get("preview_html"),
                "workflow": form.get("workflow"),
            }
            uploaded = form.get("artifact")
        else:
            raw_payload = await request.json()
            payload = raw_payload if isinstance(raw_payload, dict) else {}

        doc_type = str(payload.get("document_type", ""))
        if not doc_type:
            raise HTTPException(status_code=400, detail="document_type is required")
        doc_name = str(payload.get("document_name", f"{doc_type} - {client_reference}"))
        preview_title = str(payload.get("preview_title", ""))
        preview_html = sanitize_preview_html(str(payload.get("preview_html", "")))
        document_id = str(payload.get("document_id") or "").strip()
        if document_id:
            document_model = doc_repo.get_by_id(document_id)
            if document_model is None or str(document_model.client_id) != str(client.id):
                raise HTTPException(status_code=404, detail="Document not found")
            doc_repo.update_metadata(
                document_id,
                document_type=doc_type,
                document_name=doc_name,
                status=str(payload.get("status", "draft")),
                version=str(payload.get("version", "1")),
                preview_title=preview_title if preview_title else None,
                preview_html=preview_html if preview_html else None,
                generated_by=user_model.id if user_model else None,
            )
        else:
            document_model = DocumentModel(
                client_id=client.id,
                document_type=doc_type,
                document_name=doc_name,
                status=str(payload.get("status", "draft")),
                version=str(payload.get("version", "1")),
                preview_title=preview_title if preview_title else None,
                preview_html=preview_html if preview_html else None,
                generated_by=user_model.id if user_model else None,
            )
            doc_repo.add(document_model)
            doc_repo.flush()

        if uploaded is not None and hasattr(uploaded, "filename") and getattr(uploaded, "filename", ""):
            artifact_name = str(uploaded.filename)
            storage = ClientStorage(settings.file_storage_path)
            slug = _build_client_slug_from_model(client)
            workflow_slug = _resolve_storage_workflow_slug(
                workflow_hint=str(payload.get("workflow") or ""),
                document_type=doc_type,
            )
            upload_source = getattr(uploaded, "file", None)
            if upload_source is None:
                raise HTTPException(status_code=400, detail="Invalid artifact upload")
            try:
                filepath = storage.save_upload(
                    slug,
                    artifact_name,
                    upload_source,
                    max_size_bytes=settings.max_upload_size_bytes,
                    workflow_slug=workflow_slug,
                    bucket=DOCUMENT_BUCKET,
                )
            except ValueError as exc:
                detail = str(exc)
                status_code = 413 if "maximum upload size" in detail else 400
                raise HTTPException(status_code=status_code, detail=detail) from exc
            stored_artifact_relative_path = str(filepath.relative_to(settings.file_storage_path))
            suffix = filepath.suffix.lower()
            doc_repo.update_artifact_paths(
                document_model.id,
                docx_path=stored_artifact_relative_path if suffix == ".docx" else None,
                pdf_path=stored_artifact_relative_path if suffix == ".pdf" else None,
            )

        _log_audit(
            request, db=db,
            action="document_artifact_uploaded",
            entity_type="document",
            entity_id=str(document_model.id),
            client_id=client.id,
            details={"document_type": doc_type, "document_name": doc_name},
        )
        db.commit()
        return {"item": _document_to_response(document_model)}
    except Exception:
        db.rollback()
        if stored_artifact_relative_path:
            ClientStorage(settings.file_storage_path).delete_relative_file(stored_artifact_relative_path)
        raise
    finally:
        db.close()


@app.get("/clients/{client_reference}/documents/{document_id}/download")
def download_document(client_reference: str, document_id: str, request: Request) -> object:
    user = _current_user(request)
    db = get_session()
    try:
        client = _require_client_access(user, db, client_reference)
        doc_repo = DocumentRepository(db)
        resolved_document_id = _parse_uuid_or_404(document_id, detail="Document not found")
        doc = doc_repo.get_by_id(str(resolved_document_id))
        if not doc or doc.client_id != client.id:
            raise HTTPException(status_code=404, detail="Document not found")

        storage = ClientStorage(settings.file_storage_path)

        # Try PDF first, then DOCX
        artifact_path = doc.pdf_file_path or doc.docx_file_path
        if not artifact_path:
            raise HTTPException(status_code=404, detail="No artifact available for this document")

        resolved_path = storage.resolve_relative_file(artifact_path)
        if resolved_path is None:
            raise HTTPException(status_code=404, detail="Document artifact not found on disk")

        # Determine filename and MIME type
        if artifact_path.endswith(".pdf"):
            media_type = "application/pdf"
            filename = f"{doc.document_name}.pdf"
        elif artifact_path.endswith(".docx"):
            media_type = "application/vnd.openxmlformats-officedocument.wordprocessingml.document"
            filename = f"{doc.document_name}.docx"
        else:
            media_type = "application/octet-stream"
            filename = doc.document_name

        _log_audit(
            request, db=db,
            action="document_downloaded",
            entity_type="document",
            entity_id=str(resolved_document_id),
            client_id=client.id,
            details={"document_name": doc.document_name},
        )
        db.commit()
        return FileResponse(
            path=resolved_path,
            media_type=media_type,
            filename=None,
            headers=_attachment_headers(filename),
        )
    finally:
        db.close()


@app.get("/clients/{client_reference}/documents/pack")
def download_document_pack(client_reference: str, request: Request) -> object:
    """Return a ZIP containing generated document artifacts for a client."""
    user = _current_user(request)
    db = get_session()
    try:
        client = _require_client_access(user, db, client_reference)
        doc_repo = DocumentRepository(db)
        docs = doc_repo.list_by_client(client.id)
        selected_document_ids = {
            document_id
            for document_id in request.query_params.getlist("document_id")
            if document_id
        }
        if selected_document_ids:
            docs = [doc for doc in docs if str(doc.id) in selected_document_ids]

        storage = ClientStorage(settings.file_storage_path)
        zip_temp = tempfile.NamedTemporaryFile(prefix="omega-document-pack-", suffix=".zip", delete=False)
        zip_temp.close()
        zip_path = Path(zip_temp.name)
        packed = 0

        with zipfile.ZipFile(zip_path, "w", zipfile.ZIP_DEFLATED) as zf:
            seen: set[str] = set()
            for doc in docs:
                for artifact_path in (doc.pdf_file_path, doc.docx_file_path):
                    if not artifact_path:
                        continue
                    resolved_path = storage.resolve_relative_file(artifact_path)
                    if resolved_path is None:
                        continue
                    # Determine filename inside ZIP, avoiding collisions
                    if artifact_path.endswith(".pdf"):
                        base = f"{doc.document_name}.pdf"
                    elif artifact_path.endswith(".docx"):
                        base = f"{doc.document_name}.docx"
                    else:
                        base = doc.document_name
                    zip_name = base
                    counter = 1
                    while zip_name in seen:
                        stem, _, ext = base.rpartition(".")
                        zip_name = f"{stem}_{counter}.{ext}" if ext else f"{base}_{counter}"
                        counter += 1
                    seen.add(zip_name)
                    zf.write(resolved_path, arcname=safe_download_name(zip_name, "document"))
                    packed += 1

        if packed == 0:
            raise HTTPException(status_code=404, detail="No packable document artifacts found")

        _log_audit(
            request, db=db,
            action="document_pack_downloaded",
            entity_type="document_pack",
            entity_id=client_reference,
            client_id=client.id,
            details={"packed_count": packed},
        )
        db.commit()

        zip_filename = f"{client_reference.replace(' ', '_')}_documents.zip"
        return FileResponse(
            path=zip_path,
            media_type="application/zip",
            filename=None,
            headers=_attachment_headers(zip_filename),
            background=BackgroundTask(lambda: zip_path.unlink(missing_ok=True)),
        )
    finally:
        db.close()


@app.delete("/clients/{client_reference}/documents/{document_id}")
def delete_document(client_reference: str, document_id: str, request: Request) -> dict[str, object]:
    """Delete a generated document — DB row and all disk artifacts."""
    user = _current_user(request)
    db = get_session()
    try:
        client = _require_client_access(user, db, client_reference)

        doc_repo = DocumentRepository(db)
        resolved_document_id = _parse_uuid_or_404(document_id, detail="Document not found")
        doc = doc_repo.get_by_id(str(resolved_document_id))
        if not doc or doc.client_id != client.id:
            raise HTTPException(status_code=404, detail="Document not found")

        artifact_paths = [path for path in (doc.pdf_file_path, doc.docx_file_path) if path]
        document_name = doc.document_name
        deleted = doc_repo.delete(str(resolved_document_id))
        if deleted is None:
            raise HTTPException(status_code=404, detail="Document not found")

        _log_audit(
            request, db=db,
            action="document_deleted",
            entity_type="document",
            entity_id=str(resolved_document_id),
            client_id=client.id,
            details={"document_name": document_name},
        )
        db.commit()
        _delete_storage_artifacts(artifact_paths)
        return {"deleted": True, "document_id": str(resolved_document_id)}
    finally:
        db.close()


# ---------------------------------------------------------------------------
# Admin routes (DB-backed for users; store.py for audit/backup/security)
# ---------------------------------------------------------------------------


@app.get("/admin/users")
def admin_users(request: Request) -> dict[str, list[dict[str, object]]]:
    _require_admin(request)
    db = get_session()
    try:
        repo = UserRepository(db)
        items = [repo.to_response(u) for u in repo.list_all()]
        db.commit()
        return {"items": items}
    finally:
        db.close()


@app.post("/admin/users", status_code=201)
def admin_create_user(payload: AdminUserCreateRequest, request: Request) -> dict[str, dict[str, object]]:
    _require_admin(request)
    db = get_session()
    try:
        repo = UserRepository(db)
        if repo.get_by_email(payload.email):
            raise HTTPException(status_code=409, detail="Email already exists")

        user_model = repo.create(
            first_name=payload.first_name,
            last_name=payload.last_name,
            email=payload.email,
            password_hash=hash_password(payload.password),
            role=payload.role,
        )

        _log_audit(
            request, db=db,
            action="user_created",
            entity_type="user",
            entity_id=str(user_model.id),
            details={"email": payload.email, "role": payload.role.value},
        )
        db.commit()
        return {"item": repo.to_response(user_model)}
    finally:
        db.close()


@app.patch("/admin/users/{user_id}")
def admin_update_user(
    user_id: str, payload: AdminUserUpdateRequest, request: Request
) -> dict[str, dict[str, object]]:
    _require_admin(request)
    db = get_session()
    try:
        repo = UserRepository(db)
        try:
            resolved_user_id = UUID(user_id)
        except ValueError as exc:
            raise HTTPException(status_code=404, detail="User not found") from exc
        user_model = repo.get_by_id(resolved_user_id)
        if not user_model:
            raise HTTPException(status_code=404, detail="User not found")

        old_role = user_model.role.value if hasattr(user_model.role, "value") else str(user_model.role)
        old_status = user_model.status.value if hasattr(user_model.status, "value") else str(user_model.status)
        old_name = f"{user_model.first_name} {user_model.last_name}"
        result = repo.update_by_id(
            resolved_user_id,
            first_name=payload.first_name,
            last_name=payload.last_name,
            role=payload.role,
            status=payload.status,
            force_password_change=payload.force_password_change,
        )
        if not result:
            raise HTTPException(status_code=404, detail="User not found")

        _log_audit(
            request, db=db,
            action="user_updated",
            entity_type="user",
            entity_id=user_id,
            details={
                "old_role": old_role,
                "new_role": payload.role.value,
                "old_status": old_status,
                "new_status": payload.status.value if payload.status else old_status,
                "old_name": old_name,
                "new_name": f"{payload.first_name} {payload.last_name}",
                "force_password_change": payload.force_password_change,
            },
        )
        db.commit()
        return {"item": result}
    finally:
        db.close()


@app.post("/admin/users/{user_id}/reset-password")
def admin_reset_user_password(
    user_id: str,
    payload: AdminUserResetPasswordRequest,
    request: Request,
) -> dict[str, dict[str, object]]:
    _require_admin(request)
    db = get_session()
    try:
        repo = UserRepository(db)
        try:
            resolved_user_id = UUID(user_id)
        except ValueError as exc:
            raise HTTPException(status_code=404, detail="User not found") from exc
        result = repo.reset_password_by_id(
            resolved_user_id,
            password_hash=hash_password(payload.password),
            force_password_change=payload.force_password_change,
        )
        if not result:
            raise HTTPException(status_code=404, detail="User not found")
        session_repo = SessionRepository(db)
        invalidated_sessions = session_repo.delete_by_user_email(str(result["email"]))
        _log_audit(
            request, db=db,
            action="user_password_reset",
            entity_type="user",
            entity_id=user_id,
            details={
                "force_password_change": payload.force_password_change,
                "invalidated_session_count": invalidated_sessions,
            },
        )
        db.commit()
        return {"item": result}
    finally:
        db.close()


# ---------------------------------------------------------------------------
# Admin backup routes
# ---------------------------------------------------------------------------


@app.get("/admin/backups")
def admin_list_backups(request: Request) -> dict[str, list[dict[str, object]]]:
    _require_admin(request)
    db = get_session()
    try:
        repo = BackupRepository(db)
        runs = repo.list_recent(limit=100)
        items = [_backup_run_response(r) for r in runs]
        db.commit()
        return {"items": items}
    finally:
        db.close()


@app.post("/admin/backups", status_code=201)
def admin_create_backup(request: Request) -> dict[str, dict[str, object]]:
    user = _require_admin(request)
    db = get_session()
    try:
        repo = BackupRepository(db)

        manifest = create_backup_manifest(
            backup_path=settings.backup_path,
            file_storage_path=settings.file_storage_path,
            triggered_by_email=user["email"],
            database_url=settings.database_url,
            pg_dump_bin=settings.pg_dump_bin,
        )

        user_repo = UserRepository(db)
        user_model = user_repo.get_by_email(user["email"])

        run = BackupRunModel(
            status=manifest["status"],
            triggered_by=user_model.id if user_model else None,
            database_backup=manifest.get("database_backup"),
            files_backup=manifest.get("files_backup"),
            documents_backup=manifest.get("documents_backup"),
            error_message=manifest.get("error_message"),
        )
        repo.add(run)

        _log_audit(
            request, db=db,
            action="backup_created",
            entity_type="backup_run",
            entity_id=str(run.id),
            details={"status": manifest["status"]},
        )
        db.commit()
        return {"item": _backup_run_response(run)}
    finally:
        db.close()


@app.post("/admin/backups/{backup_id}/dry-run-restore")
def admin_dry_run_restore(backup_id: str, request: Request) -> dict[str, object]:
    """Perform a dry-run restore check (pg_restore --list) on a backup's dump file.

    Admin-only. Does NOT execute any destructive restore. Returns
    success if the dump artifact exists and is readable by pg_restore.

    Persists a RestoreAttempt record for every attempt, including
    failures where no database dump artifact exists.
    """
    user = _require_admin(request)
    db = get_session()
    try:
        backup_repo = BackupRepository(db)
        run = backup_repo.get_by_id(backup_id)
        if not run:
            raise HTTPException(status_code=404, detail="Backup run not found")

        if not run.database_backup:
            # Persist the failed attempt before raising so operators can
            # see that a dry-run was attempted on a dump-less backup.
            _persist_restore_attempt(
                backup_repo, run.id, user, "failed",
                mode="dry_run", dump_file=None,
                error_message="No database dump artifact in backup",
            )
            _log_audit(
                request, db=db,
                action="restore_dry_run",
                entity_type="backup_run",
                entity_id=backup_id,
                details={"passed": False, "reason": "no_dump_artifact"},
            )
            db.commit()
            raise HTTPException(status_code=400, detail="Backup has no database dump artifact")

        error = dry_run_restore(
            backup_root=settings.backup_path,
            dump_relative_path=run.database_backup,
            pg_restore_bin=settings.pg_restore_bin,
        )

        # Persist a restore attempt record for dry-run auditability
        passed = error is None
        _persist_restore_attempt(
            backup_repo, run.id, user, "dry_run_passed" if passed else "failed",
            mode="dry_run", dump_file=run.database_backup,
            error_message=error if not passed else None,
        )

        _log_audit(
            request, db=db,
            action="restore_dry_run",
            entity_type="backup_run",
            entity_id=backup_id,
            details={"dump_file": run.database_backup, "passed": passed},
        )
        db.commit()

        if error is not None:
            return {"passed": False, "error": error}

        approval = _issue_restore_approval(request, backup_id)
        return {"passed": True, "dump_file": run.database_backup, **approval}
    finally:
        db.close()


@app.post("/admin/backups/{backup_id}/restore")
def admin_execute_restore(backup_id: str, payload: RestoreConfirmRequest, request: Request) -> dict[str, object]:
    """Execute a database restore from a backup dump file.

    Admin-only. **Destructive** — requires explicit confirmation payload
    ``{"confirm": "yes-do-restore-now"}``.  Also validates manifest and
    dump artifacts before proceeding.
    """
    user = _require_admin(request)
    db = get_session()
    try:
        backup_repo = BackupRepository(db)
        run = backup_repo.get_by_id(backup_id)
        if not run:
            raise HTTPException(status_code=404, detail="Backup run not found")

        if not _restore_execution_supported():
            _persist_restore_attempt(
                backup_repo, run.id, user, "failed",
                mode="execute", dump_file=run.database_backup,
                error_message="Live restore execution is disabled outside development. Use the offline restore procedure.",
            )
            db.commit()
            raise HTTPException(
                status_code=409,
                detail="Live restore execution is disabled outside development. Use the offline restore procedure.",
            )

        if not _consume_restore_approval(request, backup_id, payload.confirmation_token):
            _persist_restore_attempt(
                backup_repo, run.id, user, "failed",
                mode="execute", dump_file=run.database_backup,
                error_message="Restore approval token missing or expired",
            )
            db.commit()
            raise HTTPException(status_code=400, detail="Restore approval token missing or expired")

        # Validate confirmation phrase next
        if payload.confirm != "yes-do-restore-now":
            _persist_restore_attempt(
                backup_repo, run.id, user, "failed",
                mode="execute", dump_file=run.database_backup,
                error_message="Restore not confirmed",
            )
            db.commit()
            raise HTTPException(status_code=400, detail="Restore not confirmed — explicit confirmation required")

        # Pre-validate manifest
        manifest_path = _resolve_backup_manifest_path(run)
        try:
            validation = validate_restore(
                backup_root=settings.backup_path,
                manifest_path=manifest_path or (Path(settings.backup_path) / "manifests" / f"{backup_id}.json"),
            )
        except RestoreValidationError as exc:
            _persist_restore_attempt(
                backup_repo, run.id, user, "failed",
                mode="execute", dump_file=run.database_backup,
                error_message=str(exc),
            )
            db.commit()
            raise HTTPException(status_code=400, detail=str(exc))

        if not validation["valid"]:
            _persist_restore_attempt(
                backup_repo, run.id, user, "failed",
                mode="execute", dump_file=run.database_backup,
                error_message="validation-failed",
            )
            db.commit()
            raise HTTPException(status_code=400, detail=f"Restore validation failed: {validation['warnings']}")

        if not run.database_backup:
            _persist_restore_attempt(
                backup_repo, run.id, user, "failed",
                mode="execute", dump_file=None,
                error_message="No database dump artifact in backup",
            )
            db.commit()
            raise HTTPException(status_code=400, detail="Backup has no database dump artifact")

        # Attempt real restore — only with correct confirmation marker
        try:
            restore_result = execute_restore(
                backup_root=settings.backup_path,
                dump_relative_path=run.database_backup,
                database_url=settings.database_url,
                file_storage_root=settings.file_storage_path,
                files_relative_path=validation.get("files_backup"),
                documents_relative_path=validation.get("documents_backup"),
                pg_restore_bin=settings.pg_restore_bin,
                confirm=payload.confirm,
            )
        except RestoreValidationError as exc:
            _persist_restore_attempt(
                backup_repo, run.id, user, "failed",
                mode="execute", dump_file=run.database_backup,
                error_message=str(exc),
            )
            db.commit()
            raise HTTPException(status_code=400, detail=str(exc)) from exc

        _persist_restore_attempt(
            backup_repo, run.id, user, "executed",
            mode="execute", dump_file=run.database_backup,
        )
        _log_audit(
            request, db=db,
            action="restore_executed",
            entity_type="backup_run",
            entity_id=backup_id,
            details={
                "dump_file": run.database_backup,
                "restored_archives": restore_result.get("restored_archives", {}),
            },
        )
        db.commit()
        return {
            "restored": True,
            "dump_file": run.database_backup,
            "restored_archives": restore_result.get("restored_archives", {}),
        }
    finally:
        db.close()


@app.get("/admin/backups/{backup_id}/restore-attempts")
def admin_list_restore_attempts(backup_id: str, request: Request) -> dict[str, list[dict[str, object]]]:
    """List restore attempts for a given backup run. Admin-only."""
    _require_admin(request)
    db = get_session()
    try:
        backup_repo = BackupRepository(db)
        run = backup_repo.get_by_id(backup_id)
        if not run:
            raise HTTPException(status_code=404, detail="Backup run not found")

        attempts = backup_repo.list_restore_attempts(backup_id)
        items = [BackupRepository.restore_attempt_to_response(a) for a in attempts]
        db.commit()
        return {"items": items}
    finally:
        db.close()


def _persist_restore_attempt(
    backup_repo: BackupRepository,
    backup_run_id: object,
    user: dict[str, str],
    status: str,
    *,
    mode: str,
    dump_file: str | None = None,
    error_message: str | None = None,
) -> None:
    """Persist a RestoreAttempt record for the given backup run."""
    from app.models import RestoreAttempt as RestoreAttemptModel
    from app.repositories.users import UserRepository
    user_repo = UserRepository(backup_repo._db)

    user_model = user_repo.get_by_email(user["email"])
    attempt = RestoreAttemptModel(
        backup_run_id=backup_run_id,
        status=status,
        mode=mode,
        started_by=user_model.id if user_model else None,
        dump_file=dump_file,
        error_message=error_message,
    )
    backup_repo.add_restore_attempt(attempt)


def _delete_storage_artifacts(relative_paths: list[str]) -> None:
    if not relative_paths:
        return

    import logging

    logger = logging.getLogger("omega.storage")
    storage = ClientStorage(settings.file_storage_path)
    for relative_path in relative_paths:
        try:
            storage.delete_relative_file(relative_path)
        except Exception:
            logger.warning(
                "Failed to remove storage artifact after database commit: %s",
                relative_path,
                exc_info=True,
            )


@app.get("/admin/backups/schedule-status")
def admin_schedule_status(request: Request) -> dict[str, object]:
    """Return the backup scheduler status (enabled, running, last/next run). Admin-only."""
    _require_admin(request)
    from app.services.scheduler import get_scheduler_status
    return get_scheduler_status()


@app.patch("/admin/users/{user_id}/disable")
def admin_disable_user(user_id: str, request: Request) -> dict[str, dict[str, object]]:
    """Disable a user account. Admin-only."""
    _require_admin(request)
    db = get_session()
    try:
        repo = UserRepository(db)
        try:
            resolved_user_id = UUID(user_id)
        except ValueError as exc:
            raise HTTPException(status_code=404, detail="User not found") from exc
        result = repo.disable_by_id(resolved_user_id)
        if not result:
            raise HTTPException(status_code=404, detail="User not found")
        _log_audit(
            request, db=db,
            action="user_disabled",
            entity_type="user",
            entity_id=user_id,
            details={"new_status": "disabled"},
        )
        db.commit()
        return {"item": result}
    finally:
        db.close()


@app.patch("/admin/users/{user_id}/enable")
def admin_enable_user(user_id: str, request: Request) -> dict[str, dict[str, object]]:
    _require_admin(request)
    db = get_session()
    try:
        repo = UserRepository(db)
        try:
            resolved_user_id = UUID(user_id)
        except ValueError as exc:
            raise HTTPException(status_code=404, detail="User not found") from exc
        result = repo.enable_by_id(resolved_user_id)
        if not result:
            raise HTTPException(status_code=404, detail="User not found")
        _log_audit(
            request, db=db,
            action="user_enabled",
            entity_type="user",
            entity_id=user_id,
            details={"new_status": "active"},
        )
        db.commit()
        return {"item": result}
    finally:
        db.close()


@app.post("/admin/backups/{backup_id}/validate-restore")
def admin_validate_restore(backup_id: str, request: Request) -> dict[str, object]:
    """Validate a backup's manifest and artifacts for restore. Admin-only."""
    _require_admin(request)
    db = get_session()
    try:
        backup_repo = BackupRepository(db)
        run = backup_repo.get_by_id(backup_id)
        if not run:
            raise HTTPException(status_code=404, detail="Backup run not found")
        manifest_path = _resolve_backup_manifest_path(run)
        validation = validate_restore(
            backup_root=settings.backup_path,
            manifest_path=manifest_path or (Path(settings.backup_path) / "manifests" / f"{backup_id}.json"),
        )
        _log_audit(
            request, db=db,
            action="restore_validated",
            entity_type="backup_run",
            entity_id=backup_id,
            details={"valid": validation.get("valid", False)},
        )
        db.commit()
        if validation.get("valid") and validation.get("dump_file"):
            return {**validation, **_issue_restore_approval(request, backup_id)}
        return validation
    finally:
        db.close()


@app.get("/admin/security-summary")
def admin_security_summary(request: Request) -> dict[str, dict[str, str]]:
    _require_admin(request)
    return {
        "item": {
            "password_hashing": "pbkdf2_enabled",
            "role_based_access": "enabled",
            "session_timeout_minutes": str(settings.session_timeout_minutes),
            "public_port_exposure": "disabled",
            "remote_access": settings.remote_access_mode,
            "remote_access_notes": "Use Cloudflare Tunnel with Cloudflare Access or VPN before enabling offsite access.",
            "file_storage_visibility": "private_server_storage",
        }
    }


def _resolve_backup_manifest_path(run: BackupRunModel) -> Path | None:
    backup_root = Path(settings.backup_path)

    if run.files_backup and run.files_backup.endswith(".json"):
        candidate = backup_root / run.files_backup
        return candidate if candidate.is_file() else None

    manifests_dir = backup_root / "manifests"
    if not manifests_dir.is_dir():
        return None

    for manifest_path in manifests_dir.glob("*.json"):
        try:
            manifest = load_manifest(manifest_path)
        except RestoreValidationError:
            continue

        artifact_section = manifest.get("artifact")
        database_section = manifest.get("database")
        if not isinstance(artifact_section, dict):
            continue

        manifest_files_backup = artifact_section.get("files_backup")
        manifest_documents_backup = artifact_section.get("documents_backup")
        manifest_database_backup = database_section.get("dump_file") if isinstance(database_section, dict) else None

        if (
            manifest_files_backup == run.files_backup
            and manifest_documents_backup == run.documents_backup
            and manifest_database_backup == run.database_backup
        ):
            return manifest_path

    return None


def _backup_run_response(run: BackupRunModel) -> dict[str, object]:
    payload = BackupRepository.to_response(run)
    backup_root = Path(settings.backup_path)
    manifest_path = _resolve_backup_manifest_path(run)

    payload["manifest_path"] = str(manifest_path.relative_to(backup_root).as_posix()) if manifest_path else None
    payload["manifest_present"] = manifest_path is not None
    payload["database_backup_present"] = bool(run.database_backup and (backup_root / run.database_backup).is_file())
    payload["files_backup_present"] = bool(run.files_backup and (backup_root / run.files_backup).is_file())
    payload["documents_backup_present"] = bool(run.documents_backup and (backup_root / run.documents_backup).is_file())
    return payload


def _admin_settings_file_path() -> Path:
    return Path(settings.backup_path).parent / "admin-settings.json"


def _default_admin_settings_payload() -> dict[str, object]:
    return {
        "admin_email": "",
        "app_url": settings.app_url,
        "backup_path": str(settings.backup_path),
        "file_storage_path": str(settings.file_storage_path),
        "remote_access_mode": settings.remote_access_mode,
        "session_timeout_minutes": settings.session_timeout_minutes,
        "ai_enabled": settings.ai_enabled,
        "ai_model": settings.ai_model,
        "ai_api_key": "",
    }


def _load_raw_admin_settings_payload() -> dict[str, object]:
    defaults = _default_admin_settings_payload()
    settings_file = _admin_settings_file_path()
    if not settings_file.is_file():
        return defaults

    try:
        stored = json.loads(settings_file.read_text(encoding="utf-8"))
    except (OSError, json.JSONDecodeError):
        return defaults

    if not isinstance(stored, dict):
        return defaults

    return {**defaults, **stored}


def _sanitize_admin_settings_payload(payload: dict[str, object]) -> dict[str, object]:
    sanitized = dict(payload)
    api_key = str(sanitized.get("ai_api_key") or "").strip()
    sanitized["ai_api_key"] = ""
    sanitized["ai_api_key_configured"] = bool(api_key)
    sanitized["ai_provider"] = "gemini"
    sanitized["requires_restart"] = True
    return sanitized


def _load_admin_settings_payload() -> dict[str, object]:
    return _sanitize_admin_settings_payload(_load_raw_admin_settings_payload())


def _save_admin_settings_payload(payload: dict[str, object]) -> dict[str, object]:
    settings_file = _admin_settings_file_path()
    settings_file.parent.mkdir(parents=True, exist_ok=True)
    settings_file.write_text(json.dumps(payload, indent=2), encoding="utf-8")
    return _sanitize_admin_settings_payload(payload)


def _test_operator_path(path_value: str) -> tuple[bool, str]:
    candidate = Path(path_value).expanduser()
    if not candidate.exists():
        return False, "Path does not exist"
    if not candidate.is_dir():
        return False, "Path is not a directory"

    probe = candidate / f".omega-path-test-{uuid.uuid4().hex}.tmp"
    try:
        probe.write_text("omega-path-test", encoding="utf-8")
        probe.unlink(missing_ok=True)
        return True, "Path is valid and writable"
    except OSError as exc:
        probe.unlink(missing_ok=True)
        return False, f"Path is not writable: {exc}"


@app.get("/admin/audit-logs")
def admin_audit_logs(
    request: Request,
    user_email: str | None = None,
    action: str | None = None,
    entity_type: str | None = None,
    client_reference: str | None = None,
    from_date: str | None = None,
    to_date: str | None = None,
) -> dict[str, list[dict[str, object]]]:
    """List recent audit log entries. Admin-only."""
    _require_admin(request)
    db = get_session()
    try:
        repo = AuditLogRepository(db)
        entries = repo.list_recent()
        user_lookup = UserRepository(db)
        client_lookup = ClientRepository(db)
        items = []
        for entry in entries:
            item = AuditLogRepository.to_response(entry)
            user_model = user_lookup.get_by_id(entry.user_id) if entry.user_id else None
            item["user_email"] = user_model.email if user_model else None
            client_model = client_lookup.get_by_id(entry.client_id) if entry.client_id else None
            item["client_reference"] = client_model.client_reference if client_model else None
            item["client_name"] = client_model.full_name if client_model else None
            if user_email and _normalized_email(str(item.get("user_email"))) != _normalized_email(user_email):
                continue
            if action and str(item.get("action")) != action:
                continue
            if entity_type and str(item.get("entity_type")) != entity_type:
                continue
            if client_reference and str(item.get("client_reference") or "") != client_reference:
                continue
            created_at = str(item.get("created_at") or "")
            if from_date and created_at and created_at[:10] < from_date:
                continue
            if to_date and created_at and created_at[:10] > to_date:
                continue
            items.append(item)
        db.commit()
        return {"items": items}
    finally:
        db.close()


@app.get("/admin/security")
def admin_security_status(request: Request) -> dict[str, object]:
    _require_admin(request)
    db = get_session()
    try:
        session_repo = SessionRepository(db)
        user_repo = UserRepository(db)
        users = user_repo.list_all()
        active_sessions = session_repo.count_active() if hasattr(session_repo, "count_active") else None
        db.commit()
        return {
            "app_url": settings.app_url,
            "environment": settings.environment,
            "remote_access_mode": settings.remote_access_mode,
            "session_timeout_minutes": settings.session_timeout_minutes,
            "cookie_secure": settings.cookie_secure,
            "cookie_samesite": settings.cookie_samesite,
            "password_hashing": "PBKDF2-HMAC-SHA256",
            "user_count": len(users),
            "disabled_user_count": len([user for user in users if user.status == UserStatus.DISABLED.value]),
            "force_password_change_count": len([user for user in users if user.force_password_change]),
            "active_session_count": active_sessions,
            "file_storage_path": str(settings.file_storage_path),
            "backup_path": str(settings.backup_path),
        }
    finally:
        db.close()


@app.get("/admin/storage/reconciliation")
def admin_storage_reconciliation(request: Request) -> dict[str, object]:
    _require_admin(request)
    db = get_session()
    try:
        report = build_storage_reconciliation_report(db, settings.file_storage_path)
        db.commit()
        return report
    finally:
        db.close()


@app.post("/admin/storage/reconciliation/repair")
def admin_storage_reconciliation_repair(payload: StorageRepairRequest, request: Request) -> dict[str, object]:
    _require_admin(request)
    db = get_session()
    try:
        result = repair_storage_reconciliation_report(
            db,
            settings.file_storage_path,
            execute=payload.execute,
        )
        _log_audit(
            request,
            db=db,
            action="storage_reconciliation_repair" if payload.execute else "storage_reconciliation_preview",
            entity_type="storage",
            entity_id="reconciliation",
            details={
                "executed": payload.execute,
                "actions": result.get("actions", {}),
            },
        )
        db.commit()
        return result
    finally:
        db.close()


@app.get("/admin/settings")
def admin_settings(request: Request) -> dict[str, object]:
    _require_admin(request)
    return _load_admin_settings_payload()


@app.put("/admin/settings")
def admin_update_settings(payload: AdminSettingsRequest, request: Request) -> dict[str, object]:
    _require_admin(request)
    existing_payload = _load_raw_admin_settings_payload()
    ai_api_key = str(existing_payload.get("ai_api_key") or "")
    if payload.clear_ai_api_key:
        ai_api_key = ""
    elif payload.ai_api_key is not None and payload.ai_api_key.strip():
        ai_api_key = payload.ai_api_key.strip()
    normalized_payload = {
        "admin_email": payload.admin_email.strip().lower(),
        "app_url": payload.app_url.strip(),
        "backup_path": payload.backup_path.strip(),
        "file_storage_path": payload.file_storage_path.strip(),
        "remote_access_mode": payload.remote_access_mode.strip(),
        "session_timeout_minutes": payload.session_timeout_minutes,
        "ai_enabled": payload.ai_enabled,
        "ai_model": payload.ai_model.strip(),
        "ai_api_key": ai_api_key,
    }
    return _save_admin_settings_payload(normalized_payload)


@app.post("/admin/settings/test-path")
def admin_test_settings_path(payload: AdminPathTestRequest, request: Request) -> dict[str, object]:
    _require_admin(request)
    passed, message = _test_operator_path(payload.path)
    return {
        "passed": passed,
        "message": message,
    }


# ---------------------------------------------------------------------------
# File routes (Phase 4 DB-backed)
# ---------------------------------------------------------------------------


def _build_client_slug_from_model(client: object) -> str:
    """Build a storage slug from a Client model instance."""
    record = ClientRecord(
        first_name=client.first_name if client.first_name is not None else "",
        surname=client.surname if client.surname is not None else "",
        status=ClientStatus(client.status) if client.status else ClientStatus.DRAFT,
    )
    return build_client_storage_slug(client.client_reference, record)


def _file_to_response(file_model: FileModel) -> dict[str, object]:
    return {
        "id": str(file_model.id),
        "client_id": str(file_model.client_id),
        "original_filename": file_model.original_filename,
        "stored_filename": file_model.stored_filename,
        "file_type": file_model.file_type,
        "category": file_model.category,
        "uploaded_by": str(file_model.uploaded_by) if file_model.uploaded_by else None,
        "uploaded_at": file_model.uploaded_at.isoformat() if file_model.uploaded_at else None,
        "status": file_model.status,
        "notes": file_model.notes,
    }


@app.post("/clients/{client_reference}/files", status_code=201)
async def upload_file(client_reference: str, request: Request) -> dict[str, dict[str, object]]:
    user = _current_user(request)
    db = get_session()
    stored_file_relative_path: str | None = None
    try:
        client = _require_client_access(user, db, client_reference)

        # Read the multipart upload
        form = await request.form()
        uploaded = form.get("file")
        if not uploaded or not hasattr(uploaded, "filename") or not uploaded.filename:
            raise HTTPException(status_code=400, detail="No file uploaded")

        filename = uploaded.filename
        category = str(form.get("category", "General"))
        workflow_slug = _resolve_storage_workflow_slug(workflow_hint=str(form.get("workflow") or ""))

        # Determine file type from extension
        ext = filename.rsplit(".", 1)[-1].lower() if "." in filename else ""
        file_type = f".{ext}" if ext else None

        # Write to disk
        storage = ClientStorage(settings.file_storage_path)
        slug = _build_client_slug_from_model(client)
        upload_source = getattr(uploaded, "file", None)
        if upload_source is None:
            raise HTTPException(status_code=400, detail="Invalid file upload")
        try:
            filepath = storage.save_upload(
                slug,
                filename,
                upload_source,
                max_size_bytes=settings.max_upload_size_bytes,
                workflow_slug=workflow_slug,
                bucket=FILE_BUCKET,
            )
        except ValueError as exc:
            detail = str(exc)
            status_code = 413 if "maximum upload size" in detail else 400
            raise HTTPException(status_code=status_code, detail=detail) from exc

        # Persist metadata
        file_repo = FileRepository(db)
        user_repo = UserRepository(db)
        user_model = user_repo.get_by_email(user["email"])
        file_record = FileModel(
            client_id=client.id,
            original_filename=filename,
            stored_filename=filepath.name,
            file_path=str(filepath.relative_to(settings.file_storage_path)),
            file_type=file_type,
            category=category,
            uploaded_by=user_model.id if user_model else None,
            status="uploaded",
        )
        stored_file_relative_path = file_record.file_path
        file_repo.add(file_record)
        _log_audit(
            request, db=db,
            action="file_uploaded",
            entity_type="file",
            entity_id=str(file_record.id),
            client_id=client.id,
            details={"filename": filename, "category": category},
        )
        db.commit()

        return {"item": _file_to_response(file_record)}
    except Exception:
        db.rollback()
        if stored_file_relative_path:
            ClientStorage(settings.file_storage_path).delete_relative_file(stored_file_relative_path)
        raise
    finally:
        db.close()


@app.get("/clients/{client_reference}/files")
def list_files(client_reference: str, request: Request) -> dict[str, list[dict[str, object]]]:
    user = _current_user(request)
    db = get_session()
    try:
        client = _require_client_access(user, db, client_reference)

        file_repo = FileRepository(db)
        file_models = file_repo.list_by_client(client.id)
        items = [_file_to_response(f) for f in file_models]
        db.commit()
        return {"items": items}
    finally:
        db.close()


@app.get("/clients/{client_reference}/files/{file_id}/download")
def download_file(client_reference: str, file_id: str, request: Request) -> object:
    user = _current_user(request)
    db = get_session()
    try:
        client = _require_client_access(user, db, client_reference)

        file_repo = FileRepository(db)
        resolved_file_id = _parse_uuid_or_404(file_id, detail="File not found")
        file_model = file_repo.get_by_id(resolved_file_id)
        if not file_model or file_model.client_id != client.id:
            raise HTTPException(status_code=404, detail="File not found")

        storage = ClientStorage(settings.file_storage_path)
        resolved_path = storage.resolve_relative_file(file_model.file_path)
        if resolved_path is None:
            raise HTTPException(status_code=404, detail="File content not found on disk")

        _log_audit(
            request, db=db,
            action="file_downloaded",
            entity_type="file",
            entity_id=str(resolved_file_id),
            client_id=client.id,
            details={"filename": file_model.original_filename},
        )
        db.commit()
        return FileResponse(
            path=resolved_path,
            media_type="application/octet-stream",
            filename=None,
            headers=_attachment_headers(file_model.original_filename),
        )
    finally:
        db.close()


@app.delete("/clients/{client_reference}/files/{file_id}")
def delete_file(client_reference: str, file_id: str, request: Request) -> dict[str, object]:
    """Delete a client file — DB row and disk artifact."""
    user = _current_user(request)
    db = get_session()
    try:
        client = _require_client_access(user, db, client_reference)

        file_repo = FileRepository(db)
        resolved_file_id = _parse_uuid_or_404(file_id, detail="File not found")
        file_model = file_repo.get_by_id(resolved_file_id)
        if not file_model or file_model.client_id != client.id:
            raise HTTPException(status_code=404, detail="File not found")

        original_filename = file_model.original_filename
        artifact_paths = [file_model.file_path]
        deleted = file_repo.delete(resolved_file_id)
        if deleted is None:
            raise HTTPException(status_code=404, detail="File not found")

        _log_audit(
            request, db=db,
            action="file_deleted",
            entity_type="file",
            entity_id=str(resolved_file_id),
            client_id=client.id,
            details={"filename": original_filename},
        )
        db.commit()
        _delete_storage_artifacts(artifact_paths)
        return {"deleted": True, "file_id": str(resolved_file_id)}
    finally:
        db.close()
