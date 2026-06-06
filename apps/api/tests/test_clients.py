import unittest

from app.domain.clients import ClientRecord, ClientStatus, build_client_reference, build_client_storage_slug


class ClientDomainTests(unittest.TestCase):
    def test_client_reference_uses_created_year_and_sequence(self) -> None:
        reference = build_client_reference(2026, 42)

        self.assertEqual(reference, "CLI-2026-0042")

    def test_storage_slug_is_stable_and_sanitized(self) -> None:
        record = ClientRecord(
            first_name="Aoife",
            surname="O'Brien Smith",
            status=ClientStatus.DRAFT,
        )

        slug = build_client_storage_slug("CLI-2026-0042", record)

        self.assertEqual(slug, "CLI-2026-0042-obrien-smith-aoife")
