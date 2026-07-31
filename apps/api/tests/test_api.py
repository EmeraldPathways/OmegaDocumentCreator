"""Phase 2 DB-backed API tests.

Requires a running PostgreSQL instance reachable via TEST_DATABASE_URL
or DATABASE_URL.  Falls back to postgresql://postgres:postgres@localhost:5432/omega_test.
"""

from __future__ import annotations

import os
import uuid
import unittest
from unittest.mock import Mock, patch

from fastapi.testclient import TestClient
from sqlalchemy.orm import sessionmaker

os.environ.setdefault("ADMIN_EMAIL", "admin@omega.local")
os.environ.setdefault("ADMIN_PASSWORD", "ChangeMe123!")
os.environ.setdefault("STAFF_EMAIL", "staff@omega.local")
os.environ.setdefault("STAFF_PASSWORD", "ChangeMe123!")

# Import test helpers from the tests package
import db_test_helpers  # noqa: E402

import app.db  # noqa: E402
import app.main as app_main  # noqa: E402

from app.main import app  # noqa: E402

app_main.SYSTEM_ACCESS_EMAILS = set(app_main.SYSTEM_ACCESS_EMAILS) | {"admin@omega.local"}
app_main.FULL_RECORD_ACCESS_EMAILS = set(app_main.FULL_RECORD_ACCESS_EMAILS) | {"staff@omega.local"}


def _db_is_available() -> bool:
    try:
        engine = db_test_helpers._build_test_engine()
        with engine.connect():
            return True
    except Exception:
        return False


_DB_AVAILABLE = _db_is_available()
_test_engine = db_test_helpers.setup_test_db() if _DB_AVAILABLE else None


class PhiParsingTests(unittest.TestCase):
    def test_build_phi_request_payload_includes_indexation(self) -> None:
        from app.config import get_settings
        from app.document_generation import build_phi_request_payload

        payload = build_phi_request_payload(
            get_settings(
                PHI_ENDPOINT_URL="http://example.test/interface_phi.php",
                PHI_USERNAME="user",
                PHI_PASSWORD="pass",
                PHI_REQUEST_FROM="omega",
                PHI_REQUEST_FROM_CODE="code",
            ),
            {
                "dateOfBirth": "1996-06-29",
                "letterDate": "2026-06-29",
                "gender": "Female",
                "smokerStatus": "Non-Smoker",
                "coverAge": "65",
                "recommendedCover": "30000",
                "deferredPeriod": "13 weeks",
                "phiOccupationalClass": "2",
                "phiIndexation": "Y",
            },
        )

        self.assertIn({"label": "Indexation", "value": "Y"}, payload["request_fields"])
        self.assertIn("<Indexation>Y</Indexation>", payload["xml"])
        self.assertNotIn("<Age>", payload["xml"])


class AiPromptTests(unittest.TestCase):
    def test_build_document_prompt_only_includes_allowlisted_fields(self) -> None:
        from app.ai import build_document_prompt

        prompt = build_document_prompt(
            client_name="Jamie Murphy",
            client_reference="CLI-2026-0002",
            document_type="Statement of Suitability",
            template_id="statement-template",
            workflow_snapshot={
                "fullName": "Jamie Murphy",
                "needsObjectives": "Protect monthly income",
                "recommendedCover": "30000",
                "secretInternalNote": "do not leak",
                "rawHtmlDraft": "<script>alert(1)</script>",
                "apiToken": "super-secret-token",
            },
        )

        self.assertIn("fullName: Jamie Murphy", prompt)
        self.assertIn("needsObjectives: Protect monthly income", prompt)
        self.assertIn("recommendedCover: 30000", prompt)
        self.assertNotIn("secretInternalNote", prompt)
        self.assertNotIn("rawHtmlDraft", prompt)
        self.assertNotIn("apiToken", prompt)


class StartupConfigurationTests(unittest.TestCase):
    def test_startup_configuration_errors_empty_in_development(self) -> None:
        from app.config import get_settings

        with patch.object(
            app_main,
            "settings",
            get_settings(
                ENVIRONMENT="development",
                SESSION_SECRET="development-only",
                APP_URL="http://office-server.local",
            ),
        ):
            self.assertEqual(app_main._startup_configuration_errors(), [])

    def test_startup_configuration_errors_fail_closed_for_remote_production_defaults(self) -> None:
        from app.config import get_settings

        with patch.object(
            app_main,
            "settings",
            get_settings(
                ENVIRONMENT="production",
                REMOTE_ACCESS_MODE="remote",
                SESSION_SECRET="development-only",
                APP_URL="http://office-server.local",
                COOKIE_SECURE="false",
                CORS_ORIGINS="",
                CSRF_TRUSTED_ORIGINS="",
            ),
        ):
            errors = app_main._startup_configuration_errors()

        self.assertIn("SESSION_SECRET must be changed from the default for non-development environments.", errors)
        self.assertIn("APP_URL must be set to the deployed base URL for non-development environments.", errors)
        self.assertIn("APP_URL must use https:// when REMOTE_ACCESS_MODE is not local_only.", errors)
        self.assertIn("COOKIE_SECURE must be true when REMOTE_ACCESS_MODE is not local_only.", errors)
        self.assertIn("CORS_ORIGINS must be configured when REMOTE_ACCESS_MODE is not local_only.", errors)
        self.assertIn("CSRF_TRUSTED_ORIGINS must be configured when REMOTE_ACCESS_MODE is not local_only.", errors)

    def test_startup_configuration_warnings_include_proxy_hint_in_non_dev(self) -> None:
        from app.config import get_settings

        with patch.object(
            app_main,
            "settings",
            get_settings(
                ENVIRONMENT="production",
                SESSION_SECRET="custom-secret",
                APP_URL="https://omega.example.com",
                TRUSTED_PROXY_COUNT="0",
            ),
        ):
            warnings = app_main._startup_configuration_warnings()

        self.assertIn(
            "TRUSTED_PROXY_COUNT is 0 - assuming no reverse proxy. Set it to match production proxy configuration.",
            warnings,
        )

    def test_submit_phi_request_parses_live_output_quote_path(self) -> None:
        from app.config import get_settings
        from app.document_generation import submit_phi_request

        xml_result = """<?xml version="1.0"?>
<Result>
  <Errors></Errors>
  <Outputs>
    <Quotes>
      <Company>
        <Name>Irish Life</Name>
        <Type>Guaranteed</Type>
        <Level>136.53</Level>
        <Esc3></Esc3>
        <Esc5>149.78</Esc5>
      </Company>
      <Company>
        <Name>Aviva</Name>
        <Type>Reviewable</Type>
        <Level>102.50</Level>
        <Esc3>116.40</Esc3>
        <Esc5></Esc5>
      </Company>
    </Quotes>
  </Outputs>
</Result>
"""
        mock_response = Mock()
        mock_response.read.return_value = xml_result.encode("utf-8")
        mock_response.__enter__ = Mock(return_value=mock_response)
        mock_response.__exit__ = Mock(return_value=False)

        with patch("app.document_generation.urlopen", return_value=mock_response):
            result = submit_phi_request(
                get_settings(
                    PHI_ENDPOINT_URL="http://example.test/interface_phi.php",
                    PHI_USERNAME="user",
                    PHI_PASSWORD="pass",
                    PHI_REQUEST_FROM="omega",
                    PHI_REQUEST_FROM_CODE="code",
                ),
                {
                    "dateOfBirth": "1990-11-08",
                    "letterDate": "2026-06-29",
                    "gender": "Female",
                    "smokerStatus": "Non-Smoker",
                    "coverAge": "65",
                    "recommendedCover": "30000",
                    "deferredPeriod": "13 weeks",
                    "phiOccupationalClass": "2",
                    "phiIndexation": "Y",
                },
            )

        self.assertEqual(result["status"], "sent")
        self.assertEqual(len(result["quote_results"]), 2)
        self.assertEqual(result["quote_results"][0]["provider_name"], "Irish Life")
        self.assertEqual(result["quote_results"][1]["escalation_3_premium"], "116.40")

if _test_engine is not None:
    app.db._engine = _test_engine
    app.db._SessionLocal = sessionmaker(bind=_test_engine, autoflush=False, autocommit=False)


@unittest.skipUnless(_DB_AVAILABLE, "PostgreSQL not available for Phase 2 tests")
class ApiTests(unittest.TestCase):
    @classmethod
    def setUpClass(cls) -> None:
        pass

    @classmethod
    def tearDownClass(cls) -> None:
        if _test_engine is not None:
            db_test_helpers.teardown_test_db(_test_engine)

    def setUp(self) -> None:
        assert _test_engine is not None
        # Reset in-memory login rate limiter between tests
        from app.main import _LOGIN_RATE_WINDOW as rate_window
        rate_window.clear()

        db = db_test_helpers.new_test_session(_test_engine)
        try:
            db_test_helpers.truncate_all(db)
            db_test_helpers.seed_default_users(db)
            db_test_helpers.seed_default_clients(db)
            db.commit()
        finally:
            db.close()

        self.client = TestClient(app, headers={"Origin": "http://127.0.0.1:8007"})

    # ------------------------------------------------------------------
    # Auth tests
    # ------------------------------------------------------------------

    def test_login_returns_seeded_user_profile(self) -> None:
        response = self.client.post(
            "/auth/login",
            json={"email": "admin@omega.local", "password": "ChangeMe123!"},
        )
        self.assertEqual(response.status_code, 200)
        payload = response.json()
        self.assertEqual(payload["user"]["email"], "admin@omega.local")
        self.assertEqual(payload["user"]["role"], "admin")

    def test_login_works_for_staff_user(self) -> None:
        response = self.client.post(
            "/auth/login",
            json={"email": "staff@omega.local", "password": "ChangeMe123!"},
        )
        self.assertEqual(response.status_code, 200)
        self.assertEqual(response.json()["user"]["role"], "staff")

    def test_login_fails_with_bad_password(self) -> None:
        response = self.client.post(
            "/auth/login",
            json={"email": "admin@omega.local", "password": "WrongPassword!"},
        )
        self.assertEqual(response.status_code, 401)

    def test_me_requires_login(self) -> None:
        response = self.client.get("/auth/me")
        self.assertEqual(response.status_code, 401)

    def test_me_returns_logged_in_user(self) -> None:
        self.client.post(
            "/auth/login",
            json={"email": "staff@omega.local", "password": "ChangeMe123!"},
        )
        response = self.client.get("/auth/me")
        self.assertEqual(response.status_code, 200)
        self.assertEqual(response.json()["user"]["role"], "staff")

    # ------------------------------------------------------------------
    # Phase 6: PostgreSQL session persistence tests
    # ------------------------------------------------------------------

    def test_login_creates_persisted_session_row(self) -> None:
        """Login writes a row to the sessions table."""
        from app.db import get_session
        from app.models import Session as SessionModel

        self.client.post(
            "/auth/login",
            json={"email": "admin@omega.local", "password": "ChangeMe123!"},
        )
        db = get_session()
        try:
            rows = (
                db.query(SessionModel)
                .filter(SessionModel.user_email == "admin@omega.local")
                .all()
            )
            self.assertGreaterEqual(len(rows), 1, "Expected at least 1 persisted session row after login")
            db.commit()
        finally:
            db.close()

    def test_auth_me_works_with_valid_persisted_session(self) -> None:
        """After login, /auth/me returns user profile using the persisted session."""
        self.client.post(
            "/auth/login",
            json={"email": "staff@omega.local", "password": "ChangeMe123!"},
        )
        response = self.client.get("/auth/me")
        self.assertEqual(response.status_code, 200)
        self.assertEqual(response.json()["user"]["role"], "staff")

    def test_logout_deletes_persisted_session_row(self) -> None:
        """Logout removes the persisted session row for the current user."""
        from app.db import get_session
        from app.models import Session as SessionModel

        self.client.post(
            "/auth/login",
            json={"email": "admin@omega.local", "password": "ChangeMe123!"},
        )
        # Verify session row exists in DB after login
        db = get_session()
        try:
            rows_before = (
                db.query(SessionModel)
                .filter(SessionModel.user_email == "admin@omega.local")
                .all()
            )
            self.assertGreaterEqual(len(rows_before), 1, "Expected at least 1 session row after login")
            db.commit()
        finally:
            db.close()

        self.client.post("/auth/logout")

        # Verify session row is removed from DB after logout
        db2 = get_session()
        try:
            rows_after = (
                db2.query(SessionModel)
                .filter(SessionModel.user_email == "admin@omega.local")
                .all()
            )
            self.assertEqual(len(rows_after), 0, f"Expected 0 session rows after logout, got {len(rows_after)}")
            db2.commit()
        finally:
            db2.close()

    def test_deleted_session_row_causes_401(self) -> None:
        """If the persisted session row is deleted, /auth/me returns 401."""
        from app.db import get_session
        from app.models import Session as SessionModel
        from app.repositories.sessions import SessionRepository

        self.client.post(
            "/auth/login",
            json={"email": "staff@omega.local", "password": "ChangeMe123!"},
        )
        # Find the active session row via DB query
        db = get_session()
        try:
            rows = (
                db.query(SessionModel)
                .filter(SessionModel.user_email == "staff@omega.local")
                .all()
            )
            self.assertGreaterEqual(len(rows), 1, "Expected at least 1 session row after login")
            # Get the fresh session row (created during login) and delete it
            fresh_row = rows[-1]
            session_repo = SessionRepository(db)
            session_repo.delete_by_id(str(fresh_row.id))
            db.commit()
        finally:
            db.close()

        response = self.client.get("/auth/me")
        self.assertEqual(response.status_code, 401)

    def test_expired_session_row_causes_401(self) -> None:
        """If the persisted session row is expired, /auth/me returns 401."""
        from app.db import get_session
        from datetime import UTC, datetime, timedelta
        from app.models import Session as SessionModel

        self.client.post(
            "/auth/login",
            json={"email": "staff@omega.local", "password": "ChangeMe123!"},
        )
        # Find the active session row and expire it
        db = get_session()
        try:
            rows = (
                db.query(SessionModel)
                .filter(SessionModel.user_email == "staff@omega.local")
                .all()
            )
            self.assertGreaterEqual(len(rows), 1, "Expected at least 1 session row after login")
            fresh_row = rows[-1]
            fresh_row.expires_at = datetime.now(UTC) - timedelta(minutes=1)
            db.commit()
        finally:
            db.close()

        response = self.client.get("/auth/me")
        self.assertEqual(response.status_code, 401)

    def test_auth_me_extends_persisted_session_expiry(self) -> None:
        """A valid authenticated request refreshes the DB-backed session expiry."""
        from app.db import get_session
        from app.models import Session as SessionModel

        self.client.post(
            "/auth/login",
            json={"email": "staff@omega.local", "password": "ChangeMe123!"},
        )

        db = get_session()
        try:
            session_row = (
                db.query(SessionModel)
                .filter(SessionModel.user_email == "staff@omega.local")
                .order_by(SessionModel.created_at.desc())
                .first()
            )
            self.assertIsNotNone(session_row)
            original_expiry = session_row.expires_at
            db.commit()
        finally:
            db.close()

        response = self.client.get("/auth/me")
        self.assertEqual(response.status_code, 200)

        db2 = get_session()
        try:
            refreshed_row = (
                db2.query(SessionModel)
                .filter(SessionModel.user_email == "staff@omega.local")
                .order_by(SessionModel.created_at.desc())
                .first()
            )
            self.assertIsNotNone(refreshed_row)
            self.assertGreater(refreshed_row.expires_at, original_expiry)
            db2.commit()
        finally:
            db2.close()

    def test_two_sessions_coexist_and_invalidating_one_does_not_invalidate_other(self) -> None:
        """Two login sessions for the same user can coexist; logout only invalidates one."""
        from app.db import get_session
        from datetime import UTC, datetime

        # Login as admin (session A)
        self.client.post(
            "/auth/login",
            json={"email": "admin@omega.local", "password": "ChangeMe123!"},
        )
        # Capture session A
        client_a_cookies = dict(self.client.cookies)

        # Login again as admin (session B, overwrites current cookie)
        self.client.post(
            "/auth/login",
            json={"email": "admin@omega.local", "password": "ChangeMe123!"},
        )

        # Verify two unexpired persisted session rows exist
        db = get_session()
        try:
            from app.models import Session as SessionModel
            rows = (
                db.query(SessionModel)
                .filter(
                    SessionModel.user_email == "admin@omega.local",
                    SessionModel.expires_at > datetime.now(UTC),
                )
                .all()
            )
            self.assertEqual(len(rows), 2, f"Expected 2 unexpired session rows, got {len(rows)}")
            db.commit()
        finally:
            db.close()

        # Logout (invalidates session B only)
        self.client.post("/auth/logout")

        # Session B invalidated — /auth/me should fail
        response_b = self.client.get("/auth/me")
        self.assertEqual(response_b.status_code, 401)

        # Restore cookie A and verify session A still works
        self.client.cookies.clear()
        for key, value in client_a_cookies.items():
            self.client.cookies.set(key, value)

        response_a = self.client.get("/auth/me")
        self.assertEqual(response_a.status_code, 200)
        self.assertEqual(response_a.json()["user"]["role"], "admin")

    # ------------------------------------------------------------------
    # Phase 8: Health/readiness tests
    # ------------------------------------------------------------------

    def test_health_endpoint_returns_environment_info(self) -> None:
        response = self.client.get("/health")
        self.assertEqual(response.status_code, 200)
        payload = response.json()
        self.assertEqual(payload["status"], "ok")
        self.assertIn("app_url", payload)
        self.assertIn("environment", payload)
        self.assertIn("remote_access_mode", payload)

    def test_readiness_endpoint_reports_db_and_storage_status(self) -> None:
        response = self.client.get("/ready")
        self.assertEqual(response.status_code, 200)
        payload = response.json()
        self.assertIn("ready", payload)
        self.assertIn("checks", payload)
        self.assertIn("database", payload["checks"])
        self.assertIn("file_storage", payload["checks"])
        self.assertIn("backup_storage", payload["checks"])

    # ------------------------------------------------------------------
    # Client tests (DB-backed)
    # ------------------------------------------------------------------

    def test_clients_returns_seeded_client(self) -> None:
        self.client.post(
            "/auth/login",
            json={"email": "staff@omega.local", "password": "ChangeMe123!"},
        )
        response = self.client.get("/clients")
        self.assertEqual(response.status_code, 200)
        items = response.json()["items"]
        refs = [c["client_reference"] for c in items]
        self.assertIn("CLI-2026-0001", refs)
        self.assertIn("CLI-2026-0002", refs)

    def test_client_detail_returns_full_seeded_profile(self) -> None:
        self.client.post(
            "/auth/login",
            json={"email": "staff@omega.local", "password": "ChangeMe123!"},
        )
        response = self.client.get("/clients/CLI-2026-0002")
        self.assertEqual(response.status_code, 200)
        payload = response.json()["item"]
        self.assertEqual(payload["client_reference"], "CLI-2026-0002")
        self.assertEqual(payload["full_name"], "Jamie Murphy")
        self.assertEqual(payload["email"], "jamie.murphy@example.com")
        self.assertEqual(payload["mobile_number"], "0870000002")

    def test_unauthenticated_clients_returns_401(self) -> None:
        """GET /clients without auth must now return 401."""
        response = self.client.get("/clients")
        self.assertEqual(response.status_code, 401)

    def test_unauthenticated_client_detail_returns_401(self) -> None:
        """GET /clients/{ref} without auth must now return 401."""
        response = self.client.get("/clients/CLI-2026-0002")
        self.assertEqual(response.status_code, 401)

    def test_admin_can_create_client_record(self) -> None:
        self.client.post(
            "/auth/login",
            json={"email": "admin@omega.local", "password": "ChangeMe123!"},
        )
        response = self.client.post(
            "/clients",
            json={
                "first_name": "Patrick",
                "surname": "Byrne",
                "email": "patrick.byrne@example.com",
                "mobile_number": "0871000001",
                "marital_status": "Married",
                "date_of_birth": "1982-05-14",
                "title": "Mr",
                "town_city": "Dublin",
                "county": "Dublin",
                "dependants": [
                    {"name": "Anna Byrne", "date_of_birth": "2014-03-02", "notes": "Child"},
                ],
            },
        )
        self.assertEqual(response.status_code, 201)
        payload = response.json()["item"]
        self.assertEqual(payload["full_name"], "Patrick Byrne")
        self.assertEqual(payload["status"], "draft")
        self.assertEqual(payload["created_by"], "admin@omega.local")
        self.assertEqual(payload["updated_by"], "admin@omega.local")
        self.assertEqual(payload["title"], "Mr")
        self.assertEqual(payload["town_city"], "Dublin")
        self.assertEqual(len(payload["dependants"]), 1)
        self.assertEqual(payload["dependants"][0]["name"], "Anna Byrne")

    def test_staff_can_edit_client_record(self) -> None:
        self.client.post(
            "/auth/login",
            json={"email": "staff@omega.local", "password": "ChangeMe123!"},
        )
        response = self.client.patch(
            "/clients/CLI-2026-0001",
            json={
                "marital_status": "Single",
                "mobile_number": "0877777777",
                "dependants": [{"name": "Chris Client", "date_of_birth": "2010-01-01", "notes": "Child"}],
            },
        )
        self.assertEqual(response.status_code, 200)
        payload = response.json()["item"]
        self.assertEqual(payload["marital_status"], "Single")
        self.assertEqual(payload["mobile_number"], "0877777777")
        self.assertEqual(payload["updated_by"], "staff@omega.local")
        self.assertEqual(payload["dependants"][0]["name"], "Chris Client")

    def test_admin_can_archive_client_record(self) -> None:
        self.client.post(
            "/auth/login",
            json={"email": "admin@omega.local", "password": "ChangeMe123!"},
        )
        response = self.client.patch("/clients/CLI-2026-0001/archive")
        self.assertEqual(response.status_code, 200)
        self.assertEqual(response.json()["item"]["status"], "archived")

    # ------------------------------------------------------------------
    # Admin user management (DB-backed)
    # ------------------------------------------------------------------

    def test_admin_users_requires_admin_session(self) -> None:
        self.client.post(
            "/auth/login",
            json={"email": "staff@omega.local", "password": "ChangeMe123!"},
        )
        response = self.client.get("/admin/users")
        self.assertEqual(response.status_code, 403)

    def test_admin_can_create_staff_user(self) -> None:
        self.client.post(
            "/auth/login",
            json={"email": "admin@omega.local", "password": "ChangeMe123!"},
        )
        response = self.client.post(
            "/admin/users",
            json={
                "first_name": "Nora",
                "last_name": "Kelly",
                "email": "nora.kelly@omega.local",
                "password": "StrongPass123!",
                "role": "staff",
            },
        )
        self.assertEqual(response.status_code, 201)
        payload = response.json()["item"]
        self.assertEqual(payload["email"], "nora.kelly@omega.local")
        self.assertEqual(payload["status"], "active")

    def test_admin_user_update_audit_includes_old_and_new_values(self) -> None:
        """PATCH /admin/users/{user_id} audit details include old/new role and name."""
        self.client.post(
            "/auth/login",
            json={"email": "admin@omega.local", "password": "ChangeMe123!"},
        )
        # Create a staff user
        create_resp = self.client.post(
            "/admin/users",
            json={
                "first_name": "Audit",
                "last_name": "Target",
                "email": "audit-target@omega.local",
                "password": "ChangeMe123!",
                "role": "staff",
            },
        )
        self.assertEqual(create_resp.status_code, 201)
        user_id = create_resp.json()["item"]["id"]

        # Edit the user — change role from staff to admin and rename
        patch_resp = self.client.patch(
            f"/admin/users/{user_id}",
            json={
                "first_name": "Audited",
                "last_name": "User",
                "role": "admin",
            },
        )
        self.assertEqual(patch_resp.status_code, 200, f"PATCH failed: {patch_resp.status_code} {patch_resp.text}")

        # Check audit log for the user_updated entry
        audit_resp = self.client.get("/admin/audit-logs")
        entries = audit_resp.json()["items"]
        update_entries = [e for e in entries if e["action"] == "user_updated" and e["entity_id"] == user_id]
        self.assertGreaterEqual(len(update_entries), 1, "Expected at least 1 user_updated audit entry")
        details = update_entries[0]["details"]
        self.assertEqual(details["old_role"], "staff")
        self.assertEqual(details["new_role"], "admin")
        self.assertEqual(details["old_name"], "Audit Target")
        self.assertEqual(details["new_name"], "Audited User")

    def test_admin_user_disable_audit_includes_status(self) -> None:
        """PATCH /admin/users/{user_id}/disable audit details include new_status."""
        self.client.post(
            "/auth/login",
            json={"email": "admin@omega.local", "password": "ChangeMe123!"},
        )
        # Create a staff user
        create_resp = self.client.post(
            "/admin/users",
            json={
                "first_name": "Disable",
                "last_name": "Target",
                "email": "disable-target@omega.local",
                "password": "ChangeMe123!",
                "role": "staff",
            },
        )
        self.assertEqual(create_resp.status_code, 201)
        user_id = create_resp.json()["item"]["id"]

        # Disable the user
        self.client.patch(f"/admin/users/{user_id}/disable")

        # Check audit log for user_disabled entry
        audit_resp = self.client.get("/admin/audit-logs")
        entries = audit_resp.json()["items"]
        disable_entries = [e for e in entries if e["action"] == "user_disabled" and e["entity_id"] == user_id]
        self.assertGreaterEqual(len(disable_entries), 1, "Expected at least 1 user_disabled audit entry")
        details = disable_entries[0]["details"]
        self.assertEqual(details["new_status"], "disabled")

    def test_disabled_user_cannot_log_in(self) -> None:
        self.client.post(
            "/auth/login",
            json={"email": "admin@omega.local", "password": "ChangeMe123!"},
        )
        self.client.post(
            "/admin/users",
            json={
                "first_name": "Nora",
                "last_name": "Kelly",
                "email": "nora.kelly@omega.local",
                "password": "StrongPass123!",
                "role": "staff",
            },
        )
        list_response = self.client.get("/admin/users")
        target_user = next((item for item in list_response.json()["items"] if item["email"] == "nora.kelly@omega.local"), None)
        self.assertIsNotNone(target_user)
        disable_response = self.client.patch(f"/admin/users/{target_user['id']}/disable")
        login_response = self.client.post(
            "/auth/login",
            json={"email": "nora.kelly@omega.local", "password": "StrongPass123!"},
        )
        self.assertEqual(disable_response.status_code, 200)
        self.assertEqual(disable_response.json()["item"]["status"], "disabled")
        self.assertEqual(login_response.status_code, 403)

    def test_admin_can_edit_staff_user(self) -> None:
        self.client.post(
            "/auth/login",
            json={"email": "admin@omega.local", "password": "ChangeMe123!"},
        )
        self.client.post(
            "/admin/users",
            json={
                "first_name": "Nora",
                "last_name": "Kelly",
                "email": "nora.kelly@omega.local",
                "password": "StrongPass123!",
                "role": "staff",
            },
        )
        response = self.client.patch(
            f"/admin/users/{next(item for item in self.client.get('/admin/users').json()['items'] if item['email'] == 'nora.kelly@omega.local')['id']}",
            json={"first_name": "Norah", "last_name": "Kelly", "role": "staff"},
        )
        self.assertEqual(response.status_code, 200)
        self.assertEqual(response.json()["item"]["first_name"], "Norah")

    def test_new_user_persists_across_requests(self) -> None:
        """Verify DB-backed persistence: user created by admin survives a fresh login."""
        self.client.post(
            "/auth/login",
            json={"email": "admin@omega.local", "password": "ChangeMe123!"},
        )
        self.client.post(
            "/admin/users",
            json={
                "first_name": "Nora",
                "last_name": "Kelly",
                "email": "nora.kelly@omega.local",
                "password": "StrongPass123!",
                "role": "staff",
            },
        )
        self.client.post("/auth/logout")
        login_response = self.client.post(
            "/auth/login",
            json={"email": "nora.kelly@omega.local", "password": "StrongPass123!"},
        )
        self.assertEqual(login_response.status_code, 200)
        self.assertEqual(login_response.json()["user"]["first_name"], "Nora")

    def test_new_client_persists_across_requests(self) -> None:
        """Verify DB-backed persistence: created client is retrievable."""
        self.client.post(
            "/auth/login",
            json={"email": "admin@omega.local", "password": "ChangeMe123!"},
        )
        create_resp = self.client.post(
            "/clients",
            json={
                "first_name": "Patrick",
                "surname": "Byrne",
                "email": "patrick.byrne@example.com",
                "mobile_number": "0871000001",
                "marital_status": "Married",
                "date_of_birth": "1982-05-14",
            },
        )
        ref = create_resp.json()["item"]["client_reference"]
        detail_resp = self.client.get(f"/clients/{ref}")
        self.assertEqual(detail_resp.status_code, 200)
        self.assertEqual(detail_resp.json()["item"]["full_name"], "Patrick Byrne")

    # ------------------------------------------------------------------
    # Workflow persistence tests (Phase 3)
    # ------------------------------------------------------------------

    def _login_as_admin(self) -> None:
        self.client.post(
            "/auth/login",
            json={"email": "admin@omega.local", "password": "ChangeMe123!"},
        )

    def _create_staff_user(self, *, email: str, first_name: str, last_name: str, password: str = "Omega123") -> dict[str, object]:
        self._login_as_admin()
        response = self.client.post(
            "/admin/users",
            json={
                "first_name": first_name,
                "last_name": last_name,
                "email": email,
                "password": password,
                "role": "staff",
            },
        )
        self.assertEqual(response.status_code, 201, response.text)
        self.client.post("/auth/logout")
        return response.json()["item"]

    def _login_as(self, email: str, password: str = "Omega123") -> None:
        response = self.client.post("/auth/login", json={"email": email, "password": password})
        self.assertEqual(response.status_code, 200, response.text)

    def _create_client_as(
        self,
        *,
        creator_email: str,
        first_name: str,
        surname: str,
        assigned_to: str | None = None,
        password: str = "Omega123",
    ) -> dict[str, object]:
        self._login_as(creator_email, password=password)
        response = self.client.post(
            "/clients",
            json={
                "first_name": first_name,
                "surname": surname,
                "email": f"{first_name.lower()}.{surname.lower()}@example.com",
                "mobile_number": "0871234567",
                "marital_status": "Single",
                "date_of_birth": "1990-01-01",
                "title": "Mr",
                "town_city": "Dublin",
                "county": "Dublin",
                "assigned_to": assigned_to,
            },
        )
        self.assertEqual(response.status_code, 201, response.text)
        return response.json()["item"]

    def test_workflow_fetch_for_existing_client_returns_fields(self) -> None:
        self._login_as_admin()
        response = self.client.get("/clients/CLI-2026-0002/workflow")
        self.assertEqual(response.status_code, 200)
        data = response.json()
        self.assertIn("item", data)
        self.assertIsInstance(data["item"], dict)

    def test_workflow_fetch_requires_login(self) -> None:
        response = self.client.get("/clients/CLI-2026-0002/workflow")
        self.assertEqual(response.status_code, 401)

    def test_full_access_user_can_see_all_seeded_clients(self) -> None:
        self._create_staff_user(email="info@omegafinancial.ie", first_name="Info", last_name="Omega")
        self._login_as("info@omegafinancial.ie")
        response = self.client.get("/clients")
        self.assertEqual(response.status_code, 200)
        refs = {item["client_reference"] for item in response.json()["items"]}
        self.assertIn("CLI-2026-0001", refs)
        self.assertIn("CLI-2026-0002", refs)

    def test_own_only_user_can_access_assigned_client_and_not_unassigned_client(self) -> None:
        self._create_staff_user(email="sophie@omegafinancial.ie", first_name="Sophie", last_name="Omega")
        self._create_staff_user(email="john@omegafinancial.ie", first_name="John", last_name="Omega")
        client = self._create_client_as(
            creator_email="john@omegafinancial.ie",
            first_name="Assigned",
            surname="Client",
            assigned_to="sophie@omegafinancial.ie",
        )
        client_ref = client["client_reference"]
        self.client.post("/auth/logout")

        self._login_as("sophie@omegafinancial.ie")
        allowed_detail = self.client.get(f"/clients/{client_ref}")
        self.assertEqual(allowed_detail.status_code, 200)

        workflow_resp = self.client.get(f"/clients/{client_ref}/workflow")
        self.assertEqual(workflow_resp.status_code, 200)

        blocked_detail = self.client.get("/clients/CLI-2026-0001")
        self.assertEqual(blocked_detail.status_code, 403)

    def test_delegated_user_can_access_john_records_only(self) -> None:
        self._create_staff_user(email="john@omegafinancial.ie", first_name="John", last_name="Omega")
        self._create_staff_user(email="alison@omegafinancial.ie", first_name="Alison", last_name="Omega")
        self._create_staff_user(email="sophie@omegafinancial.ie", first_name="Sophie", last_name="Omega")

        john_client = self._create_client_as(
            creator_email="john@omegafinancial.ie",
            first_name="JohnClient",
            surname="Access",
        )
        john_ref = john_client["client_reference"]
        self.client.put(
            f"/clients/{john_ref}/workflow",
            json={"personalCircumstances": "Delegated workflow access"},
        )
        self.client.post(
            f"/clients/{john_ref}/files",
            files={"file": ("delegated.pdf", b"delegated", "application/pdf")},
        )
        self.client.post(
            f"/clients/{john_ref}/documents",
            data={"document_type": "Fact Find", "document_name": "Delegated Doc"},
            files={"artifact": ("delegated.pdf", b"pdf", "application/pdf")},
        )
        self.client.post("/auth/logout")

        sophie_client = self._create_client_as(
            creator_email="sophie@omegafinancial.ie",
            first_name="SophieClient",
            surname="Blocked",
        )
        sophie_ref = sophie_client["client_reference"]
        self.client.post("/auth/logout")

        self._login_as("alison@omegafinancial.ie")
        detail_resp = self.client.get(f"/clients/{john_ref}")
        self.assertEqual(detail_resp.status_code, 200)
        workflow_resp = self.client.get(f"/clients/{john_ref}/workflow")
        self.assertEqual(workflow_resp.status_code, 200)
        files_resp = self.client.get(f"/clients/{john_ref}/files")
        self.assertEqual(files_resp.status_code, 200)
        self.assertGreaterEqual(len(files_resp.json()["items"]), 1)
        docs_resp = self.client.get(f"/clients/{john_ref}/documents")
        self.assertEqual(docs_resp.status_code, 200)
        self.assertGreaterEqual(len(docs_resp.json()["items"]), 1)

        blocked_resp = self.client.get(f"/clients/{sophie_ref}")
        self.assertEqual(blocked_resp.status_code, 403)

    def test_workflow_save_and_reload_roundtrip(self) -> None:
        self._login_as_admin()
        fields = {
            "personalCircumstances": "Test circumstances",
            "financialSituation": "Test financial",
            "needsObjectives": "Test needs",
            "termsVersion": "June 2026",
            "occupation": "Developer",
            "recommendedCover": "2500",
            "gender": "Female",
            "smokerStatus": "Non-Smoker",
            "phiOccupationalClass": "2",
            "phiIndexation": "Y",
        }
        save_resp = self.client.put(
            "/clients/CLI-2026-0002/workflow",
            json=fields,
        )
        self.assertEqual(save_resp.status_code, 200)
        self.assertEqual(save_resp.json()["item"]["saved"], "ok")
        fetch_resp = self.client.get("/clients/CLI-2026-0002/workflow")
        self.assertEqual(fetch_resp.status_code, 200)
        item = fetch_resp.json()["item"]
        self.assertEqual(item["personalCircumstances"], "Test circumstances")
        self.assertEqual(item["termsVersion"], "June 2026")
        self.assertEqual(item["occupation"], "Developer")
        self.assertIn("2500", item["recommendedCover"])
        self.assertEqual(item["gender"], "Female")
        self.assertEqual(item["smokerStatus"], "Non-Smoker")
        self.assertEqual(item["phiOccupationalClass"], "2")
        self.assertEqual(item["phiIndexation"], "Y")

    def test_workflow_clearing_previously_saved_values(self) -> None:
        self._login_as_admin()
        self.client.put(
            "/clients/CLI-2026-0002/workflow",
            json={"personalCircumstances": "Filled", "occupation": "Analyst"},
        )
        self.client.put(
            "/clients/CLI-2026-0002/workflow",
            json={"personalCircumstances": "", "occupation": ""},
        )
        fetch = self.client.get("/clients/CLI-2026-0002/workflow")
        item = fetch.json()["item"]
        self.assertEqual(item["personalCircumstances"], "")
        self.assertEqual(item["occupation"], "")

    def test_workflow_bool_coercion_yes_no_to_null(self) -> None:
        self._login_as_admin()
        self.client.put(
            "/clients/CLI-2026-0002/workflow",
            json={"agreeToMarketing": "Yes", "pepConfirmation": "No"},
        )
        fetch = self.client.get("/clients/CLI-2026-0002/workflow")
        item = fetch.json()["item"]
        self.assertEqual(item["agreeToMarketing"], "Yes")
        self.assertEqual(item["pepConfirmation"], "No")

    def test_workflow_date_and_decimal_fields(self) -> None:
        self._login_as_admin()
        self.client.put(
            "/clients/CLI-2026-0002/workflow",
            json={"letterDate": "2026-06-15", "premium": "165.50", "termsIssuedDate": "2026-01-10"},
        )
        fetch = self.client.get("/clients/CLI-2026-0002/workflow")
        item = fetch.json()["item"]
        self.assertIn("2026-06-15", item["letterDate"])
        self.assertIn("165.50", item["premium"])
        self.assertIn("2026-01-10", item["termsIssuedDate"])

    # ------------------------------------------------------------------
    # CSRF and rate-limit tests
    # ------------------------------------------------------------------

    def test_csrf_rejects_post_without_origin(self) -> None:
        """State-changing POST without origin header is rejected (not 200/201)."""
        # raise_server_exceptions=False so middleware HTTPException returns a response
        no_origin_client = TestClient(app, raise_server_exceptions=False)
        response = no_origin_client.post(
            "/clients",
            json={
                "first_name": "A",
                "surname": "B",
                "email": "a@b.com",
                "mobile_number": "087",
                "marital_status": "S",
                "date_of_birth": "1990-01-01",
            },
        )
        self.assertNotIn(response.status_code, (200, 201), f"Expected rejection (not 200/201), got {response.status_code}")

    def test_csrf_allows_same_origin_post(self) -> None:
        """State-changing POST with matching Origin header succeeds."""
        self.client.post(
            "/auth/login",
            json={"email": "staff@omega.local", "password": "ChangeMe123!"},
        )
        response = self.client.post(
            "/clients",
            json={
                "first_name": "A",
                "surname": "B",
                "email": "a@b.com",
                "mobile_number": "087",
                "marital_status": "S",
                "date_of_birth": "1990-01-01",
            },
        )
        self.assertEqual(response.status_code, 201)

    def test_csrf_rejects_cross_origin_post(self) -> None:
        """State-changing POST from a different origin is rejected (not 200/201)."""
        # raise_server_exceptions=False so middleware HTTPException returns a response
        cross_origin_client = TestClient(app, headers={"Origin": "https://evil.example.com"}, raise_server_exceptions=False)
        response = cross_origin_client.post(
            "/clients",
            json={
                "first_name": "A",
                "surname": "B",
                "email": "a@b.com",
                "mobile_number": "087",
                "marital_status": "S",
                "date_of_birth": "1990-01-01",
            },
        )
        self.assertNotIn(response.status_code, (200, 201), f"Expected rejection (not 200/201), got {response.status_code}")

    def test_csrf_accepts_same_origin_referer_fallback(self) -> None:
        """State-changing POST with Referer matching APP_URL and no Origin succeeds."""
        # Omit Origin entirely, provide only same-origin Referer
        referer_client = TestClient(app, headers={"Referer": "http://127.0.0.1:8007/clients/new"})
        referer_client.post(
            "/auth/login",
            json={"email": "staff@omega.local", "password": "ChangeMe123!"},
        )
        response = referer_client.post(
            "/clients",
            json={
                "first_name": "A",
                "surname": "B",
                "email": "a@b.com",
                "mobile_number": "087",
                "marital_status": "S",
                "date_of_birth": "1990-01-01",
            },
        )
        self.assertEqual(response.status_code, 201)

    def test_csrf_allows_trusted_frontend_origin(self) -> None:
        """State-changing POST from CSRF_TRUSTED_ORIGINS (frontend dev port) succeeds."""
        trusted_client = TestClient(app, headers={"Origin": "http://127.0.0.1:3007"})
        trusted_client.post(
            "/auth/login",
            json={"email": "staff@omega.local", "password": "ChangeMe123!"},
        )
        response = trusted_client.post(
            "/clients",
            json={
                "first_name": "Frontend",
                "surname": "Origin",
                "email": "frontend@omega.local",
                "mobile_number": "087",
                "marital_status": "S",
                "date_of_birth": "1990-01-01",
            },
        )
        self.assertEqual(response.status_code, 201,
                         f"Expected 201 for trusted origin, got {response.status_code}: {response.text}")

    def test_csrf_rejection_returns_proper_json_not_500(self) -> None:
        """CSRF rejection returns 403 JSON, not a 500 Internal Server Error."""
        evil_client = TestClient(app, headers={"Origin": "https://evil.example.com"},
                                 raise_server_exceptions=False)
        response = evil_client.post(
            "/auth/login",
            json={"email": "admin@omega.local", "password": "ChangeMe123!"},
        )
        self.assertEqual(response.status_code, 403,
                         f"Expected 403, got {response.status_code}: {response.text}")
        payload = response.json()
        self.assertIn("detail", payload)
        self.assertIn("Cross-origin", payload["detail"])

    def test_login_rate_limit_returns_429_after_5_failures(self) -> None:
        """Six rapid failed logins from same IP should trigger 429."""
        for _ in range(5):
            resp = self.client.post(
                "/auth/login",
                json={"email": "admin@omega.local", "password": "WrongPassword!"},
            )
            self.assertEqual(resp.status_code, 401, "First 5 attempts should be 401")
        # 6th attempt should be rate-limited
        sixth = self.client.post(
            "/auth/login",
            json={"email": "admin@omega.local", "password": "WrongPassword!"},
        )
        self.assertEqual(sixth.status_code, 429, "6th attempt should be 429")

    # ------------------------------------------------------------------
    # Admin non-DB routes (still store.py)
    # ------------------------------------------------------------------

    def test_admin_audit_logs_requires_admin_session(self) -> None:
        self.client.post(
            "/auth/login",
            json={"email": "staff@omega.local", "password": "ChangeMe123!"},
        )
        response = self.client.get("/admin/audit-logs")
        self.assertEqual(response.status_code, 403)

    def test_admin_can_view_audit_logs_from_db(self) -> None:
        self.client.post(
            "/auth/login",
            json={"email": "admin@omega.local", "password": "ChangeMe123!"},
        )
        response = self.client.get("/admin/audit-logs")
        self.assertEqual(response.status_code, 200)
        payload = response.json()["items"]
        self.assertIsInstance(payload, list)

    def test_admin_can_filter_audit_logs_by_client_reference(self) -> None:
        self._login_as_admin()
        create_resp = self.client.post(
            "/clients",
            json={
                "first_name": "Audit",
                "surname": "Filter",
                "email": "audit.filter@example.com",
                "mobile_number": "0871000001",
                "marital_status": "Married",
                "date_of_birth": "1982-05-14",
            },
        )
        client_reference = create_resp.json()["item"]["client_reference"]

        response = self.client.get(f"/admin/audit-logs?client_reference={client_reference}")
        self.assertEqual(response.status_code, 200)
        items = response.json()["items"]
        self.assertGreaterEqual(len(items), 1)
        self.assertTrue(all(item.get("client_reference") == client_reference for item in items))

    def test_admin_backup_requires_admin_session(self) -> None:
        self.client.post(
            "/auth/login",
            json={"email": "staff@omega.local", "password": "ChangeMe123!"},
        )
        response = self.client.post("/admin/backups")
        self.assertEqual(response.status_code, 403)

    def test_non_admin_cannot_list_backups(self) -> None:
        self.client.post(
            "/auth/login",
            json={"email": "staff@omega.local", "password": "ChangeMe123!"},
        )
        response = self.client.get("/admin/backups")
        self.assertEqual(response.status_code, 403)

    # ------------------------------------------------------------------
    # Phase 7: Backup persistence tests
    # ------------------------------------------------------------------

    def test_admin_can_create_backup_with_db_record_and_disk_artifact(self) -> None:
        self._login_as_admin()
        response = self.client.post("/admin/backups")
        self.assertEqual(response.status_code, 201)
        payload = response.json()["item"]
        self.assertIn(payload["status"], ("success", "partial"), f"Unexpected backup status: {payload['status']}")
        self.assertIn("id", payload)
        self.assertIsNotNone(payload["created_at"])
        self.assertIsNotNone(payload["files_backup"])
        self.assertIsNotNone(payload["documents_backup"])
        self.assertIsNotNone(payload["manifest_path"])
        # error_message may be None (placeholder URL) or a string (pg_dump unavailable)
        if payload["status"] == "partial":
            self.assertIsNotNone(payload["error_message"])
        else:
            self.assertIsNone(payload["error_message"])
        self.assertIsNotNone(payload["triggered_by"])

        # Verify it appears in the list
        list_resp = self.client.get("/admin/backups")
        self.assertEqual(list_resp.status_code, 200)
        items = list_resp.json()["items"]
        self.assertTrue(any(r["id"] == payload["id"] for r in items))

        # Verify artifact file exists on disk
        manifest_path = payload["manifest_path"]
        from app.main import settings as app_settings
        from pathlib import Path
        full_path = app_settings.backup_path / manifest_path
        self.assertTrue(full_path.is_file(), f"Backup manifest not found at {full_path}")

    def test_admin_can_list_backups(self) -> None:
        self._login_as_admin()
        # Create a backup first
        self.client.post("/admin/backups")
        response = self.client.get("/admin/backups")
        self.assertEqual(response.status_code, 200)
        items = response.json()["items"]
        self.assertIsInstance(items, list)
        self.assertGreaterEqual(len(items), 1)
        self.assertIn(items[0]["status"], ("success", "partial"))

    def test_backup_list_requires_login(self) -> None:
        response = self.client.get("/admin/backups")
        self.assertEqual(response.status_code, 401)

    def test_admin_security_summary_requires_admin_session(self) -> None:
        self.client.post(
            "/auth/login",
            json={"email": "staff@omega.local", "password": "ChangeMe123!"},
        )
        response = self.client.get("/admin/security-summary")
        self.assertEqual(response.status_code, 403)

    # ------------------------------------------------------------------
    # Restore validation tests
    # ------------------------------------------------------------------

    def test_restore_validate_rejects_missing_backup(self) -> None:
        self._login_as_admin()
        response = self.client.post("/admin/backups/00000000-0000-0000-0000-000000000000/validate-restore")
        self.assertEqual(response.status_code, 404)

    def test_restore_validate_succeeds_for_valid_backup(self) -> None:
        self._login_as_admin()
        create_resp = self.client.post("/admin/backups")
        self.assertEqual(create_resp.status_code, 201)
        backup_id = create_resp.json()["item"]["id"]

        response = self.client.post(f"/admin/backups/{backup_id}/validate-restore")
        self.assertEqual(response.status_code, 200)
        payload = response.json()
        self.assertIn("valid", payload)
        self.assertIn("manifest", payload)
        self.assertIsInstance(payload["warnings"], list)

    def test_restore_validate_returns_confirmation_token_when_backup_is_restore_eligible(self) -> None:
        self._login_as_admin()
        create_resp = self.client.post("/admin/backups")
        backup_id = create_resp.json()["item"]["id"]

        with patch("app.main.validate_restore", return_value={"valid": True, "manifest": {}, "warnings": [], "dump_file": "dumps/test.dump"}):
            response = self.client.post(f"/admin/backups/{backup_id}/validate-restore")

        self.assertEqual(response.status_code, 200)
        payload = response.json()
        self.assertIn("confirmation_token", payload)
        self.assertIn("confirmation_expires_at", payload)

    def test_restore_validate_requires_admin(self) -> None:
        self._login_as_admin()
        create_resp = self.client.post("/admin/backups")
        self.assertEqual(create_resp.status_code, 201)
        backup_id = create_resp.json()["item"]["id"]
        self.client.post("/auth/logout")

        self._login_as_staff()
        response = self.client.post(f"/admin/backups/{backup_id}/validate-restore")
        self.assertEqual(response.status_code, 403)

    def test_restore_validate_rejects_unauthorized(self) -> None:
        self._login_as_admin()
        create_resp = self.client.post("/admin/backups")
        backup_id = create_resp.json()["item"]["id"]
        self.client.post("/auth/logout")

        response = self.client.post(f"/admin/backups/{backup_id}/validate-restore")
        self.assertEqual(response.status_code, 401)

    def test_restore_dry_run_rejects_missing_backup(self) -> None:
        self._login_as_admin()
        response = self.client.post("/admin/backups/00000000-0000-0000-0000-000000000000/dry-run-restore")
        self.assertEqual(response.status_code, 404)

    def test_restore_dry_run_returns_400_when_no_dump_artifact(self) -> None:
        """Dry-run restore should return 400 if the backup has no database dump."""
        self._login_as_admin()
        create_resp = self.client.post("/admin/backups")
        backup_id = create_resp.json()["item"]["id"]

        response = self.client.post(f"/admin/backups/{backup_id}/dry-run-restore")
        # With 'placeholder' DATABASE_URL, no pg_dump runs — so no dump artifact
        self.assertEqual(response.status_code, 400)
        self.assertIn("no database dump artifact", response.json()["detail"].lower())

    def test_restore_dry_run_requires_admin(self) -> None:
        self._login_as_staff()
        response = self.client.post("/admin/backups/some-id/dry-run-restore")
        self.assertEqual(response.status_code, 403)

    def test_restore_dry_run_requires_login(self) -> None:
        response = self.client.post("/admin/backups/some-id/dry-run-restore")
        self.assertEqual(response.status_code, 401)

    def test_restore_execute_requires_admin(self) -> None:
        self._login_as_staff()
        response = self.client.post(
            "/admin/backups/some-id/restore",
            json={"confirm": "yes-do-restore-now"},
        )
        self.assertEqual(response.status_code, 403)

    def test_restore_execute_requires_login(self) -> None:
        response = self.client.post(
            "/admin/backups/some-id/restore",
            json={"confirm": "yes-do-restore-now"},
        )
        self.assertEqual(response.status_code, 401)

    def test_restore_execute_rejects_missing_backup(self) -> None:
        self._login_as_admin()
        response = self.client.post(
            "/admin/backups/00000000-0000-0000-0000-000000000000/restore",
            json={"confirm": "yes-do-restore-now"},
        )
        self.assertEqual(response.status_code, 404)

    def test_restore_execute_rejects_wrong_confirm(self) -> None:
        """Restore requires explicit confirmation payload."""
        self._login_as_admin()
        create_resp = self.client.post("/admin/backups")
        backup_id = create_resp.json()["item"]["id"]

        response = self.client.post(
            f"/admin/backups/{backup_id}/restore",
            json={"confirm": "nope"},
        )
        self.assertEqual(response.status_code, 400)

    def test_restore_execute_rejects_missing_confirmation_token(self) -> None:
        self._login_as_admin()
        create_resp = self.client.post("/admin/backups")
        backup_id = create_resp.json()["item"]["id"]

        response = self.client.post(
            f"/admin/backups/{backup_id}/restore",
            json={"confirm": "yes-do-restore-now"},
        )
        self.assertEqual(response.status_code, 400)
        self.assertIn("approval token", response.json()["detail"].lower())

    def test_restore_attempts_requires_admin(self) -> None:
        self._login_as_staff()
        response = self.client.get("/admin/backups/some-id/restore-attempts")
        self.assertEqual(response.status_code, 403)

    def test_restore_attempts_returns_empty_list_for_no_attempts(self) -> None:
        self._login_as_admin()
        create_resp = self.client.post("/admin/backups")
        backup_id = create_resp.json()["item"]["id"]

        response = self.client.get(f"/admin/backups/{backup_id}/restore-attempts")
        self.assertEqual(response.status_code, 200)
        self.assertEqual(response.json()["items"], [])

    def test_restore_attempts_returns_404_for_missing_backup(self) -> None:
        self._login_as_admin()
        response = self.client.get("/admin/backups/00000000-0000-0000-0000-000000000000/restore-attempts")
        self.assertEqual(response.status_code, 404)

    def test_schedule_status_requires_admin(self) -> None:
        self._login_as_staff()
        response = self.client.get("/admin/backups/schedule-status")
        self.assertEqual(response.status_code, 403)

    def test_schedule_status_returns_disabled_by_default(self) -> None:
        self._login_as_admin()
        response = self.client.get("/admin/backups/schedule-status")
        self.assertEqual(response.status_code, 200)
        data = response.json()
        self.assertFalse(data["enabled"])
        self.assertFalse(data["running"])

    def test_admin_can_view_security_summary(self) -> None:
        self.client.post(
            "/auth/login",
            json={"email": "admin@omega.local", "password": "ChangeMe123!"},
        )
        response = self.client.get("/admin/security-summary")
        self.assertEqual(response.status_code, 200)
        payload = response.json()["item"]
        self.assertEqual(payload["remote_access"], "local_only")
        self.assertEqual(payload["public_port_exposure"], "disabled")

    # ------------------------------------------------------------------
    # Stage 19: Backup/restore operator hardening tests
    # ------------------------------------------------------------------

    def test_dry_run_persists_restore_attempt_record(self) -> None:
        """Dry-run restore persists a RestoreAttempt with mode='dry_run' even on no-dump failures."""
        self._login_as_admin()
        create_resp = self.client.post("/admin/backups")
        backup_id = create_resp.json()["item"]["id"]

        # With real DATABASE_URL and no pg_dump, this backup has no database_backup.
        # Dry-run should persist a failed RestoreAttempt before returning 400.
        resp = self.client.post(f"/admin/backups/{backup_id}/dry-run-restore")
        self.assertEqual(resp.status_code, 400)

        # Verify the failed attempt was persisted
        attempts_resp = self.client.get(f"/admin/backups/{backup_id}/restore-attempts")
        self.assertEqual(attempts_resp.status_code, 200)
        items = attempts_resp.json()["items"]
        self.assertEqual(len(items), 1)
        self.assertEqual(items[0]["status"], "failed")
        self.assertEqual(items[0]["mode"], "dry_run")
        self.assertIsNone(items[0]["dump_file"])
        self.assertIn("No database dump", items[0]["error_message"])

    def test_backup_error_message_propagates_to_db(self) -> None:
        """When pg_dump fails, error_message is stored in the BackupRun DB record."""
        # With a real DATABASE_URL (not placeholder), pg_dump is attempted.
        # On Windows without pg_dump installed, status will be 'partial'
        # and error_message will be populated. Either way the payload is valid.
        self._login_as_admin()
        create_resp = self.client.post("/admin/backups")
        self.assertEqual(create_resp.status_code, 201)
        payload = create_resp.json()["item"]
        self.assertIn(payload["status"], ("success", "partial"))
        # If status is partial, error_message must be a non-empty string
        if payload["status"] == "partial":
            self.assertIsInstance(payload["error_message"], str)
            self.assertGreater(len(payload["error_message"]), 0)
        else:
            self.assertIsNone(payload["error_message"])

    def test_backup_manifest_storage_section_is_coherent(self) -> None:
        """Verify manifest on disk contains coherent storage metadata."""
        self._login_as_admin()
        create_resp = self.client.post("/admin/backups")
        self.assertEqual(create_resp.status_code, 201)
        payload = create_resp.json()["item"]

        from app.main import settings as app_settings
        from pathlib import Path
        import json

        manifest_path = app_settings.backup_path / payload["manifest_path"]
        self.assertTrue(manifest_path.is_file())

        manifest = json.loads(manifest_path.read_text(encoding="utf-8"))
        self.assertIn("storage", manifest)
        storage = manifest["storage"]
        # After Stage 19, storage uses unified file_count + total_bytes
        self.assertIsInstance(storage.get("file_count"), int)
        self.assertIsInstance(storage.get("total_bytes"), int)
        self.assertEqual(storage["file_storage_root"], str(app_settings.file_storage_path))

    def test_restore_execute_persists_failed_attempt_on_wrong_confirm(self) -> None:
        """Wrong restore confirmation persists a failed RestoreAttempt with the correct error."""
        self._login_as_admin()
        create_resp = self.client.post("/admin/backups")
        backup_id = create_resp.json()["item"]["id"]

        response = self.client.post(
            f"/admin/backups/{backup_id}/restore",
            json={"confirm": "nope"},
        )
        self.assertEqual(response.status_code, 400)

        # Verify the failed attempt was persisted — confirm is checked first
        attempts_resp = self.client.get(f"/admin/backups/{backup_id}/restore-attempts")
        self.assertEqual(attempts_resp.status_code, 200)
        items = attempts_resp.json()["items"]
        self.assertEqual(len(items), 1)
        self.assertEqual(items[0]["status"], "failed")
        self.assertEqual(items[0]["mode"], "execute")
        self.assertIn(items[0]["error_message"], {"Restore not confirmed", "Restore approval token missing or expired"})

    def test_restore_execute_persists_failed_attempt_on_missing_dump(self) -> None:
        """Restore with no dump artifact persists a failed RestoreAttempt."""
        self._login_as_admin()
        create_resp = self.client.post("/admin/backups")
        backup_id = create_resp.json()["item"]["id"]

        # This backup has no database_backup (placeholder URL), so restore
        # should fail with 400 and persist a failed attempt
        response = self.client.post(
            f"/admin/backups/{backup_id}/restore",
            json={"confirm": "yes-do-restore-now"},
        )
        # Could be 400 for validation failure or missing dump
        self.assertIn(response.status_code, (400,))

        # Verify the failed attempt was persisted
        attempts_resp = self.client.get(f"/admin/backups/{backup_id}/restore-attempts")
        self.assertEqual(attempts_resp.status_code, 200)
        items = attempts_resp.json()["items"]
        # At least one attempt should exist from this flow
        self.assertGreater(len(items), 0)
        self.assertEqual(items[0]["status"], "failed")

    def test_restore_execute_succeeds_with_confirmation_token(self) -> None:
        from app.db import get_session
        from app.models import BackupRun as BackupRunModel

        self._login_as_admin()
        create_resp = self.client.post("/admin/backups")
        backup_id = create_resp.json()["item"]["id"]

        db = get_session()
        try:
            run = db.query(BackupRunModel).filter(BackupRunModel.id == backup_id).first()
            self.assertIsNotNone(run)
            run.database_backup = "dumps/test.dump"
            db.commit()
        finally:
            db.close()

        with patch("app.main.validate_restore", return_value={"valid": True, "manifest": {}, "warnings": [], "dump_file": "dumps/test.dump"}):
            validate_resp = self.client.post(f"/admin/backups/{backup_id}/validate-restore")
        self.assertEqual(validate_resp.status_code, 200)
        token = validate_resp.json()["confirmation_token"]

        with patch("app.main.validate_restore", return_value={"valid": True, "manifest": {}, "warnings": [], "dump_file": "dumps/test.dump"}):
            with patch("app.main.execute_restore", return_value=None) as execute_restore_mock:
                response = self.client.post(
                    f"/admin/backups/{backup_id}/restore",
                    json={"confirm": "yes-do-restore-now", "confirmation_token": token},
                )

        self.assertEqual(response.status_code, 200)
        self.assertTrue(response.json()["restored"])
        execute_restore_mock.assert_called_once()

    def test_scheduler_status_shows_last_run_after_manual_backup(self) -> None:
        """After manually creating a backup, scheduler status endpoint still works."""
        self._login_as_admin()
        # Create a backup
        self.client.post("/admin/backups")
        # Check scheduler status
        response = self.client.get("/admin/backups/schedule-status")
        self.assertEqual(response.status_code, 200)
        data = response.json()
        self.assertFalse(data["enabled"])
        self.assertFalse(data["running"])
        # last_scheduled_run should be None (manual, not scheduled)
        self.assertIsNone(data["last_scheduled_run"])

    def test_non_admin_cannot_create_backup(self) -> None:
        """Staff users cannot create backups."""
        self._login_as_staff()
        response = self.client.post("/admin/backups")
        self.assertEqual(response.status_code, 403)

    def test_non_admin_cannot_execute_restore(self) -> None:
        """Staff users cannot execute restore."""
        self._login_as_staff()
        response = self.client.post(
            "/admin/backups/some-id/restore",
            json={"confirm": "yes-do-restore-now"},
        )
        self.assertEqual(response.status_code, 403)

    def test_non_admin_cannot_dry_run_restore(self) -> None:
        """Staff users cannot dry-run restore."""
        self._login_as_staff()
        response = self.client.post("/admin/backups/some-id/dry-run-restore")
        self.assertEqual(response.status_code, 403)

    def test_non_admin_cannot_validate_restore(self) -> None:
        """Staff users cannot validate restore."""
        self._login_as_staff()
        response = self.client.post("/admin/backups/some-id/validate-restore")
        self.assertEqual(response.status_code, 403)

    def test_non_admin_cannot_view_restore_attempts(self) -> None:
        """Staff users cannot view restore attempts."""
        self._login_as_staff()
        response = self.client.get("/admin/backups/some-id/restore-attempts")
        self.assertEqual(response.status_code, 403)

    def test_non_admin_cannot_view_schedule_status(self) -> None:
        """Staff users cannot view scheduler status."""
        self._login_as_staff()
        response = self.client.get("/admin/backups/schedule-status")
        self.assertEqual(response.status_code, 403)

    def test_restore_attempts_requires_login_on_list(self) -> None:
        """Listing restore attempts requires authentication."""
        response = self.client.get("/admin/backups/some-id/restore-attempts")
        self.assertEqual(response.status_code, 401)

    # ------------------------------------------------------------------
    # Document generation (store.py-backed, Phase 5 will migrate)
    # ------------------------------------------------------------------

    def _login_as_staff(self) -> None:
        self.client.post(
            "/auth/login",
            json={"email": "staff@omega.local", "password": "ChangeMe123!"},
        )

    def _document_generation_payload(self) -> dict[str, object]:
        return {
            "client_reference": "CLI-2026-0002",
            "document_type": "Statement of Suitability",
            "template_id": "income-protection-statement",
            "workflow_snapshot": {
                "full_name": "Jamie Murphy",
                "provider": "Aviva",
                "product_type": "Income Protection",
                "recommended_cover": "EUR2,500 monthly",
                "needs_objectives": "Protect monthly income during illness.",
            },
        }

    def _statement_generation_payload_with_phi_fields(self) -> dict[str, object]:
        return {
            "client_reference": "CLI-2026-0002",
            "document_type": "Statement of Suitability",
            "template_id": "income-protection-statement",
            "workflow_snapshot": {
                "fullName": "Jamie Murphy",
                "dateOfBirth": "1990-11-08",
                "gender": "Female",
                "smokerStatus": "Non-Smoker",
                "coverAge": "65",
                "recommendedCover": "30000",
                "deferredPeriod": "13 weeks",
                "phiOccupationalClass": "2",
                "phiIndexation": "Y",
                "provider": "Zurich Life",
                "occupation": "Project Analyst",
                "advisorName": "Office Staff",
            },
        }

    def test_document_generation_requires_login(self) -> None:
        response = self.client.post(
            "/documents/generate",
            json={
                "client_reference": "CLI-2026-0002",
                "document_type": "Statement of Suitability",
                "template_id": "income-protection-statement",
                "workflow_snapshot": {
                    "full_name": "Jamie Murphy",
                    "provider": "Aviva",
                    "recommended_cover": "EUR2,500 monthly",
                },
            },
        )
        self.assertEqual(response.status_code, 401)

    def test_logged_in_user_can_generate_document_with_seeded_ai_fallback(self) -> None:
        self._login_as_staff()
        response = self.client.post("/documents/generate", json=self._document_generation_payload())
        self.assertEqual(response.status_code, 200)
        payload = response.json()["item"]
        self.assertEqual(payload["client_reference"], "CLI-2026-0002")
        self.assertEqual(payload["document_type"], "Statement of Suitability")
        self.assertEqual(payload["template_id"], "income-protection-statement")
        self.assertEqual(payload["title"], "Statement of Suitability for Jamie Murphy")
        self.assertIn("summary", payload)
        self.assertGreater(len(payload["sections"]), 1)
        self.assertGreaterEqual(len(payload["warnings"]), 1)
        self.assertEqual(payload["sections"][0]["title"], "Client overview")
        self.assertIn("bodyHtml", payload["sections"][0])
        self.assertIn("<h1>", payload["generated_html"])
        self.assertIn("Jamie Murphy", payload["generated_html"])
        self.assertIn("Seeded fallback content", payload["warnings"][0])
        self.assertEqual(payload["integration_requests"][0]["status"], "failed")

    def test_statement_generation_includes_phi_request_artifact_when_phi_call_succeeds(self) -> None:
        self._login_as_staff()
        phi_result = {
            "provider": "BestAdvice",
            "request_type": "Phi",
            "status": "sent",
            "requested_at": "2026-06-19T10:00:00+00:00",
            "request_fields": [
                {"label": "DOB", "value": "08/11/1990"},
                {"label": "Sex", "value": "Female"},
            ],
            "quote_results": [
                {
                    "provider_name": "Acme Life",
                    "policy_type": "Executive",
                    "level_premium": "42.10",
                    "escalation_3_premium": "49.20",
                    "escalation_5_premium": "53.40",
                }
            ],
            "errors": [],
        }
        with patch("app.document_generation.submit_phi_request", return_value=phi_result):
            response = self.client.post("/documents/generate", json=self._statement_generation_payload_with_phi_fields())
        self.assertEqual(response.status_code, 200)
        payload = response.json()["item"]
        self.assertEqual(payload["document_type"], "Statement of Suitability")
        self.assertEqual(len(payload["integration_requests"]), 1)
        self.assertEqual(payload["integration_requests"][0]["provider"], "BestAdvice")
        self.assertEqual(payload["integration_requests"][0]["status"], "sent")
        self.assertEqual(payload["integration_requests"][0]["quote_results"][0]["provider_name"], "Acme Life")

    def test_statement_generation_returns_failed_phi_artifact_and_warning_when_phi_call_fails(self) -> None:
        self._login_as_staff()
        with patch("app.document_generation.submit_phi_request", side_effect=RuntimeError("service unavailable")):
            response = self.client.post("/documents/generate", json=self._statement_generation_payload_with_phi_fields())
        self.assertEqual(response.status_code, 200)
        payload = response.json()["item"]
        self.assertEqual(payload["document_type"], "Statement of Suitability")
        self.assertEqual(payload["integration_requests"][0]["status"], "failed")
        self.assertEqual(payload["integration_requests"][0]["provider"], "BestAdvice")
        self.assertIn("service unavailable", payload["integration_requests"][0]["errors"][0])
        self.assertTrue(any("PHI integration failed" in warning for warning in payload["warnings"]))

    def test_document_generation_persists_generated_draft_in_db(self) -> None:
        """Phase 5: generated drafts are persisted in the documents table."""
        from app.db import get_session
        from app.repositories.documents import DocumentRepository

        self._login_as_staff()
        response = self.client.post("/documents/generate", json=self._document_generation_payload())
        self.assertEqual(response.status_code, 200)
        document_id = response.json()["item"].get("document_id")
        self.assertIsNotNone(document_id)

        # Verify directly via repository
        db = get_session()
        try:
            doc_repo = DocumentRepository(db)
            doc = doc_repo.get_by_id(document_id)
            self.assertIsNotNone(doc)
            self.assertEqual(doc.document_type, "Statement of Suitability")
            self.assertEqual(doc.status, "draft")
            self.assertEqual(doc.preview_title, "Statement of Suitability for Jamie Murphy")
            self.assertIn("Jamie Murphy", doc.preview_html or "")
            db.commit()
        finally:
            db.close()

    # ------------------------------------------------------------------
    # Phase 5: Document persistence and download tests
    # ------------------------------------------------------------------

    def test_generated_document_is_persisted_in_db(self) -> None:
        self._login_as_staff()
        response = self.client.post("/documents/generate", json=self._document_generation_payload())
        self.assertEqual(response.status_code, 200)
        document_id = response.json()["item"].get("document_id")
        self.assertIsNotNone(document_id)

        # Verify it appears in the list endpoint
        list_response = self.client.get("/clients/CLI-2026-0002/documents")
        self.assertEqual(list_response.status_code, 200)
        items = list_response.json()["items"]
        self.assertGreaterEqual(len(items), 1)
        persisted = next((d for d in items if d["id"] == document_id), None)
        self.assertIsNotNone(persisted)
        self.assertEqual(persisted["document_type"], "Statement of Suitability")
        self.assertEqual(persisted["status"], "draft")
        self.assertIsNotNone(persisted["preview_html"])
        self.assertIn("Jamie Murphy", persisted["preview_html"])

    def test_list_documents_requires_login(self) -> None:
        response = self.client.get("/clients/CLI-2026-0002/documents")
        self.assertEqual(response.status_code, 401)

    def test_list_documents_returns_404_for_unknown_client(self) -> None:
        self._login_as_staff()
        response = self.client.get("/clients/CLI-UNKNOWN/documents")
        self.assertEqual(response.status_code, 404)

    def test_create_document_via_post_endpoint(self) -> None:
        self._login_as_staff()
        payload = {
            "document_type": "Fact Find",
            "document_name": "Test_Fact_Find",
            "version": "1",
            "status": "draft",
            "preview_title": "Fact Find Preview",
            "preview_html": "<h1>Fact Find</h1><p>Preview content.</p>",
        }
        response = self.client.post("/clients/CLI-2026-0002/documents", json=payload)
        self.assertEqual(response.status_code, 201)
        item = response.json()["item"]
        self.assertEqual(item["document_type"], "Fact Find")
        self.assertEqual(item["status"], "draft")
        self.assertEqual(item["preview_title"], "Fact Find Preview")
        self.assertIn("id", item)

        # Verify it shows in list
        list_response = self.client.get("/clients/CLI-2026-0002/documents")
        items = list_response.json()["items"]
        self.assertTrue(any(d["id"] == item["id"] for d in items))

    def test_create_document_with_artifact_upload_persists_downloadable_file(self) -> None:
        self._login_as_staff()
        response = self.client.post(
            "/clients/CLI-2026-0002/documents",
            data={
                "document_type": "Statement of Suitability",
                "document_name": "Statement_for_Jamie",
                "version": "Version 1",
                "status": "PDF ready",
                "preview_title": "Statement Preview",
                "preview_html": "<h1>Preview</h1>",
            },
            files={"artifact": ("Statement_for_Jamie.pdf", b"pdf-bytes", "application/pdf")},
        )
        self.assertEqual(response.status_code, 201)
        item = response.json()["item"]
        self.assertIsNotNone(item["pdf_file_path"])
        self.assertIsNone(item["docx_file_path"])

        download_response = self.client.get(f"/clients/CLI-2026-0002/documents/{item['id']}/download")
        self.assertEqual(download_response.status_code, 200)
        self.assertEqual(download_response.content, b"pdf-bytes")

    def test_create_document_rejects_empty_artifact_upload(self) -> None:
        self._login_as_staff()
        response = self.client.post(
            "/clients/CLI-2026-0002/documents",
            data={"document_type": "Statement of Suitability"},
            files={"artifact": ("empty.pdf", b"", "application/pdf")},
        )
        self.assertEqual(response.status_code, 400)

    def test_create_document_requires_login(self) -> None:
        response = self.client.post("/clients/CLI-2026-0002/documents", json={"document_type": "Test"})
        self.assertEqual(response.status_code, 401)

    def test_download_document_returns_404_when_no_artifact(self) -> None:
        self._login_as_staff()
        # Generate a document (no artifact yet)
        gen_resp = self.client.post("/documents/generate", json=self._document_generation_payload())
        document_id = gen_resp.json()["item"]["document_id"]
        response = self.client.get(f"/clients/CLI-2026-0002/documents/{document_id}/download")
        self.assertEqual(response.status_code, 404)

    def test_download_document_requires_login(self) -> None:
        self._login_as_staff()
        gen_resp = self.client.post("/documents/generate", json=self._document_generation_payload())
        document_id = gen_resp.json()["item"]["document_id"]
        self.client.post("/auth/logout")
        response = self.client.get(f"/clients/CLI-2026-0002/documents/{document_id}/download")
        self.assertEqual(response.status_code, 401)

    def test_download_document_returns_404_for_unknown_document(self) -> None:
        self._login_as_staff()
        response = self.client.get("/clients/CLI-2026-0002/documents/00000000-0000-0000-0000-000000000000/download")
        self.assertEqual(response.status_code, 404)

    def test_download_document_returns_404_for_invalid_document_id(self) -> None:
        self._login_as_staff()
        response = self.client.get("/clients/CLI-2026-0002/documents/not-a-uuid/download")
        self.assertEqual(response.status_code, 404)

    # ------------------------------------------------------------------
    # Document pack ZIP download tests
    # ------------------------------------------------------------------

    def test_document_pack_requires_auth(self) -> None:
        response = self.client.get("/clients/CLI-2026-0002/documents/pack")
        self.assertEqual(response.status_code, 401)

    def test_document_pack_unknown_client_returns_404(self) -> None:
        self._login_as_staff()
        response = self.client.get("/clients/CLI-UNKNOWN/documents/pack")
        self.assertEqual(response.status_code, 404)

    def test_document_pack_no_artifacts_returns_404(self) -> None:
        """A client with generated documents but no persisted artifacts returns 404."""
        self._login_as_staff()
        # Generate a document (no artifact upload)
        self.client.post("/documents/generate", json=self._document_generation_payload())
        response = self.client.get("/clients/CLI-2026-0002/documents/pack")
        self.assertEqual(response.status_code, 404)

    def test_document_pack_returns_zip_with_expected_files(self) -> None:
        self._login_as_staff()
        # Upload a document with a PDF artifact
        resp = self.client.post(
            "/clients/CLI-2026-0002/documents",
            data={
                "document_type": "Statement of Suitability",
                "document_name": "Statement_for_Jamie",
                "version": "Version 1",
                "status": "PDF ready",
            },
            files={"artifact": ("Statement_for_Jamie.pdf", b"pdf-content", "application/pdf")},
        )
        self.assertEqual(resp.status_code, 201)
        doc_id = resp.json()["item"]["id"]

        # Upload a second document with a DOCX artifact
        resp2 = self.client.post(
            "/clients/CLI-2026-0002/documents",
            data={
                "document_type": "Fact Find",
                "document_name": "Fact_Find_Jamie",
                "version": "1",
                "status": "DOCX ready",
            },
            files={"artifact": ("Fact_Find_Jamie.docx", b"docx-content", "application/vnd.openxmlformats-officedocument.wordprocessingml.document")},
        )
        self.assertEqual(resp2.status_code, 201)

        # Download the pack
        pack_response = self.client.get("/clients/CLI-2026-0002/documents/pack")
        self.assertEqual(pack_response.status_code, 200)
        self.assertEqual(pack_response.headers["content-type"], "application/zip")

        # Verify ZIP contents
        import io, zipfile
        zip_file = zipfile.ZipFile(io.BytesIO(pack_response.content))
        names = sorted(zip_file.namelist())
        self.assertEqual(len(names), 2)
        self.assertIn("Statement_for_Jamie.pdf", names)
        self.assertIn("Fact_Find_Jamie.docx", names)
        self.assertEqual(zip_file.read("Statement_for_Jamie.pdf"), b"pdf-content")
        self.assertEqual(zip_file.read("Fact_Find_Jamie.docx"), b"docx-content")

    def test_document_pack_includes_both_artifacts_when_doc_has_pdf_and_docx(self) -> None:
        """A single document row with both PDF and DOCX artifacts packs both."""
        from app.db import get_session
        from app.repositories.documents import DocumentRepository
        from app.main import settings as app_settings
        from app.services.storage import ClientStorage

        self._login_as_staff()

        # Upload a DOCX artifact via the API
        resp = self.client.post(
            "/clients/CLI-2026-0002/documents",
            data={
                "document_type": "Statement of Suitability",
                "document_name": "Statement_for_Jamie",
                "version": "Version 1",
                "status": "DOCX ready",
            },
            files={"artifact": ("Statement_for_Jamie.docx", b"docx-bytes", "application/vnd.openxmlformats-officedocument.wordprocessingml.document")},
        )
        self.assertEqual(resp.status_code, 201)
        item = resp.json()["item"]
        doc_id = item["id"]
        self.assertIsNotNone(item["docx_file_path"])
        self.assertIsNone(item["pdf_file_path"])

        # Now manually add a PDF artifact via the repository + storage
        from app.domain.clients import ClientRecord, ClientStatus, build_client_storage_slug
        from app.repositories.clients import ClientRepository

        db = get_session()
        try:
            client_repo = ClientRepository(db)
            client_model = client_repo.get_by_reference("CLI-2026-0002")
            record = ClientRecord(
                first_name=client_model.first_name or "",
                surname=client_model.surname or "",
                status=ClientStatus(client_model.status) if client_model.status else ClientStatus.DRAFT,
            )
            slug = build_client_storage_slug("CLI-2026-0002", record)
            storage = ClientStorage(app_settings.file_storage_path)
            filepath = storage.save_file(slug, "Statement_for_Jamie.pdf", b"pdf-bytes")
            relative = str(filepath.relative_to(app_settings.file_storage_path))

            doc_repo = DocumentRepository(db)
            updated = doc_repo.update_artifact_paths(doc_id, pdf_path=relative)
            self.assertIsNotNone(updated)
            db.commit()

            # Now the doc row has both docx_file_path and pdf_file_path
            doc = doc_repo.get_by_id(doc_id)
            self.assertIsNotNone(doc.docx_file_path)
            self.assertIsNotNone(doc.pdf_file_path)
        finally:
            db.close()

        # Download pack — should contain both artifacts
        pack_response = self.client.get("/clients/CLI-2026-0002/documents/pack")
        self.assertEqual(pack_response.status_code, 200)

        import io, zipfile
        zip_file = zipfile.ZipFile(io.BytesIO(pack_response.content))
        names = sorted(zip_file.namelist())
        self.assertEqual(len(names), 2)
        self.assertIn("Statement_for_Jamie.docx", names)
        self.assertIn("Statement_for_Jamie.pdf", names)
        self.assertEqual(zip_file.read("Statement_for_Jamie.docx"), b"docx-bytes")
        self.assertEqual(zip_file.read("Statement_for_Jamie.pdf"), b"pdf-bytes")

    def test_document_pack_avoids_duplicate_zip_entries(self) -> None:
        """When two docs have the same document_name, ZIP entries get deduplicated suffixes."""
        self._login_as_staff()

        # Upload two documents with the same document_name
        for i, content in enumerate((b"first", b"second")):
            resp = self.client.post(
                "/clients/CLI-2026-0002/documents",
                data={
                    "document_type": "Fact Find",
                    "document_name": "Duplicate_Name",
                    "version": str(i + 1),
                    "status": "PDF ready",
                },
                files={"artifact": ("Duplicate_Name.pdf", content, "application/pdf")},
            )
            self.assertEqual(resp.status_code, 201)

        pack_response = self.client.get("/clients/CLI-2026-0002/documents/pack")
        self.assertEqual(pack_response.status_code, 200)

        import io, zipfile
        zip_file = zipfile.ZipFile(io.BytesIO(pack_response.content))
        names = sorted(zip_file.namelist())
        self.assertEqual(len(names), 2)
        # First entry uses the base name; second gets _1 suffix
        self.assertIn("Duplicate_Name.pdf", names)
        self.assertIn("Duplicate_Name_1.pdf", names)

    # ------------------------------------------------------------------
    # Document deletion tests
    # ------------------------------------------------------------------

    def test_delete_document_requires_auth(self) -> None:
        response = self.client.delete("/clients/CLI-2026-0002/documents/00000000-0000-0000-0000-000000000000")
        self.assertEqual(response.status_code, 401)

    def test_delete_document_returns_404_for_unknown_document(self) -> None:
        self._login_as_staff()
        response = self.client.delete("/clients/CLI-2026-0002/documents/00000000-0000-0000-0000-000000000000")
        self.assertEqual(response.status_code, 404)

    def test_delete_document_returns_404_for_invalid_document_id(self) -> None:
        self._login_as_staff()
        response = self.client.delete("/clients/CLI-2026-0002/documents/not-a-uuid")
        self.assertEqual(response.status_code, 404)

    def test_delete_document_removes_db_row_and_disk_artifacts(self) -> None:
        """Deleting a document removes the DB row and disk file."""
        from pathlib import Path
        from app.main import settings as app_settings

        self._login_as_staff()

        # Upload a document with a PDF artifact
        resp = self.client.post(
            "/clients/CLI-2026-0002/documents",
            data={
                "document_type": "Statement of Suitability",
                "document_name": "Delete_Test_Doc",
                "version": "Version 1",
                "status": "PDF ready",
            },
            files={"artifact": ("Delete_Test_Doc.pdf", b"delete-me", "application/pdf")},
        )
        self.assertEqual(resp.status_code, 201)
        doc_id = resp.json()["item"]["id"]
        pdf_path = resp.json()["item"]["pdf_file_path"]
        self.assertIsNotNone(pdf_path)

        # Verify file on disk
        full_path = Path(app_settings.file_storage_path) / pdf_path
        self.assertTrue(full_path.is_file(), f"File not found at {full_path}")

        # Delete the document
        del_resp = self.client.delete(f"/clients/CLI-2026-0002/documents/{doc_id}")
        self.assertEqual(del_resp.status_code, 200)
        self.assertTrue(del_resp.json()["deleted"])
        self.assertEqual(del_resp.json()["document_id"], doc_id)

        # DB row should be gone
        from app.db import get_session
        from app.repositories.documents import DocumentRepository
        db = get_session()
        try:
            doc_repo = DocumentRepository(db)
            self.assertIsNone(doc_repo.get_by_id(doc_id))
            db.commit()
        finally:
            db.close()

        # Disk artifact should be gone
        self.assertFalse(full_path.is_file(), f"File still exists at {full_path}")

    def test_repeated_delete_document_returns_404(self) -> None:
        self._login_as_staff()
        resp = self.client.post(
            "/clients/CLI-2026-0002/documents",
            data={
                "document_type": "Fact Find",
                "document_name": "Twice_Delete",
                "version": "1",
                "status": "DOCX ready",
            },
            files={"artifact": ("Twice_Delete.docx", b"delete-me-too", "application/vnd.openxmlformats-officedocument.wordprocessingml.document")},
        )
        doc_id = resp.json()["item"]["id"]

        # First delete succeeds
        r1 = self.client.delete(f"/clients/CLI-2026-0002/documents/{doc_id}")
        self.assertEqual(r1.status_code, 200)

        # Second delete returns 404
        r2 = self.client.delete(f"/clients/CLI-2026-0002/documents/{doc_id}")
        self.assertEqual(r2.status_code, 404)

    # ------------------------------------------------------------------
    # Phase 4: File upload / list / download tests
    # ------------------------------------------------------------------

    def test_upload_file_requires_login(self) -> None:
        response = self.client.post(
            "/clients/CLI-2026-0002/files",
            files={"file": ("test.pdf", b"hello", "application/pdf")},
            data={"category": "Proof"},
        )
        self.assertEqual(response.status_code, 401)

    def test_upload_file_stores_on_disk_and_returns_metadata(self) -> None:
        self._login_as_admin()
        response = self.client.post(
            "/clients/CLI-2026-0002/files",
            files={"file": ("test.pdf", b"hello world", "application/pdf")},
            data={"category": "Proof"},
        )
        self.assertEqual(response.status_code, 201)
        payload = response.json()["item"]
        self.assertEqual(payload["original_filename"], "test.pdf")
        self.assertEqual(payload["category"], "Proof")
        self.assertEqual(payload["status"], "uploaded")
        self.assertIn("id", payload)
        self.assertIn("stored_filename", payload)

    def test_upload_file_rejects_empty_request(self) -> None:
        self._login_as_admin()
        response = self.client.post("/clients/CLI-2026-0002/files")
        self.assertEqual(response.status_code, 400)

    def test_list_files_returns_uploaded_file(self) -> None:
        self._login_as_admin()
        self.client.post(
            "/clients/CLI-2026-0002/files",
            files={"file": ("uploaded.pdf", b"content", "application/pdf")},
            data={"category": "Identity"},
        )
        response = self.client.get("/clients/CLI-2026-0002/files")
        self.assertEqual(response.status_code, 200)
        items = response.json()["items"]
        self.assertGreaterEqual(len(items), 1)
        self.assertEqual(items[0]["original_filename"], "uploaded.pdf")

    def test_download_file_returns_stored_content(self) -> None:
        self._login_as_admin()
        upload_resp = self.client.post(
            "/clients/CLI-2026-0002/files",
            files={"file": ("download.pdf", b"binary payload", "application/pdf")},
        )
        file_id = upload_resp.json()["item"]["id"]
        response = self.client.get(f"/clients/CLI-2026-0002/files/{file_id}/download")
        self.assertEqual(response.status_code, 200)
        self.assertEqual(response.content, b"binary payload")

    def test_download_file_still_works_after_client_details_change(self) -> None:
        self._login_as_admin()
        upload_resp = self.client.post(
            "/clients/CLI-2026-0002/files",
            files={"file": ("rename-safe.pdf", b"rename-safe", "application/pdf")},
        )
        file_id = upload_resp.json()["item"]["id"]

        update_resp = self.client.patch(
            "/clients/CLI-2026-0002",
            json={"first_name": "Jamie-Renamed", "surname": "Murphy-Updated"},
        )
        self.assertEqual(update_resp.status_code, 200)

        response = self.client.get(f"/clients/CLI-2026-0002/files/{file_id}/download")
        self.assertEqual(response.status_code, 200)
        self.assertEqual(response.content, b"rename-safe")

    def test_download_file_requires_login(self) -> None:
        # Upload first so we have a valid ID
        self._login_as_admin()
        upload_resp = self.client.post(
            "/clients/CLI-2026-0002/files",
            files={"file": ("login-test.pdf", b"x", "application/pdf")},
        )
        file_id = upload_resp.json()["item"]["id"]
        self.client.post("/auth/logout")
        response = self.client.get(f"/clients/CLI-2026-0002/files/{file_id}/download")
        self.assertEqual(response.status_code, 401)

    def test_download_returns_404_for_unknown_file(self) -> None:
        self._login_as_admin()
        response = self.client.get("/clients/CLI-2026-0002/files/00000000-0000-0000-0000-000000000000/download")
        self.assertEqual(response.status_code, 404)

    def test_download_returns_404_for_invalid_file_id(self) -> None:
        self._login_as_admin()
        response = self.client.get("/clients/CLI-2026-0002/files/not-a-uuid/download")
        self.assertEqual(response.status_code, 404)

    # ------------------------------------------------------------------
    # File deletion tests
    # ------------------------------------------------------------------

    def test_delete_file_requires_auth(self) -> None:
        response = self.client.delete("/clients/CLI-2026-0002/files/00000000-0000-0000-0000-000000000000")
        self.assertEqual(response.status_code, 401)

    def test_delete_file_returns_404_for_unknown_file(self) -> None:
        self._login_as_admin()
        response = self.client.delete("/clients/CLI-2026-0002/files/00000000-0000-0000-0000-000000000000")
        self.assertEqual(response.status_code, 404)

    def test_delete_file_returns_404_for_invalid_file_id(self) -> None:
        self._login_as_admin()
        response = self.client.delete("/clients/CLI-2026-0002/files/not-a-uuid")
        self.assertEqual(response.status_code, 404)

    def test_delete_file_removes_db_row_and_disk_artifact(self) -> None:
        """Deleting a file removes the DB row and disk artifact."""
        from pathlib import Path
        from app.main import settings as app_settings

        self._login_as_admin()

        # Upload a file
        upload_resp = self.client.post(
            "/clients/CLI-2026-0002/files",
            files={"file": ("delete_me.pdf", b"delete-me-content", "application/pdf")},
        )
        self.assertEqual(upload_resp.status_code, 201)
        file_id = upload_resp.json()["item"]["id"]

        # Verify file on disk via listing
        from app.db import get_session
        from app.repositories.files import FileRepository
        db = get_session()
        try:
            file_repo = FileRepository(db)
            file_model = file_repo.get_by_id(uuid.UUID(file_id))
            self.assertIsNotNone(file_model)
            file_path = file_model.file_path
            full_path = Path(app_settings.file_storage_path) / file_path
            self.assertTrue(full_path.is_file(), f"File not found at {full_path}")
            db.commit()
        finally:
            db.close()

        # Delete the file
        del_resp = self.client.delete(f"/clients/CLI-2026-0002/files/{file_id}")
        self.assertEqual(del_resp.status_code, 200)
        self.assertTrue(del_resp.json()["deleted"])
        self.assertEqual(del_resp.json()["file_id"], file_id)

        # DB row should be gone
        db2 = get_session()
        try:
            file_repo2 = FileRepository(db2)
            self.assertIsNone(file_repo2.get_by_id(uuid.UUID(file_id)))
            db2.commit()
        finally:
            db2.close()

        # Disk artifact should be gone
        self.assertFalse(full_path.is_file(), f"File still exists at {full_path}")

    def test_repeated_delete_file_returns_404(self) -> None:
        self._login_as_admin()
        upload_resp = self.client.post(
            "/clients/CLI-2026-0002/files",
            files={"file": ("twice_delete.pdf", b"twice", "application/pdf")},
        )
        file_id = upload_resp.json()["item"]["id"]

        # First delete succeeds
        r1 = self.client.delete(f"/clients/CLI-2026-0002/files/{file_id}")
        self.assertEqual(r1.status_code, 200)

        # Second delete returns 404
        r2 = self.client.delete(f"/clients/CLI-2026-0002/files/{file_id}")
        self.assertEqual(r2.status_code, 404)

    def test_delete_document_creates_audit_entry(self) -> None:
        """Deleting a document writes a 'document_deleted' audit row."""
        self._login_as_staff()
        resp = self.client.post(
            "/clients/CLI-2026-0002/documents",
            data={
                "document_type": "Fact Find",
                "document_name": "Audit_Doc",
                "version": "1",
                "status": "PDF ready",
            },
            files={"artifact": ("Audit_Doc.pdf", b"audit-me", "application/pdf")},
        )
        doc_id = resp.json()["item"]["id"]
        self.client.delete(f"/clients/CLI-2026-0002/documents/{doc_id}")
        self.client.post("/auth/logout")

        # Admin can see the audit entry
        self._login_as_admin()
        audit_resp = self.client.get("/admin/audit-logs")
        self.assertEqual(audit_resp.status_code, 200)
        items = audit_resp.json()["items"]
        deletions = [
            entry for entry in items
            if entry.get("action") == "document_deleted"
            and entry.get("entity_id") == doc_id
        ]
        self.assertEqual(len(deletions), 1, f"Expected 1 document_deleted audit row, got {len(deletions)}")
        self.assertEqual(deletions[0]["entity_type"], "document")
        self.assertIn("Audit_Doc", str(deletions[0].get("details", {})))

    def test_delete_file_creates_audit_entry(self) -> None:
        """Deleting a file writes a 'file_deleted' audit row."""
        self._login_as_admin()
        upload_resp = self.client.post(
            "/clients/CLI-2026-0002/files",
            files={"file": ("audit_file.pdf", b"audit-file", "application/pdf")},
        )
        file_id = upload_resp.json()["item"]["id"]
        self.client.delete(f"/clients/CLI-2026-0002/files/{file_id}")

        # Check audit logs
        audit_resp = self.client.get("/admin/audit-logs")
        self.assertEqual(audit_resp.status_code, 200)
        items = audit_resp.json()["items"]
        deletions = [
            entry for entry in items
            if entry.get("action") == "file_deleted"
            and entry.get("entity_id") == file_id
        ]
        self.assertEqual(len(deletions), 1, f"Expected 1 file_deleted audit row, got {len(deletions)}")
        self.assertEqual(deletions[0]["entity_type"], "file")
        self.assertIn("audit_file.pdf", str(deletions[0].get("details", {})))

    def test_upload_file_cleans_up_saved_artifact_when_request_fails(self) -> None:
        from app.main import settings as app_settings
        from fastapi.testclient import TestClient

        failing_client = TestClient(app, headers={"Origin": "http://127.0.0.1:8007"}, raise_server_exceptions=False)
        login_resp = failing_client.post(
            "/auth/login",
            json={"email": "admin@omega.local", "password": "ChangeMe123!"},
        )
        self.assertEqual(login_resp.status_code, 200)

        with patch("app.main._log_audit", side_effect=RuntimeError("forced failure")):
            response = failing_client.post(
                "/clients/CLI-2026-0002/files",
                files={"file": ("cleanup-check.pdf", b"cleanup", "application/pdf")},
            )

        self.assertEqual(response.status_code, 500)
        leftovers = list(app_settings.file_storage_path.rglob("cleanup-check-*.pdf"))
        self.assertEqual(leftovers, [])

    def test_upload_document_cleans_up_saved_artifact_when_request_fails(self) -> None:
        from app.main import settings as app_settings
        from fastapi.testclient import TestClient

        failing_client = TestClient(app, headers={"Origin": "http://127.0.0.1:8007"}, raise_server_exceptions=False)
        login_resp = failing_client.post(
            "/auth/login",
            json={"email": "staff@omega.local", "password": "ChangeMe123!"},
        )
        self.assertEqual(login_resp.status_code, 200)

        with patch("app.main._log_audit", side_effect=RuntimeError("forced failure")):
            response = failing_client.post(
                "/clients/CLI-2026-0002/documents",
                data={
                    "document_type": "Fact Find",
                    "document_name": "Cleanup_Doc",
                    "version": "1",
                    "status": "PDF ready",
                },
                files={"artifact": ("cleanup-doc.pdf", b"cleanup", "application/pdf")},
            )

        self.assertEqual(response.status_code, 500)
        leftovers = list(app_settings.file_storage_path.rglob("cleanup-doc-*.pdf"))
        self.assertEqual(leftovers, [])

    # ------------------------------------------------------------------
    # Document generation tests (store.py-backed)
    # ------------------------------------------------------------------

    def test_logged_in_user_still_gets_seeded_fallback_when_ai_provider_is_unsupported(self) -> None:
        from app.main import settings

        self._login_as_staff()
        original_ai_enabled = settings.ai_enabled
        original_ai_provider = settings.ai_provider
        original_ai_api_key = settings.ai_api_key
        original_ai_model = settings.ai_model

        settings.ai_enabled = True
        settings.ai_provider = "openai"
        settings.ai_api_key = "test-key"
        settings.ai_model = "gpt-5.5"

        try:
            response = self.client.post("/documents/generate", json=self._document_generation_payload())
        finally:
            settings.ai_enabled = original_ai_enabled
            settings.ai_provider = original_ai_provider
            settings.ai_api_key = original_ai_api_key
            settings.ai_model = original_ai_model

        self.assertEqual(response.status_code, 200)
        payload = response.json()["item"]
        self.assertIn("Seeded fallback content", payload["warnings"][0])
        self.assertIn("Jamie Murphy", payload["generated_html"])

    def test_logged_in_user_can_generate_document_via_gemini_provider(self) -> None:
        from app.main import settings

        self._login_as_staff()
        original_ai_enabled = settings.ai_enabled
        original_ai_provider = settings.ai_provider
        original_ai_api_key = settings.ai_api_key
        original_ai_model = settings.ai_model

        settings.ai_enabled = True
        settings.ai_provider = "gemini"
        settings.ai_api_key = "test-key"
        settings.ai_model = "gemini-2.0-flash"

        parsed_response = Mock(
            parsed={
                "title": "Statement of Suitability for Jamie Murphy",
                "summary": "AI-generated summary.",
                "sections": [
                    {"title": "Recommendation", "body": "Recommended cover is EUR2,500 monthly."},
                    {"title": "Needs and objectives", "body": "Protect monthly income during illness."},
                ],
                "warnings": ["Check underwriting limits."],
            }
        )
        mock_client = Mock()
        mock_client.models.generate_content.return_value = parsed_response

        try:
            with patch("app.ai._create_gemini_client", return_value=mock_client):
                response = self.client.post("/documents/generate", json=self._document_generation_payload())
        finally:
            settings.ai_enabled = original_ai_enabled
            settings.ai_provider = original_ai_provider
            settings.ai_api_key = original_ai_api_key
            settings.ai_model = original_ai_model

        self.assertEqual(response.status_code, 200)
        payload = response.json()["item"]
        self.assertEqual(payload["summary"], "AI-generated summary.")
        self.assertEqual(payload["sections"][0]["title"], "Recommendation")
        self.assertIn("EUR2,500 monthly", payload["sections"][0]["bodyHtml"])
        self.assertIn("Statement of Suitability for Jamie Murphy", payload["generated_html"])
        self.assertIn("Check underwriting limits.", payload["warnings"])
