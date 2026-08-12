from pathlib import Path
import tempfile
import unittest

from app.services.storage import ClientStorage


class ClientStorageContractTests(unittest.TestCase):
    def test_client_year_contract_creates_required_workflow_folders(self) -> None:
        root = Path(tempfile.mkdtemp(prefix="omega-storage-"))
        try:
            storage = ClientStorage(root)
            year_folder = storage.ensure_client_year_contract("Murphy, Jamie - omega-00002", 2026)

            self.assertEqual(year_folder, root / "Murphy, Jamie - omega-00002" / "2026")
            self.assertTrue((year_folder / "files").is_dir())
            self.assertTrue((year_folder / "documents").is_dir())
            for workflow in ("income-protection", "pensions", "savings", "investments"):
                self.assertTrue((year_folder / workflow / "files").is_dir())
                self.assertTrue((year_folder / workflow / "documents").is_dir())
        finally:
            for item in sorted(root.rglob("*"), reverse=True):
                if item.is_file():
                    item.unlink()
                elif item.is_dir():
                    item.rmdir()
            root.rmdir()

    def test_general_workflow_resolves_to_year_root_bucket(self) -> None:
        root = Path(tempfile.mkdtemp(prefix="omega-storage-"))
        try:
            storage = ClientStorage(root)
            folder = storage.ensure_client_workflow_folder("Murphy, Jamie - omega-00002", 2026, "fact-find", "documents")
            self.assertEqual(folder, root / "Murphy, Jamie - omega-00002" / "2026" / "documents")
        finally:
            for item in sorted(root.rglob("*"), reverse=True):
                if item.is_file():
                    item.unlink()
                elif item.is_dir():
                    item.rmdir()
            root.rmdir()
