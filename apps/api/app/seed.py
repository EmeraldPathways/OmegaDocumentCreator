from __future__ import annotations

from dataclasses import dataclass


@dataclass(frozen=True, slots=True)
class SeedUser:
    email: str
    role: str


DEFAULT_USERS = (
    SeedUser(email="admin@omega.local", role="admin"),
    SeedUser(email="staff@omega.local", role="staff"),
)

DEFAULT_CLIENT = {
    "client_reference": "CLI-2026-0001",
    "first_name": "Test",
    "surname": "Client",
    "status": "draft",
}
