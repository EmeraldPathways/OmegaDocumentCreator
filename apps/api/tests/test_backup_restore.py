"""Non-DB unit tests for backup and restore services.

These tests do NOT require PostgreSQL — they call the service functions
directly and mock pg_dump / pg_restore subprocess calls.
"""

from __future__ import annotations

import json
import tempfile
import unittest
import zipfile
from pathlib import Path
from unittest.mock import patch

from app.services.backups import create_backup_manifest, run_pg_dump
from app.services.restore import (
    RestoreValidationError,
    dry_run_restore,
    execute_restore,
    load_manifest,
    validate_manifest_artifacts,
    validate_restore,
)


class BackupServiceTests(unittest.TestCase):
    """Unit tests for backup service functions (no DB required)."""

    def setUp(self) -> None:
        self._tmpdir = tempfile.TemporaryDirectory()
        self.backup_root = Path(self._tmpdir.name) / "backups"
        self.file_root = Path(self._tmpdir.name) / "files"
        self.backup_root.mkdir(parents=True, exist_ok=True)
        self.file_root.mkdir(parents=True, exist_ok=True)
        (self.file_root / "Murphy, Jamie - omega-00002" / "2026" / "income-protection" / "files").mkdir(parents=True, exist_ok=True)
        (self.file_root / "Murphy, Jamie - omega-00002" / "2026" / "income-protection" / "documents").mkdir(parents=True, exist_ok=True)
        (self.file_root / "Murphy, Jamie - omega-00002" / "2026" / "income-protection" / "files" / "payslip.pdf").write_bytes(b"pay")
        (self.file_root / "Murphy, Jamie - omega-00002" / "2026" / "income-protection" / "documents" / "fact-find.docx").write_bytes(b"doc")

    def tearDown(self) -> None:
        self._tmpdir.cleanup()

    # ------------------------------------------------------------------
    # pg_dump mock tests
    # ------------------------------------------------------------------

    def test_pg_dump_success_sets_database_backup(self) -> None:
        """Mock pg_dump success: status='success', database_backup path set."""
        with patch("app.services.backups.run_pg_dump", return_value=("dumps/pgdump-test.dump", None)):
            result = create_backup_manifest(
                backup_path=self.backup_root,
                file_storage_path=self.file_root,
                triggered_by_email="admin@test.local",
                database_url="postgresql+psycopg://real:real@localhost:5432/realdb",
            )

        self.assertEqual(result["status"], "success")
        self.assertEqual(result["database_backup"], "dumps/pgdump-test.dump")
        self.assertIsNone(result["error_message"])

    def test_pg_dump_failure_sets_partial_status(self) -> None:
        """Mock pg_dump failure: status='partial', error_message set, database_backup None."""
        with patch("app.services.backups.run_pg_dump", return_value=(None, "pg_dump binary not found at 'pg_dump'")):
            result = create_backup_manifest(
                backup_path=self.backup_root,
                file_storage_path=self.file_root,
                triggered_by_email="admin@test.local",
                database_url="postgresql+psycopg://real:real@localhost:5432/realdb",
            )

        self.assertEqual(result["status"], "partial")
        self.assertIsNone(result["database_backup"])
        self.assertEqual(result["error_message"], "pg_dump binary not found at 'pg_dump'")

    def test_backup_skips_pg_dump_with_placeholder_url(self) -> None:
        """Placeholder DATABASE_URL: pg_dump never called, status='success'."""
        # Use a side-effect that would fail the test if called
        with patch("app.services.backups.run_pg_dump", side_effect=RuntimeError("should not be called")):
            result = create_backup_manifest(
                backup_path=self.backup_root,
                file_storage_path=self.file_root,
                triggered_by_email="admin@test.local",
                database_url="postgresql://placeholder",
            )

        self.assertEqual(result["status"], "success")
        self.assertIsNone(result["database_backup"])
        self.assertIsNone(result["error_message"])

    def test_pg_dump_failure_never_sets_success_status(self) -> None:
        """When pg_dump fails, status must NOT be 'success'."""
        with patch("app.services.backups.run_pg_dump", return_value=(None, "timeout")):
            result = create_backup_manifest(
                backup_path=self.backup_root,
                file_storage_path=self.file_root,
                triggered_by_email="admin@test.local",
                database_url="postgresql+psycopg://real:real@localhost:5432/realdb",
            )

        self.assertNotEqual(result["status"], "success")
        self.assertEqual(result["status"], "partial")

    def test_pg_dump_with_no_url_skips_dump(self) -> None:
        """When database_url is None, no pg_dump is attempted."""
        with patch("app.services.backups.run_pg_dump", side_effect=RuntimeError("should not be called")):
            result = create_backup_manifest(
                backup_path=self.backup_root,
                file_storage_path=self.file_root,
                triggered_by_email="admin@test.local",
                database_url=None,
            )

        self.assertEqual(result["status"], "success")
        self.assertIsNone(result["database_backup"])

    # ------------------------------------------------------------------
    # Manifest artifact tests
    # ------------------------------------------------------------------

    def test_manifest_file_written_to_disk(self) -> None:
        """create_backup_manifest writes a real JSON file to disk."""
        result = create_backup_manifest(
            backup_path=self.backup_root,
            file_storage_path=self.file_root,
            triggered_by_email="admin@test.local",
        )

        manifest_path = self.backup_root / result["manifest_path"]
        self.assertTrue(manifest_path.is_file(), f"Manifest not found at {manifest_path}")

        raw = manifest_path.read_text(encoding="utf-8")
        data = json.loads(raw)
        self.assertEqual(data["triggered_by"], "admin@test.local")
        self.assertEqual(data["backup_type"], "full")
        self.assertIn("database", data)
        self.assertIn("storage", data)
        self.assertEqual(data["artifact"]["files_backup"], result["files_backup"])
        self.assertEqual(data["artifact"]["documents_backup"], result["documents_backup"])

    def test_manifest_includes_database_section_with_dump_file_on_success(self) -> None:
        """When pg_dump succeeds, manifest includes database.dump_file."""
        with patch("app.services.backups.run_pg_dump", return_value=("dumps/pgdump-real.dump", None)):
            result = create_backup_manifest(
                backup_path=self.backup_root,
                file_storage_path=self.file_root,
                triggered_by_email="admin@test.local",
                database_url="postgresql+psycopg://real:real@localhost:5432/realdb",
            )

        manifest = result["manifest"]
        self.assertIn("database", manifest)
        self.assertEqual(manifest["database"]["dump_file"], "dumps/pgdump-real.dump")
        self.assertEqual(manifest["database"]["dump_format"], "custom")

    def test_manifest_includes_dump_error_in_database_section_on_failure(self) -> None:
        """When pg_dump fails, manifest includes database.dump_error."""
        with patch("app.services.backups.run_pg_dump", return_value=(None, "connection refused")):
            result = create_backup_manifest(
                backup_path=self.backup_root,
                file_storage_path=self.file_root,
                triggered_by_email="admin@test.local",
                database_url="postgresql+psycopg://real:real@localhost:5432/realdb",
            )

        manifest = result["manifest"]
        self.assertEqual(manifest["database"]["dump_attempted"], True)
        self.assertEqual(manifest["database"]["dump_error"], "connection refused")

    def test_backup_copies_file_and_document_artifacts(self) -> None:
        result = create_backup_manifest(
            backup_path=self.backup_root,
            file_storage_path=self.file_root,
            triggered_by_email="admin@test.local",
            database_url=None,
        )

        self.assertNotEqual(result["files_backup"], result["documents_backup"])
        self.assertTrue((self.backup_root / result["files_backup"]).is_file())
        self.assertTrue((self.backup_root / result["documents_backup"]).is_file())


class RestoreServiceTests(unittest.TestCase):
    """Unit tests for restore service functions (no DB required)."""

    def setUp(self) -> None:
        self._tmpdir = tempfile.TemporaryDirectory()
        self.backup_root = Path(self._tmpdir.name)
        self.manifests_dir = self.backup_root / "manifests"
        self.dumps_dir = self.backup_root / "dumps"
        self.manifests_dir.mkdir(parents=True, exist_ok=True)
        self.dumps_dir.mkdir(parents=True, exist_ok=True)

    def tearDown(self) -> None:
        self._tmpdir.cleanup()

    def _write_manifest(self, filename: str, data: dict) -> Path:
        path = self.manifests_dir / filename
        path.write_text(json.dumps(data), encoding="utf-8")
        return path

    def _write_dump(self, relative: str, content: bytes = b"-- SQL dump\n") -> Path:
        path = self.backup_root / relative
        path.parent.mkdir(parents=True, exist_ok=True)
        path.write_bytes(content)
        return path

    def _write_archive(self, relative: str, members: dict[str, bytes]) -> Path:
        path = self.backup_root / relative
        path.parent.mkdir(parents=True, exist_ok=True)
        with zipfile.ZipFile(path, "w", compression=zipfile.ZIP_DEFLATED) as archive:
            for name, content in members.items():
                archive.writestr(name, content)
        return path

    # ------------------------------------------------------------------
    # load_manifest tests
    # ------------------------------------------------------------------

    def test_load_manifest_rejects_missing_file(self) -> None:
        with self.assertRaises(RestoreValidationError) as ctx:
            load_manifest(self.manifests_dir / "nonexistent.json")
        self.assertIn("not found", str(ctx.exception))

    def test_load_manifest_rejects_invalid_json(self) -> None:
        path = self.manifests_dir / "bad.json"
        path.write_text("not json", encoding="utf-8")
        with self.assertRaises(RestoreValidationError):
            load_manifest(path)

    def test_load_manifest_rejects_non_dict_root(self) -> None:
        path = self.manifests_dir / "array.json"
        path.write_text("[1, 2, 3]", encoding="utf-8")
        with self.assertRaises(RestoreValidationError) as ctx:
            load_manifest(path)
        self.assertIn("not a JSON object", str(ctx.exception))

    def test_load_manifest_returns_dict_for_valid_json(self) -> None:
        path = self._write_manifest("valid.json", {"manifest_id": "abc", "backup_type": "full"})
        result = load_manifest(path)
        self.assertEqual(result["manifest_id"], "abc")

    # ------------------------------------------------------------------
    # validate_manifest_artifacts tests
    # ------------------------------------------------------------------

    def test_validate_manifest_artifacts_detects_missing_dump(self) -> None:
        manifest = {
            "artifact": {"manifest_filename": "test.json", "files_backup": "archives/files.zip", "documents_backup": "archives/documents.zip"},
            "database": {"dump_file": "dumps/missing.sql"},
        }
        warnings = validate_manifest_artifacts(manifest, backup_root=self.backup_root)
        self.assertGreaterEqual(len(warnings), 1)
        self.assertTrue(any("not found" in w for w in warnings))

    def test_validate_manifest_artifacts_detects_empty_dump(self) -> None:
        dump = self._write_dump("dumps/empty.sql", b"")
        manifest = {
            "artifact": {"manifest_filename": "test.json", "files_backup": "archives/files.zip", "documents_backup": "archives/documents.zip"},
            "database": {"dump_file": "dumps/empty.sql"},
        }
        warnings = validate_manifest_artifacts(manifest, backup_root=self.backup_root)
        self.assertGreaterEqual(len(warnings), 1)
        self.assertTrue(any("empty" in w for w in warnings))

    def test_validate_manifest_artifacts_no_warnings_for_valid_dump(self) -> None:
        dump = self._write_dump("dumps/valid.sql", b"-- valid dump")
        self._write_dump("archives/files.zip", b"zip")
        self._write_dump("archives/documents.zip", b"zip")
        manifest = {
            "artifact": {"manifest_filename": "test.json", "files_backup": "archives/files.zip", "documents_backup": "archives/documents.zip"},
            "database": {"dump_file": "dumps/valid.sql"},
        }
        warnings = validate_manifest_artifacts(manifest, backup_root=self.backup_root)
        self.assertEqual(len(warnings), 0)

    def test_validate_manifest_artifacts_no_warnings_when_no_database_section(self) -> None:
        manifest = {
            "artifact": {"manifest_filename": "test.json"},
        }
        warnings = validate_manifest_artifacts(manifest, backup_root=self.backup_root)
        self.assertEqual(len(warnings), 0)

    def test_validate_manifest_artifacts_detects_missing_file_archive(self) -> None:
        manifest = {
            "artifact": {"manifest_filename": "test.json", "files_backup": "archives/files.zip"},
        }
        warnings = validate_manifest_artifacts(manifest, backup_root=self.backup_root)
        self.assertTrue(any("Files archive not found" in warning for warning in warnings))

    def test_validate_manifest_artifacts_raises_for_missing_artifact_section(self) -> None:
        manifest = {"backup_type": "full"}  # no "artifact" key
        with self.assertRaises(RestoreValidationError) as ctx:
            validate_manifest_artifacts(manifest, backup_root=self.backup_root)
        self.assertIn("artifact", str(ctx.exception).lower())

    def test_validate_manifest_artifacts_raises_for_missing_manifest_filename(self) -> None:
        manifest = {"artifact": {}}  # no manifest_filename
        with self.assertRaises(RestoreValidationError) as ctx:
            validate_manifest_artifacts(manifest, backup_root=self.backup_root)
        self.assertIn("manifest_filename", str(ctx.exception).lower())

    # ------------------------------------------------------------------
    # validate_restore tests
    # ------------------------------------------------------------------

    def test_validate_restore_returns_valid_false_on_warnings(self) -> None:
        path = self._write_manifest("partial.json", {
            "artifact": {"manifest_filename": "partial.json", "files_backup": "archives/files.zip", "documents_backup": "archives/documents.zip"},
            "database": {"dump_file": "dumps/missing.sql"},
        })
        result = validate_restore(backup_root=self.backup_root, manifest_path=path)
        self.assertFalse(result["valid"])
        self.assertGreaterEqual(len(result["warnings"]), 1)

    def test_validate_restore_returns_valid_true_when_all_artifacts_exist(self) -> None:
        self._write_dump("archives/files.zip", b"zip")
        self._write_dump("archives/documents.zip", b"zip")
        self._write_dump("dumps/ok.sql", b"-- ok")
        path = self._write_manifest("ok.json", {
            "artifact": {"manifest_filename": "ok.json", "files_backup": "archives/files.zip", "documents_backup": "archives/documents.zip"},
            "database": {"dump_file": "dumps/ok.sql"},
        })
        result = validate_restore(backup_root=self.backup_root, manifest_path=path)
        self.assertTrue(result["valid"])
        self.assertEqual(len(result["warnings"]), 0)
        self.assertEqual(result["files_backup"], "archives/files.zip")
        self.assertEqual(result["documents_backup"], "archives/documents.zip")

    def test_validate_restore_returns_dump_file(self) -> None:
        self._write_dump("archives/files.zip", b"zip")
        self._write_dump("archives/documents.zip", b"zip")
        self._write_dump("dumps/ok.sql", b"-- ok")
        path = self._write_manifest("ok.json", {
            "artifact": {"manifest_filename": "ok.json", "files_backup": "archives/files.zip", "documents_backup": "archives/documents.zip"},
            "database": {"dump_file": "dumps/ok.sql"},
        })
        result = validate_restore(backup_root=self.backup_root, manifest_path=path)
        self.assertEqual(result["dump_file"], "dumps/ok.sql")

    def test_validate_restore_returns_none_dump_file_when_no_database_section(self) -> None:
        path = self._write_manifest("nodump.json", {
            "artifact": {"manifest_filename": "nodump.json"},
        })
        result = validate_restore(backup_root=self.backup_root, manifest_path=path)
        self.assertIsNone(result["dump_file"])

    # ------------------------------------------------------------------
    # dry_run_restore tests
    # ------------------------------------------------------------------

    def test_dry_run_restore_rejects_missing_file(self) -> None:
        error = dry_run_restore(
            backup_root=self.backup_root,
            dump_relative_path="dumps/nonexistent.sql",
            pg_restore_bin="pg_restore",
        )
        self.assertIsNotNone(error)
        self.assertIn("not found", error)

    @patch("subprocess.run")
    def test_dry_run_restore_returns_none_on_success(self, mock_run: object) -> None:
        mock_run.return_value = type("R", (), {"returncode": 0, "stderr": ""})()
        self._write_dump("dumps/pass.sql", b"-- dump content")

        error = dry_run_restore(
            backup_root=self.backup_root,
            dump_relative_path="dumps/pass.sql",
            pg_restore_bin="pg_restore",
        )
        self.assertIsNone(error)

    @patch("subprocess.run")
    def test_dry_run_restore_returns_error_on_nonzero_exit(self, mock_run: object) -> None:
        mock_run.return_value = type("R", (), {"returncode": 1, "stderr": "corrupt dump"})()
        self._write_dump("dumps/bad.sql", b"bad content")

        error = dry_run_restore(
            backup_root=self.backup_root,
            dump_relative_path="dumps/bad.sql",
            pg_restore_bin="pg_restore",
        )
        self.assertIsNotNone(error)
        self.assertIn("corrupt dump", error)

    # ------------------------------------------------------------------
    # execute_restore tests
    # ------------------------------------------------------------------

    def test_execute_restore_rejects_wrong_confirm(self) -> None:
        self._write_dump("dumps/real.sql", b"-- real dump")
        with self.assertRaises(RestoreValidationError) as ctx:
            execute_restore(
                backup_root=self.backup_root,
                dump_relative_path="dumps/real.sql",
                database_url="postgresql://real",
                confirm="wrong",
            )
        self.assertIn("not confirmed", str(ctx.exception).lower())

    def test_execute_restore_rejects_empty_confirm(self) -> None:
        self._write_dump("dumps/real.sql", b"-- real dump")
        with self.assertRaises(RestoreValidationError):
            execute_restore(
                backup_root=self.backup_root,
                dump_relative_path="dumps/real.sql",
                database_url="postgresql://real",
                confirm="",
            )

    def test_execute_restore_rejects_missing_dump(self) -> None:
        with self.assertRaises(RestoreValidationError) as ctx:
            execute_restore(
                backup_root=self.backup_root,
                dump_relative_path="dumps/nonexistent.sql",
                database_url="postgresql://real",
                confirm="yes-do-restore-now",
            )
        self.assertIn("not found", str(ctx.exception))

    def test_execute_restore_rejects_empty_dump_path(self) -> None:
        with self.assertRaises(RestoreValidationError) as ctx:
            execute_restore(
                backup_root=self.backup_root,
                dump_relative_path="",
                database_url="postgresql://real",
                confirm="yes-do-restore-now",
            )
        self.assertIn("No dump file", str(ctx.exception))

    @patch("subprocess.run")
    def test_execute_restore_succeeds_with_correct_confirm(self, mock_run: object) -> None:
        mock_run.return_value = type("R", (), {"returncode": 0, "stderr": ""})()
        self._write_dump("dumps/real.sql", b"-- real dump")

        result = execute_restore(
            backup_root=self.backup_root,
            dump_relative_path="dumps/real.sql",
            database_url="postgresql://real",
            confirm="yes-do-restore-now",
        )
        self.assertEqual(result["dump_file"], "dumps/real.sql")
        self.assertEqual(result["restored_archives"], {"files": 0, "documents": 0})

    @patch("subprocess.run")
    def test_execute_restore_raises_on_nonzero_exit(self, mock_run: object) -> None:
        mock_run.return_value = type("R", (), {"returncode": 3, "stderr": "connection refused"})()
        self._write_dump("dumps/real.sql", b"-- real dump")

        with self.assertRaises(RestoreValidationError) as ctx:
            execute_restore(
                backup_root=self.backup_root,
                dump_relative_path="dumps/real.sql",
                database_url="postgresql://real",
                confirm="yes-do-restore-now",
            )
        self.assertIn("exited with code 3", str(ctx.exception))

    @patch("subprocess.run")
    def test_execute_restore_restores_file_and_document_archives(self, mock_run: object) -> None:
        mock_run.return_value = type("R", (), {"returncode": 0, "stderr": ""})()
        self._write_dump("dumps/real.sql", b"-- real dump")
        self._write_archive(
            "archives/files.zip",
            {"Murphy, Jamie - omega-00002/2026/income-protection/files/payslip.pdf": b"restored-pay"},
        )
        self._write_archive(
            "archives/documents.zip",
            {"Murphy, Jamie - omega-00002/2026/income-protection/documents/fact-find.docx": b"restored-doc"},
        )

        storage_root = self.backup_root / "restored-storage"
        storage_root.mkdir(parents=True, exist_ok=True)
        stale_file_dir = storage_root / "Murphy, Jamie - omega-00002" / "2026" / "income-protection" / "files"
        stale_file_dir.mkdir(parents=True, exist_ok=True)
        (stale_file_dir / "stale.pdf").write_bytes(b"stale")

        result = execute_restore(
            backup_root=self.backup_root,
            dump_relative_path="dumps/real.sql",
            database_url="postgresql://real",
            file_storage_root=storage_root,
            files_relative_path="archives/files.zip",
            documents_relative_path="archives/documents.zip",
            confirm="yes-do-restore-now",
        )

        self.assertEqual(result["restored_archives"], {"files": 1, "documents": 1})
        self.assertFalse((stale_file_dir / "stale.pdf").exists())
        self.assertEqual(
            (storage_root / "Murphy, Jamie - omega-00002" / "2026" / "income-protection" / "files" / "payslip.pdf").read_bytes(),
            b"restored-pay",
        )
        self.assertEqual(
            (storage_root / "Murphy, Jamie - omega-00002" / "2026" / "income-protection" / "documents" / "fact-find.docx").read_bytes(),
            b"restored-doc",
        )


class SchedulerServiceTests(unittest.TestCase):
    """Unit tests for the backup scheduler service (no DB required)."""

    def setUp(self) -> None:
        import app.services.scheduler as sch
        sch.stop_scheduler()
        sch._scheduled_backup_running = False
        sch._last_scheduled_run = None
        sch._next_scheduled_run = None

    def tearDown(self) -> None:
        import app.services.scheduler as sch
        sch.stop_scheduler()

    def test_get_scheduler_status_disabled_when_not_started(self) -> None:
        from app.services.scheduler import get_scheduler_status
        status = get_scheduler_status()
        self.assertFalse(status["enabled"])
        self.assertFalse(status["running"])
        self.assertIsNone(status["last_scheduled_run"])

    def test_start_scheduler_sets_enabled_status(self) -> None:
        from app.services.scheduler import get_scheduler_status, start_scheduler
        start_scheduler(interval_minutes=1, backup_path="b", file_storage_path="f", database_url="url", pg_dump_bin="pg")
        status = get_scheduler_status()
        self.assertTrue(status["enabled"])

    def test_start_scheduler_is_idempotent(self) -> None:
        from app.services.scheduler import get_scheduler_status, start_scheduler
        start_scheduler(interval_minutes=1, backup_path="b", file_storage_path="f", database_url="url", pg_dump_bin="pg")
        start_scheduler(interval_minutes=1, backup_path="b2", file_storage_path="f2", database_url="u2", pg_dump_bin="pg2")
        status = get_scheduler_status()
        self.assertTrue(status["enabled"])  # still only one task

    def test_stop_scheduler_clears_enabled(self) -> None:
        from app.services.scheduler import get_scheduler_status, start_scheduler, stop_scheduler
        start_scheduler(interval_minutes=1, backup_path="b", file_storage_path="f", database_url="url", pg_dump_bin="pg")
        stop_scheduler()
        status = get_scheduler_status()
        self.assertFalse(status["enabled"])

    def test_scheduled_trigger_calls_backup_service(self) -> None:
        """run_single_scheduled_backup calls create_backup_manifest and returns completed/failed."""
        try:
            import app.db  # noqa: F401
        except ModuleNotFoundError as exc:
            self.skipTest(f"Scheduler backup test requires backend dependencies: {exc}")

        import tempfile
        from pathlib import Path
        from unittest.mock import MagicMock, patch

        # Mock the DB session to avoid needing real PostgreSQL
        mock_db = MagicMock()

        from app.services.scheduler import run_single_scheduled_backup

        import app.db
        with patch.object(app.db, "get_session", return_value=mock_db):
            with tempfile.TemporaryDirectory() as tmp:
                bp = Path(tmp) / "backups"
                fp = Path(tmp) / "files"
                bp.mkdir(parents=True, exist_ok=True)
                fp.mkdir(parents=True, exist_ok=True)

                result = run_single_scheduled_backup(
                    backup_path=bp,
                    file_storage_path=fp,
                    database_url="postgresql://placeholder",
                    pg_dump_bin="pg_dump",
                )

        self.assertIn(result["status"], ("completed", "failed"))

    def test_overlapping_scheduled_run_is_skipped(self) -> None:
        """When a scheduled backup is already running, the next call is skipped."""
        import app.services.scheduler as sch
        from app.services.scheduler import run_single_scheduled_backup
        import tempfile
        from pathlib import Path

        sch._scheduled_backup_running = True  # simulate in-flight run

        with tempfile.TemporaryDirectory() as tmp:
            bp = Path(tmp) / "b"
            fp = Path(tmp) / "f"
            bp.mkdir(parents=True, exist_ok=True)
            fp.mkdir(parents=True, exist_ok=True)

            result = run_single_scheduled_backup(
                backup_path=bp,
                file_storage_path=fp,
                database_url="url",
                pg_dump_bin="pg",
            )

        sch._scheduled_backup_running = False  # cleanup

        self.assertEqual(result["status"], "skipped")
        self.assertEqual(result["reason"], "previous-run-still-running")

    def test_database_lock_prevents_cross_process_overlap(self) -> None:
        from unittest.mock import MagicMock, patch
        import tempfile

        mock_db = MagicMock()
        mock_db.execute.return_value.scalar.return_value = False

        from app.services.scheduler import run_single_scheduled_backup

        import app.db
        with patch.object(app.db, "get_session", return_value=mock_db):
            with tempfile.TemporaryDirectory() as tmp:
                bp = Path(tmp) / "b"
                fp = Path(tmp) / "f"
                bp.mkdir(parents=True, exist_ok=True)
                fp.mkdir(parents=True, exist_ok=True)

                result = run_single_scheduled_backup(
                    backup_path=bp,
                    file_storage_path=fp,
                    database_url="postgresql://omega:test@localhost:5432/omega",
                    pg_dump_bin="pg",
                )

        self.assertEqual(result["status"], "skipped")
        self.assertEqual(result["reason"], "database-lock-held")
