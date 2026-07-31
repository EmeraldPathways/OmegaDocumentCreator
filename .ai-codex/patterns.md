# Patterns & Gotchas

## Auth pattern

- Backend sets the cookie on `POST /auth/login`.
- Frontend validates an existing session with `GET /auth/me`.
- No Bearer token flow exists.
- Malformed password hashes fail closed and return auth failure, not `500`.
- Audit entries are created for `login_success`, `login_failed`, `login_disabled_user`, `password_reset`, `user_disabled`, and `user_enabled`.

```ts
await fetch("/auth/me");
```

## Client access pattern

- Client access is enforced server-side and reused by workflow, file, and document routes.
- `created_by` is creator metadata.
- `assigned_to` is the working owner used for restricted-user access.
- Alison access is delegated from John's ownership/assignment rules in backend policy checks.

## Client identifiers and storage

- External client references use `CLI-YYYY-NNNN`.
- Storage folders use `Last, First - omega-00000`.
- Live artifact tree is:

```text
storage/clients/{Last, First - omega-00000}/{year}/{workflow}/{files|documents}/
```

- Backup artifacts live under `storage/backups/`.
- Old flat client folders and quarantine copies are legacy cleanup targets, not part of the live flow.

## Document generation pattern

1. Workflow page collects the snapshot.
2. `document-api.ts` posts:

```json
{
  "client_reference": "CLI-2026-0002",
  "document_type": "Statement of Suitability",
  "template_id": "default",
  "workflow_snapshot": {}
}
```

3. `document_generation.py` routes by document type and workflow shape.
4. `ai.py` builds the Gemini prompt from an allowlisted field set.
5. `DocumentRepository` persists metadata and frozen output snapshot.
6. Export/download flows use stored artifacts where available.

## DB-backed repository pattern

Every live route follows this shape:

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

## Persisted relative-path artifact pattern

1. File/document artifacts are stored under `FILE_STORAGE_PATH` via storage helpers
2. Relative paths from `FILE_STORAGE_PATH` are persisted in DB
3. Download endpoints resolve only through guarded relative-path helpers
4. Raw filesystem paths are not exposed to clients
5. Failed DB writes should delete just-written artifacts before raising

## Restore-approval pattern

- `validate-restore` and `dry-run-restore` issue short-lived approval tokens.
- `restore` consumes the approval token and still requires explicit confirmation text.
- Restore attempts are persisted regardless of outcome.

## Frontend persistence pattern

- Backend is authoritative for clients, workflow data, files, and generated documents.
- `localStorage` is limited to lightweight rehydration and UX hints such as the selected client.
- `sessionStorage` mirrors the current user for UX only and must not grant access by itself.

## Local run paths

- Root: `run-omega.cmd`
- Frontend: `apps/frontend/run-frontend.cmd` -> `127.0.0.1:3007`
- Backend: `apps/api/run-api.cmd` -> `127.0.0.1:8007`

## Known drift to avoid

- Do not describe admin data as seeded or in-memory.
- Do not describe client/file/document access as creator-only.
- Do not describe restore execution as a one-step action.
- Do not describe generated document history as browser-only.
- Do not describe `apps/api/app/store.py` as part of the live runtime path.
