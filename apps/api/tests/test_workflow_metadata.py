import unittest

from app.repositories.workflows import _build_workflow_meta_payload, _extract_workflow_meta


class WorkflowMetadataTests(unittest.TestCase):
    def test_saved_statements_are_limited_to_five_newest_and_preserve_other_metadata(self):
        saved_statements = [
            {
                "id": f"statement-{index}",
                "name": f"Statement {index}",
                "documentType": "Statement of Suitability",
                "policyPickerLabel": "Irish Life | Income Protection | €81.92",
                "statementFields": {"letterDate": "2026-10-02"},
                "documentDraft": {"selectedTemplateId": "statement-default"},
            }
            for index in range(6, 0, -1)
        ]
        payload = _build_workflow_meta_payload(
            saved_quotes=[{"id": "quote-1", "name": "Quote 1"}],
            saved_statements=saved_statements,
            workflow_fields={"statementSelectedQuoteKey": "quote-1"},
        )

        saved_quotes, normalized_statements, workflow_fields = _extract_workflow_meta(payload)

        self.assertEqual([entry["id"] for entry in saved_quotes], ["quote-1"])
        self.assertEqual(
            [entry["id"] for entry in normalized_statements],
            ["statement-6", "statement-5", "statement-4", "statement-3", "statement-2"],
        )
        self.assertEqual(
            normalized_statements[0]["policyPickerLabel"],
            "Irish Life | Income Protection | €81.92",
        )
        self.assertEqual(workflow_fields["statementSelectedQuoteKey"], "quote-1")


if __name__ == "__main__":
    unittest.main()
