from __future__ import annotations

import uuid

from sqlalchemy.orm import Session

from app.models import File

__all__ = ["FileRepository"]


class FileRepository:
    """Repository seam for file persistence.

    Not yet wired into routes — Phase 2+ cutover will replace store.py file
    operations with this repository.
    """

    def __init__(self, db: Session) -> None:
        self._db = db

    def list_by_client(self, client_id: uuid.UUID) -> list[File]:
        return (
            self._db.query(File)
            .filter(File.client_id == client_id)
            .order_by(File.uploaded_at.desc())
            .all()
        )

    def get_by_id(self, file_id: uuid.UUID) -> File | None:
        return self._db.query(File).filter(File.id == file_id).first()

    def add(self, file_obj: File) -> None:
        self._db.add(file_obj)

    def delete(self, file_id: uuid.UUID) -> File | None:
        """Delete a file by ID. Returns the deleted row or None if not found."""
        file_obj = self.get_by_id(file_id)
        if file_obj is None:
            return None
        self._db.delete(file_obj)
        return file_obj

    def flush(self) -> None:
        self._db.flush()
