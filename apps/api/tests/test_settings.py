from pathlib import Path
import tempfile
import unittest

from app.config import AppSettings, ensure_storage_directories

PROJECT_ROOT = Path(__file__).resolve().parents[3]


class SettingsTests(unittest.TestCase):
    def test_environment_values_are_loaded_and_normalized(self) -> None:
        settings = AppSettings(
            database_url="postgresql://db",
            file_storage_path="storage/clients",
            backup_path="storage/backups",
            session_secret="secret",
            app_url="http://127.0.0.1:3007",
            admin_email="admin@omega.local",
        )

        self.assertEqual(settings.database_url, "postgresql://db")
        self.assertEqual(settings.file_storage_path, (PROJECT_ROOT / "storage/clients").resolve())
        self.assertEqual(settings.backup_path, (PROJECT_ROOT / "storage/backups").resolve())
        self.assertEqual(settings.session_timeout_minutes, 30)

    def test_storage_directories_are_created(self) -> None:
        root = Path(tempfile.mkdtemp(prefix="omega-settings-"))
        clients = root / "clients"
        backups = root / "backups"

        settings = AppSettings(
            database_url="postgresql://db",
            file_storage_path=clients,
            backup_path=backups,
            session_secret="secret",
            app_url="http://127.0.0.1:3007",
            admin_email="admin@omega.local",
        )

        ensure_storage_directories(settings)

        self.assertTrue(clients.exists())
        self.assertTrue(backups.exists())

        for item in sorted(root.rglob("*"), reverse=True):
            if item.is_file():
                item.unlink()
            elif item.is_dir():
                item.rmdir()
        root.rmdir()
