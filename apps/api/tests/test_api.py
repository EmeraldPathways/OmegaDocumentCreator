import unittest

from fastapi.testclient import TestClient

from app.main import app


class ApiTests(unittest.TestCase):
    def setUp(self) -> None:
        from app.store import reset_store

        reset_store()
        self.client = TestClient(app)

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

    def test_login_returns_seeded_user_profile(self) -> None:
        response = self.client.post(
            "/auth/login",
            json={"email": "admin@omega.local", "password": "ChangeMe123!"},
        )

        self.assertEqual(response.status_code, 200)
        payload = response.json()
        self.assertEqual(payload["user"]["email"], "admin@omega.local")
        self.assertEqual(payload["user"]["role"], "admin")

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

    def test_clients_returns_seeded_client(self) -> None:
        response = self.client.get("/clients")

        self.assertEqual(response.status_code, 200)
        payload = response.json()
        self.assertEqual(payload["items"][0]["client_reference"], "CLI-2026-0001")

    def test_client_detail_returns_full_seeded_profile(self) -> None:
        response = self.client.get("/clients/CLI-2026-0002")

        self.assertEqual(response.status_code, 200)
        payload = response.json()["item"]
        self.assertEqual(payload["client_reference"], "CLI-2026-0002")
        self.assertEqual(payload["full_name"], "Jamie Murphy")
        self.assertEqual(payload["email"], "jamie.murphy@example.com")
        self.assertEqual(payload["mobile_number"], "0870000002")

    def test_admin_users_requires_admin_session(self) -> None:
        self.client.post(
            "/auth/login",
            json={"email": "staff@omega.local", "password": "ChangeMe123!"},
        )

        response = self.client.get("/admin/users")

        self.assertEqual(response.status_code, 403)

    def test_admin_audit_logs_requires_admin_session(self) -> None:
        self.client.post(
            "/auth/login",
            json={"email": "staff@omega.local", "password": "ChangeMe123!"},
        )

        response = self.client.get("/admin/audit-logs")

        self.assertEqual(response.status_code, 403)

    def test_admin_can_view_seeded_audit_logs(self) -> None:
        self.client.post(
            "/auth/login",
            json={"email": "admin@omega.local", "password": "ChangeMe123!"},
        )

        response = self.client.get("/admin/audit-logs")

        self.assertEqual(response.status_code, 200)
        payload = response.json()["items"]
        self.assertGreaterEqual(len(payload), 1)
        self.assertEqual(payload[0]["action"], "document_generated")
        self.assertEqual(payload[0]["entity_type"], "document")

    def test_admin_backup_run_requires_admin_session(self) -> None:
        self.client.post(
            "/auth/login",
            json={"email": "staff@omega.local", "password": "ChangeMe123!"},
        )

        response = self.client.post("/admin/backups/run")

        self.assertEqual(response.status_code, 403)

    def test_admin_can_trigger_seeded_backup_run(self) -> None:
        self.client.post(
            "/auth/login",
            json={"email": "admin@omega.local", "password": "ChangeMe123!"},
        )

        response = self.client.post("/admin/backups/run")

        self.assertEqual(response.status_code, 200)
        payload = response.json()["item"]
        self.assertEqual(payload["status"], "success")
        self.assertEqual(payload["triggered_by"], "admin@omega.local")

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

    def test_document_generation_persists_generated_draft_in_seeded_store(self) -> None:
        from app.store import get_client, get_client_generated_document_draft

        self._login_as_staff()

        response = self.client.post("/documents/generate", json=self._document_generation_payload())

        self.assertEqual(response.status_code, 200)
        saved_draft = get_client_generated_document_draft("CLI-2026-0002", "Statement of Suitability")
        self.assertIsNotNone(saved_draft)
        self.assertEqual(saved_draft["template_id"], "income-protection-statement")
        self.assertEqual(saved_draft["title"], "Statement of Suitability for Jamie Murphy")
        self.assertEqual(saved_draft["generation_status"], "completed")
        self.assertEqual(saved_draft["sections"][0]["title"], "Client overview")
        self.assertIn("bodyHtml", saved_draft["sections"][0])
        self.assertIn("Jamie Murphy", saved_draft["generated_html"])
        client = get_client("CLI-2026-0002")
        self.assertIsNotNone(client)
        self.assertEqual(client["generated_documents"][0]["document_type"], "Statement of Suitability")
        self.assertEqual(
            client["generated_documents"][0]["preview_title"],
            "Statement of Suitability for Jamie Murphy",
        )
        self.assertIn("Jamie Murphy", client["generated_documents"][0]["preview_html"])

    def test_logged_in_user_still_gets_seeded_fallback_when_ai_is_configured_without_provider_impl(self) -> None:
        from app.main import settings

        self._login_as_staff()

        original_ai_enabled = settings.ai_enabled
        original_ai_provider = settings.ai_provider
        original_ai_api_key = settings.ai_api_key
        original_ai_model = settings.ai_model

        settings.ai_enabled = True
        settings.ai_provider = "gemini"
        settings.ai_api_key = "test-key"
        settings.ai_model = "gemini-1.5-flash"

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
