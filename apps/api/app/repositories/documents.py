from __future__ import annotations

from sqlalchemy.orm import Session

from app.models import Document, StatementOfSuitability, TermsOfBusiness

__all__ = ["DocumentRepository"]


class DocumentRepository:
    """Repository seam for document persistence.

    Not yet wired into routes — Phase 2+ cutover will replace store.py document
    operations with this repository.
    """

    def __init__(self, db: Session) -> None:
        self._db = db

    def list_by_client(self, client_id: str) -> list[Document]:
        return (
            self._db.query(Document)
            .filter(Document.client_id == client_id)
            .order_by(Document.generated_at.desc())
            .all()
        )

    def get_by_id(self, document_id: str) -> Document | None:
        return self._db.query(Document).filter(Document.id == document_id).first()

    def add(self, document: Document) -> None:
        self._db.add(document)

    def get_terms(self, client_id: str) -> TermsOfBusiness | None:
        return self._db.query(TermsOfBusiness).filter(TermsOfBusiness.client_id == client_id).first()

    def get_statement(self, client_id: str) -> StatementOfSuitability | None:
        return self._db.query(StatementOfSuitability).filter(StatementOfSuitability.client_id == client_id).first()

    def flush(self) -> None:
        self._db.flush()