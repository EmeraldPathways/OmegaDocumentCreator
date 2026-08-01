import unittest

from app.main import _sanitize_admin_settings_payload


class AdminSettingsPayloadTests(unittest.TestCase):
    def test_sanitize_admin_settings_payload_hides_api_key_and_reports_presence(self) -> None:
        sanitized = _sanitize_admin_settings_payload(
            {
                "admin_email": "admin@omega.local",
                "app_url": "http://127.0.0.1:3007",
                "backup_path": "storage/backups",
                "file_storage_path": "storage/clients",
                "remote_access_mode": "local_only",
                "session_timeout_minutes": 30,
                "ai_enabled": True,
                "ai_model": "gemini-2.0-flash",
                "ai_api_key": "super-secret-key",
            }
        )

        self.assertEqual(sanitized["ai_api_key"], "")
        self.assertTrue(sanitized["ai_api_key_configured"])
        self.assertEqual(sanitized["ai_provider"], "gemini")
        self.assertTrue(sanitized["requires_restart"])

    def test_sanitize_admin_settings_payload_reports_missing_api_key(self) -> None:
        sanitized = _sanitize_admin_settings_payload(
            {
                "admin_email": "admin@omega.local",
                "app_url": "http://127.0.0.1:3007",
                "backup_path": "storage/backups",
                "file_storage_path": "storage/clients",
                "remote_access_mode": "local_only",
                "session_timeout_minutes": 30,
                "ai_enabled": False,
                "ai_model": "gemini-2.0-flash",
                "ai_api_key": "",
            }
        )

        self.assertFalse(sanitized["ai_api_key_configured"])
