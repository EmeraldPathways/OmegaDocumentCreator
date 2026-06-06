from __future__ import annotations

from datetime import UTC, datetime, timedelta
import hashlib
import hmac
import secrets


def hash_password(password: str) -> str:
    salt = secrets.token_hex(16)
    digest = hashlib.pbkdf2_hmac("sha256", password.encode("utf-8"), salt.encode("utf-8"), 200_000)
    return f"{salt}${digest.hex()}"


def verify_password(password: str, password_hash: str) -> bool:
    salt, digest = password_hash.split("$", maxsplit=1)
    candidate = hashlib.pbkdf2_hmac("sha256", password.encode("utf-8"), salt.encode("utf-8"), 200_000)
    return hmac.compare_digest(candidate.hex(), digest)


def is_session_expired(last_seen_at: str | None, timeout_minutes: int) -> bool:
    if not last_seen_at:
        return True

    last_seen = datetime.fromisoformat(last_seen_at)
    return datetime.now(UTC) - last_seen > timedelta(minutes=timeout_minutes)
