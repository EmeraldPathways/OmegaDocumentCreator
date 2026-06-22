# Data / Persistence Review

Status: complete
Reviewer: Automated review pass

## Scope

- PostgreSQL models and repositories
- Workflow persistence (Phase 3)
- File storage (Phase 4)
- Generated document storage (Phase 5)
- Backup / restore (Phases 7, 9, 10)
- Session persistence (Phase 14)

---

## Findings

### Critical

1. **Hybrid DB + in-memory fallback in `store.py::get_client()` and `store.py::_try_db_client_lookup()`**
   - File: `apps/api/app/store.py`, lines 199-260
   - Problem: `get_client()` tries DB first, then falls back to in-memory `SEEDED_CLIENTS`. If DB is temporarily down, the fallback silently returns stale seeded data as if it were live. No error is raised — consumers cannot distinguish live DB data from stale memory data.
   - Why it matters: Data integrity. A transient DB outage could return wrong client data with no indication.
   - Suggested fix direction: Remove the in-memory fallback entirely. If DB is unavailable, propagate the error.
   - Confidence: Confirmed

2. **No migration file exists for `backup_runs` table — it's embedded in `0001_initial.sql` alongside all other tables**
   - File: `apps/api/migrations/0001_initial.sql`
   - Problem: The migration isn't incremental. `0001_initial.sql` creates all tables from scratch — users, clients, workflows, documents, files, backups, audit logs. There is no migration path for existing databases. Running this on a DB that already has tables would fail.
   - Why it matters: The schema cannot be evolved. Any schema change requires a fresh database. The `0003` and `0004` migrations add tables that already exist if the initial migration was already run.
   - Suggested fix direction: Structure migrations incrementally. Rename `0001_initial.sql` to `0001_initial_schema.sql` and add run-once guards.
   - Confidence: Confirmed

### High

1. **`WorkflowRepository.save()` does an upsert-per-table without transaction-safety around the six individual table saves**
   - File: `apps/api/app/repositories/workflows.py`, lines 184-191
   - Problem: `save()` calls six per-table `_save_*` methods in sequence. Each does its own query + insert/update. If one table save fails partway through, earlier tables are already mutated with no rollback mechanism within the function.
   - Why it matters: Partial workflow saves produce inconsistent state across workflow tables. Since the caller (`main.py` line 571) calls `db.commit()` after `save()`, the partial mutations could be committed.
   - Suggested fix direction: The caller should wrap the save in a transaction that rolls back on failure. The repository should document this requirement or handle it internally via SAVEPOINT.
   - Confidence: Confirmed

2. **`_model_to_dict()` converts all values to strings — lossy for booleans and decimals**
   - File: `apps/api/app/repositories/workflows.py`, lines 102-115
   - Problem: Boolean `True` → `"Yes"`, `False` → `"No"`. Decimal values → strings. The frontend sends back string values, and `_coerce_bool()`/`_coerce_decimal()` convert them back. This works but the type system is lost in transit.
   - Why it matters: If any consumer expects native booleans or numbers from the workflow GET endpoint, they'll break. The round-trip works but is fragile.
   - Suggested fix direction: Return native types (booleans as `bool`, decimals as `Decimal` or `float`). Let the frontend handle display formatting.
   - Confidence: Confirmed

3. **`ClientStorage.save_file()` and `ClientStorage.read_relative_file()` — no file size limits**
   - File: `apps/api/app/services/storage.py`
   - Problem: No maximum file size enforcement. An authenticated user can upload arbitrarily large files, filling the disk.
   - Why it matters: Disk exhaustion DOS. A single large upload can bring down the server.
   - Suggested fix direction: Add `MAX_UPLOAD_SIZE` config setting and enforce it in the upload route before writing to disk.
   - Confidence: Confirmed

4. **`DocumentRepository.add()` calls `flush()` but the only caller that uses this path (`main.py` line 696) also calls `commit()` — inconsistent session management**
   - File: `apps/api/app/repositories/documents.py`
   - Problem: `add()` method calls `self._db.flush()` to get the auto-generated ID, but the caller in `main.py` also does `db.commit()`. If other code adds documents without committing, they get IDs without persistence.
   - Why it matters: Inconsistent contract. Callers must know whether `add()` flushes, commits, or neither. The mix of `flush()` in the repo and `commit()` in the route is fragile.
   - Suggested fix direction: Document the session contract clearly. Either always flush+commit in the repo or never commit in the repo — be consistent.
   - Confidence: Confirmed

### Medium

1. **`BackupRepository.to_response()` uses `str()` on UUID fields — IDs become `"b'...'"`-style strings in some Python versions**
   - File: `apps/api/app/repositories/backups.py`
   - Problem: `"id": str(run.id)` — the string representation of a UUID object is stable but depends on the SQLAlchemy dialect's UUID handling.
   - Why it matters: Potential for inconsistent ID formatting across response serialization.
   - Suggested fix direction: Use `str(run.id)` (already done for standard UUIDs). Verify with PostgreSQL UUID dialect.
   - Confidence: Needs confirmation

2. **No data migration for existing in-memory `localStorage` data to PostgreSQL**
   - Problem: Phase 15 claims `localStorage` was removed as source of truth, but existing browsers may still have `omega-client-records` in `localStorage`. No migration path exists to move this into the backend.
   - Why it matters: Stale `localStorage` data confuses users during the transition. The frontend ignores it, but there's no cleanup of old data.
   - Suggested fix direction: Add a one-time migration that reads `localStorage`, pushes to the backend, then clears `localStorage`.
   - Confidence: Confirmed

3. **`FileRepository` file_path field stores relative paths but the model doesn't enforce the invariant**
   - File: `apps/api/app/models.py`, line 242
   - Problem: `file_path: Mapped[str]` is just a text field. Nothing prevents absolute paths or `../` sequences from being stored in the DB.
   - Why it matters: If a bug elsewhere writes an absolute path, `read_relative_file()` (which checks for `..`) treats an absolute path starting with `C:\` as valid and reads outside the storage root.
   - Suggested fix direction: Add a DB-level check constraint or application-level validation that `file_path` is always relative and does not start with `/` or contain `..`.
   - Confidence: Confirmed

### Low

1. **`AuditLogRepository` is read-only beyond `add()` — no filtering, pagination, or search**
   - File: `apps/api/app/repositories/audit_logs.py`
   - Problem: `list_recent()` returns all logs with no limit. The admin audit page will become unusably slow with thousands of entries.
   - Why it matters: Performance degradation over time. Audit logs grow unbounded.
   - Suggested fix direction: Add pagination (LIMIT/OFFSET), filtering by date range, user, entity type, and action.
   - Confidence: Confirmed

2. **`backup_runs` table has `triggered_by` column but scheduled backups don't set it**
   - File: `apps/api/app/services/scheduler.py` — `run_single_scheduled_backup()` calls `create_backup_manifest()` then creates a `BackupRun` record. But the `triggered_by` field is left `None` for scheduled runs.
   - Why it matters: Cannot distinguish manual vs. scheduled backups in the audit trail.
   - Suggested fix direction: Set `triggered_by` to a sentinel value (e.g., a system user UUID) or leave as NULL and document the convention.
   - Confidence: Informational

---

## Post-Fix Status (Prompts 1-3)

| # | Finding | Status |
|---|---------|--------|
| Critical #1 | Hybrid DB + in-memory fallback in store.py | **Fixed** — in-memory fallback removed from ClientRepository, reset_store removed from tests |
| Critical #2 | Non-incremental migrations | **Fixed** — migrate.py runner with _migrations tracking table |
| High #1 | WorkflowRepository.save() no transaction safety | **Fixed** — try/except with db.rollback() in PUT handler |
| High #2 | _model_to_dict lossy type conversion | **Still Open** |
| High #3 | No file size limits | **Fixed** — max_upload_size_bytes config with 413 rejection |
| High #4 | DocumentRepository.add() inconsistent flush/commit | **Still Open** |
| Medium #1 | BackupRepository UUID formatting | **Still Open** |
| Medium #2 | No localStorage→backend data migration | **Still Open** |
| Medium #3 | File path format validation | **Still Open** |
| Low #1 | Audit log no pagination | **Still Open** |
| Low #2 | Scheduled backup triggered_by not set | **Still Open** |

---

## Confirmed Good

- SQLAlchemy models are well-defined with proper FK constraints, indexes, and cascading deletes.
- `ClientStorage` path traversal guard works correctly via `Path.resolve()` and `relative_to()`.
- `SessionRepository` correctly handles creation, validation, deletion, and expired cleanup.
- `BackupRepository` properly separates backup run records from restore attempt records.
- `WorkflowRepository` has a clear mapping system between DB columns and frontend field names.
- Database connectivity and storage availability are verified on startup and via `/health` and `/ready`.
- Migration files exist for sessions (`0004_sessions.sql`) and restore attempts (`0003_restore_attempts.sql`) — incremental migrations are present.

---

## File-Level Follow-Up

- [ ] Remove in-memory fallback in `store.py::get_client()`.
- [ ] Add transaction safety around `WorkflowRepository.save()` multi-table writes.
- [ ] Add `MAX_UPLOAD_SIZE` config and enforcement in file upload route.
- [ ] Document session management contract for repositories (who flushes, who commits).
- [ ] Add path format validation to File model's `file_path` field.
- [ ] Add pagination to AuditLogRepository.list_recent().
- [ ] Add user-facing localStorage → backend migration for transitioning users.