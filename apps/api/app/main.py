from __future__ import annotations

from datetime import UTC, datetime

from fastapi import FastAPI, HTTPException, Request
from pydantic import BaseModel
from starlette.middleware.sessions import SessionMiddleware

from app.config import get_settings
from app.db import get_engine, get_session
from app.document_generation import generate_document
from app.domain.users import UserRole, UserStatus
from app.repositories.clients import ClientRepository
from app.repositories.users import UserRepository
from app.security import hash_password, is_session_expired, verify_password
from app.store import (
    create_backup_run,
    get_security_summary,
    list_audit_logs,
)

settings = get_settings(
    DATABASE_URL="postgresql://placeholder",
    FILE_STORAGE_PATH="storage/clients",
    BACKUP_PATH="storage/backups",
    SESSION_SECRET="development-only",
    APP_URL="http://office-server.local",
    ADMIN_EMAIL="admin@omega.local",
)

app = FastAPI(title="Omega Document Creator API", version="0.1.0")
app.add_middleware(SessionMiddleware, secret_key=settings.session_secret)


# ---------------------------------------------------------------------------
# Startup: verify DB and bootstrap default users
# ---------------------------------------------------------------------------


@app.on_event("startup")
def _startup_db_check() -> None:
    """Verify database connectivity and seed default admin/staff users."""
    import logging
    from sqlalchemy import text

    logger = logging.getLogger("omega.startup")
    try:
        engine = get_engine()
        with engine.connect() as conn:
            conn.execute(text("SELECT 1"))
        logger.info("Database connection verified.")

        db = get_session()
        try:
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


# ---------------------------------------------------------------------------
# Auth helpers (DB-backed)
# ---------------------------------------------------------------------------


def _current_user(request: Request) -> dict[str, str]:
    email = request.session.get("user_email")
    if not email:
        raise HTTPException(status_code=401, detail="Authentication required")

    if is_session_expired(request.session.get("last_seen_at"), settings.session_timeout_minutes):
        request.session.clear()
        raise HTTPException(status_code=401, detail="Session expired")

    db = get_session()
    try:
        repo = UserRepository(db)
        user_model = repo.get_by_email(email)
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
# Health
# ---------------------------------------------------------------------------


@app.get("/health")
def healthcheck() -> dict[str, str]:
    return {"status": "ok", "app_url": settings.app_url}


# ---------------------------------------------------------------------------
# Auth routes (DB-backed)
# ---------------------------------------------------------------------------


@app.post("/auth/login")
def login(payload: LoginRequest, request: Request) -> dict[str, dict[str, str]]:
    db = get_session()
    try:
        repo = UserRepository(db)
        user_model = repo.get_by_email(payload.email)
        if not user_model or not verify_password(payload.password, user_model.password_hash):
            raise HTTPException(status_code=401, detail="Invalid credentials")
        if user_model.status != UserStatus.ACTIVE.value:
            raise HTTPException(status_code=403, detail="User account disabled")

        request.session["user_email"] = user_model.email
        request.session["last_seen_at"] = datetime.now(UTC).isoformat()
        db.commit()
        return {"user": repo.to_response(user_model)}
    finally:
        db.close()


@app.post("/auth/logout")
def logout(request: Request) -> dict[str, str]:
    request.session.clear()
    return {"status": "logged_out"}


@app.get("/auth/me")
def me(request: Request) -> dict[str, dict[str, str]]:
    return {"user": _current_user(request)}


# ---------------------------------------------------------------------------
# Client routes (DB-backed)
# ---------------------------------------------------------------------------


@app.get("/clients")
def clients() -> dict[str, list[dict[str, object]]]:
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
        db.commit()
        return {"item": item}
    finally:
        db.close()


@app.get("/clients/{client_reference}")
def client_detail(client_reference: str) -> dict[str, dict[str, object]]:
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
        db.commit()
        return {"item": item}
    finally:
        db.close()


# ---------------------------------------------------------------------------
# Documents (store.py-backed — Phase 5 will replace)
# ---------------------------------------------------------------------------


@app.post("/documents/generate")
def generate_document_record(
    payload: DocumentGenerationRequest, request: Request
) -> dict[str, dict[str, object] | list[dict[str, str]]]:
    _current_user(request)
    item = generate_document(
        settings=settings,
        client_reference=payload.client_reference,
        document_type=payload.document_type,
        template_id=payload.template_id,
        workflow_snapshot=payload.workflow_snapshot,
    )
    return {"item": item}


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
        item = repo.create(
            first_name=payload.first_name,
            last_name=payload.last_name,
            email=payload.email,
            password_hash=hash_password(payload.password),
            role=payload.role,
        )
        db.commit()
        return {"item": item}
    except ValueError as exc:
        raise HTTPException(status_code=409, detail=str(exc)) from exc
    finally:
        db.close()


@app.patch("/admin/users/{email}/disable")
def admin_disable_user(email: str, request: Request) -> dict[str, dict[str, str]]:
    _require_admin(request)
    db = get_session()
    try:
        repo = UserRepository(db)
        item = repo.disable(email)
        if not item:
            raise HTTPException(status_code=404, detail="User not found")
        db.commit()
        return {"item": item}
    finally:
        db.close()


@app.patch("/admin/users/{email}")
def admin_update_user(
    email: str, payload: AdminUserUpdateRequest, request: Request
) -> dict[str, dict[str, str]]:
    _require_admin(request)
    db = get_session()
    try:
        repo = UserRepository(db)
        item = repo.update(
            email,
            first_name=payload.first_name,
            last_name=payload.last_name,
            role=payload.role,
        )
        if not item:
            raise HTTPException(status_code=404, detail="User not found")
        db.commit()
        return {"item": item}
    finally:
        db.close()


@app.get("/admin/audit-logs")
def admin_audit_logs(request: Request) -> dict[str, list[dict[str, str]]]:
    _require_admin(request)
    return {"items": list_audit_logs()}


@app.post("/admin/backups/run")
def admin_run_backup(request: Request) -> dict[str, dict[str, str]]:
    user = _require_admin(request)
    return {"item": create_backup_run(triggered_by=user["email"])}


@app.get("/admin/security-summary")
def admin_security_summary(request: Request) -> dict[str, dict[str, str]]:
    _require_admin(request)
    return {"item": get_security_summary()}