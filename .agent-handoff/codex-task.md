# Codex Task

Status: pending

## Objective

Describe the exact task for Cline to implement.

## Scope

- Allowed files:
- Forbidden files:

## Implementation Notes

- Codex is the planner and reviewer.
- Cline is the implementation agent.
- At the start of each new Cline conversation, read `AGENTS.md` first.
- At the start of each new Cline conversation, use Agentmemory and Token Savior when available.
- Do not edit files outside the agreed scope.
- Do not work on the same files in parallel with Codex.
- If you edit any handoff file, including `.agent-handoff/cline-result.md` or `.agent-handoff/validation-log.md`, count it as a changed file.
- In `.agent-handoff/cline-result.md`, list every touched file exactly, including handoff files.

## Validation Required

- Add the commands Codex wants run before review.

## Handoff To Cline

Write the current task here before implementation starts.

---

## Backlog Prompts

Use one prompt at a time. Copy a single prompt into the `## Handoff To Cline` section when starting that task.

## Post-Phase Review Prompt

Use this after each phase is finished.

```text
Phase complete. Review the implementation result and do four things only:

1. Check whether the phase was implemented correctly against the handoff prompt and current repo state.
2. List any fixes still needed, with concrete file-level guidance.
3. If the phase is good enough, give me the next full prompt and the next small starter prompt.
4. Tell me whether `phase1-8.md`, `PROJECT.md`, or `.ai-codex` need updating based on what changed.

Read first:
- AGENTS.md
- .agent-handoff/codex-task.md
- .agent-handoff/cline-result.md
- .agent-handoff/validation-log.md
- .agent-handoff/safety-rules.md
- .ai-codex/index.md
- phase1-8.md
- PROJECT.md

Rules:
- Do not implement the next phase yet.
- Do not rewrite the current phase unless you find real issues.
- Be strict about regressions, missing tests, fake completion claims, and scope drift.
- If the phase is incomplete, give me a fix prompt for the current phase instead of the next phase.
- Keep the answer in this format:

1. Verdict
2. Issues to fix
3. Documentation updates needed
4. Next full prompt
5. Next small starter prompt
```

### Prompt 1: Real PostgreSQL Backup/Restore

Read first:
- `AGENTS.md`
- `.agent-handoff/codex-task.md`
- `.agent-handoff/safety-rules.md`
- `.ai-codex/index.md`
- `.ai-codex/scopes/persistence.md`
- `phase1-8.md`
- `PROJECT.md`

Task:
Implement real PostgreSQL backup and restore foundations.

Current state:
- Backup runs are DB-backed
- Backup manifests are written to disk
- No real `pg_dump` integration
- No restore flow exists

Requirements:
- Add a backup service abstraction that can run a real PostgreSQL dump when configured
- Keep the existing manifest pattern, but extend it to include actual dump artifact metadata
- Add a restore service abstraction that can validate and prepare a restore operation from a backup artifact
- If full restore execution is too risky for tests, implement a production-shaped restore workflow with validation and dry-run support
- Preserve existing `/admin/backups` behavior unless extension is necessary
- Add admin-only restore endpoints only if needed and keep them minimal
- Do not break existing tests

Likely files:
- `apps/api/app/services/backups.py`
- `apps/api/app/repositories/backups.py`
- `apps/api/app/main.py`
- `apps/api/tests/test_api.py`
- `.env.example`

Tests required:
- backup creates a DB row and real artifact metadata
- backup failure does not create false success state
- restore validation rejects missing/invalid artifacts
- admin auth enforced
- full backend suite passes

Deliverable:
1. Files changed
2. What changed
3. Test results
4. Remaining limitations

### Prompt 2: Restore Operations From Backup Manifests

Read first:
- `AGENTS.md`
- `.agent-handoff/codex-task.md`
- `.agent-handoff/safety-rules.md`
- `.ai-codex/index.md`
- `.ai-codex/scopes/persistence.md`
- `phase1-8.md`
- `PROJECT.md`

Task:
Implement restore operations from backup manifests.

Current state:
- Backup manifests exist
- No restore workflow exists

Requirements:
- Add a restore workflow that reads a stored backup manifest
- Validate referenced DB/file artifacts before restore
- Implement a safe dry-run mode first
- If real restore execution is added, gate it behind admin-only endpoints and explicit confirmation-style payloads
- Persist restore attempt status and outcome if a suitable table exists; otherwise add the smallest safe persistence layer
- Do not perform destructive restore behavior without explicit route-level intent
- Preserve existing routes and tests

Likely files:
- `apps/api/app/main.py`
- `apps/api/app/services/backups.py`
- `apps/api/app/models.py`
- `apps/api/app/repositories/backups.py`
- `apps/api/tests/test_api.py`

Tests required:
- dry-run restore succeeds for valid manifest
- invalid manifest/artifact returns clear error
- non-admin blocked
- backend suite passes

Deliverable:
1. Files changed
2. What changed
3. Test results
4. Remaining limitations

### Prompt 3: Automated Backup Scheduling

Read first:
- `AGENTS.md`
- `.agent-handoff/codex-task.md`
- `.agent-handoff/safety-rules.md`
- `.ai-codex/index.md`
- `phase1-8.md`
- `PROJECT.md`

Task:
Add automated backup scheduling.

Current state:
- Manual backup creation exists
- No scheduler exists

Requirements:
- Implement a lightweight scheduling mechanism appropriate for this repo
- Prefer a production-shaped scheduler hook/config model over a heavy new dependency
- Support schedule configuration by environment variables
- Prevent overlapping backup runs
- Reuse the existing backup service and DB-backed backup records
- Expose last scheduled run / next scheduled run if a minimal status surface is practical
- Do not build cloud-specific cron infrastructure unless already present

Likely files:
- `apps/api/app/config.py`
- `apps/api/app/main.py`
- `apps/api/app/services/backups.py`
- `apps/api/tests/test_api.py`
- `.env.example`

Tests required:
- scheduled trigger path calls backup service
- disabled scheduler does nothing
- overlapping run protection works
- backend suite passes

Deliverable:
1. Files changed
2. What changed
3. Test results
4. Remaining limitations

### Prompt 4: Document Pack ZIP Download

Read first:
- `AGENTS.md`
- `.agent-handoff/codex-task.md`
- `.agent-handoff/safety-rules.md`
- `.ai-codex/index.md`
- `.ai-codex/scopes/document-generation.md`
- `phase1-8.md`
- `PROJECT.md`

Task:
Implement document pack ZIP download.

Current state:
- Individual generated document download exists
- No ZIP/bulk pack download exists

Requirements:
- Add a backend endpoint that returns a ZIP containing available generated document artifacts for a client
- Include only real persisted artifacts
- Return a clear error if no packable artifacts exist
- Wire the frontend `Download Pack` action to the real backend endpoint
- Preserve current generated-document behavior
- Keep implementation small and avoid refactoring unrelated document flows

Likely files:
- `apps/api/app/main.py`
- `apps/api/app/repositories/documents.py`
- `apps/frontend/src/pages/income-protection-page.tsx`
- `apps/frontend/src/documents/generated-document-api.ts`
- `apps/api/tests/test_api.py`

Tests required:
- pack requires auth
- pack for unknown client returns 404
- pack returns ZIP with expected files
- no-artifact case handled correctly
- frontend typecheck passes
- backend suite passes

Deliverable:
1. Files changed
2. What changed
3. Test results
4. Remaining limitations

### Prompt 5: File/Document Deletion Endpoints

Read first:
- `AGENTS.md`
- `.agent-handoff/codex-task.md`
- `.agent-handoff/safety-rules.md`
- `.ai-codex/index.md`
- `.ai-codex/scopes/persistence.md`
- `phase1-8.md`
- `PROJECT.md`

Task:
Implement backend deletion endpoints for files and generated documents.

Current state:
- Upload and download exist
- No deletion endpoints exist
- Some frontend delete affordances were intentionally removed because backend support was missing

Requirements:
- Add authenticated deletion endpoints for client files and generated documents
- Delete DB metadata and disk artifacts safely
- Handle missing-on-disk artifacts gracefully
- Audit deletion actions using the existing audit logging pattern
- Decide whether deletion is hard delete or soft delete; choose the smallest implementation consistent with current schema
- Do not delete outside configured storage roots
- Only add frontend delete UI if there is already a clear place for it and it can be done surgically

Likely files:
- `apps/api/app/main.py`
- `apps/api/app/repositories/files.py`
- `apps/api/app/repositories/documents.py`
- `apps/api/app/services/storage.py`
- `apps/api/tests/test_api.py`

Tests required:
- delete requires auth
- delete removes DB row
- delete removes disk artifact
- repeated delete returns correct not-found behavior
- audit entry created
- backend suite passes

Deliverable:
1. Files changed
2. What changed
3. Test results
4. Remaining limitations

### Prompt 6: PostgreSQL Session Table

Read first:
- `AGENTS.md`
- `.agent-handoff/codex-task.md`
- `.agent-handoff/safety-rules.md`
- `.ai-codex/index.md`
- `.ai-codex/scopes/auth-admin.md`
- `phase1-8.md`
- `PROJECT.md`

Task:
Move session persistence to PostgreSQL.

Current state:
- Auth is cookie-session based
- No PostgreSQL session table exists

Requirements:
- Add the smallest production-ready server-side session persistence layer backed by PostgreSQL
- Preserve current login/logout/auth route contracts
- Preserve session timeout behavior
- Support logout invalidation
- Avoid auth redesign
- Keep admin/user behavior unchanged
- If middleware replacement is needed, keep it surgical and test-backed

Likely files:
- `apps/api/app/main.py`
- `apps/api/app/models.py`
- `apps/api/app/repositories/`
- `apps/api/app/security.py`
- `apps/api/tests/test_api.py`

Tests required:
- login creates persisted session state
- `/auth/me` uses persisted session
- logout invalidates persisted session
- expired session rejected
- backend suite passes

Deliverable:
1. Files changed
2. What changed
3. Test results
4. Remaining limitations

### Prompt 7: Remove Frontend `localStorage` As Immediate Source

Read first:
- `AGENTS.md`
- `.agent-handoff/codex-task.md`
- `.agent-handoff/safety-rules.md`
- `.ai-codex/index.md`
- `.ai-codex/scopes/income-protection.md`
- `.ai-codex/scopes/persistence.md`
- `phase1-8.md`
- `PROJECT.md`

Task:
Remove `localStorage` as the primary workflow/document/file cache and make backend data the main source of truth.

Current state:
- Backend persistence exists for workflows, files, documents
- Frontend still uses `localStorage` for immediate UX caching

Requirements:
- Refactor the frontend so backend-loaded state is authoritative
- Keep UX responsive without relying on browser persistence as the main state source
- If temporary in-memory draft state is needed, keep it in React state, not durable browser storage
- Preserve current save/generate/export behavior
- Remove stale fallback logic that can mask backend state
- Keep changes focused on the current workflow pages and related data modules

Likely files:
- `apps/frontend/src/data/client-data-context.tsx`
- `apps/frontend/src/pages/income-protection-page.tsx`
- `apps/frontend/src/data/workflow-api.ts`
- `apps/frontend/src/data/file-api.ts`
- `apps/frontend/src/documents/generated-document-api.ts`
- related tests if present

Tests required:
- frontend typecheck passes
- existing backend suite still passes
- no silent fallback to stale local browser data
- preserve current save/generate/export flows

Deliverable:
1. Files changed
2. What changed
3. Test results
4. Remaining limitations

### Prompt 8: Full Remote Access / Cloudflare Tunnel / VPN Automation

Read first:
- `AGENTS.md`
- `.agent-handoff/codex-task.md`
- `.agent-handoff/safety-rules.md`
- `.ai-codex/index.md`
- `.ai-codex/scopes/persistence.md`
- `phase1-8.md`
- `PROJECT.md`

Task:
Implement the next step beyond Phase 8 remote-access wiring: real deploy/runtime automation for remote access.

Current state:
- Config/runtime wiring exists
- Health/readiness exists
- No full Cloudflare Tunnel or VPN automation exists

Requirements:
- Choose the smallest repo-appropriate remote access path
- If Cloudflare Tunnel is the intended direction, add documented config/templates/scripts for running it safely
- Keep secrets out of the repo
- Add startup/docs/config needed for real operator use
- Do not overbuild with Terraform/Kubernetes unless already present
- Preserve local development flow

Likely files:
- `.env.example`
- `infra/docker/compose.yaml`
- repo docs
- small runtime scripts if needed

Tests/verification:
- backend tests still pass
- provide exact operator commands
- if code changed, frontend typecheck still passes

Deliverable:
1. Files changed
2. What changed
3. Verification performed
4. Remaining limitations
