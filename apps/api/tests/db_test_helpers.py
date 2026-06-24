"""Shared helpers for Phase 2+ DB-backed API tests.

Requires TEST_DATABASE_URL pointing to a dedicated test database.
Tests will NOT fall back to DATABASE_URL — the guardrail rejects
destructive operations on the live application database.
"""

# ---------------------------------------------------------------------------
# Guardrail — must run BEFORE any app import because dotenv.load_dotenv()
# in app.config modifies os.environ.  We evaluate the raw subprocess
# environment only.
# ---------------------------------------------------------------------------

from __future__ import annotations

import os
import sys

_RAW_TEST_DB = os.environ.get("TEST_DATABASE_URL", "").strip()
_RAW_LIVE_DB = os.environ.get("DATABASE_URL", "").strip()

if not _RAW_TEST_DB:
    print(
        "TEST_DATABASE_URL is not set.\n"
        "The backend test suite runs destructive setup/teardown\n"
        "(truncate_all, drop_all) and must never target the live\n"
        "application database.  Set TEST_DATABASE_URL to a dedicated\n"
        "test database, for example:\n"
        '  $env:TEST_DATABASE_URL="postgresql://omega:omega_dev_password@127.0.0.1:5432/omega_test"\n'
        "Then re-run the tests.\n",
        file=sys.stderr,
    )
    sys.exit(1)

# Quick sanity: reject an obviously unsafe test DB name before any
# SQLAlchemy parsing.  The structured check below is the authoritative
# one; this is just a fast early guard.
_TEST_DB_NAME_HINT = _RAW_TEST_DB.rstrip("/").rsplit("/", 1)[-1].split("?")[0].lower()
if "_test" not in _TEST_DB_NAME_HINT:
    print(
        "TEST_DATABASE_URL must use a database whose name contains '_test'.\n"
        "The backend test suite runs destructive setup/teardown\n"
        "(truncate_all, drop_all) and must never target the live\n"
        "application database.\n"
        f"  Current test database name: '{_TEST_DB_NAME_HINT}'\n"
        f"  Current TEST_DATABASE_URL: {_RAW_TEST_DB}\n"
        "  Example safe value:\n"
        '  $env:TEST_DATABASE_URL="postgresql://omega:omega_dev_password@127.0.0.1:5432/omega_test"\n',
        file=sys.stderr,
    )
    sys.exit(1)

# ---------------------------------------------------------------------------
# Imports (safe to load dotenv now that the guardrail has passed)
# ---------------------------------------------------------------------------

import uuid
from datetime import UTC, date, datetime
from typing import Any

from sqlalchemy import Engine, create_engine, text
from sqlalchemy.engine.url import make_url
from sqlalchemy.orm import Session, sessionmaker

from app.config import get_settings


def _normalize_database_url(database_url: str) -> str:
    if database_url.startswith("postgresql://"):
        return database_url.replace("postgresql://", "postgresql+psycopg://", 1)
    return database_url


_LOOPBACK_HOSTS = frozenset({"127.0.0.1", "localhost", "::1"})


def _canonical_host(raw_host: str | None) -> str:
    if raw_host and raw_host.strip().lower() in _LOOPBACK_HOSTS:
        return "127.0.0.1"
    return (raw_host or "").strip().lower()


def _effective_target(db_url: str) -> tuple[str, str, str, int | None]:
    u = make_url(db_url)
    port: int | None = int(u.port) if u.port is not None else None
    return (
        u.database.strip().lower() if u.database else "",
        (u.username or "").strip().lower(),
        _canonical_host(u.host),
        port,
    )


def _structured_same_db_check() -> None:
    """Structured URL comparison (post-dotenv) — rejects test==live."""
    test_normalised = _normalize_database_url(_RAW_TEST_DB)
    live_raw = os.environ.get("DATABASE_URL", "").strip()
    if not live_raw:
        return
    live_normalised = _normalize_database_url(live_raw)
    test_target = _effective_target(test_normalised)
    live_target = _effective_target(live_normalised)

    if test_target == live_target:
        print(
            "TEST_DATABASE_URL resolves to the same database as DATABASE_URL.\n"
            "The backend test suite runs destructive setup/teardown\n"
            "(truncate_all, drop_all) and must never target the live\n"
            "application database.\n"
            f"  Effective target: {test_target[0]}@"
            f"{test_target[2]}:{test_target[3] or 'default'}\n"
            f"  TEST_DATABASE_URL: {_RAW_TEST_DB}\n"
            f"  DATABASE_URL:      {live_raw}\n"
            "  Point TEST_DATABASE_URL at a separate test database, for example:\n"
            '  $env:TEST_DATABASE_URL="postgresql://omega:omega_dev_password@127.0.0.1:5432/omega_test"\n'
            "  Then re-run the tests.\n",
            file=sys.stderr,
        )
        sys.exit(1)


_structured_same_db_check()

TEST_DATABASE_URL = _normalize_database_url(_RAW_TEST_DB)


def _build_test_engine() -> Engine:
    return create_engine(
        TEST_DATABASE_URL,
        pool_pre_ping=True,
        connect_args={"connect_timeout": 2},
    )


def setup_test_db() -> Engine:
    """Create test schema if it does not exist."""
    engine = _build_test_engine()
    from app.models import Base

    Base.metadata.create_all(bind=engine)
    return engine


def teardown_test_db(engine: Engine) -> None:
    """Drop all tables in the test database."""
    from app.models import Base

    Base.metadata.drop_all(bind=engine)
    engine.dispose()


def new_test_session(engine: Engine) -> Session:
    return sessionmaker(bind=engine, autoflush=False, autocommit=False)()


def truncate_all(session: Session) -> None:
    """Delete all rows from Phase 2 tables (in FK dependency order)."""
    tables = [
        "dependants",
        "sessions",
        "audit_logs",
        "files",
        "documents",
        "statement_of_suitability",
        "terms_of_business",
        "fact_find",
        "life_serious_illness_details",
        "protection_details",
        "employment_details",
        "restore_attempts",
        "backup_runs",
        "clients",
        "users",
    ]
    for table in tables:
        session.execute(text(f"DELETE FROM {table}"))
    session.flush()


def seed_default_users(session: Session) -> None:
    """Insert the default admin and staff users."""
    from app.models import User
    from app.security import hash_password

    settings = get_settings()
    now = datetime.now(UTC)

    admin = User(
        id=uuid.uuid4(),
        first_name="Omega",
        last_name="Admin",
        email=settings.admin_email,
        password_hash=hash_password(settings.admin_password),
        role="admin",
        status="active",
        created_at=now,
        updated_at=now,
    )
    staff = User(
        id=uuid.uuid4(),
        first_name="Office",
        last_name="Staff",
        email=settings.staff_email,
        password_hash=hash_password(settings.staff_password),
        role="staff",
        status="active",
        created_at=now,
        updated_at=now,
    )
    session.add_all([admin, staff])
    session.flush()
    session.expunge_all()


def seed_default_clients(session: Session) -> None:
    """Insert two default clients matching the legacy seeded data."""
    from app.models import Client, Dependant, User
    from app.domain.clients import ClientStatus

    settings = get_settings()
    users = (
        session.query(User)
        .filter(User.email.in_([settings.admin_email, settings.staff_email]))
        .all()
    )
    user_map = {u.email: u for u in users}
    admin_id = user_map[settings.admin_email].id if settings.admin_email in user_map else None
    staff_id = user_map[settings.staff_email].id if settings.staff_email in user_map else None

    c1 = Client(
        id=uuid.uuid4(),
        client_reference="CLI-2026-0001",
        first_name="Test",
        surname="Client",
        full_name="Test Client",
        title="Mr",
        status=ClientStatus.DRAFT.value,
        created_by=admin_id,
        updated_by=admin_id,
        email="test.client@example.com",
        mobile_number="0870000001",
        date_of_birth=date.fromisoformat("1985-04-12"),
        marital_status="Married",
        home_address_line_1="1 Main Street",
        town_city="Dublin",
        county="Dublin",
        eircode="D01TEST",
        partner_name="Taylor Client",
        partner_address="1 Main Street, Dublin",
    )
    c2 = Client(
        id=uuid.uuid4(),
        client_reference="CLI-2026-0002",
        first_name="Jamie",
        surname="Murphy",
        full_name="Jamie Murphy",
        title="Ms",
        status=ClientStatus.ACTIVE.value,
        created_by=staff_id,
        updated_by=staff_id,
        email="jamie.murphy@example.com",
        mobile_number="0870000002",
        work_phone="014000002",
        date_of_birth=date.fromisoformat("1990-11-08"),
        marital_status="Single",
        home_address_line_1="22 River Road",
        home_address_line_2="Apt 4",
        town_city="Galway",
        county="Galway",
        eircode="H91TEST",
    )
    session.add_all([c1, c2])
    session.flush()

    dep = Dependant(
        id=uuid.uuid4(),
        client_id=c2.id,
        name="Ella Murphy",
        date_of_birth=date.fromisoformat("2017-06-20"),
        notes="Child",
    )
    session.add(dep)
    session.flush()
    session.expunge_all()