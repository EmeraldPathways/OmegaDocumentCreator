from __future__ import annotations

from dataclasses import dataclass
import os
from pathlib import Path

from dotenv import load_dotenv


def _resolve_project_root(config_path: Path | None = None) -> Path:
    config_path = config_path or Path(__file__).resolve()
    for candidate in config_path.parents:
        if (candidate / ".env").exists():
            return candidate
    for candidate in config_path.parents:
        if (candidate / "pyproject.toml").exists():
            return candidate
    return config_path.parents[1]


_PROJECT_ROOT = _resolve_project_root()
_DOTENV_PATH = _PROJECT_ROOT / ".env"
if _DOTENV_PATH.exists():
    load_dotenv(_DOTENV_PATH)


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
    pg_dump_bin: str = "pg_dump"
    pg_restore_bin: str = "pg_restore"
    backup_schedule_enabled: bool = False
    backup_schedule_interval_minutes: int = 1440
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
    pension_endpoint_url: str = ""
    pension_request_from: str = ""
    pension_request_from_code: str = ""
    csrf_trusted_origins: list[str] | None = None

    max_upload_size_bytes: int = 50_000_000  # 50 MB default

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


def _env_or(env_key: str, default: str) -> str:
    """Return env var value if set, otherwise the default."""
    return os.getenv(env_key, default)


def _parse_origin_list(raw: str) -> list[str] | None:
    """Parse comma-separated origin list; return None if empty."""
    cleaned = [o.strip().rstrip("/") for o in raw.split(",") if o.strip()]
    return cleaned if cleaned else None


def get_settings(**overrides: str) -> AppSettings:
    # Env vars always take priority over defaults.
    # Explicit overrides (kwargs) take priority over env vars for isolated callers (tests).
    cors_origins_raw = overrides.get("CORS_ORIGINS")
    if cors_origins_raw is None:
        cors_origins_raw = _env_or("CORS_ORIGINS", "")
    cors_origins = _parse_origin_list(cors_origins_raw)

    csrf_trusted_origins_raw = overrides.get("CSRF_TRUSTED_ORIGINS")
    if csrf_trusted_origins_raw is None:
        csrf_trusted_origins_raw = _env_or("CSRF_TRUSTED_ORIGINS", "")
    csrf_trusted_origins = _parse_origin_list(csrf_trusted_origins_raw)

    values = {
        "database_url": overrides.get("DATABASE_URL") or _env_or("DATABASE_URL", "postgresql://placeholder"),
        "file_storage_path": overrides.get("FILE_STORAGE_PATH") or _env_or("FILE_STORAGE_PATH", "storage/clients"),
        "backup_path": overrides.get("BACKUP_PATH") or _env_or("BACKUP_PATH", "storage/backups"),
        "session_secret": overrides.get("SESSION_SECRET") or _env_or("SESSION_SECRET", "development-only"),
        "app_url": overrides.get("APP_URL") or _env_or("APP_URL", "http://127.0.0.1:3007"),
        "admin_email": overrides.get("ADMIN_EMAIL") or _env_or("ADMIN_EMAIL", "admin@omega.local"),
        "admin_password": overrides.get("ADMIN_PASSWORD") or _env_or("ADMIN_PASSWORD", "ChangeMe123!"),
        "staff_email": overrides.get("STAFF_EMAIL") or _env_or("STAFF_EMAIL", "staff@omega.local"),
        "staff_password": overrides.get("STAFF_PASSWORD") or _env_or("STAFF_PASSWORD", "ChangeMe123!"),
        "session_timeout_minutes": int(
            overrides.get("SESSION_TIMEOUT_MINUTES") or _env_or("SESSION_TIMEOUT_MINUTES", "30")
        ),
        "cors_origins": cors_origins,
        "trusted_proxy_count": int(
            overrides.get("TRUSTED_PROXY_COUNT") or _env_or("TRUSTED_PROXY_COUNT", "0")
        ),
        "cookie_secure": (overrides.get("COOKIE_SECURE") or _env_or("COOKIE_SECURE", "false")).lower() == "true",
        "cookie_samesite": overrides.get("COOKIE_SAMESITE") or _env_or("COOKIE_SAMESITE", "lax"),
        "environment": overrides.get("ENVIRONMENT") or _env_or("ENVIRONMENT", "development"),
        "remote_access_mode": overrides.get("REMOTE_ACCESS_MODE") or _env_or("REMOTE_ACCESS_MODE", "local_only"),
        "pdf_converter_bin": overrides.get("PDF_CONVERTER_BIN") or _env_or("PDF_CONVERTER_BIN", "soffice"),
        "pg_dump_bin": overrides.get("PG_DUMP_BIN") or _env_or("PG_DUMP_BIN", "pg_dump"),
        "pg_restore_bin": overrides.get("PG_RESTORE_BIN") or _env_or("PG_RESTORE_BIN", "pg_restore"),
        "backup_schedule_enabled": (
            overrides.get("BACKUP_SCHEDULE_ENABLED") or _env_or("BACKUP_SCHEDULE_ENABLED", "false")
        ).lower() == "true",
        "backup_schedule_interval_minutes": int(
            overrides.get("BACKUP_SCHEDULE_INTERVAL_MINUTES")
            or _env_or("BACKUP_SCHEDULE_INTERVAL_MINUTES", "1440")
        ),
        "local_ai_enabled": (overrides.get("LOCAL_AI_ENABLED") or _env_or("LOCAL_AI_ENABLED", "false")).lower() == "true",
        "local_ai_provider": overrides.get("LOCAL_AI_PROVIDER") or _env_or("LOCAL_AI_PROVIDER", "disabled"),
        "local_ai_model": overrides.get("LOCAL_AI_MODEL") or _env_or("LOCAL_AI_MODEL", ""),
        "local_ai_embedding_model": overrides.get("LOCAL_AI_EMBEDDING_MODEL")
        or _env_or("LOCAL_AI_EMBEDDING_MODEL", ""),
        "ai_enabled": (overrides.get("AI_ENABLED") or _env_or("AI_ENABLED", "false")).lower() == "true",
        "ai_provider": overrides.get("AI_PROVIDER") or _env_or("AI_PROVIDER", "gemini"),
        "ai_api_key": overrides.get("AI_API_KEY") or _env_or("AI_API_KEY", os.getenv("GEMINI_API_KEY", "")),
        "ai_model": overrides.get("AI_MODEL") or _env_or("AI_MODEL", "gemini-2.0-flash"),
        "ai_temperature": float(overrides.get("AI_TEMPERATURE") or _env_or("AI_TEMPERATURE", "0.3")),
        "phi_endpoint_url": overrides.get("PHI_ENDPOINT_URL") or _env_or("PHI_ENDPOINT_URL", ""),
        "phi_username": overrides.get("PHI_USERNAME") or _env_or("PHI_USERNAME", ""),
        "phi_password": overrides.get("PHI_PASSWORD") or _env_or("PHI_PASSWORD", ""),
        "phi_request_from": overrides.get("PHI_REQUEST_FROM") or _env_or("PHI_REQUEST_FROM", ""),
        "phi_request_from_code": overrides.get("PHI_REQUEST_FROM_CODE") or _env_or("PHI_REQUEST_FROM_CODE", ""),
        "pension_endpoint_url": overrides.get("PENSION_ENDPOINT_URL") or _env_or("PENSION_ENDPOINT_URL", ""),
        "pension_request_from": overrides.get("PENSION_REQUEST_FROM") or _env_or("PENSION_REQUEST_FROM", _env_or("PHI_REQUEST_FROM", "")),
        "pension_request_from_code": overrides.get("PENSION_REQUEST_FROM_CODE")
        or _env_or("PENSION_REQUEST_FROM_CODE", _env_or("PHI_REQUEST_FROM_CODE", "")),
        "csrf_trusted_origins": csrf_trusted_origins,
        "max_upload_size_bytes": int(
            overrides.get("MAX_UPLOAD_SIZE_BYTES") or _env_or("MAX_UPLOAD_SIZE_BYTES", "50000000")
        ),
    }
    settings = AppSettings(**values)
    ensure_storage_directories(settings)
    return settings
