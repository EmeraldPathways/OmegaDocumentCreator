# Omega Frontend/Workflow Handoff

## Goal

The next agent should stop treating the app as a shell-only prototype and start wiring the current frontend workflow into real application behavior.

The immediate objective is:

- keep the current frontend navigation and workflow shape intact
- preserve `/income-protection` as the stable workflow route
- preserve the client-owned case-file model
- move the app from browser-only localStorage persistence toward real backend/file/document behavior

## What Exists Now

### Frontend model

The app is no longer at Stage 4 shell state.

Current frontend behavior already includes:

- top navigation only
- no dashboard-first workflow
- no top-level Documents navigation
- `Admin` visible only when signed in as admin
- `/income-protection` as the main module route
- client selection inside the Income Protection page using:
  - search field
  - dropdown
  - `Add Client`
- client documents and files managed inside the client record page
- local persisted client/session/settings state using browser storage

### Current route shape

- `/`
  - redirects to `/income-protection`
- `/login`
- `/clients`
- `/clients/new`
- `/clients/:clientReference`
- `/clients/:clientReference/edit`
- `/clients/:clientReference/income-protection`
  - stores selected client for the workflow, then redirects to `/income-protection`
- `/income-protection`
  - the real workflow route
- `/files`
- `/settings`
- `/admin`
  - admin-only
- `/documents`
  - redirects to `/clients`
- `/documents/:clientReference`
  - redirects to `/clients/:clientReference`

### Current frontend persistence

Persistence is currently browser-local only:

- session data in `sessionStorage`
- client records in `localStorage`
- selected Income Protection client in `localStorage`
- app settings in `localStorage`

This is useful for UI behavior, but it is not production persistence.

### Current workflow coverage

The Income Protection workflow already has:

- `Client Details`
- `Fact Find`
- `Terms of Business`
- `Statement of Suitability`
- `Files`
- `Generated Documents`

Current actions already exist in the UI:

- save client details
- save fact find draft
- generate fact find DOCX/PDF placeholder records
- save terms draft
- generate terms PDF placeholder records
- mark terms issued
- save statement draft
- generate statement DOCX/PDF placeholder records
- upload file placeholder record
- download individual generated document placeholder file
- download document pack placeholder status

### Current client record behavior

The client page is now the case file.

It contains:

- client summary
- dependants
- editable generated document rows
- editable file rows
- row-level `Open` buttons
- inline preview panel for the selected document/file

## What Is Still Missing

The biggest gap is no longer tab layout. It is real persistence and document/file execution.

Still missing:

- backend-backed client persistence
- backend-backed Income Protection workflow persistence
- PostgreSQL repositories/models wired to runtime
- real file upload endpoints and filesystem writes
- real client folder creation/management
- real document generation pipeline
- real generated-document download files
- real document pack ZIP generation
- real audit logging on workflow actions
- real settings persistence on the backend
- real authentication/authorization integration in the frontend

## Recommended Next Slice

The next agent should implement the smallest end-to-end production-shaped vertical slice, not another UI-only scaffold.

### Recommended order

1. Wire client persistence to the backend

- replace browser-only client storage with API-backed load/save
- keep the current frontend screens and fields
- preserve client reference based routing and client-owned document model

2. Add real file/document backend models around the existing client file structure

- use the Stage 10 schema as the basis
- create runtime repositories for:
  - clients
  - files
  - documents
- do not redesign the frontend first

3. Implement a real first document action

Recommended first real generation target:

- Statement of Suitability PDF or DOCX

Why:

- the UI already has the shape
- the document naming convention is defined
- it exercises client data reuse, document history, file linkage, and download flow in one slice

4. Wire client-page document/file actions to the real backend

- `Open`
- `Download`
- generated history
- client folder linkage

## Concrete Scope For The Next Agent

If choosing one contained slice, the recommended slice is:

### Slice: Real generated document persistence for one workflow

Implement:

- backend document record creation
- filesystem save into client folder
- client page reflects saved generated documents from backend
- Generated Documents tab downloads a real file from backend
- audit log entry for generation/download

Suggested first target:

- Statement of Suitability PDF or DOCX

## Non-Goals For The Next Agent

Do not do all of these at once:

- complete every document workflow end to end
- redesign navigation again
- add AI features
- rewrite the whole frontend state model in one pass
- replace all local UI persistence at once without a narrow backend slice
- build Cloudflare or remote infrastructure

## Architectural Decisions To Preserve

- `Income Protection` stays on `/income-protection`
- client selection happens inside the page, not in the workflow URL
- the client record is the primary case-file surface
- documents/files belong inside the client record
- no top-level Documents navigation
- `Admin` only appears for admin session state
- keep the current burgundy/grey/white office UI direction
- avoid broad rewrites; keep changes surgical

## Relevant Files

### Frontend

- `apps/frontend/src/App.tsx`
- `apps/frontend/src/components/app-shell.tsx`
- `apps/frontend/src/auth/auth-context.tsx`
- `apps/frontend/src/data/client-data-context.tsx`
- `apps/frontend/src/data/seeded-clients.ts`
- `apps/frontend/src/pages/clients-page.tsx`
- `apps/frontend/src/pages/client-form-page.tsx`
- `apps/frontend/src/pages/client-profile-page.tsx`
- `apps/frontend/src/pages/income-protection-page.tsx`
- `apps/frontend/src/pages/settings-page.tsx`
- `apps/frontend/src/styles.css`
- `apps/frontend/src/app.test.tsx`

### Backend

- `apps/api/app/main.py`
- `apps/api/app/store.py`
- `apps/api/app/config.py`
- `apps/api/app/security.py`
- `apps/api/migrations/0001_initial.sql`
- `apps/api/tests/test_api.py`
- `apps/api/tests/test_migration_schema.py`

### Project docs

- `PROJECT.md`
- `AGENTS.md`
- `STAGE4_HANDOFF.md`

## Suggested Verification

Frontend:

```powershell
cd "D:\GOOGLE DRIVE\EMERALD PATHWAYS\WEB WORK\AI CODING\VS CODE\work\Omega Document Creator\apps\frontend"
npm.cmd test
```

Backend:

```powershell
cd "D:\GOOGLE DRIVE\EMERALD PATHWAYS\WEB WORK\AI CODING\VS CODE\work\Omega Document Creator\apps\api"
.\.venv\Scripts\python -m unittest discover -s tests
```

## Expected Outcome

After the next agent pass, the repo should have at least one real backend-backed document/file workflow slice that uses the current frontend shape rather than replacing it.
