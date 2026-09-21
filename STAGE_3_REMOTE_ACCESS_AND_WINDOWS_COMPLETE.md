# Stage 3 Remote Access and Windows Checkpoint

- Date started: 2026-09-21
- Branch used: `office-pc-stage-3`
- Status: in progress
- Checkpoint commit SHA: pending initial Stage 3 commit
- Next decision: continue Stage 3; do not proceed to Stage 4 yet

## Purpose

This is the initial Stage 3 handoff for the office-PC remote-access and operating-model work. It records the Cloudflare configuration that has been applied and separates verified facts from the remaining operating decisions.

This file is not a Stage 3 completion approval. Stage 3 remains open until restart behavior, backup and restore operations, advisor intake, and the SharePoint position are explicitly decided and verified.

## Verified Cloudflare configuration

- Cloudflare zone `omegafinancial.ie` is active.
- The remote-managed tunnel is named `omega-production`.
- The tunnel has one public application hostname:
  - `app.omegafinancial.ie`
  - origin service: `http://localhost:3000`
- The tunnel has a catch-all `http_status:404` rule.
- The DNS record for `app.omegafinancial.ie` is a proxied CNAME to the tunnel hostname.
- No public API hostname was created.
- No public route was created for API port `8000` or PostgreSQL port `5432`.
- Cloudflare Access is enabled for the Omega Financial organization.
- One-time PIN login is configured.
- The Access application is `Omega Financial production`.
- The Access Allow policy contains the approved addresses from `users.md`; it does not allow Everyone or an unrestricted domain rule.
- The Windows `cloudflared` service is running.
- Cloudflare reported the tunnel as `healthy` with four active connections after the service was started.

## Verified local runtime facts

- Docker services are running:
  - frontend on loopback host port `3000`
  - API on loopback host port `8000`
  - PostgreSQL on loopback host port `5432`
- The API container is healthy.
- The production runtime configuration was corrected to use:
  - `APP_URL=https://app.omegafinancial.ie`
  - `ENVIRONMENT=production`
  - `REMOTE_ACCESS_MODE=remote`
  - `CORS_ORIGINS=https://app.omegafinancial.ie`
  - `CSRF_TRUSTED_ORIGINS=https://app.omegafinancial.ie`
  - secure cookies and trusted-proxy count `1`
- Local client and backup storage directories were created at:
  - `C:\OmegaData\Clients`
  - `C:\OmegaData\Backups`
- The frontend-proxy login path accepted the public origin and returned a successful admin login response after the existing admin account was recovered.
- The existing admin account is `andrew@omegafinancial.ie`; the first-login password-change gate is active.

## Remaining Stage 3 decisions and verification

### Restart model

Still required:

- Verify Docker Desktop recovery after Windows restart.
- Verify the `cloudflared` Windows service recovery after Windows restart.
- Verify whether the application returns automatically without an interactive user session.
- Classify the supported model as unattended recovery or attended restart.
- Document the limitation truthfully if Docker Desktop requires an operator sign-in or action.

### Backup and restore

Still required:

- Define the complete backup set, including PostgreSQL data, client files, generated documents, and backup manifests.
- Define retention, encryption, off-machine storage, and operator ownership.
- Define the supported production restore approach.
- Prove restore on a separate machine or through the approved offline-safe path.

### Advisor document intake

The supported intake position remains:

- Advisors add working PDFs and other documents through Omega upload.
- The local office-PC storage tree is the live working storage layer.
- SharePoint and OneDrive are not live working-folder storage.

The end-to-end upload proof still needs to be recorded as part of the Stage 3 operating-model verification.

### SharePoint position

Still required:

- Decide whether SharePoint is manual operator upload, a scheduled copy/export task, or deferred future work.
- Document that SharePoint is not the backup system for the complete Omega working state.
- Verify that the live application continues to function if SharePoint is unavailable.

## Known documentation follow-up

- The existing `ODC - Remote access and Windows.md` still contains earlier hostname examples and requires the final Stage 4 rewrite.
- `infra/cloudflared/config.yaml.example` is not the final Windows operating configuration and must not be used unchanged; the supported design is the single public hostname above.
- The root `.env` is local configuration and must not be staged or committed.

## Go / No-Go

- Current decision: **No-go for Stage 4**.
- Stage 3 can proceed with restart testing, backup/restore definition and proof, and the final SharePoint operating-model decision.
- The office PC must not be treated as the final live production installation until Stages 1 through 5 and the final tagged release gate are complete.
