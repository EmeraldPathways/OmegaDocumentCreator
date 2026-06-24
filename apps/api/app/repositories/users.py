from __future__ import annotations

from uuid import UUID

from sqlalchemy.orm import Session

from app.domain.users import UserRole, UserStatus
from app.models import User


class UserRepository:
    """Database user persistence.

    Replaces store.py user lookups for auth and admin operations.
    """

    def __init__(self, db: Session) -> None:
        self._db = db

    def get_by_email(self, email: str) -> User | None:
        return self._db.query(User).filter(User.email == email.lower()).first()

    def get_by_id(self, user_id: UUID) -> User | None:
        return self._db.query(User).filter(User.id == user_id).first()

    def list_all(self) -> list[User]:
        return self._db.query(User).order_by(User.created_at).all()

    def count(self) -> int:
        return self._db.query(User).count()

    def add(self, user: User) -> None:
        self._db.add(user)

    def record_login(self, user: User) -> None:
        """Update the user's last-login timestamp (no-op for now)."""
        # In a fuller implementation this would update a last_login_at column.
        # For now, just flush to keep the pattern open without requiring schema change.
        self._db.flush()

    def to_response(self, user: User) -> dict[str, str]:
        return {
            "first_name": user.first_name,
            "last_name": user.last_name,
            "email": user.email,
            "role": user.role,
            "status": user.status,
        }

    def create(
        self,
        *,
        first_name: str,
        last_name: str,
        email: str,
        password_hash: str,
        role: UserRole,
        status: UserStatus = UserStatus.ACTIVE,
    ) -> User:
        normalized = email.lower()
        existing = self.get_by_email(normalized)
        if existing is not None:
            raise ValueError("User already exists")
        user = User(
            first_name=first_name,
            last_name=last_name,
            email=normalized,
            password_hash=password_hash,
            role=role.value,
            status=status.value,
        )
        self._db.add(user)
        self._db.flush()
        return user

    def disable(self, email: str) -> dict[str, str] | None:
        user = self.get_by_email(email)
        if user is None:
            return None
        user.status = UserStatus.DISABLED.value
        self._db.flush()
        return self.to_response(user)

    def update(
        self,
        email: str,
        *,
        first_name: str,
        last_name: str,
        role: UserRole,
    ) -> dict[str, str] | None:
        user = self.get_by_email(email)
        if user is None:
            return None
        user.first_name = first_name
        user.last_name = last_name
        user.role = role.value
        self._db.flush()
        return self.to_response(user)