"""Restore service — validation and dry-run support for backup artifacts.

Does NOT execute destructive database restores by default.  Provides:
- Manifest validation (file exists, well-formed, references resolvable)
- Dump artifact validation (dump file exists and is non-empty)
- Dry-run reporting (what WOULD be restored)
"""

from __future__ import annotations

import json
import subprocess
from pathlib import Path
from typing import Any


class RestoreValidationError(Exception):
    """Raised when a restore cannot proceed because of a validation failure."""


def load_manifest(manifest_path: Path) -> dict[str, Any]:
    """Load and parse a backup manifest JSON file.

    Raises RestoreValidationError if the file is missing or not valid JSON.
    """
    if not manifest_path.is_file():
        raise RestoreValidationError(f"Manifest file not found: {manifest_path}")

    try:
        raw = manifest_path.read_text(encoding="utf-8")
        data = json.loads(raw)
    except json.JSONDecodeError as exc:
        raise RestoreValidationError(f"Manifest is not valid JSON: {exc}") from exc

    if not isinstance(data, dict):
        raise RestoreValidationError("Manifest root is not a JSON object")

    return data


def validate_manifest_artifacts(
    manifest: dict[str, Any],
    *,
    backup_root: Path,
) -> list[str]:
    """Validate that artifacts referenced in the manifest exist on disk.

    Returns a list of warnings (empty if all artifacts are present).
    Raises RestoreValidationError only for the manifest artifact itself.
    """
    warnings: list[str] = []

    # Validate the manifest artifact record
    artifact_section = manifest.get("artifact")
    if not isinstance(artifact_section, dict):
        raise RestoreValidationError("Manifest is missing 'artifact' section")

    manifest_filename = artifact_section.get("manifest_filename")
    if not isinstance(manifest_filename, str):
        raise RestoreValidationError("Manifest is missing 'artifact.manifest_filename'")

    for archive_key, label in (("files_backup", "Files archive"), ("documents_backup", "Documents archive")):
        archive_relative_path = artifact_section.get(archive_key)
        if isinstance(archive_relative_path, str):
            archive_path = backup_root / archive_relative_path
            if not archive_path.is_file():
                warnings.append(f"{label} not found: {archive_relative_path}")
            elif archive_path.stat().st_size == 0:
                warnings.append(f"{label} is empty: {archive_relative_path}")

    # Check database dump artifact
    database_section = manifest.get("database")
    if isinstance(database_section, dict):
        dump_file = database_section.get("dump_file")
        if isinstance(dump_file, str):
            dump_path = backup_root / dump_file
            if not dump_path.is_file():
                warnings.append(f"Database dump file not found: {dump_file}")
            elif dump_path.stat().st_size == 0:
                warnings.append(f"Database dump file is empty: {dump_file}")

    return warnings


def validate_restore(
    *,
    backup_root: Path,
    manifest_path: Path,
) -> dict[str, Any]:
    """Validate a backup manifest and its referenced artifacts.

    Returns a dict with:
    - valid: bool
    - manifest: the parsed manifest (if loadable)
    - warnings: list of non-fatal issues
    - dump_file: relative path to the db dump (or None)

    Raises RestoreValidationError only for truly fatal issues.
    """
    manifest = load_manifest(manifest_path)
    artifact_section = manifest.get("artifact")

    warnings = validate_manifest_artifacts(manifest, backup_root=backup_root)

    database_section = manifest.get("database")
    dump_file: str | None = None
    if isinstance(database_section, dict):
        df = database_section.get("dump_file")
        if isinstance(df, str):
            dump_file = df

    return {
        "valid": len(warnings) == 0,
        "manifest": manifest,
        "warnings": warnings,
        "dump_file": dump_file,
        "files_backup": artifact_section.get("files_backup") if isinstance(artifact_section, dict) else None,
        "documents_backup": artifact_section.get("documents_backup") if isinstance(artifact_section, dict) else None,
    }


def dry_run_restore(
    *,
    backup_root: Path,
    dump_relative_path: str,
    pg_restore_bin: str = "pg_restore",
) -> str | None:
    """Perform a non-destructive dry-run check against a PostgreSQL dump file.

    Uses ``pg_restore --list`` to verify the dump is readable and lists
    objects that would be restored.  Does NOT modify any database.

    Returns None on success or an error message string on failure.
    """
    dump_path = backup_root / dump_relative_path

    if not dump_path.is_file():
        return f"Dump file not found: {dump_path}"

    try:
        result = subprocess.run(
            [pg_restore_bin, "--list", str(dump_path)],
            capture_output=True,
            text=True,
            timeout=60,
        )

        if result.returncode != 0:
            return f"pg_restore --list failed (code {result.returncode}): {result.stderr.strip() or 'unknown error'}"

        # Successfully listed the dump — this validates it as a usable file
        return None

    except FileNotFoundError:
        return f"pg_restore binary not found at '{pg_restore_bin}'"
    except subprocess.TimeoutExpired:
        return "pg_restore --list timed out after 60s"
    except OSError as exc:
        return f"pg_restore I/O error: {exc}"


def execute_restore(
    *,
    backup_root: Path,
    dump_relative_path: str,
    database_url: str,
    pg_restore_bin: str = "pg_restore",
    confirm: str = "",
) -> None:
    """Execute a real database restore from a PostgreSQL dump file.

    This is a **destructive** operation.  Callers MUST gate this behind
    explicit operator confirmation and admin-only endpoints.

    Raises RestoreValidationError when:
    - The confirmation payload does not match the expected marker
    - The dump file is missing
    - pg_restore exits non-zero

    The *database_url* must be a SQLAlchemy URL (handled the same way as
    pg_dump connection string conversion).
    """
    if not dump_relative_path:
        raise RestoreValidationError("No dump file specified for restore")

    if confirm != "yes-do-restore-now":
        raise RestoreValidationError("Restore not confirmed — explicit confirmation required")

    dump_path = backup_root / dump_relative_path
    if not dump_path.is_file():
        raise RestoreValidationError(f"Dump file not found: {dump_path}")

    conn_str = _pg_connection_string_restore(database_url)

    try:
        result = subprocess.run(
            [pg_restore_bin, "--dbname", conn_str, "--clean", "--if-exists", "--no-owner", "--no-acl", str(dump_path)],
            capture_output=True,
            text=True,
            timeout=300,
        )

        if result.returncode != 0:
            raise RestoreValidationError(
                f"pg_restore exited with code {result.returncode}: {result.stderr.strip() or 'unknown error'}"
            )
    except subprocess.TimeoutExpired:
        raise RestoreValidationError("pg_restore timed out after 300s")
    except OSError as exc:
        raise RestoreValidationError(f"pg_restore I/O error: {exc}")


def _pg_connection_string_restore(database_url: str) -> str:
    """Convert a SQLAlchemy DATABASE_URL to a pg_restore-compatible connection string."""
    url = database_url.replace("postgresql+psycopg://", "postgresql://", 1)
    url = url.replace("postgresql+psycopg2://", "postgresql://", 1)
    return url
