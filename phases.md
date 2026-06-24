# Omega Phases

This file replaces the old `phase1-8.md` naming.

It now serves two purposes:

1. record the completed implementation runway
2. define the next stage prompts for the implementation agent

## Completed Implementation Runway

### Status

- Phases 1-16: complete
- Stage 17 document-generation flow: complete

### Completed Phases

#### Phase 1: Persistence Foundation

- SQLAlchemy database plumbing added
- models and repository seams added
- runtime config wired for PostgreSQL and storage paths

#### Phase 2: Client and Auth Persistence Cutover

- users moved from `store.py` to PostgreSQL
- client CRUD moved from `store.py` to PostgreSQL
- admin user CRUD moved to PostgreSQL
- login/logout/current-user routes cut over to repository-backed auth

#### Phase 3: Workflow Persistence

- `GET /clients/{client_reference}/workflow`
- `PUT /clients/{client_reference}/workflow`
- workflow fields persisted across fact find, statement, terms, employment, and protection tables

#### Phase 4: Files and Client Folders

- file uploads stored on disk under client folders
- file metadata persisted in PostgreSQL
- backend file list/download APIs live
- frontend Files tab uses real backend APIs

#### Phase 5: Generated Documents and Artifacts

- generated document metadata persisted in PostgreSQL
- preview HTML snapshots persisted
- PDF/DOCX artifact upload and download live
- frontend generated-doc history uses backend data

#### Phase 6: Audit Logging

- key write actions persist audit rows in PostgreSQL
- admin audit log route reads from PostgreSQL

#### Phase 7: Backups

- backup runs persisted in PostgreSQL
- manifest artifacts written to disk
- admin backup list/create routes cut over

#### Phase 8: Remote-Access Runtime Wiring

- health/readiness endpoints expanded
- cookie/CORS/runtime remote-access settings added
- startup validation and storage checks added

#### Phase 9: Backup Dump And Restore Foundations

- `pg_dump` integration added when configured
- restore validation and dry-run services added
- restore attempt persistence added

#### Phase 10: Restore Execution

- explicit restore execution endpoint added
- confirmation gate enforced
- restore failures persisted and surfaced correctly

#### Phase 11: Backup Scheduling

- lightweight scheduler service added
- startup/shutdown scheduler wiring added
- schedule status endpoint added

#### Phase 12: Document Pack ZIP Download

- `GET /clients/{client_reference}/documents/pack` added
- both PDF and DOCX artifacts included when present
- duplicate ZIP names deduplicated with suffixes

#### Phase 13: File And Document Deletion

- `DELETE /clients/{client_reference}/files/{file_id}`
- `DELETE /clients/{client_reference}/documents/{document_id}`
- DB rows and disk artifacts deleted together
- audit entries created for deletions

#### Phase 14: PostgreSQL Session Persistence

- `sessions` table added
- cookie now carries exact `session_id`
- login creates a persisted session row
- logout invalidates only the calling session row

#### Phase 15: Reduce Frontend localStorage Usage

- generated-document view no longer falls back to browser-persisted state
- backend is the authority for workflow, files, and generated history
- client record cache still uses `localStorage` for quick rehydration

#### Phase 16: Cloudflare Tunnel Automation

- `infra/cloudflared/config.yaml.example` added
- `infra/cloudflared/setup-tunnel.sh` added
- `infra/docker/compose.yaml` includes cloudflared sidecar guidance
- `.gitignore` protects tunnel credentials and generated config

#### Stage 17: AI Document Generation Flow

- `POST /documents/generate` is live
- Gemini-backed generation plus seeded fallback exists
- persisted preview HTML snapshots and generated document history exist

## Current Source Of Truth

### PostgreSQL

- users
- clients
- dependants
- workflow tables
- file metadata
- generated document metadata
- preview snapshots
- audit logs
- backup runs
- restore attempts
- sessions

### Disk

- uploaded client files
- exported PDF/DOCX artifacts
- backup manifests
- optional database dump artifacts

### Cookie Session

- `session_id`
- `user_email`
- `last_seen_at`

## Remaining Gaps

- restore workflow still needs broader operator hardening
- document pack excludes preview-only rows with no stored artifact
- Cloudflare Tunnel setup is automated, but deployment remains operator-run
- `income-protection-page.tsx` remains monolithic at ~2600 lines — further decomposition deferred

## Post-Fix Security And Operations (2026-06)

- client GET routes now require authentication
- hardcoded demo credentials removed from shipped frontend
- CSRF origin/referer validation added for state-changing routes
- file upload size limit enforced (`MAX_UPLOAD_SIZE_BYTES`, default 50MB)
- failed login audit logging and rate limiting added (5/minute per IP)
- session timestamp parsing hardened against malformed values
- migration runner: `python -m app.migrate [--status|--dry-run|--force]`
- Docker Compose health checks and restart policies added
- PostgreSQL port bound to `127.0.0.1` in Docker Compose
- security summary now reflects live configuration

## Next Stage Prompt Set

Use these prompts for DeepSeek or Cline. One stage at a time.

### Stage 18: PostgreSQL UAT And Smoke Validation

Goal:
- run the current app against a real PostgreSQL instance
- validate the main flows end-to-end
- fix only real runtime issues found during live validation

Focus:
- migration runner
- auth and `/clients` route guards
- CSRF enforcement
- login rate limiting
- workflow save
- upload-size rejection
- document generation fallback/happy path
- backup/restore validation surfaces

### Stage 19: Backup And Restore Operator Hardening

Goal:
- harden the operator recovery workflow now that the core backup/restore path exists

Focus:
- restore runbook quality
- backup metadata clarity
- restore attempt visibility
- operator docs and recovery warnings
- any small code change that materially reduces restore risk

### Stage 20: Frontend UX Cleanup And File/Document Management

Goal:
- do the next focused frontend cleanup pass without broad redesign

Focus:
- add clean delete UI for files/documents
- extract the smallest obvious pieces from `income-protection-page.tsx`
- preserve existing workflow behavior

### Stage 21: Test Reliability, Observability, And CI Hardening

Goal:
- improve reliability and operating confidence without changing the product surface

Focus:
- easier PostgreSQL-backed test execution
- better local/CI validation instructions
- test organization improvements
- structured logging or logging improvements if surgical

## Starter Prompts

### Starter Prompt: Stage 18

```text
Read `AGENTS.md`, `.agent-handoff/codex-task.md`, `phases.md`, `PROJECT.md`, and `.ai-codex/index.md`, then execute Stage 18 from the backlog prompts exactly.
```

### Starter Prompt: Stage 19

```text
Read `AGENTS.md`, `.agent-handoff/codex-task.md`, `phases.md`, `PROJECT.md`, and `.ai-codex/index.md`, then execute Stage 19 from the backlog prompts exactly.
```

### Starter Prompt: Stage 20

```text
Read `AGENTS.md`, `.agent-handoff/codex-task.md`, `phases.md`, `PROJECT.md`, and `.ai-codex/index.md`, then execute Stage 20 from the backlog prompts exactly.
```

### Starter Prompt: Stage 21

```text
Read `AGENTS.md`, `.agent-handoff/codex-task.md`, `phases.md`, `PROJECT.md`, and `.ai-codex/index.md`, then execute Stage 21 from the backlog prompts exactly.
```

## Verification Baseline

One-command validation:

```powershell
.\scripts\validate.ps1
```

Individual gates:

```powershell
# Backend tests
$env:PYTHONPATH="apps\api"; apps\api\.venv\Scripts\python -m pytest apps/api/tests/test_api.py -v

# Frontend typecheck
Push-Location apps\frontend; node_modules\.bin\tsc.cmd --noEmit --project tsconfig.app.json

# Frontend vitest
Push-Location apps\frontend; node_modules\.bin\vitest.cmd run

# CI (GitHub Actions)
.github/workflows/ci.yml — backend pytest + frontend tsc + frontend vitest on push/PR to main
```

Current results:

| Gate | Result |
|------|--------|
| Backend pytest (PostgreSQL) | 117 passed, 0 failed |
| Frontend TypeScript | 0 errors |
| Frontend vitest | 7 files, 80 tests, 0 failed |
