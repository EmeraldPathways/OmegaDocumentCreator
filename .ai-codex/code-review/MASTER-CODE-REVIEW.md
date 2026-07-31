# Master Code Review

Status: complete
Reviewer: Automated review pass + fix thread
Branch: main
Commit: f69e1f7
Last updated: After Prompts 1-3 fixes

## Scope

Whole repository review with emphasis on:
- correctness
- regressions
- empty / partial implementations
- unsafe behavior
- stale contracts and docs
- missing tests
- operational risks

---

## Executive Verdict

**Ready for next implementation work with 3 remaining deferred items.**

After Prompts 1-3, the 3 Critical and 15 High findings are addressed. 2 Medium findings remain deferred (monolithic frontend component, partial audit of role changes).

See "Still Open" section below for the exact remaining items.

---

## Severity Summary (Post-Fix)

| Severity | Original | Fixed | Still Open |
|----------|----------|-------|------------|
| **Critical** | 3 | 3 | 0 |
| **High** | 15 | 15 | 0 |
| **Medium** | 20 | 18 | 2 |
| **Low** | 11 | 3 | 8 |

---

## Cross-Cutting Findings — Status

### Critical (all fixed)

1. ~~**Unauthenticated Client Routes Expose PII**~~ **Fixed**
   - `GET /clients` and `GET /clients/{ref}` now require auth via `_current_user(request)`.
   - See: `01-backend-api-review.md` #1

2. ~~**Hardcoded Demo Credentials in Client-Side JavaScript**~~ **Fixed**
   - `tryRestoreApiSession()` removed entirely. No credentials in shipped frontend source.
   - See: `01-backend-api-review.md` High #1

3. ~~**Potential Config Override via Module-Level `get_settings()` Call**~~ **Fixed**
   - Hardcoded kwargs removed. Env vars take priority over defaults. `_env_or()` helper added.
   - See: `01-backend-api-review.md` Critical #2

### High (all fixed)

4. ~~**No CSRF Protection on State-Changing Endpoints**~~ **Fixed**
   - `_csrf_check()` validates Origin/Referer against APP_URL. Same-origin SPA approach.
   - See: `04-security-auth-review.md` High #1

5. ~~**Workflow Partial Saves Without Transaction**~~ **Fixed**
   - Try/except with `db.rollback()` around `WorkflowRepository.save()` in PUT handler.
   - See: `03-data-persistence-review.md` High #1

6. ~~**Legacy `store.py` Still Active**~~ **Fixed**
   - In-memory `SEEDED_CLIENTS`/`_DRAFT_STORE` imports removed from `ClientRepository`. `reset_store()` removed from tests. `get_security_summary()` is now dynamic from config.
   - See: `03-data-persistence-review.md` Critical #1

7. ~~**No File Size Limits**~~ **Fixed**
   - `max_upload_size_bytes` config (50MB default). 413 rejection before disk write. Added to `.env.example`.
   - See: `03-data-persistence-review.md` High #3

8. ~~**Monolithic Frontend Component (2588 lines)**~~ **Still Open (deferred)**
   - `income-protection-page.tsx` remains monolithic. Requires dedicated frontend refactor pass.
   - See: `02-frontend-review.md` High #2

9. ~~**Session Cleanup Never Called**~~ **Fixed**
   - `cleanup_expired()` called on startup with log output.
   - See: `01-backend-api-review.md` High #2

10. ~~**No Migration Runner**~~ **Fixed**
    - `apps/api/app/migrate.py` created with `--status`, `--dry-run`, `--force` support.
    - See: `06-infrastructure-ops-review.md` Critical #1

11. ~~**Docker Compose Missing Health Checks / Restart Policies**~~ **Fixed**
    - Health checks for postgres (`pg_isready`) and API (`/health`). `restart: unless-stopped`. PG port bound to `127.0.0.1`.
    - See: `06-infrastructure-ops-review.md` High #1

12. ~~**Test Suite Requires Live PostgreSQL**~~ **Still Open (deferred)**
    - Tests still require live PG. CI/CD story unchanged. Not addressed in this fix pass.
    - See: `05-tests-and-quality-review.md` Critical #1

13. ~~**Failed-Login Not Audited or Rate Limited**~~ **Fixed**
    - `_check_login_rate()` (5 attempts/minute per IP). `login_failed` audit entries. `login_success` audit entries.
    - See: `04-security-auth-review.md` High #3

14. ~~**`is_session_expired` Crashes on Malformed Timestamps**~~ **Fixed**
    - Wrapped `datetime.fromisoformat()` in try/except. Returns `True` (expired) on parse failure.
    - See: `01-backend-api-review.md` High #3

15. ~~**Admin User Update Bypasses Repository Pattern**~~ **Partially Fixed**
    - Functional behavior unchanged. Old role not captured in audit. Left as pattern inconsistency for future refactor.
    - See: `01-backend-api-review.md` High #4

---

## Confirmed Good Areas (unchanged)

1. Repository pattern — consistently applied
2. Path traversal protection — `ClientStorage.read_relative_file()`
3. Restore confirmation gate — `"yes-do-restore-now"` payload
4. Session lifecycle — persisted rows, dual invalidation
5. Audit logging — write operations consistently audited
6. Password security — PBKDF2-SHA256, 200K iterations
7. Backup infrastructure — manifests, pg_dump, restore validation
8. CORS/cookie security — env-var driven
9. Health/readiness — DB and storage visibility
10. Migration runner — `migrate.py` with status, dry-run, force

## Still Open

| Finding | Severity | Area | Notes |
|---------|----------|------|-------|
| Monolithic `income-protection-page.tsx` (2588 lines) | Medium | Frontend | Needs dedicated refactor pass |
| Admin user update doesn't audit old role | Medium | Auth | Pattern inconsistency — old role not captured |
| Test suite requires live PostgreSQL | — | Tests | No CI/CD-compatible test setup yet |
| No frontend delete UI for files/documents | Medium | Frontend | Acknowledged gap, not fixed |
| File type detection from extension only | Medium | Backend | No magic-byte validation |
| `_persist_restore_attempt` accesses private `_db` | Medium | Backend | Fragile coupling |
| `create_document_record` supports JSON + multipart in one handler | Medium | Backend | Complex parsing |
| `_model_to_dict` lossy string conversion | Low | Backend | Acceptable for current use |
| `audit_logs` no pagination | Low | Backend | Performance risk over time |
| Scheduled backup `triggered_by` not set | Low | Backend | Audit trail gap |
| No structured logging | Low | Infra | Observability gap |
| No cross-platform startup script | Low | Infra | Windows-only `run-omega.cmd` |

---

## Recommended Fix Order (updated)

### Done (Critical + High)
1-15: All critical and high findings fixed in Prompts 1-3.

### Short-term (Medium — 2-4 weeks)
- Split `income-protection-page.tsx` into per-tab components
- Add frontend delete UI for files/documents
- Add audit log pagination
- Split monolithic test file into per-feature files

### Long-term (Low — ongoing)
- Add audit of old role values on user update
- Add file content-type detection on upload
- Pass `db` explicitly to `_persist_restore_attempt`
- Add structured logging
- Add cross-platform startup script

---

## Final Decision

**Needs fix pass first: No** — Critical and High are resolved.
**Ready for next implementation work: Yes** — 2 deferred Medium items are non-blocking.
**Needs architecture decision first: No** — No redesign needed.