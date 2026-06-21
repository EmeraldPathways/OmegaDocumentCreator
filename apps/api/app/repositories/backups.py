from __future__ import annotations

from sqlalchemy.orm import Session

from app.models import BackupRun

__all__ = ["BackupRepository"]


class BackupRepository:
    """Repository seam for backup run persistence.

    Not yet wired into routes — Phase 2+ cutover will use this for persistent
    backup history.
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