from __future__ import annotations

from sqlalchemy.orm import Session

from app.models import AuditLog

__all__ = ["AuditLogRepository"]


class AuditLogRepository:
    """DB-backed audit log repository.

    Replaces store.py seeded audit log reads and writes.
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

    @staticmethod
    def to_response(entry: AuditLog) -> dict[str, object]:
        return {
            "id": str(entry.id),
            "user_id": str(entry.user_id) if entry.user_id else None,
            "client_id": str(entry.client_id) if entry.client_id else None,
            "action": entry.action,
            "entity_type": entry.entity_type,
            "entity_id": entry.entity_id,
            "details": entry.details,
            "ip_address": entry.ip_address,
            "created_at": entry.created_at.isoformat() if entry.created_at else None,
        }
