# Omega Document Creator

## Overview

Omega Document Creator is a secure internal office web application for Omega Financial Management.

It is intended to run on a Windows-based office server and be accessed by office staff over the local network through a browser. Remote access is a later concern and must only be introduced behind a protected HTTPS setup such as VPN or Cloudflare Tunnel.

Version 1 is an internal office workflow tool for:

- secure login
- staff/admin role separation
- client record management
- Income Protection workflows
- document generation
- local file storage
- audit logging
- backups

AI is explicitly out of scope for version 1.

## Product Scope

### Primary module

The first core module is:

- `Income Protection`

### Main navigation

- Dashboard
- Clients
- Income Protection
- Documents
- Files
- Admin
- Settings

### Roles

#### Admin

- create, edit, disable, and delete staff accounts
- view all clients
- create, edit, and archive client records
- manage document templates
- generate Word and PDF documents
- view audit logs
- manage backup settings

#### Staff

- log in securely
- create and edit client records
- complete Income Protection forms
- upload client files
- generate Word and PDF documents
- view client records and files they are permitted to access

## Technical Direction

### Stack

- Frontend: React + TypeScript
- Backend: FastAPI + Python
- Database: PostgreSQL
- File storage: local server filesystem
- Auth: server-side cookie session auth
- Document generation: DOCX template based
- PDF generation: server-side DOCX-to-PDF
- Deployment: Docker Compose

### Design direction

- Omega-style burgundy, grey, and white
- left sidebar navigation
- top client search
- clear page headings
- large action buttons
- office-friendly, non-flashy UI

## Repository Structure

```text
apps/
  api/
  frontend/
infra/
  docker/
storage/
  clients/
  backups/
templates/
  docx/
AGENTS.md
PROJECT.md
STAGE4_HANDOFF.md
```

## Current Implementation Status

### Stage 1

Implemented in scaffold form:

- frontend app scaffold
- backend API scaffold
- Docker Compose file
- local storage directories
- env template
- migration stub
- seed data
- dashboard page
- client list page
- client profile page

### Stage 2

Implemented in the current in-memory scaffold:

- login endpoint
- logout endpoint
- current user endpoint
- admin-only user listing
- admin user creation
- admin user update
- admin user disable
- password hashing using PBKDF2
- password verification
- session last-seen tracking
- session timeout checks
- disabled-user login blocking

Important note:

- Stage 2 is logically implemented, but persistence is still in-memory.
- PostgreSQL-backed users and sessions are not implemented yet.

### Stage 3

Implemented in the current in-memory scaffold:

- client list endpoint
- client detail endpoint
- client create endpoint
- client update endpoint
- client archive endpoint
- client list page
- client profile page
- client create page
- client edit page

Important note:

- Stage 3 is also currently in-memory.
- The current client schema covers the main profile fields needed for the scaffold, but not the full final production schema from the spec.

### Stage 4

Implemented in the current frontend scaffold:

- client-bound Income Protection route
- Income Protection module shell page
- shared seeded client summary data reused across module views
- tab structure for:
  - Client Details
  - Fact Find
  - Terms of Business
  - Statement of Suitability
  - Files
  - Generated Documents
- placeholder tab panels for later workflow stages

Important note:

- Stage 4 is currently frontend-only scaffold work.
- Fact Find, Terms of Business, Statement of Suitability, files, and generated documents are still placeholders at this stage.

### Stages 5 to 17

Stage 5 has now started in scaffold form:

- Fact Find tab renders a first draft UI inside the Income Protection module
- shared client values prefill the first Personal Details, Employment Details, and Income Protection fields
- in-session Save Draft status is visible in the Fact Find view
- remaining Fact Find sections are listed for later Stage 5 slices

Important note:

- Stage 5 is only partially started in the frontend scaffold.
- autosave, validation, persistence, document generation, and full section coverage are not implemented yet.

Stage 6 has now started in scaffold form:

- Terms of Business tab renders a draft tracking view
- seeded values cover version, issued-by, delivery method, and notes
- local issue status can be toggled in-session
- Terms PDF generation is still a placeholder action

Stage 7 has now started in scaffold form:

- Statement of Suitability tab renders a draft recommendation view
- seeded values cover statement type, provider, product type, cover summary, and letter date
- local document status can be toggled for DOCX and PDF actions
- generated files and persistence are still placeholder-only

Important note:

- Stages 6 and 7 are also frontend-only scaffold work.
- real generation, file linkage, persistence, and validation are not implemented yet.

Stage 8 has now started in scaffold form:

- Files tab renders a client-files view inside the Income Protection module
- seeded client folder layout is shown for the expected local storage structure
- seeded file metadata is listed in a tracked files table
- Upload File is currently a local placeholder action with in-session status only

Important note:

- Stage 8 is currently frontend-only scaffold work.
- real uploads, local filesystem writes, folder creation, and backend file metadata persistence are not implemented yet.

Stage 9 has now started in scaffold form:

- Generated Documents tab renders a generated-history view inside the Income Protection module
- seeded generated document records are listed with type, filename, version, status, and generated date
- Download Document Pack is currently a local placeholder action with in-session status only

Important note:

- Stage 9 is currently frontend-only scaffold work.
- real DOCX/PDF generation, ZIP export, filesystem saves, backend document persistence, and audit logging are not implemented yet.

Stage 10 has now started in backend schema form:

- the initial SQL migration now defines the wider MVP table set for users, clients, dependants, employment details, protection details, life and serious illness details, fact find, terms of business, statement of suitability, files, documents, and audit logs
- foreign-key relationships and a small set of supporting indexes are included in the migration stub
- backend tests now verify that the Stage 10 table set and critical columns remain present in the migration

Important note:

- Stage 10 is currently schema-definition work only.
- the running application still uses in-memory seeded data, and these tables are not wired into repositories or runtime persistence yet.

Stage 11 has now started in frontend validation form:

- Fact Find now keeps Save Draft available while adding Generate DOCX and Generate PDF placeholder actions
- Fact Find final generation shows a missing-field checklist and blocks generation when essential fields are missing
- Statement of Suitability final generation now also shows a missing-field checklist and blocks generation when essential fields are missing
- frontend tests cover non-blocking draft save behavior and blocked final-generation behavior for incomplete seeded data

Important note:

- Stage 11 is currently frontend-only validation scaffold work.
- autosave, persistence-backed validation, and full required-field coverage across all workflow sections are not implemented yet.

Stage 12 has now started in seeded audit-log form:

- backend now exposes an admin-only `GET /admin/audit-logs` endpoint backed by seeded in-memory audit log records
- frontend Admin page now includes an Audit Logs table with seeded entries for generated documents and uploaded files
- backend and frontend tests cover the admin-only audit log surface

Important note:

- Stage 12 is currently scaffolded with seeded in-memory data only.
- comprehensive action tracking, persistence-backed audit logging, and client-specific audit history views are not implemented yet.

Stage 13 has now started in seeded backup form:

- backend now exposes an admin-only `POST /admin/backups/run` endpoint backed by an in-memory seeded backup run list
- frontend Admin page now includes a Backups panel with last successful backup details and a manual `Run Backup Now` placeholder action
- backend and frontend tests cover the admin-only backup trigger and visible backup status

Important note:

- Stage 13 is currently scaffolded with seeded in-memory backup data only.
- real PostgreSQL dumps, filesystem archive creation, scheduled backups, and persisted backup history are not implemented yet.

Stage 14 has now started in seeded security-summary form:

- backend now exposes an admin-only `GET /admin/security-summary` endpoint backed by an in-memory security summary
- frontend Admin page now includes a Security panel covering password hashing, role-based access, session timeout, private file storage, and public-port posture
- remote access guidance now explicitly recommends `Cloudflare Tunnel with Cloudflare Access` instead of exposing public ports directly
- `.env.example` now includes `REMOTE_ACCESS_MODE=local_only` to keep the default deployment posture office-local first

Important note:

- Stage 14 is currently a scaffolded security summary, not a full infrastructure lock-down implementation.
- file-upload validation, HTTPS termination, live Cloudflare tunnel creation, and complete runtime hardening are not implemented yet.

Stage 15 has now started in frontend UI form:

- dashboard homepage now presents a module roadmap strip with `Income Protection` as the active V1 module
- homepage now also reserves `Pensions` and `Investments` spaces beside the Income Protection action for planned V2 and V3 releases
- dashboard copy now distinguishes the live module from future workflow areas without exposing unfinished routes

Important note:

- Stage 15 is currently a dashboard and module-entry UI slice only.
- full UX refinement across long forms, progress indicators, autosave affordances, and broader responsive polish are not implemented yet.

Stage 16 has now started in local-AI-readiness form:

- frontend now has a real `Settings` page instead of sending `Settings` navigation back to `Login`
- Settings now documents the approved future local-AI path with AI explicitly disabled in version 1
- backend config and `.env.example` now reserve local-only AI settings for a later Ollama-based stage without enabling any AI runtime behavior

Important note:

- Stage 16 does not enable AI features in version 1.
- no model runner integration, embeddings pipeline, RAG indexing, or AI-assisted workflow actions are implemented.

## Backend Details

### Current auth model

Current auth is session-cookie based using Starlette `SessionMiddleware`.

Session keys currently used:

- `user_email`
- `last_seen_at`

### Current backend behavior

Current seeded backend behavior is provided from:

- `apps/api/app/store.py`

This file currently holds mutable seeded users and clients in process memory.

### Current security utilities

Password hashing and session timeout logic live in:

- `apps/api/app/security.py`

Current password scheme:

- PBKDF2-HMAC-SHA256 with random salt

### Current API surface

Implemented now:

- `GET /health`
- `POST /auth/login`
- `POST /auth/logout`
- `GET /auth/me`
- `GET /clients`
- `POST /clients`
- `GET /clients/{client_reference}`
- `PATCH /clients/{client_reference}`
- `PATCH /clients/{client_reference}/archive`
- `GET /admin/users`
- `GET /admin/audit-logs`
- `GET /admin/security-summary`
- `POST /admin/backups/run`
- `POST /admin/users`
- `PATCH /admin/users/{email}`
- `PATCH /admin/users/{email}/disable`

Not yet implemented:

- persistent DB-backed repositories
- files endpoints
- documents endpoints
- backup endpoints
- Income Protection endpoints

## Frontend Details

### Current routes

- `/`
- `/login`
- `/clients`
- `/clients/new`
- `/clients/:clientReference`
- `/clients/:clientReference/income-protection`
- `/clients/:clientReference/edit`
- `/admin`

### Current frontend pages

- dashboard page
- dashboard module roadmap with `Income Protection`, `Pensions`, and `Investments`
- login page
- settings page with Stage 16 AI readiness guidance
- clients page
- client profile page
- Income Protection module page
- Fact Find draft view inside the Income Protection module
- Terms of Business draft view inside the Income Protection module
- Statement of Suitability draft view inside the Income Protection module
- Client Files draft view inside the Income Protection module
- Generated Documents draft view inside the Income Protection module
- client create page
- client edit page
- admin page

### Not yet implemented

- authenticated route guards in frontend state
- API client integration
- autosave forms
- full Fact Find workflow UI
- full Terms of Business workflow UI
- full Statement of Suitability workflow UI
- full files/documents UI
- backup UI

## Testing

### Backend

Backend uses a repo-local virtual environment:

- `apps/api/.venv`

Verification command:

```powershell
cd "apps/api"
.\.venv\Scripts\python -m unittest discover -s tests
```

### Frontend

Frontend verification command:

```powershell
cd "apps/frontend"
npm.cmd test
```

### Current known warnings

Backend:

- `fastapi.testclient` currently emits a Starlette deprecation warning about `httpx`

Frontend:

- React Router future-flag warnings appear in tests

These are not blocking the current scaffold.

## Gaps Between Current Code and Final Product

The biggest remaining gaps are:

- PostgreSQL persistence is not wired into the running app
- migrations are only a stub
- no SQLAlchemy models or repositories yet
- no persisted audit logs
- no file uploads
- no client folder management
- no persisted Income Protection workflows
- no persisted Terms of Business workflow
- no persisted Statement of Suitability workflow
- no persisted file upload workflow
- no document generation
- no real backups
- no persisted generated-document history
- no live remote-access infrastructure wiring

## Immediate Priorities

The correct next implementation order is:

1. Finish Stage 3 persistence and richer client data shape
2. Build Fact Find workflow
3. Add real file uploads and client folder workflow
4. Add real generated documents and audit logging
5. Add backups

## Constraints

- Keep changes small and surgical
- Match `AGENTS.md`
- Do not introduce AI features in version 1
- Prefer production-shaped code over demo shortcuts where feasible
- Use the smallest relevant verification command after each slice
- Use `apply_patch` for manual edits

## Environment

### Current env template

Defined in:

- `.env.example`

Important variables:

- `DATABASE_URL`
- `FILE_STORAGE_PATH`
- `BACKUP_PATH`
- `SESSION_SECRET`
- `APP_URL`
- `ADMIN_EMAIL`
- `ADMIN_PASSWORD`
- `STAFF_EMAIL`
- `STAFF_PASSWORD`
- `PDF_CONVERTER_BIN`

## Important Files

Backend:

- `apps/api/app/main.py`
- `apps/api/app/store.py`
- `apps/api/app/security.py`
- `apps/api/app/config.py`
- `apps/api/tests/test_api.py`
- `apps/api/tests/test_security.py`
- `apps/api/migrations/0001_initial.sql`

Frontend:

- `apps/frontend/src/App.tsx`
- `apps/frontend/src/components/app-shell.tsx`
- `apps/frontend/src/data/seeded-clients.ts`
- `apps/frontend/src/pages/clients-page.tsx`
- `apps/frontend/src/pages/client-profile-page.tsx`
- `apps/frontend/src/pages/income-protection-page.tsx`
- `apps/frontend/src/pages/admin-page.tsx`
- `apps/frontend/src/pages/login-page.tsx`
- `apps/frontend/src/styles.css`
- `apps/frontend/src/app.test.tsx`

## Stage Status Summary

- Stage 1: scaffolded
- Stage 2: functionally scaffolded, not persistent
- Stage 3: partially scaffolded, not persistent
- Stage 4: scaffolded in frontend shell form
- Stage 5: partially scaffolded in frontend draft form
- Stage 6: partially scaffolded in frontend draft form
- Stage 7: partially scaffolded in frontend draft form
- Stage 8: partially scaffolded in frontend draft form
- Stage 9: partially scaffolded in frontend draft form
- Stage 10: schema defined, not wired into runtime persistence
- Stage 11: partially scaffolded in frontend validation form
- Stage 12: partially scaffolded with seeded audit logs
- Stage 13: partially scaffolded with seeded backups
- Stage 14: partially scaffolded with seeded security guidance
- Stage 15: partially scaffolded in frontend dashboard/UI form
- Stage 16: partially scaffolded in local-AI-readiness form
- Stage 17+: not implemented

## Handoff

For the next agent continuing beyond the Stage 4 shell, use:

- `STAGE4_HANDOFF.md`
