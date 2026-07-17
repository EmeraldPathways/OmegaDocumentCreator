# Omega Document Creator

## Overview

Omega Document Creator is an internal office application for Omega Financial Management.

The current product is a PostgreSQL-backed React + FastAPI system for:

- authenticated client management
- shared fact-find capture
- separate Income Protection quote and statement generation
- separate Pensions quote and statement generation
- client file storage and generated document history
- admin user, audit, backup, and restore operations

This document reflects the current implementation state on Friday, July 17, 2026.

## Product Scope

### Top-level pages

- `Clients`
- `Fact Find`
- `Income Protection`
- `Pensions`
- `Files/Docs`

### Workflow rules

- `Clients` stays functionally unchanged.
- `Fact Find` is the shared information source for both downstream workflows.
- `Fact Find` contains only `Fact Find` and `Fact Find Update`.
- `Income Protection` contains only `Quote` and `Statement of Suitability`.
- `Pensions` contains only `Pensions Quote` and `Pensions Statement`.
- `Files/Docs` contains the current `Files` and `Generated Documents` workspaces.
- The current design, layout, preview flow, editor behavior, and export behavior are preserved through the split.

### Roles

#### Admin

- create, edit, and disable staff accounts
- view all clients
- create, edit, and archive client records
- review audit logs
- create and review backup runs
- validate, dry-run, and execute restores
- review scheduler and security status
- access admin-only settings

#### Staff

- log in securely
- create and edit client records
- complete shared fact-find workflow fields
- upload, download, and delete client files
- generate and edit document drafts
- export PDF and DOCX artifacts
- review generated document history

## Technical Direction

### Stack

- Frontend: React + TypeScript
- Backend: FastAPI + Python
- Database: PostgreSQL via SQLAlchemy
- File storage: local server filesystem
- Auth: cookie-session auth plus persisted PostgreSQL session rows
- AI generation: Gemini-backed generation with seeded fallback
- Deployment: Windows-first local scripts plus Docker Compose

## Repository Structure

```text
apps/
  api/
  frontend/
docs/
  superpowers/
infra/
  cloudflared/
  docker/
storage/
  clients/
  backups/
templates/
  docx/
.ai-codex/
.agent-handoff/
AGENTS.md
PROJECT.md
phases.md
```

## Current Implementation Status

### Core platform

Live in the current codebase:

- PostgreSQL runtime wiring
- SQLAlchemy models and repositories
- persisted sessions in PostgreSQL
- authenticated client CRUD
- workflow persistence
- backend-backed file upload/list/download/delete
- backend-backed generated document history, artifact upload, download, pack download, and deletion
- audit logging
- backup manifests, restore validation, dry-run, execution, and restore-attempt persistence
- backup scheduler wiring
- Cloudflare Tunnel setup guidance and automation scripts

### Current workflow split

Live in the current codebase:

- top navigation split into five primary pages
- `/fact-find` page narrowed to `Fact Find` and `Fact Find Update`
- `/income-protection` page narrowed to `Quote` and `Statement of Suitability`
- `/pensions` page narrowed to `Pensions Quote` and `Pensions Statement`
- `/files-docs` page narrowed to `Files` and `Generated Documents`
- legacy `/files` kept as a redirect to `/files-docs`
- root route redirects to `/fact-find`

### Current document flows

- `Fact Find` and `Fact Find Update` generate from the shared workflow draft
- Income Protection quote generation uses a local quote form and sends a Quote-specific workflow snapshot
- Income Protection statement generation uses the selected quote results and statement workflow fields
- Pensions uses its own `Pensions Quote` and `Pensions Statement` draft keys
- Pensions quote generation now builds a pensions-specific snapshot and routes to the pension integration path
- Files and generated documents remain client-scoped and backend-backed

## Backend Details

### Current auth model

Auth is cookie-session based using Starlette `SessionMiddleware` plus a persisted PostgreSQL `sessions` table.

Session keys currently used:

- `session_id`
- `user_email`
- `last_seen_at`

### Current API surface

Implemented:

- `GET /health`
- `GET /ready`
- `POST /auth/login`
- `POST /auth/logout`
- `GET /auth/me`
- `GET /clients`
- `POST /clients`
- `GET /clients/{client_reference}`
- `PATCH /clients/{client_reference}`
- `PATCH /clients/{client_reference}/archive`
- `GET /clients/{client_reference}/workflow`
- `PUT /clients/{client_reference}/workflow`
- `POST /documents/generate`
- `POST /documents/statement-quote`
- `GET /clients/{client_reference}/documents`
- `POST /clients/{client_reference}/documents`
- `GET /clients/{client_reference}/documents/{document_id}/download`
- `GET /clients/{client_reference}/documents/pack`
- `DELETE /clients/{client_reference}/documents/{document_id}`
- `POST /clients/{client_reference}/files`
- `GET /clients/{client_reference}/files`
- `GET /clients/{client_reference}/files/{file_id}/download`
- `DELETE /clients/{client_reference}/files/{file_id}`
- `GET /admin/users`
- `POST /admin/users`
- `PATCH /admin/users/{user_id}`
- `GET /admin/backups`
- `POST /admin/backups`
- `POST /admin/backups/{backup_id}/validate-restore`
- `POST /admin/backups/{backup_id}/dry-run-restore`
- `POST /admin/backups/{backup_id}/restore`
- `GET /admin/backups/{backup_id}/restore-attempts`
- `GET /admin/backups/schedule-status`
- `GET /admin/audit-logs`
- `GET /admin/security-summary`

### Integration behavior

- PHI quote requests are supported through the BestAdvice PHI endpoint
- pensions quote requests are supported through the BestAdvice pension calculator endpoint
- statement quote requests are routed through `/documents/statement-quote`
- pensions snapshots are detected and routed to the pensions request builder instead of the PHI request builder

## Frontend Details

### Current routes

- `/`
- `/login`
- `/clients`
- `/clients/new`
- `/clients/:clientReference`
- `/clients/:clientReference/edit`
- `/clients/:clientReference/income-protection`
- `/fact-find`
- `/income-protection`
- `/pensions`
- `/files-docs`
- `/documents`
- `/documents/:clientReference`
- `/files`
- `/settings`
- `/admin`

### Current workflow behavior

- backend workflow persistence is authoritative
- client record cache uses `localStorage` for quick rehydration
- generated document history is backend-backed
- `Fact Find` and `Fact Find Update` are generated from the shared draft
- Income Protection quote generation uses Quote-tab-local inputs rather than shared fact-find quote fields
- Pensions quote generation uses a pensions-specific quote form with its own request shape
- `Files/Docs` reuses the existing upload, list, preview, pack, and export surfaces under its own route
- the shared workflow shell preserves the current layout while constraining visible tabs per page

### Current document types

- `Fact Find`
- `Fact Find Update`
- `Terms of Business`
- `Statement of Suitability`
- `Quote`
- `Pensions Statement`
- `Pensions Quote`

## Security And Operations

Current hardening in the codebase includes:

- authentication required for client routes
- CSRF Origin/Referer validation for state-changing endpoints
- persisted session invalidation and startup cleanup
- failed-login auditing and rate limiting
- upload size limit via `MAX_UPLOAD_SIZE_BYTES`
- localhost-bound PostgreSQL in Docker Compose
- health checks and restart policies in Docker Compose
- migration runner via `python -m app.migrate`

## Testing

### Focused commands in active use

Backend:

```powershell
cd apps/api
.venv\Scripts\python.exe -m unittest tests.test_pension_quote_unit
```

Frontend:

```powershell
cd apps/frontend
npm.cmd test -- --no-cache src/app.test.tsx
npx.cmd tsc --noEmit --project tsconfig.app.json
```

### Current verification snapshot

Confirmed during the current workflow split work:

- focused pensions backend quote-routing test passes
- focused frontend route/workflow split test file passes
- frontend TypeScript check passes

This file does not claim a fresh full-suite verification beyond those focused checks.

## Open Gaps

The main remaining work is follow-up and hardening rather than foundational platform build-out:

- broader regression coverage beyond the focused route and pensions quote checks
- possible additional seeded-profile defaults or preview assertions for the split flows
- further decomposition of the large shared workflow page if the current inline complexity becomes a maintenance burden
- operational deployment remains operator-driven even though Docker and Cloudflare Tunnel support are in place

## Environment

Important variables:

- `DATABASE_URL`
- `TEST_DATABASE_URL`
- `FILE_STORAGE_PATH`
- `BACKUP_PATH`
- `SESSION_SECRET`
- `SESSION_TIMEOUT_MINUTES`
- `COOKIE_SECURE`
- `COOKIE_SAMESITE`
- `APP_URL`
- `ENVIRONMENT`
- `REMOTE_ACCESS_MODE`
- `CORS_ORIGINS`
- `TRUSTED_PROXY_COUNT`
- `CSRF_TRUSTED_ORIGINS`
- `PDF_CONVERTER_BIN`
- `PG_DUMP_BIN`
- `PG_RESTORE_BIN`
- `MAX_UPLOAD_SIZE_BYTES`
- `BACKUP_SCHEDULE_ENABLED`
- `BACKUP_SCHEDULE_INTERVAL_MINUTES`
- `LOCAL_AI_ENABLED`
- `LOCAL_AI_PROVIDER`
- `LOCAL_AI_MODEL`
- `LOCAL_AI_EMBEDDING_MODEL`
- `AI_ENABLED`
- `AI_PROVIDER`
- `AI_API_KEY`
- `GEMINI_API_KEY`
- `AI_MODEL`
- `AI_TEMPERATURE`
- `PHI_ENDPOINT_URL`
- `PHI_USERNAME`
- `PHI_PASSWORD`
- `PHI_REQUEST_FROM`
- `PHI_REQUEST_FROM_CODE`
- `PENSION_ENDPOINT_URL`
- `PENSION_REQUEST_FROM`
- `PENSION_REQUEST_FROM_CODE`

## Important Files

Backend:

- `apps/api/app/main.py`
- `apps/api/app/config.py`
- `apps/api/app/models.py`
- `apps/api/app/db.py`
- `apps/api/app/document_generation.py`
- `apps/api/app/repositories/`
- `apps/api/app/services/`
- `apps/api/migrations/`
- `apps/api/tests/test_api.py`
- `apps/api/tests/test_pension_quote_unit.py`

Frontend:

- `apps/frontend/src/App.tsx`
- `apps/frontend/src/components/app-shell.tsx`
- `apps/frontend/src/auth/auth-context.tsx`
- `apps/frontend/src/data/client-data-context.tsx`
- `apps/frontend/src/data/file-api.ts`
- `apps/frontend/src/data/workflow-api.ts`
- `apps/frontend/src/documents/generated-document-api.ts`
- `apps/frontend/src/pages/fact-find-page.tsx`
- `apps/frontend/src/pages/income-protection-documents-page.tsx`
- `apps/frontend/src/pages/pensions-page.tsx`
- `apps/frontend/src/pages/files-docs-page.tsx`
- `apps/frontend/src/pages/income-protection-page.tsx`
- `apps/frontend/src/pages/admin-page.tsx`

Infrastructure:

- `run-omega.cmd`
- `apps/frontend/run-frontend.cmd`
- `apps/api/run-api.cmd`
- `infra/docker/compose.yaml`
- `infra/cloudflared/config.yaml.example`
- `infra/cloudflared/setup-tunnel.sh`
