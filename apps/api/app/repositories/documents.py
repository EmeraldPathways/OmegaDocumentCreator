from __future__ import annotations

from sqlalchemy.orm import Session

from app.models import Document, StatementOfSuitability, TermsOfBusiness

__all__ = ["DocumentRepository"]


class DocumentRepository:
    """Repository for generated document persistence.

    Replaces store.py draft storage and seeded generated-document history.
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

    def next_version_for(self, client_id: str, document_type: str) -> str:
        existing_versions = (
            self._db.query(Document.version)
            .filter(Document.client_id == client_id, Document.document_type == document_type)
            .all()
        )

        highest = 0
        for row in existing_versions:
            raw_value = row[0]
            if raw_value is None:
                continue
            try:
                highest = max(highest, int(str(raw_value).strip()))
            except ValueError:
                continue

        return str(highest + 1)

    def update_artifact_paths(self, document_id: str, *, docx_path: str | None = None, pdf_path: str | None = None) -> Document | None:
        doc = self.get_by_id(document_id)
        if doc is None:
            return None
        if docx_path is not None:
            doc.docx_file_path = docx_path
        if pdf_path is not None:
            doc.pdf_file_path = pdf_path
        return doc

    def get_terms(self, client_id: str) -> TermsOfBusiness | None:
        return self._db.query(TermsOfBusiness).filter(TermsOfBusiness.client_id == client_id).first()

    def get_statement(self, client_id: str) -> StatementOfSuitability | None:
        return self._db.query(StatementOfSuitability).filter(StatementOfSuitability.client_id == client_id).first()

    def delete(self, document_id: str) -> Document | None:
        """Delete a document by ID. Returns the deleted row or None if not found."""
        doc = self.get_by_id(document_id)
        if doc is None:
            return None
        self._db.delete(doc)
        return doc

    def flush(self) -> None:
        self._db.flush()
