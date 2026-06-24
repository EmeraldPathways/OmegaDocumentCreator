# Codex Task

Status: pending

## Objective

Describe the exact task for the implementation agent to execute.

## Scope

- Allowed files:
- Forbidden files:

## Implementation Notes

- Codex is the planner and reviewer.
- Cline or DeepSeek is the implementation agent.
- At the start of each new implementation conversation, read `AGENTS.md` first.
- At the start of each new implementation conversation, use Agentmemory and Token Savior when available.
- Do not edit files outside the agreed scope.
- Do not work on the same files in parallel with Codex.
- If you edit any handoff file, including `.agent-handoff/cline-result.md` or `.agent-handoff/validation-log.md`, count it as a changed file.
- In `.agent-handoff/cline-result.md`, list every touched file exactly, including handoff files.

## Validation Required

- Add the commands Codex wants run before review.

## Handoff To Agent

Write the current task here before implementation starts.

---

## Active Prompt Set

This file now tracks the post-cutover stage prompts.

Historical Prompts 1-8 are complete and retained only in `.agent-handoff/cline-result.md` and `.agent-handoff/validation-log.md`.

Use one stage at a time. Copy a single stage prompt into the `## Handoff To Agent` section when starting that task.

## Post-Stage Review Prompt

Use this after each stage is finished.

```text
Stage complete. Review the implementation result and do four things only:

1. Check whether the stage was implemented correctly against the handoff prompt and current repo state.
2. List any fixes still needed, with concrete file-level guidance.
3. If the stage is good enough, give me the next full prompt and the next small starter prompt.
4. Tell me whether `phases.md`, `PROJECT.md`, or `.ai-codex` need updating based on what changed.

Read first:
- AGENTS.md
- .agent-handoff/codex-task.md
- .agent-handoff/cline-result.md
- .agent-handoff/validation-log.md
- .agent-handoff/safety-rules.md
- .ai-codex/index.md
- phases.md
- PROJECT.md

Rules:
- Do not implement the next stage yet.
- Do not rewrite the current stage unless you find real issues.
- Be strict about regressions, missing tests, fake completion claims, and scope drift.
- If the stage is incomplete, give me a fix prompt for the current stage instead of the next stage.
- Keep the answer in this format:

1. Verdict
2. Issues to fix
3. Documentation updates needed
4. Next full prompt
5. Next small starter prompt
```

### Stage 18: PostgreSQL UAT And Smoke Validation

Read first:
- `AGENTS.md`
- `.agent-handoff/codex-task.md`
- `.agent-handoff/safety-rules.md`
- `.ai-codex/index.md`
- `.ai-codex/scopes/persistence.md`
- `phases.md`
- `PROJECT.md`
- `code-review/MASTER-CODE-REVIEW.md`

Task:
Run a real PostgreSQL-backed validation pass for the current app and fix only real runtime issues found during that validation.

Current state:
- the repo is feature-complete through the current implementation stages
- many backend tests are still only structurally reviewed unless PostgreSQL is available
- runtime validation is the main remaining risk

Requirements:
- make PostgreSQL available for the host-run test flow
- verify migrations can run with `app.migrate`
- run targeted live smoke checks for:
  - auth guards on `/clients`
  - CSRF enforcement
  - login rate limiting
  - workflow save
  - file upload size rejection
  - document generation fallback/happy path
  - backup creation / restore validation surfaces
- fix only real runtime issues uncovered by this pass
- document exact verification commands and outcomes
- do not start broad refactors in this stage

Likely files:
- `apps/api/app/main.py`
- `apps/api/app/migrate.py`
- `apps/api/tests/test_api.py`
- `.env.example`
- `infra/docker/compose.yaml`
- docs / validation logs

Tests required:
- live PostgreSQL-backed verification commands recorded
- full backend suite passes

Deliverable:
1. Files changed
2. What changed
3. Test results
4. Remaining limitations

### Stage 19: Backup And Restore Operator Hardening

Read first:
- `AGENTS.md`
- `.agent-handoff/codex-task.md`
- `.agent-handoff/safety-rules.md`
- `.ai-codex/index.md`
- `.ai-codex/scopes/persistence.md`
- `phases.md`
- `PROJECT.md`
- `code-review/03-data-persistence-review.md`
- `code-review/06-infrastructure-ops-review.md`

Task:
Harden the backup and restore workflow for real operator use.

Current state:
- backup, restore validation, dry-run, execution, and scheduler all exist
- the main remaining gap is operator reliability and recovery confidence

Requirements:
- improve the restore/runbook path without redesigning it
- tighten backup metadata and restore attempt visibility where needed
- ensure migration runner, backup creation, restore validation, and restore execution fit a real operator sequence
- add or improve docs for recovery steps and warnings
- if a small code change materially reduces restore risk, implement it
- keep destructive behavior explicitly gated and test-backed

Likely files:
- `apps/api/app/main.py`
- `apps/api/app/services/backups.py`
- `apps/api/app/services/restore.py`
- `apps/api/app/repositories/backups.py`
- `PROJECT.md`
- `.ai-codex/*`
- `code-review/*`

Tests required:
- backup and restore flows validated against real or realistic smoke paths
- non-admin blocked
- destructive execution still explicitly gated
- backend suite passes for touched areas

Deliverable:
1. Files changed
2. What changed
3. Test results
4. Remaining limitations

### Stage 20: Frontend UX Cleanup And File/Document Management

Read first:
- `AGENTS.md`
- `.agent-handoff/codex-task.md`
- `.agent-handoff/safety-rules.md`
- `.ai-codex/index.md`
- `.ai-codex/scopes/income-protection.md`
- `.ai-codex/scopes/persistence.md`
- `phases.md`
- `PROJECT.md`
- `code-review/02-frontend-review.md`

Task:
Do the next focused frontend cleanup pass without broad redesign.

Current state:
- backend persistence is in place
- no frontend delete UI exists for files/documents
- `income-protection-page.tsx` remains too large

Requirements:
- add the smallest clean delete UI for files/documents if the backend endpoints already support it
- extract only the most obvious low-risk pieces from `income-protection-page.tsx`
- preserve current workflow behavior and route structure
- do not do a visual redesign
- do not reintroduce browser persistence fallbacks

Likely files:
- `apps/frontend/src/pages/income-protection-page.tsx`
- `apps/frontend/src/documents/generated-document-api.ts`
- `apps/frontend/src/data/file-api.ts`
- related UI/components if extracted
- frontend docs if needed

Tests required:
- frontend typecheck passes
- existing backend suite still passes
- delete flows and extracted components remain functionally correct

Deliverable:
1. Files changed
2. What changed
3. Test results
4. Remaining limitations

### Stage 21: Test Reliability, Observability, And CI Hardening

Read first:
- `AGENTS.md`
- `.agent-handoff/codex-task.md`
- `.agent-handoff/safety-rules.md`
- `.ai-codex/index.md`
- `phases.md`
- `PROJECT.md`
- `code-review/05-tests-and-quality-review.md`
- `code-review/06-infrastructure-ops-review.md`

Task:
Improve test reliability and operational observability without changing the product surface.

Current state:
- a lot of functionality exists, but the reliability story is still weaker than the feature story
- structured logging, CI-friendly test setup, and better test segmentation remain open

Requirements:
- improve the test setup so PostgreSQL-backed execution is easier and better documented
- split or reorganize tests where there is an obvious low-risk win
- add structured logging or logging improvements if they can be done surgically
- improve operator/developer instructions for running validation locally
- avoid big platform additions

Likely files:
- `apps/api/tests/`
- `apps/api/app/main.py`
- `apps/api/app/config.py`
- `.env.example`
- `PROJECT.md`
- `.ai-codex/*`

Tests required:
- touched test suites pass
- any new local validation instructions are accurate
- documentation matches the actual commands used

Deliverable:
1. Files changed
2. What changed
3. Test results
4. Remaining limitations
