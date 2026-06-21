from __future__ import annotations

from sqlalchemy.orm import Session

from app.models import Dependant, EmploymentDetail, FactFind, LifeSeriousIllnessDetail, ProtectionDetail

__all__ = ["WorkflowRepository"]


class WorkflowRepository:
    """Repository seam for workflow/income-protection persistence.

    Not yet wired into routes — Phase 2+ cutover will replace store.py workflow
    operations with this repository.
    """

    def __init__(self, db: Session) -> None:
        self._db = db

    def get_dependants(self, client_id: str) -> list[Dependant]:
        return self._db.query(Dependant).filter(Dependant.client_id == client_id).all()

    def get_employment(self, client_id: str) -> EmploymentDetail | None:
        return self._db.query(EmploymentDetail).filter(EmploymentDetail.client_id == client_id).first()

    def get_protection(self, client_id: str) -> ProtectionDetail | None:
        return self._db.query(ProtectionDetail).filter(ProtectionDetail.client_id == client_id).first()

    def get_life_si(self, client_id: str) -> LifeSeriousIllnessDetail | None:
        return self._db.query(LifeSeriousIllnessDetail).filter(LifeSeriousIllnessDetail.client_id == client_id).first()

    def get_fact_find(self, client_id: str) -> FactFind | None:
        return self._db.query(FactFind).filter(FactFind.client_id == client_id).first()

    def add(self, obj: object) -> None:
        self._db.add(obj)

    def flush(self) -> None:
        self._db.flush()