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
    def _clean_name_part(value: str, fallback: str) -> str:
        cleaned = re.sub(r"\s+", " ", value.replace("/", " ").replace("\\", " ").strip())
        cleaned = cleaned.strip(" .")
        return cleaned or fallback

    match = re.search(r"(\d+)$", client_reference)
    omega_numeric_id = match.group(1) if match else "00000"
    omega_id = f"omega-{omega_numeric_id.zfill(5)}"
    surname = _clean_name_part(client.surname, "Unknown")
    first_name = _clean_name_part(client.first_name, "Unknown")
    return f"{surname}, {first_name} - {omega_id}"
