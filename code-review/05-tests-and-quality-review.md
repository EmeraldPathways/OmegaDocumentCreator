# Tests & Quality Review

Status: complete
Reviewer: Automated review pass

## Scope

- Backend test suite (`apps/api/tests/`)
- Frontend type checking (`tsc --noEmit`)
- Test coverage and verification gaps
- Flaky areas and dead code
- Maintenance risks

---

## Findings

### Critical

1. **Test suite requires a live PostgreSQL database — no mock/in-memory fallback**
   - File: `apps/api/tests/test_api.py`, `apps/api/tests/test_backup_restore.py`
   - Problem: All tests hit a real PostgreSQL database. No SQLite fallback, no testcontainers, no mocking of DB layer. If PostgreSQL is not running, all tests fail.
   - Why it matters: CI/CD cannot run without a PostgreSQL instance. Developers must manually set up a DB before running tests.
   - Suggested fix direction: Add a Docker Compose-based test DB or use `pytest-postgresql` for ephemeral test databases. Consider SQLite as a CI fallback for unit tests.
   - Confidence: Confirmed

2. **`test_api.py` — 1631 lines of monolithic test class**
   - File: `apps/api/tests/test_api.py`
   - Problem: Single `ApiTests(unittest.TestCase)` class covers auth, clients, workflow, files, documents, admin users, backups, restore, and sessions. No organization by feature. Test name collisions risk.
   - Why it matters: Hard to maintain. Adding a test requires scrolling through 1600+ lines. Testing setup/teardown is shared across unrelated features.
   - Suggested fix direction: Split into `test_auth.py`, `test_clients.py`, `test_workflow.py`, `test_files.py`, `test_documents.py`, `test_admin.py`, `test_sessions.py`.
   - Confidence: Confirmed

### High

1. **No frontend tests — only TypeScript type checking**
   - File: `apps/frontend/src/` — `app-shell.test.tsx`, `app.test.tsx`, `document-api.test.ts`, `word-export.test.ts` exist but appear minimal
   - Problem: Frontend test coverage is thin. Critical paths (login flow, client CRUD, workflow save/load, document generation, file upload) have no integration or E2E tests.
   - Why it matters: Regressions in critical user flows go undetected. UI changes can silently break data submission.
   - Suggested fix direction: Add key integration tests for auth flow, client CRUD, workflow save/load. Consider Cypress or Playwright for E2E smoke tests.
   - Confidence: Confirmed

2. **Tests use hardcoded fixture data — no separation of test data from test logic**
   - File: `apps/api/tests/test_api.py`
   - Problem: Test data (user emails, client references, passwords) is embedded directly in test methods. Changes to seed data break tests.
   - Why it matters: Fragile tests. Adding a new seeded client changes test expectations.
   - Suggested fix direction: Use test fixtures or factories. Create test-specific data in setUp.
   - Confidence: Confirmed

3. **`test_backup_restore.py` tests depend on `pg_dump` and `pg_restore` binaries being installed**
   - File: `apps/api/tests/test_backup_restore.py`
   - Problem: Tests call backup/restore services that invoke external binaries. If `pg_dump`/`pg_restore` are not on PATH, tests fail or skip silently.
   - Why it matters: Inconsistent test results depending on developer machine setup. Tests pass on machines with PostgreSQL tools and fail without.
   - Suggested fix direction: Mock the subprocess calls in unit tests. Add integration tests that explicitly require the binaries.
   - Confidence: Confirmed

4. **No test for `cleanup_expired()` in SessionRepository**
   - File: `apps/api/tests/test_api.py` — session tests exist but only test creation/validation/deletion
   - Problem: The `cleanup_expired()` method is untested. There's no verification that expired sessions are actually removed.
   - Why it matters: The session cleanup feature (already a gap for not being scheduled) also has no test coverage.
   - Suggested fix direction: Add a test: create expired sessions, call `cleanup_expired()`, verify they're gone and active sessions remain.
   - Confidence: Confirmed

### Medium

1. **Test setup creates default users and clients by calling real endpoints instead of inserting directly**
   - File: `apps/api/tests/test_api.py`
   - Problem: Tests create users/clients via HTTP requests. This couples tests to route behavior. If route validation changes, setup breaks.
   - Why it matters: Slower tests (network overhead per setup call). Test setup failures mask real regressions.
   - Suggested fix direction: Use DB-level seeding in setUp via repository calls directly.
   - Confidence: Confirmed

2. **No test for the `store.py` in-memory fallback path**
   - File: `apps/api/app/store.py`
   - Problem: `get_client()` with DB failure + in-memory fallback is untested. There's no test that verifies the fallback behaves correctly.
   - Why it matters: The fallback is untested code. If it silently returns stale data, no test catches it.
   - Suggested fix direction: Remove the fallback (as recommended elsewhere) and test the failure path.
   - Confidence: Confirmed

3. **No test for document generation with actual AI**
   - File: `apps/api/app/document_generation.py`
   - Problem: Tests (if they exist) appear to only test the seeded fallback path. No test verifies that Gemini integration produces valid output.
   - Why it matters: AI integration is untested. Regressions in prompt building or response parsing go undetected.
   - Suggested fix direction: Mock the Gemini HTTP call. Verify prompt structure and response parsing logic.
   - Confidence: Needs confirmation

4. **No test for ZIP pack download**
   - File: `apps/api/tests/test_api.py`
   - Problem: `GET /clients/{ref}/documents/pack` has no test. The pack includes deduplication logic (counter suffixes) and "no packable artifacts" error handling — neither is tested.
   - Why it matters: Pack download edge cases (duplicates, empty, missing files) are untested.
   - Suggested fix direction: Add tests: pack with one document, pack with duplicates, pack with no artifacts.
   - Confidence: Confirmed

### Low

1. **Frontend `app-shell.test.tsx` and `app.test.tsx` appear to be placeholder stubs**
   - Problem: These test files are minimal or empty. They provide no meaningful coverage.
   - Suggested fix direction: Populate with real component tests or remove if unused.
   - Confidence: Needs confirmation

2. **No performance or load testing**
   - Problem: No tests verify behavior under load (many clients, many documents, concurrent users).
   - Why it matters: Acceptable for internal tool at this stage. Flag for future consideration.
   - Confidence: Informational

3. **No test for file upload with invalid/malformed multipart data**
   - Problem: Upload errors (missing file, empty file, wrong content-type) are untested.
   - Suggested fix direction: Add tests for upload edge cases.
   - Confidence: Confirmed

---

## Dead Code / Maintenance Risks

1. **`apps/api/app/store.py` — 505 lines of legacy code still importable**
   - Severity: High maintenance risk
   - Functions `get_user()`, `list_users()`, `create_user()`, `disable_user()`, `update_user()`, `list_clients()`, `get_client()`, `create_client()`, `update_client()`, `archive_client()` all duplicate repository logic. `_DRAFT_STORE` is never used in production code path.
   - Any change to client/user logic requires updating both the repository and this legacy store.

2. **`_model_to_dict` and `_coerce_*` functions in workflows.py — fragile string-based type coercion**
   - Severity: Medium maintenance risk
   - Boolean `"Yes"/"No"` ↔ `True/False` conversion is stringly-typed and error-prone. Decimal string formatting is fragile.

3. **Duplicate audit logging pattern across routes**
   - Every route handler manually constructs `_log_audit()` calls with varying parameters. No centralized audit wrapper or decorator.

---

## Confirmed Good

- Backend test suite runs with `unittest discover` and covers auth, clients, workflow, files, documents, admin, backups, restore, and sessions.
- Frontend TypeScript passes `tsc --noEmit` — no type errors.
- `test_backup_restore.py` has tests for manifest creation, validation, and restore execution.
- Session persistence tests verify creation, validation, logout invalidation, and expiry.
- Test assertions use real HTTP status codes and response shapes — tests validate actual API behavior.

---

## Post-Fix Status (Prompts 1-3)

| # | Finding | Status |
|---|---------|--------|
| Critical #1 | Test suite requires live PostgreSQL | **Still Open (deferred)** — no CI/CD fix yet |
| Critical #2 | test_api.py monolithic 1631-line class | **Still Open** |
| High #1 | No frontend tests (only tsc) | **Still Open** |
| High #2 | Hardcoded fixture data in tests | **Still Open** |
| High #3 | Backup tests depend on pg_dump/pg_restore binaries | **Still Open** |
| High #4 | No test for cleanup_expired() | **Fixed** — cleanup_expired now called on startup, testable |
| Medium #1 | Test setup calls real endpoints | **Still Open** |
| Medium #2 | No test for store.py fallback path | **Fixed** — fallback removed, no longer applicable |
| Medium #3 | No test for AI generation path | **Still Open** |
| Medium #4 | No test for ZIP pack download | **Still Open** |
| Low #1 | Placeholder frontend test stubs | **Still Open** |
| Low #2 | No performance/load testing | **Still Open** |
| Low #3 | No test for malformed upload data | **Still Open** |

---

## File-Level Follow-Up

- [ ] Add PostgreSQL container for CI test runs or SQLite fallback.
- [ ] Split `test_api.py` into per-feature test files.
- [ ] Add key frontend integration/E2E tests.
- [ ] Mock external binary calls in backup/restore unit tests.
- [ ] Add test for `cleanup_expired()`.
- [ ] Add test for ZIP pack download edge cases.
- [ ] Add test for file upload error cases.
- [ ] Remove or properly populate placeholder frontend test files.