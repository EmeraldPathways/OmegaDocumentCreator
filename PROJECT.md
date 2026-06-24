# Omega Document Creator

## Overview

Omega Document Creator is an internal office web application for Omega Financial Management.

The live implementation now covers:

- secure login with persisted PostgreSQL session rows
- staff/admin role separation
- PostgreSQL-backed users, clients, workflows, documents, audit logs, backups, restore attempts, and sessions
- Income Protection workflow persistence
- AI-assisted document generation with persisted preview snapshots
- durable file upload/download storage
- generated document history, artifact upload, download, pack download, and deletion
- audit logging for key write actions
- backup manifest creation, restore validation, dry-run, execution, and scheduler wiring
- remote-access automation guidance via Cloudflare Tunnel

## Product Scope

### Primary module

- `Income Protection`

### Main navigation

- Clients
- Income Protection
- Files
- Admin
- Settings

### Roles

#### Admin

- create, edit, disable, and manage staff accounts
- view all clients
- create, edit, and archive client records
- review audit logs
- create and review backup runs
- validate, dry-run, and execute restores
- review scheduler status
- access security summary

#### Staff

- log in securely
- create and edit client records
- complete Income Protection workflow fields
- upload, download, and delete client files
- generate AI-backed document drafts
- review and edit generated content
- export PDF and DOCX artifacts
- view and download generated document history

## Technical Direction

### Stack

- Frontend: React + TypeScript
- Backend: FastAPI + Python
- Database: PostgreSQL via SQLAlchemy
- File storage: local server filesystem
- Auth: cookie session auth plus PostgreSQL session table
- AI generation: Google Gemini with seeded fallback
- Deployment: Windows-first local scripts plus Docker Compose

## Repository Structure

```text
apps/
  api/
  frontend/
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

### Stages 1-16

Stages 1-16 are complete in the current codebase.

That includes:

- runtime PostgreSQL wiring
- SQLAlchemy models and repositories
- auth and client persistence cutover
- workflow persistence
- file upload/download storage and client folders
- generated document persistence and artifact storage
- audit logging
- backup manifests and backup history
- restore validation, dry-run, execution, and restore-attempt persistence
- backup scheduling wiring
- generated document pack ZIP download
- file and document deletion endpoints
- PostgreSQL-backed exact-row session persistence
- backend workflow persistence as the source of truth; client record cache uses `localStorage` for quick rehydration
- Cloudflare Tunnel automation and remote-access setup guidance

### Stage 17

Stage 17 is also live:

- `POST /documents/generate`
- Gemini-backed document generation
- seeded fallback when AI is unavailable
- persisted preview HTML snapshots
- frontend preview/edit/export flow

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

## Frontend Details

### Current routes

- `/`
- `/login`
- `/clients`
- `/clients/new`
- `/clients/:clientReference`
- `/clients/:clientReference/edit`
- `/clients/:clientReference/income-protection`
- `/income-protection`
- `/documents`
- `/documents/:clientReference`
- `/files`
- `/settings`
- `/admin`

### Current workflow behavior

- backend workflow persistence is authoritative
- client record cache uses `localStorage` for quick rehydration; workflow fields are backend-backed
- generated document history is backend-backed
- Files tab uses real backend upload/list/download
- Generated Documents tab uses real backend history/download/pack APIs

## Testing

### One-command validation

```powershell
.\scripts\validate.ps1
```

### Backend

```powershell
$env:PYTHONPATH="apps\api"; apps\api\.venv\Scripts\python -m pytest apps/api/tests/test_api.py -v
```

### Frontend

```powershell
Push-Location apps\frontend; node_modules\.bin\tsc.cmd --noEmit --project tsconfig.app.json
Push-Location apps\frontend; node_modules\.bin\vitest.cmd run
```

### CI

GitHub Actions (`.github/workflows/ci.yml`): backend pytest (PostgreSQL) + frontend tsc + vitest on push/PR to main.

Current results:

| Gate | Result |
|------|--------|
| Frontend TypeScript | 0 errors |
| Frontend vitest | 7 files, 80 tests, 0 failed |
| Backend (full suite) | 166 passed, 0 failed |

## Gaps Between Current Code and Final Product

The main remaining gaps are operational hardening and product polish rather than core persistence cutover:

- backup/restore operator workflow still needs broader production hardening
- ~~`cleanup_expired()` for persisted sessions is implemented but not yet wired into scheduled cleanup~~ → session cleanup runs on startup
- document pack skips preview-only documents that have no stored artifact files
- Cloudflare Tunnel automation is documented and scripted, but deployment remains operator-driven
- `income-protection-page.tsx` partially decomposed (helpers + Files tab + Generated Documents tab extracted into colocated modules, 2,178 lines); workflow tabs still inline — deeper decomposition deferred

## Post-Fix Security & Operations Improvements (2026-06)

- All client GET routes now require authentication (`_current_user` guard)
- Hardcoded demo credentials removed from shipped frontend JavaScript
- CSRF protection added — same-origin Origin/Referer validation for state-changing routes
- File upload size limit enforced (MAX_UPLOAD_SIZE_BYTES, default 50MB)
- Session cleanup runs on startup via `SessionRepository.cleanup_expired()`
- Failed login attempts now audited and rate-limited (5/minute per IP)
- Session timestamp parsing hardened (malformed timestamps treated as expired)
- Migration runner available: `python -m app.migrate [--status|--dry-run|--force]`
- Docker Compose includes health checks and restart policies for all services
- PostgreSQL port bound to localhost only in Docker Compose
- Security summary endpoint now reflects live configuration instead of static template

## Delivery Plan

The original persistence roadmap is complete. Any next roadmap should be framed as post-cutover hardening and UX follow-up rather than core Phase 1-16 implementation.

## Constraints

- Keep changes small and surgical
- Match `AGENTS.md`
- Prefer production-shaped code over demo shortcuts
- Use the smallest relevant verification command after each slice
- Use `apply_patch` for manual edits

## Environment

Important variables:

- `DATABASE_URL`
- `FILE_STORAGE_PATH`
- `BACKUP_PATH`
- `SESSION_SECRET`
- `SESSION_TIMEOUT_MINUTES`
- `COOKIE_SECURE`
- `COOKIE_SAMESITE`
- `ENVIRONMENT`
- `REMOTE_ACCESS_MODE`
- `CORS_ORIGINS`
- `TRUSTED_PROXY_COUNT`
- `PG_DUMP_BIN`
- `PG_RESTORE_BIN`
- `BACKUP_SCHEDULE_ENABLED`
- `BACKUP_SCHEDULE_INTERVAL_MINUTES`
- `AI_ENABLED`
- `AI_PROVIDER`
- `AI_API_KEY`
- `AI_MODEL`
- `AI_TEMPERATURE`

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
- `apps/api/tests/test_backup_restore.py`

Frontend:

- `apps/frontend/src/App.tsx`
- `apps/frontend/src/auth/auth-context.tsx`
- `apps/frontend/src/data/client-data-context.tsx`
- `apps/frontend/src/data/file-api.ts`
- `apps/frontend/src/data/workflow-api.ts`
- `apps/frontend/src/documents/generated-document-api.ts`
- `apps/frontend/src/pages/income-protection-page.tsx`
- `apps/frontend/src/pages/admin-page.tsx`

Infrastructure:

- `infra/docker/compose.yaml`
- `infra/cloudflared/config.yaml.example`
- `infra/cloudflared/setup-tunnel.sh`

## Stage Status Summary

- Stage 1: complete
- Stage 2: complete
- Stage 3: complete
- Stage 4: complete
- Stage 5: complete
- Stage 6: complete
- Stage 7: complete
- Stage 8: complete
- Stage 9: complete
- Stage 10: complete
- Stage 11: complete
- Stage 12: complete
- Stage 13: complete
- Stage 14: complete
- Stage 15: complete
- Stage 16: complete
- Stage 17: complete
- Stage 18: complete
- Stage 19: complete
- Stage 20: complete
- Stage 21: complete
- Stage 22: complete
- Stage 23: complete (admin-audit-only pass; frontend decomposition deferred)
- Stage 24: complete (helper extraction delivered; `income-protection-helpers.tsx` is 282 lines)
- Stage 25: complete (Files + Generated Documents tabs extracted into colocated components)
