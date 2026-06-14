from __future__ import annotations

from copy import deepcopy
from datetime import UTC, datetime

from app.domain.clients import ClientStatus
from app.domain.users import UserRecord, UserRole, UserStatus
from app.security import hash_password


USER_TEMPLATES = {
    "admin@omega.local": UserRecord(
        first_name="Omega",
        last_name="Admin",
        email="admin@omega.local",
        password_hash=hash_password("ChangeMe123!"),
        role=UserRole.ADMIN,
    ),
    "staff@omega.local": UserRecord(
        first_name="Office",
        last_name="Staff",
        email="staff@omega.local",
        password_hash=hash_password("ChangeMe123!"),
        role=UserRole.STAFF,
    ),
}

CLIENT_TEMPLATES = [
    {
        "client_reference": "CLI-2026-0001",
        "first_name": "Test",
        "surname": "Client",
        "full_name": "Test Client",
        "title": "Mr",
        "status": ClientStatus.DRAFT,
        "created_by": "admin@omega.local",
        "updated_by": "admin@omega.local",
        "created_at": "2026-01-10T09:00:00+00:00",
        "updated_at": "2026-01-10T09:00:00+00:00",
        "email": "test.client@example.com",
        "mobile_number": "0870000001",
        "work_phone": "",
        "date_of_birth": "1985-04-12",
        "marital_status": "Married",
        "home_address_line_1": "1 Main Street",
        "home_address_line_2": "",
        "town_city": "Dublin",
        "county": "Dublin",
        "eircode": "D01TEST",
        "partner_name": "Taylor Client",
        "partner_address": "1 Main Street, Dublin",
        "general_notes": "Initial seeded client.",
        "dependants": [],
    },
    {
        "client_reference": "CLI-2026-0002",
        "first_name": "Jamie",
        "surname": "Murphy",
        "full_name": "Jamie Murphy",
        "title": "Ms",
        "status": ClientStatus.ACTIVE,
        "created_by": "staff@omega.local",
        "updated_by": "staff@omega.local",
        "created_at": "2026-01-12T10:30:00+00:00",
        "updated_at": "2026-01-12T10:30:00+00:00",
        "email": "jamie.murphy@example.com",
        "mobile_number": "0870000002",
        "work_phone": "014000002",
        "date_of_birth": "1990-11-08",
        "marital_status": "Single",
        "home_address_line_1": "22 River Road",
        "home_address_line_2": "Apt 4",
        "town_city": "Galway",
        "county": "Galway",
        "eircode": "H91TEST",
        "partner_name": "",
        "partner_address": "",
        "general_notes": "Wants Income Protection review.",
        "dependants": [{"name": "Ella Murphy", "date_of_birth": "2017-06-20", "notes": "Child"}],
    },
]

SEEDED_USERS: dict[str, UserRecord] = {}
SEEDED_CLIENTS: list[dict[str, object]] = []
SUPPORTED_DOCUMENT_TYPES = ("Fact Find", "Terms of Business", "Statement of Suitability")
AUDIT_LOG_TEMPLATES = [
    {
        "id": "AUD-0003",
        "action": "document_generated",
        "entity_type": "document",
        "entity_id": "DOC-0002",
        "user_email": "staff@omega.local",
        "client_reference": "CLI-2026-0002",
        "details": "Statement of Suitability PDF",
        "created_at": "2026-06-06T14:10:00+00:00",
    },
    {
        "id": "AUD-0002",
        "action": "file_uploaded",
        "entity_type": "file",
        "entity_id": "FILE-0002",
        "user_email": "staff@omega.local",
        "client_reference": "CLI-2026-0002",
        "details": "jamie-murphy-passport.pdf",
        "created_at": "2026-06-06T13:55:00+00:00",
    },
    {
        "id": "AUD-0001",
        "action": "client_created",
        "entity_type": "client",
        "entity_id": "CLI-2026-0002",
        "user_email": "staff@omega.local",
        "client_reference": "CLI-2026-0002",
        "details": "Jamie Murphy",
        "created_at": "2026-01-12T10:30:00+00:00",
    },
]
SEEDED_AUDIT_LOGS: list[dict[str, str]] = []
BACKUP_RUN_TEMPLATES = [
    {
        "id": "BKP-0001",
        "status": "success",
        "triggered_by": "admin@omega.local",
        "database_backup": "database/omega-2026-06-05.sql",
        "files_backup": "files/clients-2026-06-05.zip",
        "documents_backup": "documents/generated-2026-06-05.zip",
        "created_at": "2026-06-05T18:00:00+00:00",
    }
]
SEEDED_BACKUP_RUNS: list[dict[str, str]] = []
SECURITY_SUMMARY_TEMPLATE = {
    "password_hashing": "pbkdf2_enabled",
    "role_based_access": "enabled",
    "session_timeout_minutes": "30",
    "public_port_exposure": "disabled",
    "remote_access": "cloudflare_tunnel_recommended",
    "remote_access_notes": "Use Cloudflare Tunnel with Cloudflare Access or VPN before enabling offsite access.",
    "file_storage_visibility": "private_server_storage",
}


def _default_generated_document_drafts() -> dict[str, dict[str, object]]:
    return {
        document_type: {
            "document_type": document_type,
            "template_id": "",
            "title": "",
            "summary": "",
            "sections": [],
            "warnings": [],
            "generated_html": "",
            "generation_status": "idle",
        }
        for document_type in SUPPORTED_DOCUMENT_TYPES
    }


def _ensure_generated_document_state(client: dict[str, object]) -> None:
    if "document_drafts" not in client:
        client["document_drafts"] = _default_generated_document_drafts()
    if "generated_documents" not in client:
        client["generated_documents"] = []


def _build_generated_document_name(full_name: str, document_type: str, generated_at: str, version: int) -> str:
    sanitized_name = full_name.replace(" ", "_")
    sanitized_document_type = document_type.replace(" ", "_")
    version_suffix = "" if version == 1 else f"_v{version}"
    return f"{sanitized_name}_{sanitized_document_type}_{generated_at}{version_suffix}.pdf"


def reset_store() -> None:
    global SEEDED_USERS, SEEDED_CLIENTS, SEEDED_AUDIT_LOGS, SEEDED_BACKUP_RUNS
    SEEDED_USERS = {
        email: UserRecord(
            first_name=user.first_name,
            last_name=user.last_name,
            email=user.email,
            password_hash=user.password_hash,
            role=user.role,
            status=user.status,
        )
        for email, user in USER_TEMPLATES.items()
    }
    SEEDED_CLIENTS = deepcopy(CLIENT_TEMPLATES)
    SEEDED_AUDIT_LOGS = deepcopy(AUDIT_LOG_TEMPLATES)
    SEEDED_BACKUP_RUNS = deepcopy(BACKUP_RUN_TEMPLATES)


reset_store()


def get_user(email: str) -> UserRecord | None:
    return SEEDED_USERS.get(email.lower())


def list_users() -> list[dict[str, str]]:
    return [
        {
            "first_name": user.first_name,
            "last_name": user.last_name,
            "email": user.email,
            "role": user.role.value,
            "status": user.status.value,
        }
        for user in SEEDED_USERS.values()
    ]


def create_user(
    *,
    first_name: str,
    last_name: str,
    email: str,
    password: str,
    role: UserRole,
) -> dict[str, str]:
    normalized_email = email.lower()
    if normalized_email in SEEDED_USERS:
        raise ValueError("User already exists")

    user = UserRecord(
        first_name=first_name,
        last_name=last_name,
        email=normalized_email,
        password_hash=hash_password(password),
        role=role,
        status=UserStatus.ACTIVE,
    )
    SEEDED_USERS[normalized_email] = user
    return {
        "first_name": user.first_name,
        "last_name": user.last_name,
        "email": user.email,
        "role": user.role.value,
        "status": user.status.value,
    }


def disable_user(email: str) -> dict[str, str] | None:
    user = SEEDED_USERS.get(email.lower())
    if not user:
        return None

    user.status = UserStatus.DISABLED
    return {
        "first_name": user.first_name,
        "last_name": user.last_name,
        "email": user.email,
        "role": user.role.value,
        "status": user.status.value,
    }


def update_user(
    email: str,
    *,
    first_name: str,
    last_name: str,
    role: UserRole,
) -> dict[str, str] | None:
    user = SEEDED_USERS.get(email.lower())
    if not user:
        return None

    user.first_name = first_name
    user.last_name = last_name
    user.role = role
    return {
        "first_name": user.first_name,
        "last_name": user.last_name,
        "email": user.email,
        "role": user.role.value,
        "status": user.status.value,
    }


def list_clients() -> list[dict[str, str]]:
    return [
        {
            "client_reference": client["client_reference"],
            "first_name": client["first_name"],
            "surname": client["surname"],
            "full_name": client["full_name"],
            "status": client["status"].value,
            "created_by": client["created_by"],
            "updated_by": client["updated_by"],
        }
        for client in SEEDED_CLIENTS
    ]


def list_audit_logs() -> list[dict[str, str]]:
    return deepcopy(SEEDED_AUDIT_LOGS)


def create_backup_run(*, triggered_by: str) -> dict[str, str]:
    item = {
        "id": f"BKP-{len(SEEDED_BACKUP_RUNS) + 1:04d}",
        "status": "success",
        "triggered_by": triggered_by,
        "database_backup": "database/omega-2026-06-06.sql",
        "files_backup": "files/clients-2026-06-06.zip",
        "documents_backup": "documents/generated-2026-06-06.zip",
        "created_at": "2026-06-06T15:00:00+00:00",
    }
    SEEDED_BACKUP_RUNS.insert(0, item)
    return deepcopy(item)


def latest_backup_run() -> dict[str, str] | None:
    if not SEEDED_BACKUP_RUNS:
        return None
    return deepcopy(SEEDED_BACKUP_RUNS[0])


def get_security_summary() -> dict[str, str]:
    return deepcopy(SECURITY_SUMMARY_TEMPLATE)


def get_client(client_reference: str) -> dict[str, object] | None:
    for client in SEEDED_CLIENTS:
        if client["client_reference"] == client_reference:
            _ensure_generated_document_state(client)
            return {
                "client_reference": client["client_reference"],
                "first_name": client["first_name"],
                "surname": client["surname"],
                "full_name": client["full_name"],
                "title": client["title"],
                "status": client["status"].value,
                "created_by": client["created_by"],
                "updated_by": client["updated_by"],
                "created_at": client["created_at"],
                "updated_at": client["updated_at"],
                "email": client["email"],
                "mobile_number": client["mobile_number"],
                "work_phone": client["work_phone"],
                "date_of_birth": client["date_of_birth"],
                "marital_status": client["marital_status"],
                "home_address_line_1": client["home_address_line_1"],
                "home_address_line_2": client["home_address_line_2"],
                "town_city": client["town_city"],
                "county": client["county"],
                "eircode": client["eircode"],
                "partner_name": client["partner_name"],
                "partner_address": client["partner_address"],
                "general_notes": client["general_notes"],
                "dependants": deepcopy(client["dependants"]),
                "document_drafts": deepcopy(client["document_drafts"]),
                "generated_documents": deepcopy(client["generated_documents"]),
            }
    return None


def get_client_generated_document_draft(client_reference: str, document_type: str) -> dict[str, object] | None:
    for client in SEEDED_CLIENTS:
        if client["client_reference"] != client_reference:
            continue
        _ensure_generated_document_state(client)
        draft = client["document_drafts"].get(document_type)
        return deepcopy(draft) if draft else None
    return None


def save_generated_document_draft(
    *,
    client_reference: str,
    document_type: str,
    template_id: str,
    title: str,
    summary: str,
    sections: list[dict[str, object]],
    warnings: list[str],
    generated_html: str,
) -> dict[str, object] | None:
    for client in SEEDED_CLIENTS:
        if client["client_reference"] != client_reference:
            continue

        _ensure_generated_document_state(client)
        generated_at = datetime.now(UTC).date().isoformat()
        draft = {
            "document_type": document_type,
            "template_id": template_id,
            "title": title,
            "summary": summary,
            "sections": deepcopy(sections),
            "warnings": deepcopy(warnings),
            "generated_html": generated_html,
            "generation_status": "completed",
        }
        client["document_drafts"][document_type] = draft

        generated_documents = client["generated_documents"]
        next_version = sum(1 for item in generated_documents if item.get("document_type") == document_type) + 1
        generated_documents.insert(
            0,
            {
                "id": f"DOC-{len(generated_documents) + 1:04d}",
                "document_type": document_type,
                "document_name": _build_generated_document_name(
                    str(client["full_name"]),
                    document_type,
                    generated_at,
                    next_version,
                ),
                "version": f"Version {next_version}",
                "status": "Preview saved",
                "generated_at": generated_at,
                "preview_title": title,
                "preview_html": generated_html,
            },
        )
        return deepcopy(draft)

    return None


def create_client(
    *,
    first_name: str,
    surname: str,
    email: str,
    mobile_number: str,
    marital_status: str,
    date_of_birth: str,
    title: str,
    town_city: str,
    county: str,
    dependants: list[dict[str, str]],
    created_by: str,
) -> dict[str, object]:
    client_reference = f"CLI-2026-{len(SEEDED_CLIENTS) + 1:04d}"
    item = {
        "client_reference": client_reference,
        "first_name": first_name,
        "surname": surname,
        "full_name": f"{first_name} {surname}",
        "title": title,
        "status": ClientStatus.DRAFT,
        "created_by": created_by,
        "updated_by": created_by,
        "created_at": "2026-06-06T13:00:00+00:00",
        "updated_at": "2026-06-06T13:00:00+00:00",
        "email": email,
        "mobile_number": mobile_number,
        "work_phone": "",
        "date_of_birth": date_of_birth,
        "marital_status": marital_status,
        "home_address_line_1": "",
        "home_address_line_2": "",
        "town_city": town_city,
        "county": county,
        "eircode": "",
        "partner_name": "",
        "partner_address": "",
        "general_notes": "",
        "dependants": deepcopy(dependants),
        "document_drafts": _default_generated_document_drafts(),
        "generated_documents": [],
    }
    SEEDED_CLIENTS.append(item)
    return get_client(client_reference) or {}


def update_client(client_reference: str, updates: dict[str, object], updated_by: str) -> dict[str, object] | None:
    for client in SEEDED_CLIENTS:
        if client["client_reference"] == client_reference:
            client.update(updates)
            if "first_name" in updates or "surname" in updates:
                client["full_name"] = f"{client['first_name']} {client['surname']}"
            client["updated_by"] = updated_by
            client["updated_at"] = "2026-06-06T13:15:00+00:00"
            return get_client(client_reference)
    return None


def archive_client(client_reference: str, updated_by: str) -> dict[str, object] | None:
    for client in SEEDED_CLIENTS:
        if client["client_reference"] == client_reference:
            client["status"] = ClientStatus.ARCHIVED
            client["updated_by"] = updated_by
            client["updated_at"] = "2026-06-06T13:20:00+00:00"
            return get_client(client_reference)
    return None
