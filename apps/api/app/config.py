from __future__ import annotations

from dataclasses import dataclass
import os
from pathlib import Path


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
    pdf_converter_bin: str = "soffice"
    local_ai_enabled: bool = False
    local_ai_provider: str = "disabled"
    local_ai_model: str = ""
    local_ai_embedding_model: str = ""
    ai_enabled: bool = False
    ai_provider: str = "disabled"
    ai_api_key: str = ""
    ai_model: str = ""

    def __post_init__(self) -> None:
        self.file_storage_path = Path(self.file_storage_path)
        self.backup_path = Path(self.backup_path)


def ensure_storage_directories(settings: AppSettings) -> None:
    settings.file_storage_path.mkdir(parents=True, exist_ok=True)
    settings.backup_path.mkdir(parents=True, exist_ok=True)


def get_settings(**overrides: str) -> AppSettings:
    local_ai_enabled_value = overrides.get("LOCAL_AI_ENABLED") or os.getenv("LOCAL_AI_ENABLED", "false")
    ai_enabled_value = overrides.get("AI_ENABLED") or os.getenv("AI_ENABLED", "false")
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
        "pdf_converter_bin": overrides.get("PDF_CONVERTER_BIN") or os.getenv("PDF_CONVERTER_BIN", "soffice"),
        "local_ai_enabled": local_ai_enabled_value.lower() == "true",
        "local_ai_provider": overrides.get("LOCAL_AI_PROVIDER") or os.getenv("LOCAL_AI_PROVIDER", "disabled"),
        "local_ai_model": overrides.get("LOCAL_AI_MODEL") or os.getenv("LOCAL_AI_MODEL", ""),
        "local_ai_embedding_model": overrides.get("LOCAL_AI_EMBEDDING_MODEL")
        or os.getenv("LOCAL_AI_EMBEDDING_MODEL", ""),
        "ai_enabled": ai_enabled_value.lower() == "true",
        "ai_provider": overrides.get("AI_PROVIDER") or os.getenv("AI_PROVIDER", "disabled"),
        "ai_api_key": overrides.get("AI_API_KEY") or os.getenv("AI_API_KEY", ""),
        "ai_model": overrides.get("AI_MODEL") or os.getenv("AI_MODEL", ""),
    }
    settings = AppSettings(**values)
    ensure_storage_directories(settings)
    return settings
