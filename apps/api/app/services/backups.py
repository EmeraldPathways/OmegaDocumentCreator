"""Backup service that creates manifest artifacts on disk and persists metadata.

Stores backup manifests as JSON files under the configured BACKUP_PATH.
Optionally runs real pg_dump when a database URL is configured, storing
the resulting SQL dump alongside the manifest.
"""

from __future__ import annotations

import json
import subprocess
import uuid
from datetime import UTC, datetime
from pathlib import Path


def _backup_timestamp() -> str:
    return datetime.now(UTC).strftime("%Y-%m-%dT%H%M%SZ")


def _pg_connection_string(database_url: str) -> str:
    """Convert a SQLAlchemy DATABASE_URL to a pg_dump-compatible connection string."""
    url = database_url.replace("postgresql+psycopg://", "postgresql://", 1)
    url = url.replace("postgresql+psycopg2://", "postgresql://", 1)
    return url


def run_pg_dump(
    *,
    database_url: str,
    output_dir: Path,
    timestamp: str,
    pg_dump_bin: str = "pg_dump",
) -> tuple[str | None, str | None]:
    """Run pg_dump against the target database.

    Returns (dump_relative_path, error_message).  When successful the dump
    file is written to output_dir as ``pgdump-{timestamp}.sql`` and the
    relative path (from the backup root) is returned.  On failure the dump
    path is None and error_message describes what went wrong.
    """
    dump_filename = f"pgdump-{timestamp}.sql"
    dump_path = output_dir / dump_filename

    conn_str = _pg_connection_string(database_url)

    try:
        result = subprocess.run(
            [pg_dump_bin, "--dbname", conn_str, "--file", str(dump_path), "--no-owner", "--no-acl"],
            capture_output=True,
            text=True,
            timeout=120,
        )

        if result.returncode != 0:
            dump_path.unlink(missing_ok=True)
            return None, f"pg_dump exited with code {result.returncode}: {result.stderr.strip() or 'unknown error'}"

        if not dump_path.is_file() or dump_path.stat().st_size == 0:
            dump_path.unlink(missing_ok=True)
            return None, "pg_dump produced an empty file"

        return f"dumps/{dump_filename}", None

    except FileNotFoundError:
        return None, f"pg_dump binary not found at '{pg_dump_bin}'. Is PostgreSQL installed?"
    except subprocess.TimeoutExpired:
        dump_path.unlink(missing_ok=True)
        return None, "pg_dump timed out after 120s"
    except OSError as exc:
        dump_path.unlink(missing_ok=True)
        return None, f"pg_dump I/O error: {exc}"


def _scan_directory_stats(root: Path) -> dict[str, int]:
    """Count files and total size under a directory (non-recursive limit)."""
    file_count = 0
    total_bytes = 0
    try:
        for entry in root.rglob("*"):
            if entry.is_file():
                file_count += 1
                total_bytes += entry.stat().st_size
    except OSError:
        pass
    return {"file_count": file_count, "total_bytes": total_bytes}


def create_backup_manifest(
    *,
    backup_path: Path,
    file_storage_path: Path,
    triggered_by_email: str,
    database_url: str | None = None,
    pg_dump_bin: str = "pg_dump",
) -> dict[str, object]:
    """Create a backup manifest artifact on disk and return metadata.

    Writes a JSON manifest file under backup_path/manifests/.
    The manifest records the backup timestamp, included storage roots,
    and file counts.

    When *database_url* is provided and pg_dump is available, a real
    PostgreSQL dump is produced alongside the manifest.

    Returns a dict with keys suitable for creating a BackupRun DB record.
    """
    timestamp = _backup_timestamp()
    manifest_id = uuid.uuid4().hex[:12]
    manifest_filename = f"backup-manifest-{timestamp}-{manifest_id}.json"

    manifests_dir = backup_path / "manifests"
    manifests_dir.mkdir(parents=True, exist_ok=True)

    dumps_dir = backup_path / "dumps"
    dumps_dir.mkdir(parents=True, exist_ok=True)

    storage_stats = _scan_directory_stats(file_storage_path)

    # ---- Real pg_dump (best-effort) ----
    dump_path: str | None = None
    dump_error: str | None = None

    if database_url and "placeholder" not in database_url:
        dump_path, dump_error = run_pg_dump(
            database_url=database_url,
            output_dir=dumps_dir,
            timestamp=timestamp,
            pg_dump_bin=pg_dump_bin,
        )

    database_section: dict[str, object] = {
        "target": "postgresql",
    }
    if dump_path is not None:
        database_section["dump_file"] = dump_path
        database_section["dump_format"] = "sql"
    elif dump_error is not None:
        database_section["dump_attempted"] = True
        database_section["dump_error"] = dump_error
    else:
        database_section["note"] = "database-backup-not-included-via-pg_dump"

    manifest = {
        "manifest_id": manifest_id,
        "backup_type": "full",
        "timestamp": timestamp,
        "triggered_by": triggered_by_email,
        "database": database_section,
        "storage": {
            "file_storage_root": str(file_storage_path),
            "file_count": storage_stats["file_count"],
            "total_bytes": storage_stats["total_bytes"],
        },
        "artifact": {
            "manifest_filename": manifest_filename,
            "backup_root": str(backup_path),
        },
    }

    manifest_path = manifests_dir / manifest_filename
    manifest_path.write_text(json.dumps(manifest, indent=2), encoding="utf-8")

    status = "success" if dump_error is None else "partial"

    return {
        "status": status,
        "database_backup": dump_path,
        "files_backup": f"manifests/{manifest_filename}",
        "documents_backup": f"manifests/{manifest_filename}",
        "error_message": dump_error,
        "manifest": manifest,
    }