# Stage 3 Remote Access and Windows Checkpoint

- Date started: 2026-09-21
- Branch used: `office-pc-stage-3`
- Status: in progress
- Checkpoint commit SHA: 2970eff (backup/restore verification and PostgreSQL client compatibility fix)
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

Current evidence:

- The three Docker services use `restart: unless-stopped`.
- PostgreSQL and the API are healthy; the frontend is running.
- The `cloudflared` Windows service is `Running` with `StartType=Automatic`.
- Docker Desktop is currently running as a user-level application.
- The `com.docker.service` Windows service is `Stopped` with `StartType=Manual`.
- No Docker Desktop scheduled task or populated per-user Run entry was found in the current inspection.

This is not a reboot proof. A Windows restart has not been performed in this checkpoint, so the supported classification is currently **attended restart**. The application may recover automatically after Docker Desktop is started, but unattended recovery without an interactive user session is not proven. The limitation is that Docker Desktop startup/session behavior remains an operator responsibility until a controlled reboot test proves otherwise.

Still required:

- Verify Docker Desktop recovery after Windows restart.
- Verify the `cloudflared` Windows service recovery after Windows restart.
- Verify whether the application returns automatically without an interactive user session.
- Reclassify as unattended only if the controlled reboot test proves it.

### Backup and restore

Verified in this checkpoint:

- A full backup was created under the configured local `BACKUP_PATH` and returned `status=success`.
- The manifest included a PostgreSQL custom-format dump, a files archive, a documents archive, and the JSON manifest.
- Manifest validation returned `valid=true` with no warnings.
- `pg_restore --list` completed without error.
- The PostgreSQL client tools were aligned with the pinned PostgreSQL 16 server after a restore compatibility defect was found: the API image now uses `pg_dump/pg_restore 16.14` rather than the generic Debian 17 client.
- An isolated restore was executed into a uniquely named temporary PostgreSQL database and temporary storage root, then both were removed. It restored successfully and preserved the expected clean-state counts (`0` clients, `9` users); the empty files/documents archives restored with `0` files each.
- Production destructive restore remains disabled by the application outside development. The supported production approach is an operator-approved offline restore into a replacement/isolated PostgreSQL instance, followed by file/document archive restoration and a controlled cutover.

Still required:

- Define the complete backup set, including PostgreSQL data, client files, generated documents, and backup manifests.
- Define retention, encryption, off-machine storage, and operator ownership.
- Prove the documented restore procedure on a separate machine, not only the temporary local database proof.

### Advisor document intake

The supported intake position remains:

- Advisors add working PDFs and other documents through Omega upload.
- The local office-PC storage tree is the live working storage layer.
- SharePoint and OneDrive are not live working-folder storage.

The end-to-end upload proof still needs to be recorded as part of the Stage 3 operating-model verification.

The current checkpoint intentionally did not create a temporary live client or document merely to produce that proof, because the live data reset is meant to remain empty. Service-level storage and the clean host storage roots are verified; a real authenticated upload proof remains outstanding.

### SharePoint position

Decision for this stage: **deferred future work**. Omega upload remains the only supported live intake path. If SharePoint is used later, it will be a manual operator export/copy destination only after the document is already stored in Omega.

Verified boundary:

- The live runtime has no SharePoint/OneDrive dependency or live working-folder mount.
- The application health/readiness checks remain independent of SharePoint availability.
- SharePoint is not the backup system for PostgreSQL, client files, generated documents, or manifests.

Still required:

- If the deferred work is later reopened, define a manual or scheduled export procedure with an owner and audit trail.

## Known documentation follow-up

- The existing `ODC - Remote access and Windows.md` still contains earlier hostname examples and requires the final Stage 4 rewrite.
- `infra/cloudflared/config.yaml.example` is not the final Windows operating configuration and must not be used unchanged; the supported design is the single public hostname above.
- The root `.env` is local configuration and must not be staged or committed.

## Go / No-Go

- Current decision: **No-go for Stage 4**.
- Backup generation, validation, and offline-safe restore proof are now complete for this checkpoint.
- Stage 3 remains open for controlled Windows restart proof, retention/encryption/off-machine backup ownership, separate-machine restore proof, and real authenticated upload proof.
- The office PC must not be treated as the final live production installation until Stages 1 through 5 and the final tagged release gate are complete.
