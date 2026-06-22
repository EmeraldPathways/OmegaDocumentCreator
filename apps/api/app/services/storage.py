"""Storage service for client file operations on disk.

Writes files under FILE_STORAGE_PATH / {client_slug} / and provides
deterministic safe filenames.
"""

from __future__ import annotations

import re
import uuid
from pathlib import Path


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


class ClientStorage:
    """Manages per-client file storage on disk."""

    def __init__(self, root: Path) -> None:
        self._root = root

    def ensure_client_folder(self, client_slug: str) -> Path:
        """Create (if needed) and return the client folder path."""
        folder = self._root / client_slug
        folder.mkdir(parents=True, exist_ok=True)
        return folder

    def save_file(self, client_slug: str, filename: str, content: bytes) -> Path:
        """Write file bytes to the client folder.

        Returns the full resolved path of the saved file.
        """
        folder = self.ensure_client_folder(client_slug)
        stored_name = _unique_filename(filename)
        filepath = folder / stored_name
        filepath.write_bytes(content)
        return filepath

    def read_relative_file(self, relative_path: str) -> bytes | None:
        """Read a stored file using its persisted relative path."""
        filepath = self._root / relative_path
        if not filepath.resolve().is_relative_to(self._root.resolve()):
            return None
        if not filepath.is_file():
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
