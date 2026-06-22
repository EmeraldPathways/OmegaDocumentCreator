# Fix Prompt 1 - Critical Findings Only

Use this first.

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
13. code-review/04-security-auth-review.md
14. code-review/05-tests-and-quality-review.md
15. code-review/06-infrastructure-ops-review.md

Task:
Fix the Critical findings only.

Fix now:

1. Unauthenticated PII exposure on:
   - `GET /clients`
   - `GET /clients/{client_reference}`

2. Hardcoded credentials in browser code:
   - remove `tryRestoreApiSession()` or equivalent fallback using shipped credentials

3. Configuration override risk:
   - verify and fix `get_settings()` usage in `apps/api/app/main.py`
   - production env vars must not be silently overridden by hardcoded import-time kwargs

4. Live in-memory fallback risk if it is still part of runtime reads:
   - remove or isolate `store.py` hybrid fallback paths that can return stale seeded client data during DB issues

Constraints:

- Keep route contracts stable unless security requires tightening auth.
- Prefer failing closed over falling back to stale data.
- Do not start CSRF, scheduler, healthcheck, or large refactors in this prompt.
- Do not introduce new dependencies unless absolutely required.

Expected files likely include:

- `apps/api/app/main.py`
- `apps/api/app/store.py`
- `apps/api/app/config.py`
- `apps/frontend/src/documents/document-api.ts`
- related tests
- docs only if the contract changes

Required verification:

- backend tests covering auth/client routes still pass
- frontend typecheck passes
- no credential strings remain in shipped frontend source
- route auth behavior is verified by tests

Required review updates after fixing:

- update `code-review/MASTER-CODE-REVIEW.md`
- update `code-review/01-backend-api-review.md`
- update `code-review/02-frontend-review.md`
- update `code-review/03-data-persistence-review.md`
- update `code-review/04-security-auth-review.md`
- update `code-review/06-infrastructure-ops-review.md`

Output format:

1. Files changed
2. What changed
3. Verification result
4. Review files updated
5. Remaining risks before Prompt 2
```
