from __future__ import annotations

import io
import uuid
import zipfile
from contextlib import asynccontextmanager
from datetime import UTC, datetime

from fastapi import FastAPI, HTTPException, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.middleware.trustedhost import TrustedHostMiddleware
from pydantic import BaseModel
from sqlalchemy import text
from starlette.middleware.sessions import SessionMiddleware

import app.db as app_db
from app.config import get_settings
from app.db import get_engine, get_session
from app.document_generation import generate_document
from app.domain.clients import ClientRecord, ClientStatus, build_client_storage_slug
from app.domain.users import UserRole, UserStatus
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
from app.services.restore import RestoreValidationError, dry_run_restore, execute_restore, validate_restore
from app.services.storage import ClientStorage

settings = get_settings()

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
    _csrf_check(request)
    return await call_next(request)


# ---------------------------------------------------------------------------
# Startup / shutdown helpers (wired via lifespan below)
# ---------------------------------------------------------------------------


def _startup_db_check() -> None:
    """Verify database connectivity, seed default users, and start scheduler if enabled."""
    import logging

    logger = logging.getLogger("omega.startup")

    # Validate deploy-critical settings
    if settings.environment != "development":
        if settings.session_secret == "development-only":
            logger.error("SESSION_SECRET must be changed from the default for non-development environments.")
        if not settings.app_url or settings.app_url.startswith("http://office-server.local"):
            logger.warning("APP_URL is set to a default/local value. Set to the public base URL for remote deployment.")
        if not settings.cors_origins and settings.remote_access_mode != "local_only":
            logger.warning("CORS_ORIGINS is not set but REMOTE_ACCESS_MODE is not local_only. Configure CORS for remote access.")
        if settings.trusted_proxy_count <= 0:
            logger.info("TRUSTED_PROXY_COUNT is 0 — assuming no reverse proxy. Set to match production proxy configuration.")

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

            if not repo.get_by_email(settings.admin_email):
                repo.create(
                    first_name="Omega",
                    last_name="Admin",
                    email=settings.admin_email,
                    password_hash=hash_password(settings.admin_password),
                    role=UserRole.ADMIN,
                )
                logger.info("Bootstrap admin user created: %s", settings.admin_email)

            if not repo.get_by_email(settings.staff_email):
                repo.create(
                    first_name="Office",
                    last_name="Staff",
                    email=settings.staff_email,
                    password_hash=hash_password(settings.staff_password),
                    role=UserRole.STAFF,
                )
                logger.info("Bootstrap staff user created: %s", settings.staff_email)

            db.commit()
        finally:
            db.close()
    except Exception:
        logger.warning("Database not available — continuing with in-memory store.", exc_info=True)

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
    dependants: list[dict[str, str]] = []


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
    dependants: list[dict[str, str]] | None = None


class DocumentGenerationRequest(BaseModel):
    client_reference: str
    document_type: str
    template_id: str
    workflow_snapshot: dict[str, object]


class RestoreConfirmRequest(BaseModel):
    confirm: str  # must be "yes-do-restore-now" to proceed


# ---------------------------------------------------------------------------
# Auth helpers (DB-backed)
# ---------------------------------------------------------------------------


def _current_user(request: Request) -> dict[str, str]:
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

        request.session["last_seen_at"] = datetime.now(UTC).isoformat()
        db.commit()
        return repo.to_response(user_model)
    finally:
        db.close()


def _require_admin(request: Request) -> dict[str, str]:
    user = _current_user(request)
    if user["role"] != UserRole.ADMIN.value:
        raise HTTPException(status_code=403, detail="Admin access required")
    return user


# ---------------------------------------------------------------------------
# CSRF protection for state-changing routes (same-origin SPA)
# ---------------------------------------------------------------------------

_CSRF_SAFE_METHODS = {"GET", "HEAD", "OPTIONS"}


def _csrf_check(request: Request) -> None:
    """Reject cross-origin state-changing requests for cookie-session endpoints.

    The frontend SPA runs on the same origin so its requests always carry
    an Origin header matching the APP_URL.  Browsers strip the Origin
    header on same-origin redirects, so we also accept a missing Origin
    when the Referer header is same-origin.  This is the simplest
    production-shaped CSRF defense for an internal cookie-session app
    without requiring token plumbing.
    """
    if request.method in _CSRF_SAFE_METHODS:
        return

    origin = request.headers.get("origin")
    referer = request.headers.get("referer")

    app_origin = settings.app_url.rstrip("/")

    def _is_same_origin(value: str) -> bool:
        return value.startswith(app_origin)

    if origin is not None:
        if not _is_same_origin(origin):
            raise HTTPException(status_code=403, detail="Cross-origin request blocked")
        return

    # No Origin header – check Referer for same-origin fallback
    if referer is not None and _is_same_origin(referer):
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
    except Exception as exc:
        return {"database": "unavailable", "database_error": str(exc)}


def _check_storage_availability() -> dict[str, object]:
    """Return storage availability status for readiness checks."""
    from pathlib import Path
    result: dict[str, object] = {}
    storage_root = Path(settings.file_storage_path)
    backup_root = Path(settings.backup_path)
    result["file_storage"] = str(storage_root) if storage_root.is_dir() else "unavailable"
    result["backup_storage"] = str(backup_root) if backup_root.is_dir() else "unavailable"
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
def readiness() -> dict[str, object]:
    db_status = _check_db_connectivity()
    storage_status = _check_storage_availability()
    db_available = db_status.get("database") == "available"
    storage_available = (
        storage_status.get("file_storage") != "unavailable"
        and storage_status.get("backup_storage") != "unavailable"
    )
    ready = db_available and storage_available
    return {
        "ready": ready,
        "checks": {
            **db_status,
            **storage_status,
        },
    }


# ---------------------------------------------------------------------------
# Auth routes (DB-backed users; cookie-session login)
# ---------------------------------------------------------------------------


# Lightweight in-memory login rate limiter (per IP, 5 attempts / minute)
_LOGIN_RATE_WINDOW: dict[str, tuple[float, int]] = {}


def _check_login_rate(client_ip: str) -> None:
    """Return if within rate limit. Raise 429 if exceeded."""
    now = datetime.now(UTC).timestamp()
    window_start, count = _LOGIN_RATE_WINDOW.get(client_ip, (0.0, 0))
    if now - window_start > 60:
        count = 0
        window_start = now
    if count >= 5:
        raise HTTPException(status_code=429, detail="Too many login attempts. Try again later.")
    _LOGIN_RATE_WINDOW[client_ip] = (window_start, count + 1)


@app.post("/auth/login")
def login(payload: LoginRequest, request: Request) -> dict[str, dict[str, str]]:
    client_ip = request.client.host if request.client else "unknown"
    _check_login_rate(client_ip)
    db = get_session()
    try:
        user_repo = UserRepository(db)
        user_model = user_repo.get_by_email(payload.email)

        if not user_model or not verify_password(payload.password, user_model.password_hash):
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
            raise HTTPException(status_code=403, detail="User account disabled")

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
def me(request: Request) -> dict[str, dict[str, str]]:
    return {"user": _current_user(request)}


# ---------------------------------------------------------------------------
# Client routes (DB-backed)
# ---------------------------------------------------------------------------


@app.get("/clients")
def clients(request: Request) -> dict[str, list[dict[str, object]]]:
    _current_user(request)
    db = get_session()
    try:
        repo = ClientRepository(db)
        all_clients = repo.list_all()
        items = [repo._to_list_item(c) for c in all_clients]
        db.commit()
        return {"items": items}
    finally:
        db.close()


@app.post("/clients", status_code=201)
def create_client_record(payload: ClientCreateRequest, request: Request) -> dict[str, dict[str, object]]:
    user = _current_user(request)
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
            dependants=payload.dependants,
            created_by_email=user["email"],
        )
        client_ref = item.get("client_reference", "")
        _log_audit(
            request, db=db,
            action="client_created",
            entity_type="client",
            entity_id=client_ref,
            details={"full_name": f"{payload.first_name} {payload.surname}"},
        )
        db.commit()
        return {"item": item}
    finally:
        db.close()


@app.get("/clients/{client_reference}")
def client_detail(client_reference: str, request: Request) -> dict[str, dict[str, object]]:
    _current_user(request)
    db = get_session()
    try:
        repo = ClientRepository(db)
        client = repo.get_by_reference(client_reference)
        if not client:
            raise HTTPException(status_code=404, detail="Client not found")
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
        updates = {key: value for key, value in payload.model_dump().items() if value is not None}
        item = repo.update(client_reference, updates, updated_by_email=user["email"])
        if not item:
            raise HTTPException(status_code=404, detail="Client not found")
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
    _current_user(request)
    db = get_session()
    try:
        client_repo = ClientRepository(db)
        client = client_repo.get_by_reference(client_reference)
        if not client:
            raise HTTPException(status_code=404, detail="Client not found")
        workflow_repo = WorkflowRepository(db)
        fields = workflow_repo.get(client.id)
        db.commit()
        return {"item": fields}
    finally:
        db.close()


@app.put("/clients/{client_reference}/workflow")
def save_workflow(client_reference: str, payload: dict[str, object], request: Request) -> dict[str, dict[str, str]]:
    _current_user(request)
    db = get_session()
    try:
        client_repo = ClientRepository(db)
        client = client_repo.get_by_reference(client_reference)
        if not client:
            raise HTTPException(status_code=404, detail="Client not found")
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
        client_repo = ClientRepository(db)
        client = client_repo.get_by_reference(payload.client_reference)
        item = generate_document(
            settings=settings,
            client_reference=payload.client_reference,
            document_type=payload.document_type,
            template_id=payload.template_id,
            workflow_snapshot=payload.workflow_snapshot,
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


@app.get("/clients/{client_reference}/documents")
def list_documents(client_reference: str, request: Request) -> dict[str, list[dict[str, object]]]:
    _current_user(request)
    db = get_session()
    try:
        client_repo = ClientRepository(db)
        client = client_repo.get_by_reference(client_reference)
        if not client:
            raise HTTPException(status_code=404, detail="Client not found")

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
    try:
        client_repo = ClientRepository(db)
        client = client_repo.get_by_reference(client_reference)
        if not client:
            raise HTTPException(status_code=404, detail="Client not found")

        doc_repo = DocumentRepository(db)
        user_repo = UserRepository(db)
        user_model = user_repo.get_by_email(current_user["email"])

        content_type = request.headers.get("content-type", "")
        uploaded = None
        if content_type.startswith("multipart/form-data"):
            form = await request.form()
            payload = {
                "document_type": form.get("document_type"),
                "document_name": form.get("document_name"),
                "version": form.get("version"),
                "status": form.get("status"),
                "preview_title": form.get("preview_title"),
                "preview_html": form.get("preview_html"),
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
        preview_html = str(payload.get("preview_html", ""))
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
            artifact_content = await uploaded.read()
            if not artifact_content:
                raise HTTPException(status_code=400, detail="Empty artifact upload")

            storage = ClientStorage(settings.file_storage_path)
            slug = _build_client_slug_from_model(client)
            filepath = storage.save_file(slug, artifact_name, artifact_content)
            relative_path = str(filepath.relative_to(settings.file_storage_path))
            suffix = filepath.suffix.lower()
            doc_repo.update_artifact_paths(
                document_model.id,
                docx_path=relative_path if suffix == ".docx" else None,
                pdf_path=relative_path if suffix == ".pdf" else None,
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
    finally:
        db.close()


@app.get("/clients/{client_reference}/documents/{document_id}/download")
def download_document(client_reference: str, document_id: str, request: Request) -> object:
    _current_user(request)
    db = get_session()
    try:
        client_repo = ClientRepository(db)
        client = client_repo.get_by_reference(client_reference)
        if not client:
            raise HTTPException(status_code=404, detail="Client not found")

        doc_repo = DocumentRepository(db)
        doc = doc_repo.get_by_id(document_id)
        if not doc or doc.client_id != client.id:
            raise HTTPException(status_code=404, detail="Document not found")

        from fastapi.responses import Response

        storage = ClientStorage(settings.file_storage_path)

        # Try PDF first, then DOCX
        artifact_path = doc.pdf_file_path or doc.docx_file_path
        if not artifact_path:
            raise HTTPException(status_code=404, detail="No artifact available for this document")

        content = storage.read_relative_file(artifact_path)
        if content is None:
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
            entity_id=document_id,
            client_id=client.id,
            details={"document_name": doc.document_name},
        )
        db.commit()
        return Response(
            content=content,
            media_type=media_type,
            headers={"Content-Disposition": f'attachment; filename="{filename}"'},
        )
    finally:
        db.close()


@app.get("/clients/{client_reference}/documents/pack")
def download_document_pack(client_reference: str, request: Request) -> object:
    """Return a ZIP containing all generated document artifacts for a client."""
    _current_user(request)
    db = get_session()
    try:
        client_repo = ClientRepository(db)
        client = client_repo.get_by_reference(client_reference)
        if not client:
            raise HTTPException(status_code=404, detail="Client not found")

        doc_repo = DocumentRepository(db)
        docs = doc_repo.list_by_client(client.id)

        storage = ClientStorage(settings.file_storage_path)
        zip_buffer = io.BytesIO()
        packed = 0

        with zipfile.ZipFile(zip_buffer, "w", zipfile.ZIP_DEFLATED) as zf:
            seen: set[str] = set()
            for doc in docs:
                for artifact_path in (doc.pdf_file_path, doc.docx_file_path):
                    if not artifact_path:
                        continue
                    content = storage.read_relative_file(artifact_path)
                    if content is None:
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
                    zf.writestr(zip_name, content)
                    packed += 1

        if packed == 0:
            raise HTTPException(status_code=404, detail="No packable document artifacts found")

        from fastapi.responses import Response

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
        return Response(
            content=zip_buffer.getvalue(),
            media_type="application/zip",
            headers={"Content-Disposition": f'attachment; filename="{zip_filename}"'},
        )
    finally:
        db.close()


@app.delete("/clients/{client_reference}/documents/{document_id}")
def delete_document(client_reference: str, document_id: str, request: Request) -> dict[str, object]:
    """Delete a generated document — DB row and all disk artifacts."""
    _current_user(request)
    db = get_session()
    try:
        client_repo = ClientRepository(db)
        client = client_repo.get_by_reference(client_reference)
        if not client:
            raise HTTPException(status_code=404, detail="Client not found")

        doc_repo = DocumentRepository(db)
        doc = doc_repo.get_by_id(document_id)
        if not doc or doc.client_id != client.id:
            raise HTTPException(status_code=404, detail="Document not found")

        # Remove disk artifacts (graceful if missing)
        storage = ClientStorage(settings.file_storage_path)
        for path in (doc.pdf_file_path, doc.docx_file_path):
            if path:
                storage.delete_relative_file(path)

        document_name = doc.document_name
        deleted = doc_repo.delete(document_id)
        if deleted is None:
            raise HTTPException(status_code=404, detail="Document not found")

        _log_audit(
            request, db=db,
            action="document_deleted",
            entity_type="document",
            entity_id=document_id,
            client_id=client.id,
            details={"document_name": document_name},
        )
        db.commit()
        return {"deleted": True, "document_id": document_id}
    finally:
        db.close()


# ---------------------------------------------------------------------------
# Admin routes (DB-backed for users; store.py for audit/backup/security)
# ---------------------------------------------------------------------------


@app.get("/admin/users")
def admin_users(request: Request) -> dict[str, list[dict[str, str]]]:
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
def admin_create_user(payload: AdminUserCreateRequest, request: Request) -> dict[str, dict[str, str]]:
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
) -> dict[str, dict[str, str]]:
    _require_admin(request)
    db = get_session()
    try:
        repo = UserRepository(db)
        user_model = repo.get_by_email(user_id)
        if not user_model:
            raise HTTPException(status_code=404, detail="User not found")

        old_role = user_model.role.value if hasattr(user_model.role, "value") else str(user_model.role)
        old_name = f"{user_model.first_name} {user_model.last_name}"
        user_model.first_name = payload.first_name
        user_model.last_name = payload.last_name
        user_model.role = payload.role

        _log_audit(
            request, db=db,
            action="user_updated",
            entity_type="user",
            entity_id=user_id,
            details={"old_role": old_role, "new_role": payload.role.value, "old_name": old_name, "new_name": f"{payload.first_name} {payload.last_name}"},
        )
        db.commit()
        return {"item": repo.to_response(user_model)}
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
        items = [repo.to_response(r) for r in runs]
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
        return {"item": repo.to_response(run)}
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

        return {"passed": True, "dump_file": run.database_backup}
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
        from pathlib import Path as _Path

        backup_repo = BackupRepository(db)
        run = backup_repo.get_by_id(backup_id)
        if not run:
            raise HTTPException(status_code=404, detail="Backup run not found")

        # Validate confirmation token first — cheapest check
        if payload.confirm != "yes-do-restore-now":
            _persist_restore_attempt(
                backup_repo, run.id, user, "failed",
                mode="execute", dump_file=run.database_backup,
                error_message="Restore not confirmed",
            )
            db.commit()
            raise HTTPException(status_code=400, detail="Restore not confirmed — explicit confirmation required")

        # Pre-validate manifest
        if not run.files_backup:
            _persist_restore_attempt(
                backup_repo, run.id, user, "failed",
                mode="execute", dump_file=run.database_backup,
                error_message="Backup has no manifest file reference",
            )
            db.commit()
            raise HTTPException(status_code=400, detail="Backup has no manifest file reference")

        manifest_path = _Path(settings.backup_path) / run.files_backup
        try:
            validation = validate_restore(
                backup_root=settings.backup_path,
                manifest_path=manifest_path,
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
            execute_restore(
                backup_root=settings.backup_path,
                dump_relative_path=run.database_backup,
                database_url=settings.database_url,
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
            details={"dump_file": run.database_backup},
        )
        db.commit()
        return {"restored": True, "dump_file": run.database_backup}
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


@app.get("/admin/backups/schedule-status")
def admin_schedule_status(request: Request) -> dict[str, object]:
    """Return the backup scheduler status (enabled, running, last/next run). Admin-only."""
    _require_admin(request)
    from app.services.scheduler import get_scheduler_status
    return get_scheduler_status()


@app.patch("/admin/users/{user_id}/disable")
def admin_disable_user(user_id: str, request: Request) -> dict[str, dict[str, str]]:
    """Disable a user account. Admin-only."""
    _require_admin(request)
    db = get_session()
    try:
        repo = UserRepository(db)
        result = repo.disable(user_id)
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


@app.post("/admin/backups/{backup_id}/validate-restore")
def admin_validate_restore(backup_id: str, request: Request) -> dict[str, object]:
    """Validate a backup's manifest and artifacts for restore. Admin-only."""
    _require_admin(request)
    db = get_session()
    try:
        from pathlib import Path as _Path
        backup_repo = BackupRepository(db)
        run = backup_repo.get_by_id(backup_id)
        if not run:
            raise HTTPException(status_code=404, detail="Backup run not found")
        if not run.files_backup:
            raise HTTPException(status_code=400, detail="Backup has no manifest file reference")
        manifest_path = _Path(settings.backup_path) / run.files_backup
        validation = validate_restore(
            backup_root=settings.backup_path,
            manifest_path=manifest_path,
        )
        _log_audit(
            request, db=db,
            action="restore_validated",
            entity_type="backup_run",
            entity_id=backup_id,
            details={"valid": validation.get("valid", False)},
        )
        db.commit()
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


@app.get("/admin/audit-logs")
def admin_audit_logs(request: Request) -> dict[str, list[dict[str, object]]]:
    """List recent audit log entries. Admin-only."""
    _require_admin(request)
    db = get_session()
    try:
        repo = AuditLogRepository(db)
        entries = repo.list_recent()
        items = [AuditLogRepository.to_response(e) for e in entries]
        db.commit()
        return {"items": items}
    finally:
        db.close()


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
    try:
        client_repo = ClientRepository(db)
        client = client_repo.get_by_reference(client_reference)
        if not client:
            raise HTTPException(status_code=404, detail="Client not found")

        # Read the multipart upload
        form = await request.form()
        uploaded = form.get("file")
        if not uploaded or not hasattr(uploaded, "filename") or not uploaded.filename:
            raise HTTPException(status_code=400, detail="No file uploaded")

        filename = uploaded.filename
        content = await uploaded.read()

        if len(content) > settings.max_upload_size_bytes:
            raise HTTPException(
                status_code=413,
                detail=f"File exceeds maximum upload size of {settings.max_upload_size_bytes} bytes",
            )

        category = str(form.get("category", "General"))

        # Determine file type from extension
        ext = filename.rsplit(".", 1)[-1].lower() if "." in filename else ""
        file_type = f".{ext}" if ext else None

        # Write to disk
        storage = ClientStorage(settings.file_storage_path)
        slug = _build_client_slug_from_model(client)
        filepath = storage.save_file(slug, filename, content)

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
    finally:
        db.close()


@app.get("/clients/{client_reference}/files")
def list_files(client_reference: str, request: Request) -> dict[str, list[dict[str, object]]]:
    _current_user(request)
    db = get_session()
    try:
        client_repo = ClientRepository(db)
        client = client_repo.get_by_reference(client_reference)
        if not client:
            raise HTTPException(status_code=404, detail="Client not found")

        file_repo = FileRepository(db)
        file_models = file_repo.list_by_client(client.id)
        items = [_file_to_response(f) for f in file_models]
        db.commit()
        return {"items": items}
    finally:
        db.close()


@app.get("/clients/{client_reference}/files/{file_id}/download")
def download_file(client_reference: str, file_id: str, request: Request) -> object:
    _current_user(request)
    db = get_session()
    try:
        client_repo = ClientRepository(db)
        client = client_repo.get_by_reference(client_reference)
        if not client:
            raise HTTPException(status_code=404, detail="Client not found")

        file_repo = FileRepository(db)
        file_model = file_repo.get_by_id(uuid.UUID(file_id))
        if not file_model or file_model.client_id != client.id:
            raise HTTPException(status_code=404, detail="File not found")

        from fastapi.responses import Response

        storage = ClientStorage(settings.file_storage_path)
        content = storage.read_relative_file(file_model.file_path)
        if content is None:
            raise HTTPException(status_code=404, detail="File content not found on disk")

        _log_audit(
            request, db=db,
            action="file_downloaded",
            entity_type="file",
            entity_id=file_id,
            client_id=client.id,
            details={"filename": file_model.original_filename},
        )
        db.commit()
        return Response(
            content=content,
            media_type="application/octet-stream",
            headers={"Content-Disposition": f'attachment; filename="{file_model.original_filename}"'},
        )
    finally:
        db.close()


@app.delete("/clients/{client_reference}/files/{file_id}")
def delete_file(client_reference: str, file_id: str, request: Request) -> dict[str, object]:
    """Delete a client file — DB row and disk artifact."""
    _current_user(request)
    db = get_session()
    try:
        client_repo = ClientRepository(db)
        client = client_repo.get_by_reference(client_reference)
        if not client:
            raise HTTPException(status_code=404, detail="Client not found")

        file_repo = FileRepository(db)
        file_model = file_repo.get_by_id(uuid.UUID(file_id))
        if not file_model or file_model.client_id != client.id:
            raise HTTPException(status_code=404, detail="File not found")

        # Remove disk artifact (graceful if missing)
        storage = ClientStorage(settings.file_storage_path)
        storage.delete_relative_file(file_model.file_path)

        original_filename = file_model.original_filename
        deleted = file_repo.delete(uuid.UUID(file_id))
        if deleted is None:
            raise HTTPException(status_code=404, detail="File not found")

        _log_audit(
            request, db=db,
            action="file_deleted",
            entity_type="file",
            entity_id=file_id,
            client_id=client.id,
            details={"filename": original_filename},
        )
        db.commit()
        return {"deleted": True, "file_id": file_id}
    finally:
        db.close()
