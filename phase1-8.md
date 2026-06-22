# Omega Phases 1-8 Handoff

This file is the compact implementation handoff for the persistence and infrastructure roadmap in `docs/superpowers/plans/2026-06-21-omega-persistence-roadmap.md`.

Use it before starting the next phase so work does not repeat or regress earlier cutovers.

## Phase Status

- Phase 1: complete
- Phase 2: complete
- Phase 3: complete
- Phase 4: complete
- Phase 5: complete
- Phase 6: complete
- Phase 7: complete
- Phase 8: complete

## Phase 1: Persistence Foundation

Completed:
- Added runtime SQLAlchemy database plumbing in `apps/api/app/db.py`
- Added SQLAlchemy model coverage for the MVP schema in `apps/api/app/models.py`
- Added repository seams under `apps/api/app/repositories/`
- Wired config usage for `DATABASE_URL`
- Kept visible app behavior unchanged while persistence foundations landed

Notes:
- Cookie-session auth remains in place
- PostgreSQL is the target source of truth for structured data
- `store.py` still existed as the live source for non-cutover areas after Phase 1

## Phase 2: Client and Auth Persistence Cutover

Completed:
- Rewired auth routes in `apps/api/app/main.py` to PostgreSQL-backed repositories
- Rewired admin user CRUD to PostgreSQL-backed repositories
- Rewired client list/detail/create/update/archive to PostgreSQL-backed repositories
- Added bootstrap seeding for default admin and staff users on startup
- Preserved cookie-session auth and disabled-user login blocking
- Added DB-backed API tests and helpers in `apps/api/tests/`

Important fixes already made:
- Restored FastAPI `app.db` compatibility for the test harness
- Fixed client repository `UTC` import/runtime bug
- Kept API contracts stable while moving users and clients off in-memory seeded state

Current Phase 2 state:
- Users and clients are PostgreSQL-backed
- `store.py` is no longer authoritative for users or clients

## Phase 3: Workflow Persistence

Completed:
- Added workflow endpoints in `apps/api/app/main.py`:
  - `GET /clients/{client_reference}/workflow`
  - `PUT /clients/{client_reference}/workflow`
- Added normalized workflow persistence in `apps/api/app/repositories/workflows.py`
- Persisted workflow data across:
  - fact find
  - terms of business
  - statement of suitability
  - employment details
  - protection details
  - life / serious illness details
- Frontend workflow page now loads backend workflow data on client change
- Manual save path now writes to backend and reports backend failure honestly
- Added backend workflow persistence coverage in `apps/api/tests/test_api.py`

Important fixes already made:
- Removed conflicting workflow field ownership across tables
- Removed conditional upsert behavior that left stale rows behind on clearing
- Restored `recommendedCover` handling as free text so real advisor-facing values round-trip correctly
- Fixed frontend save handlers so they no longer claim success when backend persistence fails
- Fixed async workflow-page handler issues introduced by the save-path changes

Current Phase 3 state:
- Workflow persistence is backend-backed
- Browser/local state is still used for immediate UX, but workflow saves are no longer reported as successful if the backend write fails
- Terms of Business is persisted through the workflow endpoint even though it is not a standalone top-level route

## Phase 4: Files and Client Folders

Completed:
- Added disk-backed client storage service in `apps/api/app/services/storage.py`
- Added backend file routes in `apps/api/app/main.py`:
  - `POST /clients/{client_reference}/files`
  - `GET /clients/{client_reference}/files`
  - `GET /clients/{client_reference}/files/{file_id}/download`
- Persisted file metadata in PostgreSQL through `apps/api/app/repositories/files.py`
- Cut the frontend Files tab over to real backend upload/list/download behavior
- Added backend test coverage for file upload, listing, and download

Important fixes already made:
- File downloads now read the persisted relative file path instead of recomputing a mutable client slug
- Storage roots in config are normalized relative to the repo root
- Backend-backed file rows survive client name/detail changes without breaking download
- Removed the misleading frontend delete affordance for backend files because no delete route exists yet

Current Phase 4 state:
- Uploaded files are durable in PostgreSQL plus disk storage
- Per-client folders are created on disk under the configured storage root
- Backend file listing and download are live

## Phase 5: Generated Documents and Exported Artifacts

Completed:
- Persisted generated document metadata and preview snapshots in PostgreSQL
- Added backend document routes in `apps/api/app/main.py`:
  - `POST /documents/generate`
  - `GET /clients/{client_reference}/documents`
  - `POST /clients/{client_reference}/documents`
  - `GET /clients/{client_reference}/documents/{document_id}/download`
- Added multipart document artifact upload support for PDF and DOCX exports
- Added blob-producing frontend export helpers in:
  - `apps/frontend/src/documents/pdf-export.ts`
  - `apps/frontend/src/documents/word-export.ts`
- Rewired the frontend generated-documents flow to upload exported artifacts to the backend after local export
- Added backend tests for document persistence, artifact upload, and download

Important fixes already made:
- Document downloads now read persisted relative artifact paths from the database
- The document-create route now flushes before updating artifact paths
- The frontend no longer treats “backend returned an empty document list” as “backend unavailable”
- Fixed generated-document download button logic that was wrong because of `&&` / `||` precedence
- Preserved local export behavior while adding durable backend artifact storage

Current Phase 5 state:
- Generated document history is durable in PostgreSQL
- Exported PDF/DOCX artifacts are durable on disk and downloadable from the backend
- Preview HTML snapshots survive restarts
- Browser/local history still exists for UX, but backend history is now the durable source once loaded

## Current Source-of-Truth Boundaries (Post-Phase 8)

Structured data in PostgreSQL:
- users
- clients
- dependants
- workflow-related tables used by Phase 3
- file metadata
- generated document metadata and preview snapshots
- audit logs
- backup runs

Durable on disk:
- uploaded client files
- exported generated-document artifacts (PDF/DOCX)
- backup manifest artifacts
- per-client folder structure

Not yet implemented / partial:
- Database dump/restore (backup manifests record metadata only; no pg_dump integration)
- Backup scheduling
- Restore operations
- Session table in PostgreSQL

## Verification Baseline

Backend:
- `cd "apps/api"; .\.venv\Scripts\python -m unittest discover -s tests`

Frontend:
- `cd "apps/frontend"; npx.cmd tsc --noEmit`

Current result (post-Phase 8):
- backend test suite passes: 67 tests
