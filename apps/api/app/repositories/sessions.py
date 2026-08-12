from __future__ import annotations

from datetime import UTC, datetime, timedelta

from sqlalchemy.orm import Session as DbSession

from app.models import Session as SessionModel

__all__ = ["SessionRepository"]


class SessionRepository:
    """Repository for PostgreSQL-backed session persistence."""

    def __init__(self, db: DbSession) -> None:
        self._db = db

    def create(self, user_email: str, timeout_minutes: int) -> SessionModel:
        """Create a new persisted session row."""
        now = datetime.now(UTC)
        session = SessionModel(
            user_email=user_email,
            created_at=now,
            expires_at=now + timedelta(minutes=timeout_minutes),
        )
        self._db.add(session)
        self._db.flush()
        return session

    def get_valid_by_id(self, session_id: str) -> SessionModel | None:
        """Return the session row if it exists and is unexpired, else None."""
        return (
            self._db.query(SessionModel)
            .filter(
                SessionModel.id == session_id,
                SessionModel.expires_at > datetime.now(UTC),
            )
            .first()
        )

    def extend_expiry(self, session: SessionModel, timeout_minutes: int) -> SessionModel:
        """Refresh a persisted session expiry for sliding-session behavior."""
        session.expires_at = datetime.now(UTC) + timedelta(minutes=timeout_minutes)
        self._db.flush()
        return session

    def delete_by_id(self, session_id: str) -> None:
        """Delete a single session row by ID (logout invalidation)."""
        self._db.query(SessionModel).filter(
            SessionModel.id == session_id,
        ).delete()

    def delete_by_user_email(self, user_email: str) -> int:
        """Delete all persisted session rows for a user."""
        return (
            self._db.query(SessionModel)
            .filter(SessionModel.user_email == user_email.lower())
            .delete()
        )

    def cleanup_expired(self) -> int:
        """Remove expired session rows. Returns count of removed rows."""
        result = self._db.query(SessionModel).filter(
            SessionModel.expires_at <= datetime.now(UTC),
        ).delete()
        return result

    def count_active(self) -> int:
        return (
            self._db.query(SessionModel)
            .filter(SessionModel.expires_at > datetime.now(UTC))
            .count()
        )
