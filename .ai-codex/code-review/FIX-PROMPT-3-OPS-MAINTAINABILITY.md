# Fix Prompt 3 - Ops, Migrations, Tests, and Maintainability

Use this after Prompt 2 is complete and verified.

```text
Read first:

1. AGENTS.md
2. PROJECT.md
3. .ai-codex/index.md
4. .ai-codex/architecture.md
5. .ai-codex/api-surface.md
6. .ai-codex/patterns.md
7. .ai-codex/scopes/persistence.md
8. .ai-codex/scopes/income-protection.md
9. code-review/MASTER-CODE-REVIEW.md
10. code-review/01-backend-api-review.md
11. code-review/02-frontend-review.md
12. code-review/03-data-persistence-review.md
13. code-review/05-tests-and-quality-review.md
14. code-review/06-infrastructure-ops-review.md

Task:
Fix the next operational and maintainability findings after Prompts 1 and 2.

Fix now:

1. Add a real migration runner story.
   - smallest repo-appropriate solution
   - if Alembic is too large for the current scope, implement a safe scripted migration runner and document it clearly

2. Add Docker Compose health checks and restart policies where appropriate.

3. Tighten startup validation for weak cookie / deployment settings in non-development environments.

4. Improve test reliability for the reviewed gaps in the touched areas.
   - especially around environment/setup or DB-gated behavior where a realistic improvement can be made without a huge refactor

5. Reduce the worst maintainability hotspot if it can be done surgically.
   - likely `income-protection-page.tsx`
   - extract the smallest obvious subcomponents/utilities instead of a broad rewrite

6. Update stale docs that changed because of Prompts 1-3.
   - `PROJECT.md`
   - `.ai-codex/*`
   - review files

Constraints:

- Do not turn this into a full frontend redesign.
- Do not add large infrastructure platforms.
- Keep the migration solution realistic for this repo and Windows-first workflow.
- Prefer concrete operator instructions over abstract placeholders.

Expected files likely include:

- `apps/api/app/main.py`
- `apps/api/app/config.py`
- `apps/api/tests/`
- `apps/frontend/src/pages/income-protection-page.tsx`
- `infra/docker/compose.yaml`
- `.env.example`
- repo docs

Required verification:

- backend verification for touched paths
- frontend typecheck passes
- migration runner path is documented and testable or smoke-tested
- Docker healthcheck config is present and internally consistent

Required review updates after fixing:

- update `code-review/MASTER-CODE-REVIEW.md`
- update all affected area review files
- mark fixed items clearly

Output format:

1. Files changed
2. What changed
3. Verification result
4. Review files updated
5. Remaining non-blocking risks
```
