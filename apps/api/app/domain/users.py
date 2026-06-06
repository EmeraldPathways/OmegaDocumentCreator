from __future__ import annotations

from dataclasses import dataclass
from enum import StrEnum


class UserRole(StrEnum):
    ADMIN = "admin"
    STAFF = "staff"


class UserStatus(StrEnum):
    ACTIVE = "active"
    DISABLED = "disabled"


@dataclass(slots=True)
class UserRecord:
    first_name: str
    last_name: str
    email: str
    password_hash: str
    role: UserRole
    status: UserStatus = UserStatus.ACTIVE
