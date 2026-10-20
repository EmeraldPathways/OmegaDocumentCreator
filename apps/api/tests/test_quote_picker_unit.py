from __future__ import annotations

import unittest
from unittest.mock import patch

from app.config import get_settings
from app.document_generation import build_quote_picker_requests


class QuotePickerUnitTests(unittest.TestCase):
    def test_build_quote_picker_requests_returns_each_supported_deferred_period(self) -> None:
        def fake_submit_phi_request(_settings: object, workflow_snapshot: dict[str, object]) -> dict[str, object]:
            period = str(workflow_snapshot["deferredPeriod"])
            return {
                "provider": "BestAdvice",
                "request_type": "Phi",
                "status": "sent",
                "requested_at": "2026-10-20T10:00:00+00:00",
                "request_fields": [{"label": "DeferredPeriod", "value": period}],
                "quote_results": [{"provider_name": "Aviva", "policy_type": "Guaranteed", "level_premium": "100.00"}],
                "errors": [],
            }

        with patch("app.document_generation.submit_phi_request", side_effect=fake_submit_phi_request):
            requests = build_quote_picker_requests(
                settings=get_settings(
                    PHI_ENDPOINT_URL="http://example.test/interface_phi.php",
                    PHI_USERNAME="user",
                    PHI_PASSWORD="pass",
                    PHI_REQUEST_FROM="omega",
                    PHI_REQUEST_FROM_CODE="code",
                ),
                workflow_snapshot={
                    "dateOfBirth": "1990-11-08",
                    "gender": "Female",
                    "smokerStatus": "Non-Smoker",
                    "coverAge": "65",
                    "recommendedCover": "30000",
                    "phiOccupationalClass": "2",
                    "phiIndexation": "Y",
                },
            )

        self.assertEqual(
            [request["request_fields"][0]["value"] for request in requests],
            ["4 weeks", "8 weeks", "13 weeks", "26 weeks", "52 weeks"],
        )
        self.assertEqual(len(requests), 5)


if __name__ == "__main__":
    unittest.main()
