# Office PC Porting Readiness Plan

## Summary
Prepare the project for office-PC deployment in two stages: first make the application releaseable and production-safe, then make the deployment path deterministic on the target Windows, OneDrive, Docker, and Cloudflare stack. The output of this work is a tagged release candidate plus an updated office-PC runbook that matches the code exactly.

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
- Keep PostgreSQL data outside OneDrive and keep app file storage and backups on explicit host paths.
- Verify `APP_URL`, `CORS_ORIGINS`, `CSRF_TRUSTED_ORIGINS`, `COOKIE_SECURE`, and proxy expectations as a coherent Cloudflare-backed production configuration.

3. **Make operations deterministic**
- Decide and support one restart model for the office PC.
- Recommended: unattended recovery design, where the app and tunnel come back without a human interactive login.
- If Docker Desktop plus signed-in OneDrive remains the chosen model, document that this is an attended recovery setup and not a lights-out server.
- Define a supported backup set: database dump, file storage, generated documents, production `.env`, release tag and commit, and restore instructions.
- Define an update workflow that only uses tagged releases and includes pre-update backup, validation, rollback target, and post-update smoke checks.

4. **Bring the runbook in sync with the code**
- Rewrite `ODC - Remote access and Windows.md` so every env var, path, port, and hostname matches the actual release.
- Remove any instructions that depend on current branch quirks once those are fixed.
- Replace hard-coded tunnel target assumptions with the final production frontend service and port.
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
- OneDrive-backed client files stay locally available and appear in OneDrive web.
- PostgreSQL and API are unreachable from other machines.
- Full offline backup restore succeeds on a separate machine using the documented process.

- **Release control**
- Tagged release installs cleanly from scratch on a Windows test machine.
- Runbook steps reproduce the tested install without branch-specific edits.

## Assumptions and Defaults
- Default target is a tagged production release, not the current branch.
- Default deployment stack remains Windows 11 plus Docker plus Cloudflare plus OneDrive-backed client file storage, with PostgreSQL and Docker state kept outside OneDrive.
- Default expectation is decision-complete release prep before any office-PC migration; no partial install-now-and-fix-later path is acceptable.
- Default operational recommendation is to redesign for unattended restart recovery; if that is not implemented, the final runbook must explicitly classify the setup as attended and limited.
