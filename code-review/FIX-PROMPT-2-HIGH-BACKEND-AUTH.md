# Fix Prompt 2 - High Priority Backend, Auth, and Data Integrity

Use this after Prompt 1 is complete and verified.

```text
Read first:

1. AGENTS.md
2. PROJECT.md
3. .ai-codex/index.md
4. .ai-codex/architecture.md
5. .ai-codex/api-surface.md
6. .ai-codex/patterns.md
7. .ai-codex/scopes/persistence.md
8. code-review/MASTER-CODE-REVIEW.md
9. code-review/01-backend-api-review.md
10. code-review/03-data-persistence-review.md
11. code-review/04-security-auth-review.md
12. code-review/05-tests-and-quality-review.md

Task:
Fix the highest-priority backend/auth/data-integrity findings that remain after Prompt 1.

Fix now:

1. Add CSRF protection for state-changing authenticated routes.
   - Cover POST / PUT / PATCH / DELETE.
   - Keep the frontend working with the new requirement.

2. Make malformed session timestamps fail closed instead of 500.
   - `is_session_expired()` should treat invalid timestamps as expired.

3. Add transaction safety around workflow multi-table saves.
   - Prevent partial persisted state across the workflow tables.

4. Add file upload size limits and validation.
   - Introduce config-driven limit.
   - Reject oversized uploads before disk write.

5. Wire expired-session cleanup into an actual runtime path.
   - startup cleanup and/or scheduler path is acceptable.

6. Add failed-login audit logging and lightweight brute-force protection.
   - smallest safe production-shaped implementation
   - do not overbuild

7. Fix any direct route-level ORM mutation that should go through repository pattern if still present in the reviewed high findings.

Constraints:

- Keep auth/session model recognizable.
- Keep fixes surgical.
- If a new config var is added, update `.env.example`.
- Add or update tests for each fix.
- Do not begin the migration-runner or Docker healthcheck work yet.

Expected files likely include:

- `apps/api/app/main.py`
- `apps/api/app/security.py`
- `apps/api/app/config.py`
- `apps/api/app/repositories/workflows.py`
- `apps/api/app/repositories/users.py`
- `apps/frontend/src/auth/`
- `apps/frontend/src/data/`
- `apps/api/tests/`

Required verification:

- backend tests pass for the touched areas
- frontend typecheck passes
- CSRF protection is test-covered
- malformed session timestamp path is test-covered
- oversized upload rejection is test-covered

Required review updates after fixing:

- update `code-review/MASTER-CODE-REVIEW.md`
- update `code-review/01-backend-api-review.md`
- update `code-review/03-data-persistence-review.md`
- update `code-review/04-security-auth-review.md`
- update `code-review/05-tests-and-quality-review.md`

Output format:

1. Files changed
2. What changed
3. Verification result
4. Review files updated
5. Remaining risks before Prompt 3
```
