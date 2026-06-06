from __future__ import annotations

from dataclasses import dataclass
from enum import StrEnum
import re


class ClientStatus(StrEnum):
    DRAFT = "draft"
    ACTIVE = "active"
    WAITING_FOR_DOCUMENTS = "waiting_for_documents"
    READY_FOR_REVIEW = "ready_for_review"
    COMPLETED = "completed"
    ARCHIVED = "archived"


@dataclass(slots=True)
class ClientRecord:
    first_name: str
    surname: str
    status: ClientStatus


def build_client_reference(year: int, sequence: int) -> str:
    return f"CLI-{year}-{sequence:04d}"


def build_client_storage_slug(client_reference: str, client: ClientRecord) -> str:
    surname = re.sub(r"[^a-z0-9]+", "-", client.surname.lower().replace("'", "")).strip("-")
    first_name = re.sub(r"[^a-z0-9]+", "-", client.first_name.lower().replace("'", "")).strip("-")
    return f"{client_reference}-{surname}-{first_name}"
