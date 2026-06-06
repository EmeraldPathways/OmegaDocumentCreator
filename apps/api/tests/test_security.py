from datetime import UTC, datetime, timedelta
import unittest

from app.security import hash_password, is_session_expired, verify_password


class SecurityTests(unittest.TestCase):
    def test_passwords_are_hashed_and_verifiable(self) -> None:
        password_hash = hash_password("ChangeMe123!")

        self.assertNotEqual(password_hash, "ChangeMe123!")
        self.assertTrue(verify_password("ChangeMe123!", password_hash))
        self.assertFalse(verify_password("wrong-password", password_hash))

    def test_session_expiry_detects_old_timestamps(self) -> None:
        recent = (datetime.now(UTC) - timedelta(minutes=10)).isoformat()
        expired = (datetime.now(UTC) - timedelta(minutes=45)).isoformat()

        self.assertFalse(is_session_expired(recent, timeout_minutes=30))
        self.assertTrue(is_session_expired(expired, timeout_minutes=30))
