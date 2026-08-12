# Stage 1 Production Blockers Complete

- Date completed: 2026-08-12
- Branch used: `office-pc-stage1`
- Commit SHA at completion checkpoint: `dca007c6209def3f7e151e8b147b997bdeda29bb`
- Stage status: complete
- Next stage decision: go to Stage 2

## Scope Completed
- First-admin bootstrap from `ADMIN_EMAIL` and `ADMIN_PASSWORD`
- Forced-password-change flow from login through password update
- Session revocation after admin-triggered password reset
- Client save-status truthfulness on form persistence failures
- Dependant persistence from the client profile page
- Quote snapshot persistence truthfulness on save/load/delete flows
- Workflow autosave/manual-save queueing to avoid overlapping save races
- Quote readiness alignment with backend PHI requirements by requiring `gender`
- Restore-support position locked to offline-only outside development

## Detailed Description

### 1. First-admin bootstrap
- Before:
  - startup only logged a warning when the database had no users
  - a fresh production-style install could stop at the login screen with no valid admin account created from env
- After:
  - startup now creates exactly one first admin from `ADMIN_EMAIL` and `ADMIN_PASSWORD` when the user table is empty
  - this gives a deterministic first-login path for a clean install
- Why this mattered:
  - the office-PC install cannot depend on manual database edits or undocumented bootstrap steps

### 2. Forced-password-change flow
- Before:
  - the backend returned `force_password_change`
  - the frontend still treated the user as fully signed in
  - there was no dedicated password-change route or screen
  - a reset user could continue through normal routes without completing the forced change
- After:
  - a dedicated `/auth/change-password` backend endpoint exists
  - a dedicated frontend password-change page exists
  - route guards now redirect any `force_password_change` user to `/change-password`
  - login redirects forced-change users to the password-change page instead of the normal workflow
  - successful password change clears the force-change flag and refreshes the active session
- Why this mattered:
  - the previous behavior made the “forced” password-change flag operationally false

### 3. Session revocation after password reset
- Before:
  - an admin password reset updated the stored password but did not invalidate the user’s existing persisted sessions
  - a user with an already-issued session could potentially remain authenticated after a reset
- After:
  - all persisted sessions for the target user are deleted during admin password reset
  - all persisted sessions for the user are also rotated during self-service password change
- Why this mattered:
  - a production-safe password reset must invalidate previously issued sessions

### 4. Client save truthfulness
- Before:
  - the client form save flow could present “saved” behavior too optimistically
  - failures in the persistence path were not surfaced as explicitly failed state in the form-level save indicator
- After:
  - client form save status now has an explicit error state
  - failed saves no longer look like successful persistence
  - manual and autosave paths both use the corrected save-status handling
- Why this mattered:
  - the office-PC plan depends on the UI being truthful about whether client data is actually persisted

### 5. Dependant persistence
- Before:
  - adding a dependant from the client profile page only updated local page state and showed a success toast
  - the dependant was not actually persisted through the backend save path
- After:
  - adding a dependant now calls the real `saveClient` persistence path
  - the saved client response is reloaded into page state
  - the save indicator now reflects success or failure
- Why this mattered:
  - this was a direct Stage 1 persistence bug, not just a UX issue

### 6. Quote snapshot persistence truthfulness
- Before:
  - quote snapshot save/load/delete flows could report success even when persistence failed
  - the saved-quote UX could therefore overstate what had actually been written
- After:
  - quote snapshot save/load/delete status now distinguishes:
    - fully saved
    - saved in current session only
    - failed to persist
  - success toasts are now conditional on the actual persistence outcome
- Why this mattered:
  - saved quote behavior was one of the explicit production blockers in the office-PC readiness work

### 7. Autosave create-vs-update race reduction
- Before:
  - workflow persistence could trigger overlapping save operations
  - the save path used separate client-record and workflow-snapshot writes with no queueing
  - this increased the risk of misleading save state and race-prone persistence behavior
- After:
  - workflow persistence is now serialized through a queue
  - overlapping autosave/manual-save attempts are processed in order instead of racing
  - the save-state transitions are now aligned with the actual queued persistence path
- Why this mattered:
  - Stage 1 required the app to become more deterministic before moving toward office-PC deployment

### 8. Quote readiness vs backend PHI acceptance
- Before:
  - the frontend quote readiness rules did not require `gender`
  - the backend PHI request builder does require `gender`
  - the UI could therefore indicate that a quote was ready while the backend would still reject the PHI request as missing required data
- After:
  - income-protection quote readiness now requires `gender`
  - the requirement mapping points users back to the fact-find field that actually supplies the backend payload input
  - the frontend test suite was updated to enforce this contract
- Why this mattered:
  - this was a direct source-of-truth mismatch between readiness UI and backend execution rules

### 9. Restore-support position
- Before:
  - the admin UI exposed “Execute Restore” as a normal live action
  - the backend allowed destructive restore execution when the token/confirmation flow passed
  - this did not match the office-PC requirement for a safe offline restore approach
- After:
  - live restore execution is blocked outside development
  - non-development environments now return a conflict response instructing the operator to use the offline restore procedure
  - the admin UI no longer presents live restore execution as a supported normal action outside development
- Why this mattered:
  - Stage 1 needed a clear operational position before Stage 2 and Stage 3 could define the deployment contract and office-PC runbook honestly

## Files Changed
- `apps/api/app/main.py`
- `apps/api/app/repositories/sessions.py`
- `apps/api/tests/test_api.py`
- `apps/frontend/src/App.tsx`
- `apps/frontend/src/auth/auth-context.tsx`
- `apps/frontend/src/pages/admin-page.tsx`
- `apps/frontend/src/pages/change-password-page.tsx`
- `apps/frontend/src/pages/client-form-page.tsx`
- `apps/frontend/src/pages/client-profile-page.tsx`
- `apps/frontend/src/pages/income-protection-page.tsx`
- `apps/frontend/src/pages/income-protection-requirements.ts`
- `apps/frontend/src/pages/income-protection-requirements.test.ts`
- `apps/frontend/src/pages/login-page.tsx`

## Verification Run
- `python -m pytest apps/api/tests/test_api.py -k "startup_db_check_bootstraps_first_admin_when_database_has_no_users or change_password_clears_force_password_change_and_rotates_session or admin_reset_password_invalidates_existing_sessions or restore_execute_is_blocked_outside_development"`
- `npx.cmd tsc --noEmit`
- `npm.cmd test -- income-protection-requirements.test.ts`

## Results
- Backend bootstrap, password-change, session-revocation, and restore-policy tests passed.
- Frontend typecheck passed.
- Quote requirement regression test passed.
- Restore execution is now blocked outside development and the admin UI no longer presents live restore as a supported normal operation in non-development environments.

## What Was Verified Per Blocker
- First admin bootstrap:
  - verified by backend test that truncates the user table, runs startup checks, and confirms exactly one admin is created from env
- Forced password change:
  - verified by backend test that forces a password change, confirms the flag is present at login, changes the password, and confirms the flag is cleared
- Session revocation:
  - verified by backend test that confirms old sessions are invalidated after password change and admin reset
- Quote readiness alignment:
  - verified by frontend requirement test showing `gender` is required for income-protection quote readiness and is included in missing-field output
- Restore position:
  - verified by backend test that restore execution is blocked when the environment is production
- Frontend integration safety:
  - verified by frontend TypeScript check after the route/auth/save-path changes

## Out Of Scope For Stage 1
- Docker production runtime shape
- final Compose host-path contract
- OneDrive/Windows operational model
- Cloudflare topology
- office-PC installation runbook rewrite
- release candidate assembly and tagged installation verification

## Open Issues
- No remaining Stage 1 blockers are open.
- `ODC - Remote access and Windows.md` already had unrelated user changes and was intentionally not modified during Stage 1.
- `OFFICE_PC_PORTING_STAGED_EXECUTION_PLAN.md` exists as the staged plan document and remains uncommitted until the branch is committed.

## Go / No-Go
- Go for Stage 2.
- Recommended next focus: production runtime and config contract, including Compose storage mounts, production frontend runtime shape, and office-PC deployment env alignment.
