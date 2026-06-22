from __future__ import annotations

from sqlalchemy.orm import Session

from app.models import BackupRun

__all__ = ["BackupRepository"]


class BackupRepository:
    """DB-backed backup run repository.

    Replaces store.py seeded backup run storage.
    """

    def __init__(self, db: Session) -> None:
        self._db = db

    def list_recent(self, limit: int = 10) -> list[BackupRun]:
        return (
            self._db.query(BackupRun)
            .order_by(BackupRun.created_at.desc())
            .limit(limit)
            .all()
        )

    def add(self, run: BackupRun) -> None:
        self._db.add(run)

    def flush(self) -> None:
        self._db.flush()

    @staticmethod
    def to_response(run: BackupRun) -> dict[str, object]:
        return {
            "id": str(run.id),
            "status": run.status,
            "triggered_by": str(run.triggered_by) if run.triggered_by else None,
            "database_backup": run.database_backup,
            "files_backup": run.files_backup,
            "documents_backup": run.documents_backup,
            "error_message": run.error_message,
            "created_at": run.created_at.isoformat() if run.created_at else None,
        }
