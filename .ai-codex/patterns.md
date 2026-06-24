# Patterns & Gotchas

## Auth pattern

- Backend sets the cookie on `POST /auth/login`.
- Frontend validates an existing session with `GET /auth/me`.
- No Bearer token flow exists.
- Audit entries are created for login success (`login_success`), failed attempts (`login_failed`), and logout.
- Login is rate-limited to 5 attempts per minute per IP.

```ts
await fetch("/auth/me");
```

## Client identifiers

- Client routes and store helpers use `client_reference`.
- Current format is `CLI-YYYY-NNNN`, not `OMG-001`.

## Document generation pattern

1. `income-protection-page.tsx` collects the workflow snapshot.
2. `document-api.ts` posts:

```json
{
  "client_reference": "CLI-2026-0002",
  "document_type": "Statement of Suitability",
  "template_id": "default",
  "workflow_snapshot": {}
}
```

3. `document_generation.py` builds the prompt, runs AI/fallback, and persists metadata + frozen HTML snapshot in PostgreSQL via `DocumentRepository`.
4. `document-api.ts` normalizes the backend response into camelCase fields.
5. `workflow-document-builders.ts` + `document-composer.ts` produce the styled exportable HTML.

## DB-backed repository pattern (all Phases 2-7)

Every live route uses this pattern:

```python
db = get_session()
try:
    repo = SomeRepository(db)
    # operate, then db.commit()
    return result
finally:
    db.close()
```

Repositories accept a `Session`, return models or dicts, and do not own session lifecycle.

## Persisted relative-path download pattern (Phases 4-5)

1. File/document artifacts stored on disk under `FILE_STORAGE_PATH` via `ClientStorage.save_file()`
2. Relative path from `FILE_STORAGE_PATH` persisted in DB
3. Download endpoints resolve via `ClientStorage.read_relative_file()` with path traversal guard
4. Raw filesystem paths never exposed to clients

## Audit logging pattern (Phase 6)

```python
_log_audit(request, db=db, action="client_created", entity_type="client",
           entity_id=client_ref, details={"full_name": name})
```
- Called after successful write actions and for login attempts (both success and failure)
- `login_failed` audit entries are created for invalid credential attempts
- `login_success` audit entries are created for successful logins
- Admin audit-logs route reads from PostgreSQL via `AuditLogRepository.list_recent()`

## Backup manifest pattern (Phase 7)

- `POST /admin/backups` calls `create_backup_manifest()` which writes a JSON manifest under `BACKUP_PATH/manifests/`
- Backup run persisted in DB via `BackupRepository` with manifest path in `files_backup`/`documents_backup`
- No external binaries required; scans filesystem for stats

## Health/readiness pattern (Phase 8)

- `/health` — `{ status, app_url, environment, remote_access_mode }`
- `/ready` — `{ ready: bool, checks: { database, file_storage, backup_storage } }`
- CORS middleware applied only when `CORS_ORIGINS` is explicitly set
- Cookie security: `https_only` from `COOKIE_SECURE`, `same_site` from `COOKIE_SAMESITE`
- Startup validates SESSION_SECRET, APP_URL, CORS_ORIGINS for non-dev environments

## Session handling

- Backend session keys in live code: `session_id`, `user_email`, `last_seen_at`
- No `role` session key is stored directly.
- Admin checks happen after `_current_user()` resolves the user record from PostgreSQL (via `UserRepository`).

## Password helpers

```python
hash_password(password: str) -> str
verify_password(password: str, password_hash: str) -> bool
is_session_expired(last_seen_at: str | None, timeout_minutes: int) -> bool
```

## Frontend workflow persistence

- `client-data-context.tsx` holds client/workflow state in React context (not localStorage).
- Workflow saves are backed by `PUT /clients/{ref}/workflow` (PostgreSQL via `WorkflowRepository`).
- Frontend loads workflow from backend on client change via `fetchWorkflow()`.
- Selected auth user is mirrored in `sessionStorage` only for UI convenience.

## Local run paths

- Root: `run-omega.cmd`
- Frontend: `apps/frontend/run-frontend.cmd` -> `127.0.0.1:3007`
- Backend: `apps/api/run-api.cmd` -> `127.0.0.1:8007`

## Migration reality

- `apps/api/migrations/0001_initial.sql` defines users, clients, dependants, employment/protection tables, documents, terms of business, statement of suitability, files, and audit logs.
- The sessions table is created in migration `0004_sessions.sql`.

## Known drift to avoid

- Do not document unused routed pages as live UX.
- Do not describe Terms of Business as a live Income Protection tab unless `moduleTabs` is changed.
- Do not describe `/clients` as supporting `?search=` unless backend code adds it.
- Do not describe audit logs or backups as seeded/in-memory — both are now PostgreSQL-backed.
- Do not describe CSRF as absent — same-origin Origin/Referer header validation exists.
- Do not describe client routes as public — `GET /clients` and `GET /clients/{ref}` now require session auth.
- Do not describe audit entries as success-only — failed logins are now audited.
