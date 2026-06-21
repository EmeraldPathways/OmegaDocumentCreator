from __future__ import annotations

from sqlalchemy.orm import Session

from app.models import AuditLog

__all__ = ["AuditLogRepository"]


class AuditLogRepository:
    """Repository seam for audit log persistence.

    Not yet wired into routes — Phase 2+ cutover will replace store.py audit
    operations with this repository.
    """

    def __init__(self, db: Session) -> None:
        self._db = db

    def list_recent(self, limit: int = 100) -> list[AuditLog]:
        return (
            self._db.query(AuditLog)
            .order_by(AuditLog.created_at.desc())
            .limit(limit)
            .all()
        )

    def list_by_client(self, client_id: str) -> list[AuditLog]:
        return (
            self._db.query(AuditLog)
            .filter(AuditLog.client_id == client_id)
            .order_by(AuditLog.created_at.desc())
            .all()
        )

    def add(self, entry: AuditLog) -> None:
        self._db.add(entry)

    def flush(self) -> None:
        self._db.flush()