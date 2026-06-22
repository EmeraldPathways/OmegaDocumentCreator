"""Minimal, safe migration runner for Omega Document Creator.

Usage (from apps/api/):
  .\.venv\Scripts\python -m app.migrate          # apply pending migrations
  .\.venv\Scripts\python -m app.migrate --status  # list migrations and applied state
  .\.venv\Scripts\python -m app.migrate --force    # re-apply all migrations

Migrations live in apps/api/migrations/ as numbered SQL files.
Applied migrations are tracked in a table named `_migrations`.
"""

from __future__ import annotations

import argparse
import os
import sys
from pathlib import Path


def _ensure_migration_table(db: object) -> None:
    db.execute(
        """CREATE TABLE IF NOT EXISTS _migrations (
            filename TEXT PRIMARY KEY,
            applied_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
        )"""
    )


def _applied_migrations(db: object) -> set[str]:
    result = db.execute("SELECT filename FROM _migrations ORDER BY filename")
    return {row[0] for row in result.fetchall()}


def _discover_migrations() -> list[Path]:
    migrations_dir = Path(__file__).resolve().parent.parent / "migrations"
    if not migrations_dir.is_dir():
        print(f"Migrations directory not found: {migrations_dir}")
        sys.exit(1)

    sql_files = sorted(f for f in migrations_dir.iterdir() if f.suffix == ".sql")
    if not sql_files:
        print("No migration files found.")
    return sql_files


def run_migrations(dry_run: bool = False, force: bool = False) -> list[str]:
    """Apply pending migrations. Returns list of applied filenames."""
    from app.db import get_engine
    from sqlalchemy import text

    engine = get_engine()
    migrations = _discover_migrations()
    applied: list[str] = []

    with engine.connect() as conn:
        trans = conn.begin()
        try:
            _ensure_migration_table(conn)
            already = _applied_migrations(conn)
            pending = [m for m in migrations if m.name not in already or force]

            if not pending:
                if not dry_run:
                    print("All migrations already applied.")
                return applied

            for migration in pending:
                sql = migration.read_text(encoding="utf-8")
                if not sql.strip():
                    print(f"  Skipping empty migration: {migration.name}")
                    continue

                if dry_run:
                    print(f"  [DRY RUN] Would apply: {migration.name}")
                    continue

                print(f"  Applying: {migration.name}")
                for statement in _split_statements(sql):
                    conn.execute(text(statement))

                conn.execute(
                    text("INSERT INTO _migrations (filename) VALUES (:name) ON CONFLICT DO NOTHING"),
                    {"name": migration.name},
                )
                applied.append(migration.name)

            trans.commit()
        except Exception:
            trans.rollback()
            raise

    if not dry_run and applied:
        print(f"Applied {len(applied)} migration(s).")
    return applied


def show_status() -> None:
    """Print migration status."""
    from app.db import get_engine

    engine = get_engine()
    migrations = _discover_migrations()

    with engine.connect() as conn:
        _ensure_migration_table(conn)
        already = _applied_migrations(conn)

    for m in migrations:
        status = "applied" if m.name in already else "PENDING"
        print(f"  [{status}] {m.name}")
    if not migrations:
        print("  No migrations found.")


def _split_statements(sql: str) -> list[str]:
    """Split SQL text on semicolons, skip empty/blanks."""
    statements = []
    for stmt in sql.split(";"):
        cleaned = stmt.strip()
        if cleaned:
            statements.append(cleaned)
    return statements


if __name__ == "__main__":
    parser = argparse.ArgumentParser(description="Omega migration runner")
    parser.add_argument(
        "--status", action="store_true", help="Show migration status"
    )
    parser.add_argument(
        "--dry-run", action="store_true", help="Show what would be applied"
    )
    parser.add_argument(
        "--force", action="store_true", help="Re-apply all migrations"
    )
    args = parser.parse_args()

    if args.status:
        show_status()
    else:
        run_migrations(dry_run=args.dry_run, force=args.force)