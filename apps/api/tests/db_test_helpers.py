"""Shared helpers for Phase 2+ DB-backed API tests.

Requires a running PostgreSQL instance reachable via DATABASE_URL.
If DATABASE_URL is not set, defaults to a local test database.
"""

from __future__ import annotations

import uuid
from datetime import UTC, date, datetime

from sqlalchemy import Engine, create_engine, text
from sqlalchemy.orm import Session, sessionmaker

from app.config import get_settings

_RAW_TEST_DATABASE_URL = (
    __import__("os").environ.get("TEST_DATABASE_URL")
    or __import__("os").environ.get("DATABASE_URL")
    or "postgresql+psycopg://postgres:postgres@localhost:5432/omega_test"
)


def _normalize_database_url(database_url: str) -> str:
    if database_url.startswith("postgresql://"):
        return database_url.replace("postgresql://", "postgresql+psycopg://", 1)
    return database_url


TEST_DATABASE_URL = _normalize_database_url(_RAW_TEST_DATABASE_URL)


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
