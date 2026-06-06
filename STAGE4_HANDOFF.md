# Stage 4 Handoff

## Goal

Start `Stage 4` by building the first Income Protection module shell on top of the current Stage 3 scaffold.

The next agent should deliver:

- an Income Protection area bound to a selected client
- tab navigation for:
  - Client Details
  - Fact Find
  - Terms of Business
  - Statement of Suitability
  - Files
  - Generated Documents
- shared client summary data visible in the module shell
- backend placeholder endpoints for the Stage 4 module shape if needed

Do not jump ahead into full Fact Find, Terms of Business, or Statement of Suitability implementation yet.

## Current State

### Stage 1

Scaffold exists for:

- React frontend
- FastAPI backend
- Docker Compose
- env template
- local storage folders
- initial migration stub

### Stage 2

Current in-memory scaffold supports:

- login/logout/current user endpoints
- password hashing with PBKDF2
- session timeout checks
- admin create/update/disable user flows

Important limitation:

- users and sessions are still in-memory, not PostgreSQL-backed

### Stage 3

Current in-memory scaffold now supports:

- list clients
- get client detail
- create client
- update client
- archive client
- client list page
- client profile page
- client create page
- client edit page

Current client profile fields in the scaffold include:

- name and client reference
- title
- status
- created_by and updated_by
- created_at and updated_at
- email
- mobile_number
- work_phone
- date_of_birth
- marital_status
- address basics
- partner basics
- general notes
- dependants

Important limitation:

- Stage 3 is still scaffold-level and in-memory
- the full production client schema from the spec is not complete yet

## Relevant Files

Backend:

- `apps/api/app/main.py`
- `apps/api/app/store.py`
- `apps/api/app/domain/clients.py`
- `apps/api/tests/test_api.py`

Frontend:

- `apps/frontend/src/App.tsx`
- `apps/frontend/src/components/app-shell.tsx`
- `apps/frontend/src/pages/clients-page.tsx`
- `apps/frontend/src/pages/client-profile-page.tsx`
- `apps/frontend/src/pages/client-form-page.tsx`
- `apps/frontend/src/styles.css`
- `apps/frontend/src/app.test.tsx`

Project docs:

- `PROJECT.md`
- `AGENTS.md`

## Recommended Stage 4 Slice

Implement Stage 4 as a shell only.

Suggested sequence:

1. Add an Income Protection route under a client context, for example:
   - `/clients/:clientReference/income-protection`

2. Build an Income Protection page that shows:
   - client heading
   - client status badge
   - top summary card with shared client details
   - tab bar for the six required sections

3. Start with tab content placeholders only:
   - short panel per tab
   - each panel should clearly indicate the next stage that will fill it

4. Add small frontend tests for:
   - route renders
   - tab labels render
   - selected client context appears

5. If backend support is needed for cleaner UI state, add minimal placeholder endpoints only.

## Non-Goals For The Next Agent

Do not implement yet:

- full Fact Find form
- autosave
- Terms of Business workflow
- Statement of Suitability workflow
- file upload handling
- document generation
- audit logs
- PostgreSQL persistence rewrite

## Verification

Backend:

```powershell
cd "D:\GOOGLE DRIVE\EMERALD PATHWAYS\WEB WORK\AI CODING\VS CODE\work\Omega Document Creator\apps\api"
.\.venv\Scripts\python -m unittest discover -s tests
```

Frontend:

```powershell
cd "D:\GOOGLE DRIVE\EMERALD PATHWAYS\WEB WORK\AI CODING\VS CODE\work\Omega Document Creator\apps\frontend"
npm.cmd test
```

## Expected Outcome

After the next Stage 4 pass, the repo should have a usable Income Protection module shell that:

- fits the app navigation
- is tied to a specific client
- establishes the tab structure for the later document workflows
- does not yet overbuild Stage 5 and beyond
