"""Storage service for client file operations on disk.

Writes files under FILE_STORAGE_PATH / {client_slug} / {year} / with either:
- {files|documents} for year-root artifacts such as Fact Find
- {workflow_slug} / {files|documents} for workflow-specific artifacts
"""

from __future__ import annotations

import re
import uuid
from datetime import UTC, datetime
from pathlib import Path
from typing import BinaryIO

DOCUMENT_BUCKET = "documents"
FILE_BUCKET = "files"
GENERAL_WORKFLOW = "general"
INCOME_PROTECTION_WORKFLOW = "income-protection"
PENSIONS_WORKFLOW = "pensions"
SAVINGS_WORKFLOW = "savings"
INVESTMENTS_WORKFLOW = "investments"
DEFAULT_CLIENT_WORKFLOWS = (
    INCOME_PROTECTION_WORKFLOW,
    PENSIONS_WORKFLOW,
    SAVINGS_WORKFLOW,
    INVESTMENTS_WORKFLOW,
)


def normalize_workflow_slug(value: str | None) -> str:
    normalized = re.sub(r"[^a-z0-9]+", "-", (value or "").strip().lower()).strip("-")
    if not normalized:
        return GENERAL_WORKFLOW
    if normalized in {"fact-find", "fact-find-update", "terms-of-business", GENERAL_WORKFLOW}:
        return GENERAL_WORKFLOW
    if normalized in {"income-protection", "files-docs"}:
        return INCOME_PROTECTION_WORKFLOW
    if normalized in {"pensions", "pension"}:
        return PENSIONS_WORKFLOW
    return normalized


def workflow_slug_for_document_type(document_type: str | None) -> str:
    normalized = (document_type or "").strip().lower()
    if "pension" in normalized:
        return PENSIONS_WORKFLOW
    if normalized in {
        "fact find",
        "fact find update",
        "terms of business",
    }:
        return GENERAL_WORKFLOW
    if normalized in {
        "statement of suitability",
        "quote",
    }:
        return INCOME_PROTECTION_WORKFLOW
    return GENERAL_WORKFLOW


def _workflow_folder(year_folder: Path, workflow_slug: str) -> Path:
    normalized = normalize_workflow_slug(workflow_slug)
    if normalized == GENERAL_WORKFLOW:
        return year_folder
    return year_folder / normalized


def _safe_filename(original: str) -> str:
    """Produce a safe filename from the original, preserving extension."""
    stem, _, ext = original.rpartition(".")
    # Collapse runs of non-alphanumeric chars into a single dash
    safe_stem = re.sub(r"[^a-zA-Z0-9]+", "-", stem).strip("-").lower() or "file"
    safe_ext = re.sub(r"[^a-zA-Z0-9]+", "", ext).lower()
    return f"{safe_stem}.{safe_ext}" if safe_ext else safe_stem


def _unique_filename(original: str) -> str:
    """Return a unique filename based on the original."""
    safe = _safe_filename(original)
    stem, _, ext = safe.rpartition(".")
    unique = uuid.uuid4().hex[:8]
    return f"{stem}-{unique}.{ext}" if ext else f"{stem}-{unique}"


def safe_download_name(original: str, fallback_stem: str = "download") -> str:
    """Return a readable attachment filename without unsafe characters."""
    candidate = (original or "").strip()
    if not candidate:
        candidate = fallback_stem
    candidate = candidate.replace("\\", " ").replace("/", " ")
    candidate = re.sub(r"[\r\n\t]+", " ", candidate)
    candidate = re.sub(r"\s+", " ", candidate).strip()
    return candidate or fallback_stem


class ClientStorage:
    """Manages per-client file storage on disk."""

    def __init__(self, root: Path) -> None:
        self._root = root

    def ensure_client_folder(self, client_slug: str) -> Path:
        """Create (if needed) and return the client folder path."""
        folder = self._root / client_slug
        folder.mkdir(parents=True, exist_ok=True)
        return folder

    def ensure_client_workflow_folder(self, client_slug: str, year: int, workflow_slug: str, bucket: str) -> Path:
        year_folder = self.ensure_client_folder(client_slug) / str(year)
        folder = _workflow_folder(year_folder, workflow_slug) / bucket
        folder.mkdir(parents=True, exist_ok=True)
        return folder

    def ensure_client_year_contract(
        self,
        client_slug: str,
        year: int,
        *,
        workflow_slugs: tuple[str, ...] = DEFAULT_CLIENT_WORKFLOWS,
        buckets: tuple[str, str] = (FILE_BUCKET, DOCUMENT_BUCKET),
    ) -> Path:
        year_folder = self.ensure_client_folder(client_slug) / str(year)
        year_folder.mkdir(parents=True, exist_ok=True)
        for bucket in buckets:
            (year_folder / bucket).mkdir(parents=True, exist_ok=True)
        for workflow_slug in workflow_slugs:
            for bucket in buckets:
                self.ensure_client_workflow_folder(client_slug, year, workflow_slug, bucket)
        return year_folder

    def save_file(
        self,
        client_slug: str,
        filename: str,
        content: bytes,
        *,
        year: int | None = None,
        workflow_slug: str = GENERAL_WORKFLOW,
        bucket: str = FILE_BUCKET,
    ) -> Path:
        """Write file bytes to the client folder.

        Returns the full resolved path of the saved file.
        """
        resolved_year = year or datetime.now(UTC).year
        folder = self.ensure_client_workflow_folder(client_slug, resolved_year, workflow_slug, bucket)
        stored_name = _unique_filename(filename)
        filepath = folder / stored_name
        filepath.write_bytes(content)
        return filepath

    def save_upload(
        self,
        client_slug: str,
        filename: str,
        upload_file: BinaryIO,
        *,
        max_size_bytes: int,
        year: int | None = None,
        workflow_slug: str = GENERAL_WORKFLOW,
        bucket: str = FILE_BUCKET,
        chunk_size: int = 1024 * 1024,
    ) -> Path:
        """Stream an uploaded file to disk and enforce a maximum size."""
        resolved_year = year or datetime.now(UTC).year
        folder = self.ensure_client_workflow_folder(client_slug, resolved_year, workflow_slug, bucket)
        stored_name = _unique_filename(filename)
        filepath = folder / stored_name

        total_bytes = 0
        try:
            with filepath.open("wb") as handle:
                while True:
                    chunk = upload_file.read(chunk_size)
                    if not chunk:
                        break
                    total_bytes += len(chunk)
                    if total_bytes > max_size_bytes:
                        raise ValueError(f"File exceeds maximum upload size of {max_size_bytes} bytes")
                    handle.write(chunk)
        except Exception:
            filepath.unlink(missing_ok=True)
            raise

        if total_bytes == 0:
            filepath.unlink(missing_ok=True)
            raise ValueError("Empty upload")

        return filepath

    def resolve_relative_file(self, relative_path: str) -> Path | None:
        """Resolve a persisted relative path inside the storage root."""
        filepath = (self._root / relative_path).resolve()
        root = self._root.resolve()
        if not filepath.is_relative_to(root):
            return None
        if not filepath.is_file():
            return None
        return filepath

    def read_relative_file(self, relative_path: str) -> bytes | None:
        """Read a stored file using its persisted relative path."""
        filepath = self.resolve_relative_file(relative_path)
        if filepath is None:
            return None
        return filepath.read_bytes()

    def read_file(self, client_slug: str, stored_filename: str) -> bytes | None:
        """Read a stored file from disk.

        Only resolves relative to the client folder — never exposes raw
        server paths to callers.
        """
        folder = self._root / client_slug
        filepath = folder / stored_filename
        if not filepath.resolve().is_relative_to(folder.resolve()):
            return None  # path traversal guard
        if not filepath.is_file():
            return None
        return filepath.read_bytes()

    def delete_relative_file(self, relative_path: str) -> bool:
        """Delete a stored file using its persisted relative path.

        Returns True if the file was deleted, False if it didn't exist.
        Never deletes outside the configured storage root.
        """
        filepath = self._root / relative_path
        if not filepath.resolve().is_relative_to(self._root.resolve()):
            return False
        if not filepath.is_file():
            return False
        filepath.unlink()
        return True
