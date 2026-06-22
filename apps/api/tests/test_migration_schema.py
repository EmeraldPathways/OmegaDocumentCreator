from pathlib import Path
import unittest


class MigrationSchemaTests(unittest.TestCase):
    def test_initial_migration_defines_stage_10_tables(self) -> None:
        migration = Path(__file__).resolve().parents[1] / "migrations" / "0001_initial.sql"
        sql = migration.read_text(encoding="utf-8")

        expected_tables = [
            "users",
            "clients",
            "dependants",
            "employment_details",
            "protection_details",
            "life_serious_illness_details",
            "fact_find",
            "terms_of_business",
            "statement_of_suitability",
            "files",
            "documents",
            "audit_logs",
        ]

        for table_name in expected_tables:
            self.assertIn(f"CREATE TABLE {table_name} (", sql)

    def test_initial_migration_includes_critical_stage_10_columns(self) -> None:
        migration = Path(__file__).resolve().parents[1] / "migrations" / "0001_initial.sql"
        sql = migration.read_text(encoding="utf-8")

        required_columns = [
            "client_reference TEXT NOT NULL UNIQUE",
            "created_by UUID REFERENCES users(id)",
            "updated_by UUID REFERENCES users(id)",
            "recommendation_reasons JSONB NOT NULL DEFAULT '[]'::jsonb",
            "generated_document_id UUID REFERENCES documents(id) ON DELETE SET NULL",
            "details JSONB NOT NULL DEFAULT '{}'::jsonb",
        ]

        for column_definition in required_columns:
            self.assertIn(column_definition, sql)

    def test_phase_1_followup_migration_defines_backup_runs_and_document_snapshot_fields(self) -> None:
        migration = Path(__file__).resolve().parents[1] / "migrations" / "0002_backup_runs_document_snapshots.sql"
        sql = migration.read_text(encoding="utf-8")

        self.assertIn("CREATE TABLE backup_runs (", sql)
        self.assertIn("CREATE INDEX idx_backup_runs_created_at ON backup_runs (created_at);", sql)
        self.assertIn("ADD COLUMN preview_title TEXT,", sql)
        self.assertIn("ADD COLUMN preview_html TEXT;", sql)

    def test_restore_attempts_migration_defines_table_and_index(self) -> None:
        migration = Path(__file__).resolve().parents[1] / "migrations" / "0003_restore_attempts.sql"
        sql = migration.read_text(encoding="utf-8")

        self.assertIn("CREATE TABLE restore_attempts (", sql)
        self.assertIn("backup_run_id UUID NOT NULL REFERENCES backup_runs(id) ON DELETE CASCADE", sql)
        self.assertIn("status TEXT NOT NULL", sql)
        self.assertIn("mode TEXT NOT NULL", sql)
        self.assertIn("CREATE INDEX idx_restore_attempts_backup_run_id ON restore_attempts (backup_run_id);", sql)
