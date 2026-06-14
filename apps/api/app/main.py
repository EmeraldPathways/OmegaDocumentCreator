from __future__ import annotations

from datetime import UTC, datetime

from fastapi import FastAPI, HTTPException, Request
from pydantic import BaseModel
from starlette.middleware.sessions import SessionMiddleware

from app.config import get_settings
from app.document_generation import generate_document
from app.domain.users import UserRole, UserStatus
from app.security import is_session_expired, verify_password
from app.store import (
    archive_client,
    create_backup_run,
    create_client,
    create_user,
    disable_user,
    get_client,
    get_security_summary,
    get_user,
    list_audit_logs,
    list_clients,
    list_users,
    update_client,
    update_user,
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


def _current_user(request: Request) -> dict[str, str]:
    email = request.session.get("user_email")
    if not email:
        raise HTTPException(status_code=401, detail="Authentication required")

    if is_session_expired(request.session.get("last_seen_at"), settings.session_timeout_minutes):
        request.session.clear()
        raise HTTPException(status_code=401, detail="Session expired")

    user = get_user(email)
    if not user:
        request.session.clear()
        raise HTTPException(status_code=401, detail="Authentication required")
    if user.status != UserStatus.ACTIVE:
        request.session.clear()
        raise HTTPException(status_code=403, detail="User account disabled")

    request.session["last_seen_at"] = datetime.now(UTC).isoformat()

    return {
        "first_name": user.first_name,
        "last_name": user.last_name,
        "email": user.email,
        "role": user.role.value,
        "status": user.status.value,
    }


def _require_admin(request: Request) -> dict[str, str]:
    user = _current_user(request)
    if user["role"] != UserRole.ADMIN.value:
        raise HTTPException(status_code=403, detail="Admin access required")
    return user


@app.get("/health")
def healthcheck() -> dict[str, str]:
    return {"status": "ok", "app_url": settings.app_url}


@app.post("/auth/login")
def login(payload: LoginRequest, request: Request) -> dict[str, dict[str, str]]:
    user = get_user(payload.email)
    if not user or not verify_password(payload.password, user.password_hash):
        raise HTTPException(status_code=401, detail="Invalid credentials")
    if user.status != UserStatus.ACTIVE:
        raise HTTPException(status_code=403, detail="User account disabled")

    request.session["user_email"] = user.email
    request.session["last_seen_at"] = datetime.now(UTC).isoformat()
    return {
        "user": {
            "first_name": user.first_name,
            "last_name": user.last_name,
            "email": user.email,
            "role": user.role.value,
            "status": user.status.value,
        }
    }


@app.post("/auth/logout")
def logout(request: Request) -> dict[str, str]:
    request.session.clear()
    return {"status": "logged_out"}


@app.get("/auth/me")
def me(request: Request) -> dict[str, dict[str, str]]:
    return {"user": _current_user(request)}


@app.get("/clients")
def clients() -> dict[str, list[dict[str, object]]]:
    return {"items": list_clients()}


@app.post("/clients", status_code=201)
def create_client_record(payload: ClientCreateRequest, request: Request) -> dict[str, dict[str, object]]:
    user = _current_user(request)
    item = create_client(
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
        created_by=user["email"],
    )
    return {"item": item}


@app.get("/clients/{client_reference}")
def client_detail(client_reference: str) -> dict[str, dict[str, object]]:
    client = get_client(client_reference)
    if not client:
        raise HTTPException(status_code=404, detail="Client not found")
    return {"item": client}


@app.patch("/clients/{client_reference}")
def update_client_record(
    client_reference: str, payload: ClientUpdateRequest, request: Request
) -> dict[str, dict[str, object]]:
    _current_user(request)
    updates = {key: value for key, value in payload.model_dump().items() if value is not None}
    item = update_client(client_reference, updates, _current_user(request)["email"])
    if not item:
        raise HTTPException(status_code=404, detail="Client not found")
    return {"item": item}


@app.patch("/clients/{client_reference}/archive")
def archive_client_record(client_reference: str, request: Request) -> dict[str, dict[str, object]]:
    user = _require_admin(request)
    item = archive_client(client_reference, user["email"])
    if not item:
        raise HTTPException(status_code=404, detail="Client not found")
    return {"item": item}


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


@app.get("/admin/users")
def admin_users(request: Request) -> dict[str, list[dict[str, str]]]:
    _require_admin(request)
    return {"items": list_users()}


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


@app.post("/admin/users", status_code=201)
def admin_create_user(payload: AdminUserCreateRequest, request: Request) -> dict[str, dict[str, str]]:
    _require_admin(request)
    try:
        item = create_user(
            first_name=payload.first_name,
            last_name=payload.last_name,
            email=payload.email,
            password=payload.password,
            role=payload.role,
        )
    except ValueError as exc:
        raise HTTPException(status_code=409, detail=str(exc)) from exc
    return {"item": item}


@app.patch("/admin/users/{email}/disable")
def admin_disable_user(email: str, request: Request) -> dict[str, dict[str, str]]:
    _require_admin(request)
    item = disable_user(email)
    if not item:
        raise HTTPException(status_code=404, detail="User not found")
    return {"item": item}


@app.patch("/admin/users/{email}")
def admin_update_user(
    email: str, payload: AdminUserUpdateRequest, request: Request
) -> dict[str, dict[str, str]]:
    _require_admin(request)
    item = update_user(
        email,
        first_name=payload.first_name,
        last_name=payload.last_name,
        role=payload.role,
    )
    if not item:
        raise HTTPException(status_code=404, detail="User not found")
    return {"item": item}
