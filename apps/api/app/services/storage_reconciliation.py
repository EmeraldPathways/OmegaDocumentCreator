from __future__ import annotations

from datetime import UTC, datetime
from pathlib import Path
from typing import Any

from sqlalchemy.orm import Session

from app.models import Client, Document, File

MAX_REPORT_ITEMS = 200


def _path_within_root(root: Path, relative_path: str | None) -> Path | None:
    if not relative_path:
        return None
    candidate = (root / relative_path).resolve()
    root_resolved = root.resolve()
    if not candidate.is_relative_to(root_resolved):
        return None
    return candidate


def _client_lookup(db: Session) -> dict[object, Client]:
    return {client.id: client for client in db.query(Client).all()}


def _scan_storage_reconciliation(db: Session, storage_root: Path) -> dict[str, list[dict[str, Any]]]:
    root = storage_root.resolve()
    clients = _client_lookup(db)
    file_records = db.query(File).all()
    document_records = db.query(Document).all()

    missing_file_records: list[dict[str, Any]] = []
    invalid_file_records: list[dict[str, Any]] = []
    missing_document_artifacts: list[dict[str, Any]] = []
    invalid_document_artifacts: list[dict[str, Any]] = []
    referenced_paths: set[str] = set()

    def client_meta(client_id: object) -> dict[str, Any]:
        client = clients.get(client_id)
        return {
            "client_id": str(client_id),
            "client_reference": getattr(client, "client_reference", None),
            "client_name": getattr(client, "full_name", None),
        }

    for file_record in file_records:
        if file_record.file_path:
            referenced_paths.add(file_record.file_path)
        resolved_path = _path_within_root(root, file_record.file_path)
        item = {
            "id": str(file_record.id),
            "record_type": "file",
            "relative_path": file_record.file_path,
            "original_filename": file_record.original_filename,
            "stored_filename": file_record.stored_filename,
            "category": file_record.category,
            **client_meta(file_record.client_id),
        }
        if resolved_path is None:
            invalid_file_records.append(item)
        elif not resolved_path.is_file():
            missing_file_records.append(item)

    for document_record in document_records:
        for artifact_type, relative_path in (
            ("docx", document_record.docx_file_path),
            ("pdf", document_record.pdf_file_path),
        ):
            if not relative_path:
                continue
            referenced_paths.add(relative_path)
            resolved_path = _path_within_root(root, relative_path)
            item = {
                "id": str(document_record.id),
                "record_type": "document",
                "artifact_type": artifact_type,
                "document_type": document_record.document_type,
                "document_name": document_record.document_name,
                "relative_path": relative_path,
                **client_meta(document_record.client_id),
            }
            if resolved_path is None:
                invalid_document_artifacts.append(item)
            elif not resolved_path.is_file():
                missing_document_artifacts.append(item)

    orphaned_disk_files: list[dict[str, Any]] = []
    if root.is_dir():
        for filepath in root.rglob("*"):
            if not filepath.is_file():
                continue
            relative_path = filepath.relative_to(root).as_posix()
            if relative_path in referenced_paths:
                continue
            orphaned_disk_files.append(
                {
                    "relative_path": relative_path,
                    "size_bytes": filepath.stat().st_size,
                }
            )

    return {
        "missing_file_records": missing_file_records,
        "invalid_file_records": invalid_file_records,
        "missing_document_artifacts": missing_document_artifacts,
        "invalid_document_artifacts": invalid_document_artifacts,
        "orphaned_disk_files": orphaned_disk_files,
        "file_records": [{"id": str(item.id), "relative_path": item.file_path} for item in file_records],
        "document_records": [
            {
                "id": str(item.id),
                "docx_file_path": item.docx_file_path,
                "pdf_file_path": item.pdf_file_path,
            }
            for item in document_records
        ],
    }


def build_storage_reconciliation_report(db: Session, storage_root: Path) -> dict[str, Any]:
    root = storage_root.resolve()
    scan = _scan_storage_reconciliation(db, storage_root)
    report = {
        "generated_at": datetime.now(UTC).isoformat(),
        "storage_root": str(root),
        "summary": {
            "file_record_count": len(scan["file_records"]),
            "document_record_count": len(scan["document_records"]),
            "missing_file_record_count": len(scan["missing_file_records"]),
            "invalid_file_record_count": len(scan["invalid_file_records"]),
            "missing_document_artifact_count": len(scan["missing_document_artifacts"]),
            "invalid_document_artifact_count": len(scan["invalid_document_artifacts"]),
            "orphaned_disk_file_count": len(scan["orphaned_disk_files"]),
        },
        "items": {
            "missing_file_records": scan["missing_file_records"][:MAX_REPORT_ITEMS],
            "invalid_file_records": scan["invalid_file_records"][:MAX_REPORT_ITEMS],
            "missing_document_artifacts": scan["missing_document_artifacts"][:MAX_REPORT_ITEMS],
            "invalid_document_artifacts": scan["invalid_document_artifacts"][:MAX_REPORT_ITEMS],
            "orphaned_disk_files": scan["orphaned_disk_files"][:MAX_REPORT_ITEMS],
        },
        "truncated": {
            "missing_file_records": len(scan["missing_file_records"]) > MAX_REPORT_ITEMS,
            "invalid_file_records": len(scan["invalid_file_records"]) > MAX_REPORT_ITEMS,
            "missing_document_artifacts": len(scan["missing_document_artifacts"]) > MAX_REPORT_ITEMS,
            "invalid_document_artifacts": len(scan["invalid_document_artifacts"]) > MAX_REPORT_ITEMS,
            "orphaned_disk_files": len(scan["orphaned_disk_files"]) > MAX_REPORT_ITEMS,
        },
    }
    return report


def repair_storage_reconciliation_report(
    db: Session,
    storage_root: Path,
    *,
    execute: bool,
) -> dict[str, Any]:
    scan = _scan_storage_reconciliation(db, storage_root)
    report = build_storage_reconciliation_report(db, storage_root)
    summary = report["summary"]

    actions = {
        "delete_missing_file_records": int(summary["missing_file_record_count"]) + int(summary["invalid_file_record_count"]),
        "clear_missing_document_artifact_paths": int(summary["missing_document_artifact_count"])
        + int(summary["invalid_document_artifact_count"]),
        "delete_orphaned_disk_files": int(summary["orphaned_disk_file_count"]),
    }

    if not execute:
        return {
            "executed": False,
            "actions": actions,
            "report": report,
        }

    root = storage_root.resolve()

    for file_record in db.query(File).all():
        resolved_path = _path_within_root(root, file_record.file_path)
        if resolved_path is None or not resolved_path.is_file():
            db.delete(file_record)

    for document_record in db.query(Document).all():
        for attribute_name in ("docx_file_path", "pdf_file_path"):
            relative_path = getattr(document_record, attribute_name)
            if not relative_path:
                continue
            resolved_path = _path_within_root(root, relative_path)
            if resolved_path is None or not resolved_path.is_file():
                setattr(document_record, attribute_name, None)

    for item in scan["orphaned_disk_files"]:
        relative_path = item.get("relative_path")
        if not isinstance(relative_path, str):
            continue
        resolved_path = _path_within_root(root, relative_path)
        if resolved_path and resolved_path.is_file():
            resolved_path.unlink(missing_ok=True)

    db.flush()

    refreshed = build_storage_reconciliation_report(db, storage_root)
    return {
        "executed": True,
        "actions": actions,
        "report": refreshed,
    }
