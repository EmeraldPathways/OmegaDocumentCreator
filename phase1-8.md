# Omega Phases 1-16 Handoff

This file keeps the original handoff filename, but the implementation state now covers the full Phase 1-16 runway.

## Status

- Phases 1-16: complete

## Completed Phases

### Phase 1: Persistence Foundation

- SQLAlchemy database plumbing added
- models and repository seams added
- runtime config wired for PostgreSQL and storage paths

### Phase 2: Client and Auth Persistence Cutover

- users moved from `store.py` to PostgreSQL
- client CRUD moved from `store.py` to PostgreSQL
- admin user CRUD moved to PostgreSQL
- login/logout/current-user routes cut over to repository-backed auth

### Phase 3: Workflow Persistence

- `GET /clients/{client_reference}/workflow`
- `PUT /clients/{client_reference}/workflow`
- workflow fields persisted across fact find, statement, terms, employment, and protection tables

### Phase 4: Files and Client Folders

- file uploads stored on disk under client folders
- file metadata persisted in PostgreSQL
- backend file list/download APIs live
- frontend Files tab uses real backend APIs

### Phase 5: Generated Documents and Artifacts

- generated document metadata persisted in PostgreSQL
- preview HTML snapshots persisted
- PDF/DOCX artifact upload and download live
- frontend generated-doc history uses backend data

### Phase 6: Audit Logging

- key write actions persist audit rows in PostgreSQL
- admin audit log route reads from PostgreSQL

### Phase 7: Backups

- backup runs persisted in PostgreSQL
- manifest artifacts written to disk
- admin backup list/create routes cut over

### Phase 8: Remote-Access Runtime Wiring

- health/readiness endpoints expanded
- cookie/CORS/runtime remote-access settings added
- startup validation and storage checks added

### Phase 9: Backup Dump and Restore Foundations

- `pg_dump` integration added when configured
- restore validation and dry-run services added
- restore attempt persistence added

### Phase 10: Restore Execution

- explicit restore execution endpoint added
- confirmation gate enforced
- restore failures persisted and surfaced correctly

### Phase 11: Backup Scheduling

- lightweight scheduler service added
- startup/shutdown scheduler wiring added
- schedule status endpoint added

### Phase 12: Document Pack ZIP Download

- `GET /clients/{client_reference}/documents/pack` added
- both PDF and DOCX artifacts included when present
- duplicate ZIP names deduplicated with suffixes

### Phase 13: File and Document Deletion

- `DELETE /clients/{client_reference}/files/{file_id}`
- `DELETE /clients/{client_reference}/documents/{document_id}`
- DB rows and disk artifacts deleted together
- audit entries created for deletions

### Phase 14: PostgreSQL Session Persistence

- `sessions` table added
- cookie now carries exact `session_id`
- login creates a persisted session row
- logout invalidates only the calling session row

### Phase 15: Remove Frontend localStorage As Source of Truth

- workflow/client persistence no longer uses `localStorage`
- generated-document view no longer falls back to browser-persisted state
- backend is the authority for workflow, files, and generated history

### Phase 16: Cloudflare Tunnel Automation

- `infra/cloudflared/config.yaml.example` added
- `infra/cloudflared/setup-tunnel.sh` added
- `infra/docker/compose.yaml` includes cloudflared sidecar guidance
- `.gitignore` protects tunnel credentials and generated config

## Current Source of Truth

### PostgreSQL

- users
- clients
- dependants
- workflow tables
- file metadata
- generated document metadata
- preview snapshots
- audit logs
- backup runs
- restore attempts
- sessions

### Disk

- uploaded client files
- exported PDF/DOCX artifacts
- backup manifests
- optional database dump artifacts

### Cookie Session

- `session_id`
- `user_email`
- `last_seen_at`

## Remaining Gaps

- ~~session cleanup exists but is not yet wired into automatic expiry cleanup~~ → session cleanup runs on startup
- restore workflow still needs broader operator hardening
- document pack excludes preview-only rows with no stored artifact
- no frontend delete UI for files/documents
- Cloudflare Tunnel setup is automated, but deployment remains operator-run

## Post-Fix Security & Operations (2026-06)

After code-review fix pass:
- Client GET routes now require authentication
- Hardcoded demo credentials removed from shipped frontend
- CSRF origin/referer validation added for state-changing routes
- File upload size limit enforced (MAX_UPLOAD_SIZE_BYTES, default 50MB)
- Failed login audit logging and rate limiting added (5/minute per IP)
- Session timestamp parsing hardened against malformed values
- Migration runner: `python -m app.migrate [--status|--dry-run|--force]`
- Docker Compose health checks and restart policies added
- PostgreSQL port bound to 127.0.0.1 in Docker Compose
- Security summary now reflects live configuration

## Verification Baseline

Backend:

```powershell
cd "apps/api"
.\.venv\Scripts\python -m unittest discover -s tests
```

Frontend:

```powershell
cd "apps/frontend"
npx.cmd tsc --noEmit
```
