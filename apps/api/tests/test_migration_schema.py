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

