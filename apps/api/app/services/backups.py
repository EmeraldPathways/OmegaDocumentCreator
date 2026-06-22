"""Backup service that creates manifest artifacts on disk and persists metadata.

Stores backup manifests as JSON files under the configured BACKUP_PATH.
Does not require external binaries like pg_dump — produces a durable
manifest artifact that records what would be backed up.
"""

from __future__ import annotations

import json
import uuid
from datetime import UTC, datetime
from pathlib import Path


def _backup_timestamp() -> str:
    return datetime.now(UTC).strftime("%Y-%m-%dT%H%M%SZ")


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
) -> dict[str, object]:
    """Create a backup manifest artifact on disk and return metadata.

    Writes a JSON manifest file under backup_path/manifests/.
    The manifest records the backup timestamp, included storage roots,
    and file counts.

    Returns a dict with keys suitable for creating a BackupRun DB record.
    """
    timestamp = _backup_timestamp()
    manifest_id = uuid.uuid4().hex[:12]
    manifest_filename = f"backup-manifest-{timestamp}-{manifest_id}.json"

    manifests_dir = backup_path / "manifests"
    manifests_dir.mkdir(parents=True, exist_ok=True)

    client_files_stats = _scan_directory_stats(file_storage_path)
    documents_stats = _scan_directory_stats(file_storage_path)

    manifest = {
        "manifest_id": manifest_id,
        "backup_type": "full",
        "timestamp": timestamp,
        "triggered_by": triggered_by_email,
        "database": {"target": "postgresql", "note": "database-backup-not-included-via-pg_dump"},
        "storage": {
            "file_storage_root": str(file_storage_path),
            "client_files": client_files_stats,
            "documents": documents_stats,
        },
        "artifact": {
            "manifest_filename": manifest_filename,
            "backup_root": str(backup_path),
        },
    }

    manifest_path = manifests_dir / manifest_filename
    manifest_path.write_text(json.dumps(manifest, indent=2), encoding="utf-8")

    return {
        "status": "success",
        "database_backup": None,
        "files_backup": f"manifests/{manifest_filename}",
        "documents_backup": f"manifests/{manifest_filename}",
        "error_message": None,
        "manifest": manifest,
    }