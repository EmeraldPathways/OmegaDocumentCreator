from __future__ import annotations

from dataclasses import dataclass
import os
from pathlib import Path

_PROJECT_ROOT = Path(__file__).resolve().parents[3]


@dataclass(slots=True)
class AppSettings:
    database_url: str
    file_storage_path: Path
    backup_path: Path
    session_secret: str
    app_url: str
    admin_email: str
    admin_password: str = "ChangeMe123!"
    staff_email: str = "staff@omega.local"
    staff_password: str = "ChangeMe123!"
    session_timeout_minutes: int = 30
    cors_origins: list[str] | None = None
    trusted_proxy_count: int = 0
    cookie_secure: bool = False
    cookie_samesite: str = "lax"
    environment: str = "development"
    remote_access_mode: str = "local_only"
    pdf_converter_bin: str = "soffice"
    local_ai_enabled: bool = False
    local_ai_provider: str = "disabled"
    local_ai_model: str = ""
    local_ai_embedding_model: str = ""
    ai_enabled: bool = False
    ai_provider: str = "gemini"
    ai_api_key: str = ""
    ai_model: str = "gemini-2.0-flash"
    ai_temperature: float = 0.3
    phi_endpoint_url: str = ""
    phi_username: str = ""
    phi_password: str = ""
    phi_request_from: str = ""
    phi_request_from_code: str = ""

    def __post_init__(self) -> None:
        self.file_storage_path = Path(self.file_storage_path)
        self.backup_path = Path(self.backup_path)
        if not self.file_storage_path.is_absolute():
            self.file_storage_path = (_PROJECT_ROOT / self.file_storage_path).resolve()
        if not self.backup_path.is_absolute():
            self.backup_path = (_PROJECT_ROOT / self.backup_path).resolve()


def ensure_storage_directories(settings: AppSettings) -> None:
    settings.file_storage_path.mkdir(parents=True, exist_ok=True)
    settings.backup_path.mkdir(parents=True, exist_ok=True)


def get_settings(**overrides: str) -> AppSettings:
    local_ai_enabled_value = overrides.get("LOCAL_AI_ENABLED") or os.getenv("LOCAL_AI_ENABLED", "false")
    ai_enabled_value = overrides.get("AI_ENABLED") or os.getenv("AI_ENABLED", "false")

    cors_origins_raw = overrides.get("CORS_ORIGINS") or os.getenv("CORS_ORIGINS", "")
    cors_origins = [o.strip() for o in cors_origins_raw.split(",") if o.strip()] if cors_origins_raw else None

    values = {
        "database_url": overrides.get("DATABASE_URL") or os.getenv("DATABASE_URL", "postgresql://placeholder"),
        "file_storage_path": overrides.get("FILE_STORAGE_PATH") or os.getenv("FILE_STORAGE_PATH", "storage/clients"),
        "backup_path": overrides.get("BACKUP_PATH") or os.getenv("BACKUP_PATH", "storage/backups"),
        "session_secret": overrides.get("SESSION_SECRET") or os.getenv("SESSION_SECRET", "development-only"),
        "app_url": overrides.get("APP_URL") or os.getenv("APP_URL", "http://office-server.local"),
        "admin_email": overrides.get("ADMIN_EMAIL") or os.getenv("ADMIN_EMAIL", "admin@omega.local"),
        "admin_password": overrides.get("ADMIN_PASSWORD") or os.getenv("ADMIN_PASSWORD", "ChangeMe123!"),
        "staff_email": overrides.get("STAFF_EMAIL") or os.getenv("STAFF_EMAIL", "staff@omega.local"),
        "staff_password": overrides.get("STAFF_PASSWORD") or os.getenv("STAFF_PASSWORD", "ChangeMe123!"),
        "session_timeout_minutes": int(
            overrides.get("SESSION_TIMEOUT_MINUTES") or os.getenv("SESSION_TIMEOUT_MINUTES", "30")
        ),
        "cors_origins": cors_origins,
        "trusted_proxy_count": int(
            overrides.get("TRUSTED_PROXY_COUNT") or os.getenv("TRUSTED_PROXY_COUNT", "0")
        ),
        "cookie_secure": (overrides.get("COOKIE_SECURE") or os.getenv("COOKIE_SECURE", "false")).lower() == "true",
        "cookie_samesite": overrides.get("COOKIE_SAMESITE") or os.getenv("COOKIE_SAMESITE", "lax"),
        "environment": overrides.get("ENVIRONMENT") or os.getenv("ENVIRONMENT", "development"),
        "remote_access_mode": overrides.get("REMOTE_ACCESS_MODE") or os.getenv("REMOTE_ACCESS_MODE", "local_only"),
        "pdf_converter_bin": overrides.get("PDF_CONVERTER_BIN") or os.getenv("PDF_CONVERTER_BIN", "soffice"),
        "local_ai_enabled": local_ai_enabled_value.lower() == "true",
        "local_ai_provider": overrides.get("LOCAL_AI_PROVIDER") or os.getenv("LOCAL_AI_PROVIDER", "disabled"),
        "local_ai_model": overrides.get("LOCAL_AI_MODEL") or os.getenv("LOCAL_AI_MODEL", ""),
        "local_ai_embedding_model": overrides.get("LOCAL_AI_EMBEDDING_MODEL")
        or os.getenv("LOCAL_AI_EMBEDDING_MODEL", ""),
        "ai_enabled": ai_enabled_value.lower() == "true",
        "ai_provider": overrides.get("AI_PROVIDER") or os.getenv("AI_PROVIDER", "gemini"),
        "ai_api_key": overrides.get("AI_API_KEY") or os.getenv("AI_API_KEY", os.getenv("GEMINI_API_KEY", "")),
        "ai_model": overrides.get("AI_MODEL") or os.getenv("AI_MODEL", "gemini-2.0-flash"),
        "ai_temperature": float(overrides.get("AI_TEMPERATURE") or os.getenv("AI_TEMPERATURE", "0.3")),
        "phi_endpoint_url": overrides.get("PHI_ENDPOINT_URL") or os.getenv("PHI_ENDPOINT_URL", ""),
        "phi_username": overrides.get("PHI_USERNAME") or os.getenv("PHI_USERNAME", ""),
        "phi_password": overrides.get("PHI_PASSWORD") or os.getenv("PHI_PASSWORD", ""),
        "phi_request_from": overrides.get("PHI_REQUEST_FROM") or os.getenv("PHI_REQUEST_FROM", ""),
        "phi_request_from_code": overrides.get("PHI_REQUEST_FROM_CODE") or os.getenv("PHI_REQUEST_FROM_CODE", ""),
    }
    settings = AppSettings(**values)
    ensure_storage_directories(settings)
    return settings