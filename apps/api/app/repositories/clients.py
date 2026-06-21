from __future__ import annotations

from datetime import date, datetime
from uuid import UUID

from sqlalchemy.orm import Session

from app.domain.clients import ClientStatus
from app.models import Client, Dependant, User


class ClientRepository:
    """Database client persistence.

    Replaces store.py client operations for CRUD routes.
    """

    def __init__(self, db: Session) -> None:
        self._db = db

    # ------------------------------------------------------------------
    # Lookups
    # ------------------------------------------------------------------

    def get_by_reference(self, client_reference: str) -> Client | None:
        return self._db.query(Client).filter(Client.client_reference == client_reference).first()

    def list_all(self) -> list[Client]:
        return self._db.query(Client).order_by(Client.created_at.desc()).all()

    def count(self) -> int:
        return self._db.query(Client).count()

    # ------------------------------------------------------------------
    # Helpers
    # ------------------------------------------------------------------

    def _user_email_by_id(self, user_id: UUID | None) -> str:
        """Resolve a user UUID to an email string for API responses."""
        if user_id is None:
            return ""
        user = self._db.query(User).filter(User.id == user_id).first()
        return user.email if user else ""

    def _user_id_by_email(self, email: str) -> UUID | None:
        """Resolve an email to a user UUID for FK storage."""
        user = self._db.query(User).filter(User.email == email.lower()).first()
        return user.id if user else None

    def _load_dependants(self, client_id: UUID) -> list[dict[str, str]]:
        deps = (
            self._db.query(Dependant)
            .filter(Dependant.client_id == client_id)
            .order_by(Dependant.name)
            .all()
        )
        result: list[dict[str, str]] = []
        for d in deps:
            entry: dict[str, str] = {"name": d.name}
            if d.date_of_birth:
                entry["date_of_birth"] = d.date_of_birth.isoformat()
            if d.notes:
                entry["notes"] = d.notes
            result.append(entry)
        return result

    def _sync_dependants(self, client_id: UUID, dependants_data: list[dict[str, str]]) -> None:
        self._db.query(Dependant).filter(Dependant.client_id == client_id).delete()
        for dep in dependants_data:
            name = (dep.get("name") or "").strip()
            if not name:
                continue
            dob_raw = dep.get("date_of_birth")
            notes = dep.get("notes")
            self._db.add(
                Dependant(
                    client_id=client_id,
                    name=name,
                    date_of_birth=self._parse_date(dob_raw),
                    notes=str(notes).strip() if notes else None,
                )
            )

    def _parse_date(self, value: object) -> date | None:
        if value is None:
            return None
        if isinstance(value, date):
            return value
        normalized = str(value).strip()
        if not normalized:
            return None
        return date.fromisoformat(normalized)

    def _phase_2_artifacts(self, client_reference: str) -> tuple[dict[str, object], list[dict[str, object]]]:
        from copy import deepcopy

        from app.store import SEEDED_CLIENTS, _DRAFT_STORE, _default_generated_document_drafts

        document_drafts = deepcopy(_DRAFT_STORE.get(client_reference, _default_generated_document_drafts()))
        generated_documents: list[dict[str, object]] = []
        for seeded in SEEDED_CLIENTS:
            if seeded["client_reference"] == client_reference:
                generated_documents = deepcopy(seeded.get("generated_documents", []))
                break
        return document_drafts, generated_documents

    # ------------------------------------------------------------------
    # Response builders (match store.py contract shapes)
    # ------------------------------------------------------------------

    def _to_detail_response(self, client: Client) -> dict[str, object]:
        document_drafts, generated_documents = self._phase_2_artifacts(client.client_reference)
        return {
            "client_reference": client.client_reference,
            "first_name": client.first_name,
            "surname": client.surname,
            "full_name": client.full_name,
            "title": client.title or "",
            "status": client.status,
            "created_by": self._user_email_by_id(client.created_by),
            "updated_by": self._user_email_by_id(client.updated_by),
            "created_at": client.created_at.isoformat() if client.created_at else "",
            "updated_at": client.updated_at.isoformat() if client.updated_at else "",
            "email": client.email or "",
            "mobile_number": client.mobile_number or "",
            "work_phone": client.work_phone or "",
            "date_of_birth": client.date_of_birth.isoformat() if client.date_of_birth else "",
            "marital_status": client.marital_status or "",
            "home_address_line_1": client.home_address_line_1 or "",
            "home_address_line_2": client.home_address_line_2 or "",
            "town_city": client.town_city or "",
            "county": client.county or "",
            "eircode": client.eircode or "",
            "partner_name": client.partner_name or "",
            "partner_address": client.partner_address or "",
            "general_notes": "",
            "dependants": self._load_dependants(client.id),
            "document_drafts": document_drafts,
            "generated_documents": generated_documents,
        }

    def _to_list_item(self, client: Client) -> dict[str, object]:
        return {
            "client_reference": client.client_reference,
            "first_name": client.first_name,
            "surname": client.surname,
            "full_name": client.full_name,
            "status": client.status,
            "created_by": self._user_email_by_id(client.created_by),
            "updated_by": self._user_email_by_id(client.updated_by),
        }

    # ------------------------------------------------------------------
    # CRUD
    # ------------------------------------------------------------------

    def create(
        self,
        *,
        first_name: str,
        surname: str,
        email: str,
        mobile_number: str,
        marital_status: str,
        date_of_birth: str,
        title: str,
        town_city: str,
        county: str,
        dependants: list[dict[str, str]],
        created_by_email: str,
    ) -> dict[str, object]:
        from app.domain.clients import build_client_reference

        full_name = f"{first_name} {surname}".strip()
        current_year = datetime.now(UTC).year
        seq = self._db.query(Client).count() + 1
        client_reference = build_client_reference(current_year, seq)

        created_by_id = self._user_id_by_email(created_by_email)

        client = Client(
            client_reference=client_reference,
            first_name=first_name,
            surname=surname,
            full_name=full_name,
            title=title or None,
            marital_status=marital_status or None,
            date_of_birth=self._parse_date(date_of_birth),
            mobile_number=mobile_number or None,
            email=email or None,
            town_city=town_city or None,
            county=county or None,
            status=ClientStatus.DRAFT.value,
            created_by=created_by_id,
            updated_by=created_by_id,
        )
        self._db.add(client)
        self._db.flush()

        if dependants:
            self._sync_dependants(client.id, dependants)
            self._db.flush()

        return self._to_detail_response(client)

    def update(
        self,
        client_reference: str,
        updates: dict[str, object],
        updated_by_email: str,
    ) -> dict[str, object] | None:
        client = self.get_by_reference(client_reference)
        if client is None:
            return None

        dependants_data = updates.pop("dependants", None)
        updated_by_id = self._user_id_by_email(updated_by_email)

        field_map = {
            "first_name": "first_name",
            "surname": "surname",
            "email": "email",
            "mobile_number": "mobile_number",
            "marital_status": "marital_status",
            "date_of_birth": "date_of_birth",
            "title": "title",
            "town_city": "town_city",
            "county": "county",
            "work_phone": "work_phone",
            "home_address_line_1": "home_address_line_1",
            "home_address_line_2": "home_address_line_2",
            "eircode": "eircode",
            "partner_name": "partner_name",
            "partner_address": "partner_address",
        }

        for request_key, attr_name in field_map.items():
            if request_key in updates:
                setattr(client, attr_name, updates[request_key] or None)

        if "first_name" in updates or "surname" in updates:
            client.full_name = f"{client.first_name} {client.surname}".strip()

        client.updated_by = updated_by_id

        if dependants_data is not None:
            self._db.query(Dependant).filter(Dependant.client_id == client.id).delete()
            for dep in dependants_data:
                name = (dep.get("name") or "").strip()
                if not name:
                    continue
                dob_raw = dep.get("date_of_birth")
                notes = dep.get("notes")
                self._db.add(
                    Dependant(
                        client_id=client.id,
                        name=name,
                        date_of_birth=self._parse_date(dob_raw),
                        notes=str(notes).strip() if notes else None,
                    )
                )

        self._db.flush()
        return self._to_detail_response(client)

    def archive(self, client_reference: str, updated_by_email: str) -> dict[str, object] | None:
        client = self.get_by_reference(client_reference)
        if client is None:
            return None
        client.status = ClientStatus.ARCHIVED.value
        client.updated_by = self._user_id_by_email(updated_by_email)
        self._db.flush()
        return self._to_detail_response(client)
