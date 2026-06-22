"""Phase 2 DB-backed API tests.

Requires a running PostgreSQL instance reachable via TEST_DATABASE_URL
or DATABASE_URL.  Falls back to postgresql://postgres:postgres@localhost:5432/omega_test.
"""

from __future__ import annotations

import unittest
from unittest.mock import Mock, patch

from fastapi.testclient import TestClient
from sqlalchemy.orm import sessionmaker

# Import test helpers from the tests package
import db_test_helpers  # noqa: E402

import app.db  # noqa: E402

from app.main import app  # noqa: E402


def _db_is_available() -> bool:
    try:
        engine = db_test_helpers._build_test_engine()
        with engine.connect():
            return True
    except Exception:
        return False


_DB_AVAILABLE = _db_is_available()
_test_engine = db_test_helpers.setup_test_db() if _DB_AVAILABLE else None

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
        db = db_test_helpers.new_test_session(_test_engine)
        try:
            db_test_helpers.truncate_all(db)
            db_test_helpers.seed_default_users(db)
            db_test_helpers.seed_default_clients(db)
            db.commit()
        finally:
            db.close()

        from app.store import reset_store

        reset_store()

        self.client = TestClient(app)

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
        response = self.client.get("/clients")
        self.assertEqual(response.status_code, 200)
        items = response.json()["items"]
        refs = [c["client_reference"] for c in items]
        self.assertIn("CLI-2026-0001", refs)
        self.assertIn("CLI-2026-0002", refs)

    def test_client_detail_returns_full_seeded_profile(self) -> None:
        response = self.client.get("/clients/CLI-2026-0002")
        self.assertEqual(response.status_code, 200)
        payload = response.json()["item"]
        self.assertEqual(payload["client_reference"], "CLI-2026-0002")
        self.assertEqual(payload["full_name"], "Jamie Murphy")
        self.assertEqual(payload["email"], "jamie.murphy@example.com")
        self.assertEqual(payload["mobile_number"], "0870000002")

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
        disable_response = self.client.patch("/admin/users/nora.kelly@omega.local/disable")
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
            "/admin/users/nora.kelly@omega.local",
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

    def test_workflow_save_and_reload_roundtrip(self) -> None:
        self._login_as_admin()
        fields = {
            "personalCircumstances": "Test circumstances",
            "financialSituation": "Test financial",
            "needsObjectives": "Test needs",
            "termsVersion": "June 2026",
            "occupation": "Developer",
            "recommendedCover": "2500",
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
        self.assertEqual(payload["status"], "success")
        self.assertIn("id", payload)
        self.assertIsNotNone(payload["created_at"])
        self.assertIsNotNone(payload["files_backup"])
        self.assertIsNotNone(payload["documents_backup"])
        self.assertIsNone(payload["error_message"])
        self.assertIsNotNone(payload["triggered_by"])

        # Verify it appears in the list
        list_resp = self.client.get("/admin/backups")
        self.assertEqual(list_resp.status_code, 200)
        items = list_resp.json()["items"]
        self.assertTrue(any(r["id"] == payload["id"] for r in items))

        # Verify artifact file exists on disk
        manifest_path = payload["files_backup"]
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
        self.assertEqual(items[0]["status"], "success")

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

    def test_admin_can_view_security_summary(self) -> None:
        self.client.post(
            "/auth/login",
            json={"email": "admin@omega.local", "password": "ChangeMe123!"},
        )
        response = self.client.get("/admin/security-summary")
        self.assertEqual(response.status_code, 200)
        payload = response.json()["item"]
        self.assertEqual(payload["remote_access"], "cloudflare_tunnel_recommended")
        self.assertEqual(payload["public_port_exposure"], "disabled")

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
