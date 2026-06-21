# Omega Persistence and Infrastructure Delivery Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace seeded and browser-backed state with durable PostgreSQL and filesystem persistence, then add audit, backup, and protected remote-access infrastructure in small shippable phases.

**Architecture:** FastAPI remains the backend entry point, PostgreSQL becomes the source of truth for structured data, and the local filesystem under configured storage roots holds uploaded files, exported documents, and backup artifacts. Existing cookie-session auth, `client_reference` public identifiers, and current user-facing route structure stay in place unless a phase explicitly adds a new endpoint.

**Tech Stack:** FastAPI, Python, SQLAlchemy, PostgreSQL, React, TypeScript, local Windows-first filesystem storage, Docker Compose.

## Global Constraints

- Keep changes small and surgical.
- Match `AGENTS.md`.
- Prefer production-shaped code over demo shortcuts where feasible.
- Use the smallest relevant verification command after each slice.
- Preserve current route contracts unless a phase explicitly adds endpoints.
- PostgreSQL is the source of truth for structured data.
- `FILE_STORAGE_PATH` stores uploaded and exported binary files.
- `BACKUP_PATH` stores backup artifacts.
- Cookie-session auth remains in place.
- `client_reference` remains the public identifier.
- Remote access stays disabled by default and only becomes available behind VPN or Cloudflare Tunnel with HTTPS protection.

---

## Phase 1: Persistence Foundation

**Goal:** Add runtime database plumbing, models, and repository seams without changing visible app behavior.

**Scope**
- Add SQLAlchemy engine, session factory, and request-safe session access in `apps/api/app/`.
- Add model definitions matching the current MVP schema tables already present in `apps/api/migrations/0001_initial.sql`.
- Add repository modules so API routes can be rewired away from `store.py`.
- Extend migrations for runtime gaps that are already known:
  - `backup_runs` table
  - durable document snapshot/content fields needed for generated history
- Keep frontend and current route behavior unchanged in this phase.

**Key changes**
- Backend: database bootstrap, models, repositories, migration follow-up.
- Frontend: none.
- Infrastructure: ensure env/config reads `DATABASE_URL` consistently.

**Dependencies**
- None.

**Acceptance criteria**
- Backend can start with a real PostgreSQL connection.
- SQLAlchemy models cover the MVP schema used by later phases.
- Repository interfaces exist for users, clients, workflows, files, documents, audit logs, and backups.
- No runtime feature cutover happens yet.

**Verification**
- `cd "apps/api"; .\.venv\Scripts\python -m unittest discover -s tests`

## Phase 2: Client and Auth Persistence Cutover

**Goal:** Move users and clients from seeded in-memory data to PostgreSQL-backed repositories.

**Scope**
- Replace `store.py` as the source of truth for:
  - login user lookup
  - current-user fetch
  - admin user list/create/update/disable
  - client list/create/detail/update/archive
- Preserve cookie-session auth and do not add a session table.
- Add bootstrap seeding for initial admin and staff accounts if they do not exist.

**Key changes**
- Backend: route/service cutover for `/auth/*`, `/admin/users`, and `/clients*`.
- Frontend: no contract changes expected.
- Infrastructure: optional startup/bootstrap step for default users.

**Dependencies**
- Requires Phase 1 database/session/model/repository foundation.

**Acceptance criteria**
- Users and clients persist across app restarts.
- Existing auth and client flows continue working from the frontend.
- `store.py` is no longer authoritative for users or clients.

**Verification**
- `cd "apps/api"; .\.venv\Scripts\python -m unittest discover -s tests`
- `cd "apps/frontend"; npm.cmd test`

## Phase 3: Workflow Persistence

**Goal:** Move Income Protection workflow state out of browser storage and into backend persistence.

**Scope**
- Add backend workflow endpoints:
  - `GET /clients/{client_reference}/workflow`
  - `PUT /clients/{client_reference}/workflow`
- Persist:
  - Fact Find
  - Terms of Business
  - Statement of Suitability
- Update frontend state loading/saving in the shared client data layer and workflow page.
- Keep manual save behavior; autosave remains out of scope.

**Key changes**
- Backend: workflow aggregation service over normalized workflow tables.
- Frontend: replace `localStorage` as the source of truth for workflow drafts.
- Infrastructure: none.

**Dependencies**
- Requires Phase 2 client persistence.

**Acceptance criteria**
- Workflow changes survive reload, logout, and browser change.
- Fact Find, Terms of Business, and Statement of Suitability all load from the backend.
- Browser storage is no longer authoritative for workflow state.

**Verification**
- `cd "apps/api"; .\.venv\Scripts\python -m unittest discover -s tests`
- `cd "apps/frontend"; npm.cmd test`

## Phase 4: File Uploads and Client Folders

**Goal:** Replace placeholder file tracking with real uploads, downloads, and per-client folder management.

**Scope**
- Add a storage service rooted at `FILE_STORAGE_PATH`.
- Create stable client folders using `client_reference` and the existing client slug helper.
- Add endpoints:
  - `POST /clients/{client_reference}/files`
  - `GET /clients/{client_reference}/files`
  - `GET /clients/{client_reference}/files/{file_id}/download`
- Persist file metadata in PostgreSQL.
- Replace placeholder frontend upload behavior with real multipart upload flows.

**Key changes**
- Backend: filesystem write/read service plus file repository/API.
- Frontend: Files tab and client profile file areas become backend-backed.
- Infrastructure: ensure storage root exists and remains private on disk.

**Dependencies**
- Requires Phase 2 client persistence.
- Should land after Phase 3 if workflow payloads include file lists.

**Acceptance criteria**
- Uploaded files are written to disk under the configured client folder structure.
- File metadata survives restart.
- Backend download endpoints return the stored file content.

**Verification**
- `cd "apps/api"; .\.venv\Scripts\python -m unittest discover -s tests`
- `cd "apps/frontend"; npm.cmd test`

## Phase 5: Generated Document Storage and History

**Goal:** Make generated document history durable and downloadable.

**Scope**
- Keep `POST /documents/generate` for draft generation.
- Persist generated document metadata and frozen HTML snapshots used for preview/export history.
- Add endpoints:
  - `GET /clients/{client_reference}/documents`
  - `POST /clients/{client_reference}/documents`
  - `GET /clients/{client_reference}/documents/{document_id}/download`
- Store exported PDF and DOCX files on disk.
- Update frontend export registration so generated history is backend-backed.

**Key changes**
- Backend: document repository, durable snapshot fields, download handlers.
- Frontend: export flow posts completed document metadata and binary artifacts to the backend.
- Infrastructure: document storage stays under the server filesystem, not browser state.

**Dependencies**
- Requires Phase 3 workflow persistence.
- Benefits from Phase 4 file/folder storage patterns.

**Acceptance criteria**
- Generated document history is database-backed.
- Frozen HTML snapshots can be reopened after restart.
- Exported PDF and DOCX artifacts can be downloaded later.

**Verification**
- `cd "apps/api"; .\.venv\Scripts\python -m unittest discover -s tests`
- `cd "apps/frontend"; npm.cmd test`

## Phase 6: Audit Logging

**Goal:** Replace seeded audit log data with durable audit logging for mutating actions.

**Scope**
- Add a centralized audit logging service.
- Record audit rows for:
  - client create/update/archive
  - workflow save
  - file upload and download, plus delete if implemented
  - document generate and document save/download
  - admin user changes
  - backup runs
- Keep `GET /admin/audit-logs` but back it with PostgreSQL.

**Key changes**
- Backend: mutation-side audit logging and repository-backed audit list API.
- Frontend: Admin page consumes real audit rows without seeded placeholders.
- Infrastructure: none.

**Dependencies**
- Requires Phases 2 through 5 so the main persisted mutations exist.

**Acceptance criteria**
- New workflow, file, document, client, and admin mutations create audit rows.
- Audit log entries survive restart.
- Admin page shows real activity rather than seeded entries.

**Verification**
- `cd "apps/api"; .\.venv\Scripts\python -m unittest discover -s tests`
- `cd "apps/frontend"; npm.cmd test`

## Phase 7: Backups

**Goal:** Replace placeholder backup status with real backup artifacts and persisted run history.

**Scope**
- Implement a backup service that:
  - creates a PostgreSQL dump
  - archives client files
  - archives generated documents
- Persist each run in `backup_runs`.
- Keep `POST /admin/backups/run` and add `GET /admin/backups` only if history beyond the latest run is needed by the UI.
- Write artifacts under `BACKUP_PATH`.

**Key changes**
- Backend: real backup orchestration, status recording, and artifact path persistence.
- Frontend: Admin backup panel shows live results instead of fixed placeholders.
- Infrastructure: storage permissions and backup artifact layout under the configured backup root.

**Dependencies**
- Requires Phases 4 and 5 so file/document artifacts exist.
- Should land after Phase 6 so backup runs are audited from day one.

**Acceptance criteria**
- Manual backup creates real files on disk.
- Success and failure states are persisted.
- Admin UI can show the latest real backup result.

**Verification**
- `cd "apps/api"; .\.venv\Scripts\python -m unittest discover -s tests`
- `cd "apps/frontend"; npm.cmd test`

## Phase 8: Remote-Access Infrastructure

**Goal:** Add protected remote access as an infrastructure profile without weakening the local-first app posture.

**Scope**
- Keep the default deployment mode office-local only.
- Add infrastructure wiring and documentation for remote access behind:
  - Cloudflare Tunnel with Access, or
  - VPN-based protected access
- Keep public app ports closed.
- Avoid coupling remote-access setup to application persistence code.

**Key changes**
- Backend: none unless a minimal health/config surface is strictly required.
- Frontend: none.
- Infrastructure: Docker, host, and deployment configuration for protected HTTPS access.

**Dependencies**
- Independent of application persistence, but safest after Phases 1 through 7 are stable.

**Acceptance criteria**
- Remote access can be enabled intentionally through infrastructure configuration.
- Default deployment remains local-only.
- No direct public exposure is introduced.

**Verification**
- Validate the deployment profile and protected access path in the chosen infrastructure environment.

## Cross-Phase Constraints

- Do not redesign auth into server-side session storage unless a separate spec requires it.
- Do not add autosave while moving workflow persistence.
- Do not expose server filesystem paths directly to the client.
- Keep backward-compatible route behavior wherever a dedicated new endpoint is not required.
- Prefer repository and service seams over route-local persistence logic.

## Ordered Execution Notes for Future Agents

1. Complete one phase end-to-end before starting the next.
2. Update tests in the same phase that changes the behavior.
3. Remove seeded placeholders only after the persistent replacement is live.
4. Keep diffs small; avoid refactoring unrelated frontend or backend modules.
5. Re-read `AGENTS.md`, `.ai-codex/index.md`, and the relevant scope file before each phase implementation.

## Out of Scope

- Autosave timers
- Scheduled backups
- Public internet exposure
- Session-table redesign
