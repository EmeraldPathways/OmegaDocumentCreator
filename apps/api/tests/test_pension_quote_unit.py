from __future__ import annotations

import unittest
from unittest.mock import patch

from app.config import get_settings
from app.document_generation import build_statement_quote_requests


class PensionQuoteUnitTests(unittest.TestCase):
    def test_build_statement_quote_requests_routes_pensions_snapshots_to_pension_integration(self) -> None:
        with patch("app.document_generation.submit_phi_request") as submit_phi_request:
            with patch("app.document_generation.submit_pension_request", return_value={"request_type": "Pension"}) as submit_pension_request:
                requests = build_statement_quote_requests(
                    settings=get_settings(
                        PHI_ENDPOINT_URL="http://example.test/interface_phi.php",
                        PHI_USERNAME="user",
                        PHI_PASSWORD="pass",
                        PHI_REQUEST_FROM="omega",
                        PHI_REQUEST_FROM_CODE="code",
                        PENSION_ENDPOINT_URL="http://example.test/interface_pension_calculator.php",
                    ),
                    workflow_snapshot={
                        "workflowKind": "pensions",
                        "dateOfBirth": "1990-11-08",
                        "gender": "Female",
                        "pensionRetirementAge": "65",
                        "pensionRequired": "20000",
                        "monthlyContribution": "500",
                    },
                )

        submit_phi_request.assert_not_called()
        submit_pension_request.assert_called_once()
        self.assertEqual(requests, [{"request_type": "Pension"}])

    def test_pensions_statement_document_type_routes_to_pension_integration_without_snapshot_markers(self) -> None:
        from app.document_generation import _build_integration_requests

        with patch("app.document_generation.submit_phi_request") as submit_phi_request:
            with patch("app.document_generation.submit_pension_request", return_value={"request_type": "Pension"}) as submit_pension_request:
                requests = _build_integration_requests(
                    settings=get_settings(
                        PHI_ENDPOINT_URL="http://example.test/interface_phi.php",
                        PHI_USERNAME="user",
                        PHI_PASSWORD="pass",
                        PHI_REQUEST_FROM="omega",
                        PHI_REQUEST_FROM_CODE="code",
                        PENSION_ENDPOINT_URL="http://example.test/interface_pension_calculator.php",
                    ),
                    document_type="Pensions Statement",
                    workflow_snapshot={
                        "dateOfBirth": "1990-11-08",
                        "gender": "Female",
                        "provider": "Pension Co",
                    },
                    warnings=[],
                )

        submit_phi_request.assert_not_called()
        submit_pension_request.assert_called_once()
        self.assertEqual(requests, [{"request_type": "Pension"}])


if __name__ == "__main__":
    unittest.main()
