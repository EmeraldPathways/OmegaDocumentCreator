from __future__ import annotations

from sqlalchemy.orm import Session

from app.models import BackupRun, RestoreAttempt

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

    def get_by_id(self, run_id: str) -> BackupRun | None:
        from uuid import UUID
        try:
            uid = UUID(run_id)
        except ValueError:
            return None
        return self._db.query(BackupRun).filter(BackupRun.id == uid).first()

    def add(self, run: BackupRun) -> None:
        self._db.add(run)

    def flush(self) -> None:
        self._db.flush()

    def add_restore_attempt(self, attempt: RestoreAttempt) -> None:
        self._db.add(attempt)

    def list_restore_attempts(self, backup_run_id: str, limit: int = 20) -> list[RestoreAttempt]:
        from uuid import UUID
        try:
            uid = UUID(backup_run_id)
        except ValueError:
            return []
        return (
            self._db.query(RestoreAttempt)
            .filter(RestoreAttempt.backup_run_id == uid)
            .order_by(RestoreAttempt.created_at.desc())
            .limit(limit)
            .all()
        )

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

    @staticmethod
    def restore_attempt_to_response(attempt: RestoreAttempt) -> dict[str, object]:
        return {
            "id": str(attempt.id),
            "backup_run_id": str(attempt.backup_run_id),
            "status": attempt.status,
            "mode": attempt.mode,
            "started_by": str(attempt.started_by) if attempt.started_by else None,
            "dump_file": attempt.dump_file,
            "error_message": attempt.error_message,
            "created_at": attempt.created_at.isoformat() if attempt.created_at else None,
        }
