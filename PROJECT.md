# Omega Document Creator

## Overview

Omega Document Creator is an internal office application for Omega Financial Management.

This document reflects the current implementation state on Friday, July 31, 2026.

The live product is a PostgreSQL-backed React + FastAPI system for:

- authenticated client management
- shared fact-find capture
- separate Income Protection quote and statement generation
- separate Pensions quote and statement generation
- backend-backed file storage and generated document history
- admin user, audit, backup, restore, and settings operations

## Product Scope

### Top-level pages

- `Clients`
- `Fact Find`
- `Income Protection`
- `Pensions`
- `Files/Docs`
- `Admin`
- `Settings`

### Workflow rules

- `Fact Find` contains `Fact Find` and `Fact Find Update`.
- `Income Protection` contains `Quote` and `Statement of Suitability`.
- `Pensions` contains `Pensions Quote` and `Pensions Statement`.
- `Files/Docs` contains the shared `Files` and `Generated Documents` workspaces.
- Shared workflow data feeds downstream gates and generation flows.
- The current preview, editor, and export behavior is preserved across routes.

### Access model

- `andrew@omegafinancial.ie` has full system and admin access.
- `info@omegafinancial.ie`, `john@omegafinancial.ie`, `aideen@omegafinancial.ie`, and `aimee@omegafinancial.ie` are `manager` users and can access all client, workflow, file, and document records.
- `sophie@omegafinancial.ie`, `declan@omegafinancial.ie`, and `tadhg@omegafinancial.ie` can access records they created or are assigned to.
- `alison@omegafinancial.ie` can access records owned or assigned to John.
- `created_by` remains creator metadata.
- `assigned_to` is the primary working-owner field used across clients, workflows, files, and documents.
- `manager` is now a real persisted user role, not just a hidden backend allowlist effect.

## Technical Direction

### Stack

- Frontend: React + TypeScript
- Backend: FastAPI + Python
- Database: PostgreSQL via SQLAlchemy
- File storage: local filesystem under repo `storage/`
- Auth: cookie session auth plus persisted PostgreSQL session rows
- AI generation: Gemini-backed generation with seeded fallback
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
  backups/
  clients/
templates/
  docx/
.ai-codex/
.agent-handoff/
AGENTS.md
PROJECT.md
```

## Current Implementation Status

### Core platform

Live in the current codebase:

- PostgreSQL runtime wiring
- SQLAlchemy models and repositories
- persisted sessions in PostgreSQL
- authenticated client CRUD with assignment
- explicit `admin` / `manager` / `staff` user-role model in auth and admin UI
- backend workflow persistence
- backend-backed file upload/list/download/delete
- backend-backed generated document history, artifact upload, download, pack download, and deletion
- audit logging
- backup manifests, restore validation, restore dry-run, restore execution, and restore-attempt persistence
- backup scheduler wiring
- admin users, audit, backups, security, and settings pages wired to live backend routes

### Current route split

Live in the current codebase:

- root route redirects to `/fact-find`
- `/fact-find` serves Fact Find and Fact Find Update
- `/income-protection` serves Quote and Statement of Suitability
- `/pensions` serves Pensions Quote and Pensions Statement
- `/files-docs` serves Files and Generated Documents
- legacy `/files` redirects to `/files-docs`
- `/admin` and `/settings` require admin access

### Current document flows

- `Fact Find` and `Fact Find Update` generate from the shared workflow draft
- Income Protection quote generation uses quote-specific workflow snapshot data
- Income Protection saved quote snapshots can now be loaded and deleted from the Quote workflow
- Income Protection statement generation uses selected quote data plus shared workflow fields
- Pensions routes use pensions-specific quote and statement document types
- generated documents can be listed, downloaded, packed, and deleted from backend history

## Storage Model

### Live artifact layout

```text
storage/
  backups/
  clients/
    {Last, First - omega-00000}/
      {year}/
        {workflow}/
          files/
          documents/
```

Rules reflected in the current app:

- all client artifacts belong inside the client folder
- files and generated documents are separated by workflow and bucket
- backup artifacts stay under `storage/backups`
- legacy flat client folders and quarantine copies are cleanup targets, not the live storage design

## Backend Details

### Current auth model

Auth uses Starlette `SessionMiddleware` plus a persisted PostgreSQL `sessions` table.

Session keys currently used:

- `session_id`
- `user_email`
- `last_seen_at`

`/auth/me` validates the persisted session row and extends expiry. Disabled users cannot authenticate. Malformed password hashes fail closed.

### Current API surface

Implemented:

- `GET /health`
- `GET /ready`
- `POST /auth/login`
- `POST /auth/logout`
- `GET /auth/me`
- `GET /users/assignable`
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
- `POST /admin/users/{user_id}/reset-password`
- `PATCH /admin/users/{user_id}/disable`
- `PATCH /admin/users/{user_id}/enable`
- `GET /admin/backups`
- `POST /admin/backups`
- `POST /admin/backups/{backup_id}/validate-restore`
- `POST /admin/backups/{backup_id}/dry-run-restore`
- `POST /admin/backups/{backup_id}/restore`
- `GET /admin/backups/{backup_id}/restore-attempts`
- `GET /admin/backups/schedule-status`
- `GET /admin/audit-logs`
- `GET /admin/security-summary`
- `GET /admin/security`
- `GET /admin/settings`
- `PATCH /admin/settings`
- `POST /admin/settings/test-path`

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

### Current persistence behavior

- backend records are authoritative for clients, workflows, files, and generated documents
- client assignment is persisted server-side
- frontend uses lightweight browser storage only for session mirroring, selected client, and quick rehydration
- generated document history is backend-backed

## Security And Operations

Current hardening in the codebase includes:

- authentication required for client, workflow, file, and document routes
- server-side client access filtering and assignment enforcement
- role-driven global client visibility for `manager` users
- CSRF Origin/Referer validation for state-changing endpoints
- persisted session invalidation and startup cleanup
- failed-login, disabled-login, password-reset, and enable/disable auditing
- upload size limit via `MAX_UPLOAD_SIZE_BYTES`
- restore approval tokens for destructive restore execution
- startup configuration validation for non-development environments
- migration runner via `python -m app.migrate`

## Verification Snapshot

Verified in the current branch before this documentation refresh:

- frontend production build passed
- backend syntax parse passed for the changed auth files

The remaining non-blocking issue is a frontend bundle-size warning during build.

## Current Follow-up Areas

- further split `income-protection-page.tsx` into smaller bounded components
- keep cross-page gate mappings aligned as workflow fields move between sections
- add more operator tooling for missing-file reconciliation and cleanup reporting
- remote access remains an operator rollout task rather than a finished product feature

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
