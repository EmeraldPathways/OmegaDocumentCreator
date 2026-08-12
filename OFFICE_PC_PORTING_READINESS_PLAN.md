# Office PC Porting Readiness Plan

## Summary
Prepare the project for office-PC deployment in two stages: first make the application releaseable and production-safe, then make the deployment path deterministic on the target Windows, Docker, Cloudflare, and SharePoint operating model. The output of this work is a tagged release candidate plus an updated office-PC runbook that matches the code exactly.

The storage model for the office PC is:

- live application data stored locally on the office PC
- PostgreSQL and Docker state stored locally on the office PC
- client files stored locally on the office PC
- backups stored locally on the office PC and copied elsewhere as part of the backup process
- SharePoint used only as a later upload or archive destination if required

The office PC must not depend on OneDrive or SharePoint pull-down sync for the application's live working files.
Advisor-added PDFs and documents must enter the live system through Omega's own upload flow, not by writing directly into a synced working folder.
The live client storage contract should keep year-level folders under each client, with Fact Find-style artifacts allowed at the year root and product workflows stored in their own workflow folders.

## Implementation Changes
1. **Close all current production blockers**
- Fix first-admin bootstrap from `ADMIN_EMAIL` and `ADMIN_PASSWORD`.
- Enforce forced-password-change flow end to end, including a real password-change screen and server-side session revocation on reset.
- Fix dependant persistence, quote persistence truthfulness, and client autosave create-vs-update race conditions.
- Make restore offline-safe: validate artifacts first, avoid active-app restore into the live database, and define a supported offline restore procedure.
- Align quote readiness with backend PHI requirements so frontend validation cannot say "ready" when the backend will reject the request.

2. **Create a production deployment shape**
- Replace the frontend Docker image's Vite dev server with a production build/runtime and document the final internal app port as a stable contract.
- Make Docker storage mounts configurable from `.env` for client files and backups; the Compose file must consume the same `CLIENT_FILES_HOST_PATH` and `BACKUPS_HOST_PATH` values the office-PC guide tells the operator to set.
- Keep PostgreSQL data outside any synced folder and keep app file storage and backups on explicit local host paths.
- Verify `APP_URL`, `CORS_ORIGINS`, `CSRF_TRUSTED_ORIGINS`, `COOKIE_SECURE`, and proxy expectations as a coherent Cloudflare-backed production configuration.

3. **Make operations deterministic**
- Decide and support one restart model for the office PC.
- Recommended: unattended recovery design, where the app and tunnel come back without a human interactive login.
- If Docker Desktop remains the chosen model, document whether this is an attended recovery setup or whether additional service automation is required.
- Define a supported backup set: database dump, file storage, generated documents, production `.env`, release tag and commit, and restore instructions.
- Define an update workflow that only uses tagged releases and includes pre-update backup, validation, rollback target, and post-update smoke checks.
- Define SharePoint strictly as an upload or archive destination, not as the live app storage layer.
- Define advisor document intake through Omega upload as the primary supported workflow.

4. **Bring the runbook in sync with the code**
- Rewrite `ODC - Remote access and Windows.md` so every env var, path, port, and hostname matches the actual release.
- Remove any instructions that depend on current branch quirks once those are fixed.
- Replace hard-coded tunnel target assumptions with the final production frontend service and port.
- Remove any instruction that implies a two-way sync working folder.
- Make the runbook explicit that staff add working documents through Omega upload, not Windows Explorer into a synced client folder.
- Add an explicit stop gate for any missing readiness criteria in the release candidate.

5. **Produce a release artifact set**
- Create one approved release branch or release candidate from `main`, not from a feature branch.
- Run and record the required test suite results for that candidate.
- Tag the approved version, capture commit SHA, and use that exact tag in the office-PC installation steps.
- Update `.env.example`, Docker docs, and the office-PC runbook together in the same release-prep change so config drift is not possible.

## Public Interfaces and Config Contracts
- `.env` contract must include and document:
  - `ADMIN_EMAIL`, `ADMIN_PASSWORD`
  - `APP_URL`, `ENVIRONMENT`, `REMOTE_ACCESS_MODE`
  - `CORS_ORIGINS`, `CSRF_TRUSTED_ORIGINS`, `TRUSTED_PROXY_COUNT`
  - `CLIENT_FILES_HOST_PATH`, `BACKUPS_HOST_PATH`
  - `FILE_STORAGE_PATH`, `BACKUP_PATH`
  - `SESSION_SECRET`, `COOKIE_SECURE`, `COOKIE_SAMESITE`
- Docker Compose must treat the host storage path variables as part of the supported deployment interface.
- Restore procedure must become an explicit documented operator interface, not an implied admin button behavior.
- SharePoint upload, if used later, must be documented as a separate operational procedure and must not change the application's primary filesystem contract.
- Advisor document intake must remain an application workflow, not a filesystem-sync workflow.
- Client storage layout must be explicit and documented, including which artifacts live at the year root versus inside workflow folders.

## Test Plan
- **Auth and admin**
- Fresh database bootstraps exactly one admin from env.
- Forced password change blocks normal use until completed.
- Password reset revokes existing sessions.

- **Persistence**
- Client create and edit survives refresh and reopen.
- Dependants survive refresh and reopen.
- Saved quotes survive refresh and only show success when persisted.
- Autosave does not create duplicate clients and recovers cleanly from failed saves.

- **Production runtime**
- Frontend serves from production build, not Vite dev mode.
- Compose uses configured host storage paths, not repo-local fallback mounts.
- Backend passes `/ready` under production env.
- Cloudflare-facing origin and CSRF and session flow work through the final public URL.

- **Office-PC operations**
- Reboot test matches the documented recovery model.
- Client files stay locally available on the office PC even with no SharePoint connectivity.
- Advisors can upload documents into Omega without relying on SharePoint or OneDrive sync.
- The client folder layout matches the supported year-root and workflow-folder storage contract.
- PostgreSQL and API are unreachable from other machines.
- Full offline backup restore succeeds on a separate machine using the documented process.
- If SharePoint upload is enabled later, uploads do not pull remote files back into the live app folders.
- The supported user workflow for adding PDFs and other documents is Omega upload, not direct synced-folder editing.

- **Release control**
- Tagged release installs cleanly from scratch on a Windows test machine.
- Runbook steps reproduce the tested install without branch-specific edits.

## Assumptions and Defaults
- Default target is a tagged production release, not the current branch.
- Default deployment stack remains Windows 11 plus Docker plus Cloudflare, with PostgreSQL, Docker state, client files, and backups kept on explicit local host paths.
- Default expectation is decision-complete release prep before any office-PC migration; no partial install-now-and-fix-later path is acceptable.
- Default SharePoint position is upload or archive only and out-of-band from the live application storage.
- Default advisor document intake position is app-based upload into Omega.
- Default storage taxonomy is:
  - `{client}/{year}/files` and `{client}/{year}/documents` for year-root artifacts such as Fact Find and Fact Find Update
  - `{client}/{year}/income-protection/{files|documents}` for Quote and Statement of Suitability artifacts
  - `{client}/{year}/pensions/{files|documents}`, `{client}/{year}/savings/{files|documents}`, and `{client}/{year}/investments/{files|documents}` as the product-folder baseline
- Default operational recommendation is to redesign for unattended restart recovery; if that is not implemented, the final runbook must explicitly classify the setup as attended and limited.
