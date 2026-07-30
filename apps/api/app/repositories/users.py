from __future__ import annotations

from datetime import UTC, datetime
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
        """Update the user's last-login timestamp."""
        user.last_login_at = datetime.now(UTC)
        self._db.flush()

    def to_response(self, user: User) -> dict[str, str | bool | None]:
        return {
            "first_name": user.first_name,
            "last_name": user.last_name,
            "email": user.email,
            "role": user.role,
            "status": user.status,
            "force_password_change": user.force_password_change,
            "last_login_at": user.last_login_at.isoformat() if user.last_login_at else None,
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
            force_password_change=False,
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

    def enable(self, email: str) -> dict[str, str | bool | None] | None:
        user = self.get_by_email(email)
        if user is None:
            return None
        user.status = UserStatus.ACTIVE.value
        self._db.flush()
        return self.to_response(user)

    def reset_password(
        self,
        email: str,
        *,
        password_hash: str,
        force_password_change: bool = True,
    ) -> dict[str, str | bool | None] | None:
        user = self.get_by_email(email)
        if user is None:
            return None
        user.password_hash = password_hash
        user.force_password_change = force_password_change
        self._db.flush()
        return self.to_response(user)

    def update(
        self,
        email: str,
        *,
        first_name: str,
        last_name: str,
        role: UserRole,
        status: UserStatus | None = None,
        force_password_change: bool | None = None,
    ) -> dict[str, str | bool | None] | None:
        user = self.get_by_email(email)
        if user is None:
            return None
        user.first_name = first_name
        user.last_name = last_name
        user.role = role.value
        if status is not None:
            user.status = status.value
        if force_password_change is not None:
            user.force_password_change = force_password_change
        self._db.flush()
        return self.to_response(user)
