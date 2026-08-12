# Office PC Porting Staged Execution Plan

## Summary
This work should be executed in controlled stages, not as one large migration. Each stage must end with:

- the code and docs for that stage being complete
- the verification for that stage being recorded
- one repo-root markdown completion file being written before the next stage begins

The office PC must not be used as a live production install until all stages are complete and the final release tag has passed the documented install test.

## Working Rules
- Development continues in the normal development checkout and branch flow.
- The office PC install must only ever run an approved tagged release.
- Do not develop directly on the office PC.
- Do not install from `main` or from a feature branch.
- Do not start a later stage until the current stage exit criteria are met and its completion markdown file has been written.
- Do not assume OneDrive or SharePoint sync is the app's live storage layer.
- Treat SharePoint as a separate upload or archive destination only if and when that process is later defined.
- Treat Omega upload as the primary supported intake path for advisor PDFs and documents.

## Stage Structure
Every stage follows the same pattern:

1. Fix or complete the scope for that stage.
2. Run the verification for that stage.
3. Write the stage completion markdown file in the repo root.
4. Use that markdown file as the handoff and checkpoint before starting the next stage.

Each stage completion file should contain:

- date completed
- branch or tag used
- commit SHA
- scope completed
- files changed
- tests run
- results
- open issues
- go or no-go decision for the next stage

## Stage 1: Production Blocker Audit and Closure

### Goal
Close the application-level blockers that currently make the office-PC deployment unsafe or misleading.

### Scope
- First-admin bootstrap from `ADMIN_EMAIL` and `ADMIN_PASSWORD`
- Forced-password-change flow from login through successful password reset
- Session revocation after admin-triggered password reset
- Client autosave create-vs-update race behavior
- Dependant persistence after refresh and reopen
- Quote persistence and saved-quote truthfulness
- Quote readiness alignment with backend PHI requirements
- Restore safety review, including whether the current live restore path must be restricted or replaced by an offline-only supported procedure

### Required Outputs
- code fixes for every blocker accepted into the target branch
- updated tests covering the repaired behavior
- written list of any unresolved items that block the office release

### Exit Criteria
- fresh environment can create exactly one first admin from env
- forced-password-change users cannot bypass into normal app use
- reset password flow revokes prior sessions
- client/dependant/quote persistence survives refresh and reopen
- autosave no longer creates duplicate or misleading records
- quote readiness state matches backend acceptance rules
- restore support position is explicitly defined as live-safe or offline-only

### Completion File
`STAGE_1_PRODUCTION_BLOCKERS_COMPLETE.md`

## Stage 2: Production Runtime and Local Storage Contract

### Goal
Make the Docker and environment shape deterministic for the office-PC deployment, using local office-PC storage as the live storage layer and Omega upload as the primary file-intake path.

### Scope
- Replace the frontend Docker runtime shape so it serves a production build, not a Vite development workflow
- Define the final supported internal service ports
- Make host-mounted storage configurable through `.env`
- Align Compose with:
  - `CLIENT_FILES_HOST_PATH`
  - `BACKUPS_HOST_PATH`
  - `FILE_STORAGE_PATH`
  - `BACKUP_PATH`
- Keep PostgreSQL data outside synced folders
- Keep client files in an explicit local office-PC host path
- Keep backups in an explicit local office-PC host path
- Lock the client storage taxonomy so year-root artifacts and workflow-folder artifacts are stored in the intended locations
- Verify production env behavior for:
  - `APP_URL`
  - `ENVIRONMENT`
  - `REMOTE_ACCESS_MODE`
  - `CORS_ORIGINS`
  - `CSRF_TRUSTED_ORIGINS`
  - `TRUSTED_PROXY_COUNT`
  - `COOKIE_SECURE`
  - `COOKIE_SAMESITE`

### Required Outputs
- updated `infra/docker/compose.yaml`
- updated `.env.example`
- any required frontend/backend runtime changes
- clear statement of the final supported office-PC runtime contract
- explicit statement that live storage is local and not dependent on SharePoint or OneDrive pull-down sync
- explicit statement that advisors add files through Omega upload, not direct synced-folder writes
- explicit statement of the supported folder layout under each client year

### Exit Criteria
- Compose no longer depends on repo-local storage mounts for office deployment
- frontend container is production-shaped
- backend `/ready` passes with the intended production env contract
- backend and PostgreSQL remain private to loopback/internal network only
- storage contract is documented and matches the code
- advisor intake model is documented and matches the supported workflow
- folder taxonomy is documented and matches the supported workflow routing

### Completion File
`STAGE_2_RUNTIME_AND_CONFIG_COMPLETE.md`

## Stage 3: Remote Access, Backups, and SharePoint Upload Model

### Goal
Define the real supported operating model for the office PC, including remote access, restart expectations, backups, advisor file intake, and the non-sync SharePoint upload position.

### Scope
- Decide whether the supported recovery model is:
  - unattended restart capable
  - attended restart only
- Define the exact Cloudflare topology
- Keep one public frontend hostname only
- Do not expose a public API hostname
- Confirm how Docker Desktop and Cloudflare Tunnel are expected to recover after reboot
- Define the supported backup set and operator responsibilities
- Define the supported restore approach for production use
- Define the supported advisor file-intake rule for PDFs and other documents
- Define whether SharePoint upload is:
  - manual operator upload
  - scheduled copy/export task
  - deferred future work
- Explicitly forbid using a two-way sync client for the live working folder

### Required Outputs
- final operating model decision
- final Cloudflare access and tunnel design
- final backup and restore operating procedure
- final advisor document-intake position
- final SharePoint upload position
- documented limitations if unattended recovery is not supported

### Exit Criteria
- restart expectations are explicit and truthful
- remote-access design matches the actual runtime contract
- backup contents and restore procedure are fully specified
- advisor document intake is explicitly defined as Omega upload
- SharePoint is defined as upload-only or explicitly deferred
- the plan no longer implies server behavior that the office-PC stack cannot actually provide

### Completion File
`STAGE_3_REMOTE_ACCESS_AND_WINDOWS_COMPLETE.md`

## Stage 4: Runbook Rewrite and Release Candidate Assembly

### Goal
Rewrite the office-PC installation documentation so it matches the code exactly, then assemble a release candidate from approved code.

### Scope
- Rewrite `ODC - Remote access and Windows.md`
- Remove branch-specific warnings that no longer apply once fixed
- Replace outdated hostnames, ports, paths, or tunnel targets
- Ensure the runbook uses the final single-public-hostname model
- Ensure install instructions use a tagged release only
- Ensure the runbook describes local live storage plus the final approved advisor-upload and backup or SharePoint-archive process
- Align runbook, `.env.example`, and Compose in the same release-prep pass
- Create the release candidate from approved code, not from an unstable branch

### Required Outputs
- rewritten `ODC - Remote access and Windows.md`
- release candidate branch or equivalent release-prep state
- final install prerequisites list
- final stop-gates list for unsafe installs

### Exit Criteria
- the runbook matches the code and deployment contract exactly
- no step depends on feature-branch quirks
- no step relies on mixed local-dev and Docker assumptions
- no step implies a two-way sync working folder
- no step implies that staff add working files through SharePoint or OneDrive sync
- the release candidate is ready for clean-machine installation testing

### Completion File
`STAGE_4_RUNBOOK_AND_RELEASE_CANDIDATE_COMPLETE.md`

## Stage 5: Windows Test Install, Backup Proof, and Release Tag

### Goal
Prove that the documented office-PC deployment works end to end before go-live.

### Scope
- clean Windows installation from the chosen release candidate
- verification of first login and admin bootstrap
- verification of persistence flows
- verification of private network exposure only
- verification of local file behavior
- verification of advisor file upload through Omega
- verification of the expected year-root and workflow-folder layout
- verification of backup creation
- verification of restore on a separate machine or offline-safe path, following the supported procedure
- verification of the approved SharePoint upload process, if Stage 3 defines one
- final release approval and tag creation

### Required Outputs
- clean install test record
- smoke test results
- backup and restore proof record
- advisor upload proof record
- SharePoint upload proof record, if applicable
- final approved tag and commit SHA

### Exit Criteria
- the documented install works on a clean Windows machine
- the smoke test passes
- backup and restore procedure is proven
- advisor document intake through Omega is proven
- any approved SharePoint upload process is proven without pull-down sync into live folders
- the final production tag is approved for office installation

### Completion File
`STAGE_5_WINDOWS_INSTALL_AND_RELEASE_COMPLETE.md`

## Final Go-Live Rule
The office PC can only be used as the live system after:

- Stages 1 through 5 are complete
- all five completion markdown files exist in the repo root
- the final tagged release has passed the clean-machine install test
- the rewritten Windows runbook matches that exact tag

## Recommended Execution Order
1. Complete Stage 1 and write `STAGE_1_PRODUCTION_BLOCKERS_COMPLETE.md`
2. Complete Stage 2 and write `STAGE_2_RUNTIME_AND_CONFIG_COMPLETE.md`
3. Complete Stage 3 and write `STAGE_3_REMOTE_ACCESS_AND_WINDOWS_COMPLETE.md`
4. Complete Stage 4 and write `STAGE_4_RUNBOOK_AND_RELEASE_CANDIDATE_COMPLETE.md`
5. Complete Stage 5 and write `STAGE_5_WINDOWS_INSTALL_AND_RELEASE_COMPLETE.md`

Do not overlap Stage 4 or Stage 5 with unresolved Stage 1 to Stage 3 work.
