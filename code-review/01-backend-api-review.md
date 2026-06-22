# Backend / API Review

Status: complete
Reviewer: Automated review pass

## Scope

- `apps/api/app/main.py` — route handlers, auth guards
- `apps/api/app/models.py` — SQLAlchemy models
- `apps/api/app/repositories/` — DB-backed repositories
- `apps/api/app/services/` — storage, backup, restore, scheduler
- `apps/api/app/document_generation.py` — AI doc generation
- `apps/api/migrations/` — schema migrations

---

## Findings

### Critical

1. **`GET /clients` and `GET /clients/{ref}` have no auth guard**
   - File: `apps/api/app/main.py`, lines 424, 470
   - Function: `clients()`, `client_detail()`
   - Problem: Both routes are public — no `_current_user()` call. Any unauthenticated request can enumerate all clients and view full client details including PII (email, mobile, date of birth, address, dependants).
   - Why it matters: Direct PII leak. The PROJECT.md and api-surface.md claim these require session auth but the code has none.
   - Suggested fix direction: Add `_current_user(request)` at the top of both handlers.
   - Confidence: Confirmed

2. **Module-level `get_settings()` with hardcoded fallbacks overrides real config**
   - File: `apps/api/app/main.py`, lines 41-48
   - Problem: `settings = get_settings(DATABASE_URL="postgresql://placeholder", ...)` is called at import time with literal defaults. If `get_settings()` prefers these kwargs over env vars, the entire app runs with development-only defaults regardless of `.env` settings.
   - Why it matters: Security (SESSION_SECRET="development-only"), incorrect DATABASE_URL, wrong storage paths. Could silently run in production with dev config.
   - Suggested fix direction: Remove hardcoded args from the call. Use `get_settings()` with no arguments or ensure env vars take precedence.
   - Confidence: Needs confirmation — depends on exact `get_settings` implementation in config.py.

3. **`_current_user` commits DB after updating `last_seen_at` with no error handling**
   - File: `apps/api/app/main.py`, lines 269-270
   - Problem: `request.session["last_seen_at"] = ...` then `db.commit()` — if commit fails, the cookie session is updated but DB isn't. Also, if the commit succeeds but later route logic fails, no rollback occurs.
   - Why it matters: DB/cookie session state inconsistency. A failed commit after cookie update means next `_current_user` call finds stale `last_seen_at` in cookie but correct DB state.
   - Suggested fix direction: Wrap commit in try/except; clear the session cookie update on failure.
   - Confidence: Confirmed

### High

1. **`tryRestoreApiSession()` contains hardcoded demo credentials**
   - File: `apps/frontend/src/documents/document-api.ts` (referenced from frontend review but the function POSTs to `/auth/login` with hardcoded `admin@omega.local` / `ChangeMe123!`)
   - Problem: Demo credentials are baked into frontend code that ships to browsers. Anyone can extract them from the JS bundle.
   - Why it matters: If default admin credentials aren't changed in production, this is a direct login vector.
   - Suggested fix direction: Remove `tryRestoreApiSession()` entirely; handle 401s by redirecting to login page.
   - Confidence: Confirmed

2. **Session cleanup (`cleanup_expired`) never called automatically**
   - File: `apps/api/app/repositories/sessions.py`, line 47
   - Problem: `cleanup_expired()` is implemented but there's no scheduled task, startup event, or route that calls it. Expired session rows accumulate indefinitely.
   - Why it matters: Unbounded table growth. Over time the sessions table fills the DB, degrading performance.
   - Suggested fix direction: Call `cleanup_expired()` on startup and wire it into the backup scheduler or a separate periodic task.
   - Confidence: Confirmed (acknowledged as a gap in PROJECT.md and architecture.md)

3. **`is_session_expired` crashes on malformed `last_seen_at` values**
   - File: `apps/api/app/security.py`, lines 21-26
   - Problem: `datetime.fromisoformat(last_seen_at)` with no try/except. If the cookie carries a corrupted or non-ISO timestamp string, this raises an unhandled exception (500) instead of treating the session as expired.
   - Why it matters: An attacker or buggy client sending a bad timestamp cookie causes a 500 crash for every authenticated request.
   - Suggested fix direction: Wrap `fromisoformat` in try/except; return `True` (session expired) on parse failure.
   - Confidence: Confirmed

4. **`admin_update_user` bypasses repository pattern — direct model mutation**
   - File: `apps/api/app/main.py`, lines 956-958
   - Problem: `user_model.first_name = payload.first_name`, `user_model.last_name = payload.last_name`, `user_model.role = payload.role` — directly mutates ORM model attributes. No validation, no audit of old values, no `updated_at` tracking (User model has `updated_at` with `onupdate` but it may not fire depending on session state).
   - Why it matters: Inconsistent with the rest of the codebase which uses repository methods. Bypasses any future hooks, validation, or business logic in UserRepository.
   - Suggested fix direction: Add an `update()` method to UserRepository and call it, similar to ClientRepository.update().
   - Confidence: Confirmed

### Medium

1. **`file_type` set from filename extension — no content/MIME validation**
   - File: `apps/api/app/main.py`, lines 1274-1275
   - Problem: `ext = filename.rsplit(".", 1)[-1].lower()` trusts the filename supplied by the client. No magic-byte or MIME type check on the actual binary content.
   - Why it matters: A file named `malware.exe.pdf` gets stored as `.pdf` type. While the file isn't executed server-side, incorrect file types mislead downstream consumers and potentially enable social engineering.
   - Suggested fix direction: Use `python-magic` or `filetype` library to detect actual content type on upload.
   - Confidence: Confirmed

2. **`_persist_restore_attempt` accesses private `backup_repo._db` attribute**
   - File: `apps/api/app/main.py`, line 1195
   - Problem: `user_repo = UserRepository(backup_repo._db)` accesses `_db` (private by convention). If BackupRepository changes its internal attribute name, this breaks silently.
   - Why it matters: Fragile coupling between functions. A refactor of BackupRepository breaks restore attempt logging.
   - Suggested fix direction: Pass `db` explicitly to `_persist_restore_attempt` instead of deriving it from the repo.
   - Confidence: Confirmed

3. **`create_document_record` supports both JSON and multipart in one handler — complex parsing**
   - File: `apps/api/app/main.py`, lines 648-726
   - Problem: The endpoint checks `content-type` header and branches between `request.form()` and `request.json()`. Content-type can be manipulated by clients, and the multipart branch sets `payload` to form field strings while the JSON branch trusts any dict structure. No Pydantic model validation for multipart.
   - Why it matters: Inconsistent validation between the two code paths. Missing required field enforcement on multipart path.
   - Suggested fix direction: Split into two endpoints or use a Pydantic model to validate multipart form fields after extraction.
   - Confidence: Confirmed

4. **No failed-login audit logging or rate limiting**
   - File: `apps/api/app/main.py`, lines 371-396
   - Problem: `POST /auth/login` creates audit entries only after successful login (via `_log_audit` indirect). Failed attempts produce no record. No rate limiting exists on the login endpoint.
   - Why it matters: Brute-force attacks go undetected. No visibility into attack patterns.
   - Suggested fix direction: Log failed attempts with IP and email. Add per-IP or per-email rate limiting (e.g., 5 attempts per minute).
   - Confidence: Confirmed

5. **`store.py` — 505 lines of legacy in-memory code that remains importable and callable**
   - File: `apps/api/app/store.py`
   - Problem: The in-memory store (`SEEDED_USERS`, `SEEDED_CLIENTS`, `_DRAFT_STORE`) still exists and functions like `get_client()` implement a hybrid DB-then-in-memory fallback. The `create_client()` function generates references with hardcoded year `CLI-2026-{seq}`. `get_security_summary()` returns a static template that never reflects actual config.
   - Why it matters: Code that's supposed to be deprecated is still reachable. `main.py` imports `get_security_summary` from store.py (line 39). Hybrid fallback in `get_client()` means in-memory data could silently serve stale data if DB is unavailable, masking real errors.
   - Suggested fix direction: Remove in-memory stores. Make `get_security_summary()` dynamic from `settings`. Remove the hybrid client lookup pattern entirely.
   - Confidence: Confirmed

6. **`_build_client_slug_from_model` uses untyped `object` parameter**
   - File: `apps/api/app/main.py`, lines 1228-1235
   - Problem: Function signature says `client: object` and accesses `client.client_reference`, `client.first_name`, etc. via attribute access. If a non-Client model is passed, this fails at runtime with `AttributeError`.
   - Why it matters: No static type checking. Bugs from passing wrong objects surface only in production.
   - Suggested fix direction: Change parameter type to `Client` (the SQLAlchemy model from `app.models`).
   - Confidence: Confirmed

### Low

1. **`_log_audit` function defined inside main.py rather than in a dedicated module**
   - File: `apps/api/app/main.py`, lines 288-307
   - Problem: The audit helper lives in the route file. Repository pattern suggests this should be in the audit_logs repository or a service.
   - Why it matters: Minor organizational issue. Not a functional bug.
   - Suggested fix direction: Move to AuditLogRepository as a static/class method or to a dedicated audit service.
   - Confidence: Informational

2. **`_model_to_dict` in workflows.py converts all non-None, non-bool values to strings**
   - File: `apps/api/app/repositories/workflows.py`, lines 102-115
   - Problem: `result[front_key] = str(val).strip()` for any non-bool, non-date value. Numeric fields from DB (Decimal) are converted to strings in the GET response but the frontend sends them back as strings too. This works but is lossy for numeric precision.
   - Why it matters: Round-trip precision loss for monetary values (e.g., `Decimal("1500.00")` → `"1500.00"` → `Decimal("1500.00")` — works for display but may lose trailing zeros in some edge cases).
   - Suggested fix direction: Acceptable as-is for current use case. Document the behavior.
   - Confidence: Informational

3. **Migration `0004_sessions.sql` creates table without `session_id` column referenced in patterns.md**
   - File: `apps/api/migrations/0004_sessions.sql` vs `patterns.md` line 116
   - Problem: patterns.md claims "There is no `sessions` table in the migration" but `0004_sessions.sql` does exist with the sessions table. This is a documentation drift — the migration exists and is correct, the doc is stale.
   - Why it matters: Stale docs confuse future developers.
   - Suggested fix direction: Update patterns.md line 116 to reflect that the sessions migration exists.
   - Confidence: Confirmed

4. **`phase1-8.md` references `migrations/0003_restore_attempts.sql` but models.py has no corresponding migration in migrations/ directory**
   - The `restore_attempts` migration (0003) is listed in the index but the actual file needs to be verified to exist. The `backup_runs` table is in `0001_initial.sql` (line 9 of the migration), but `restore_attempts` in a separate migration means the schema may need both migrations applied in order.
   - Why it matters: Potential migration ordering issue if `backup_runs` table isn't created before `restore_attempts` references it via FK.
   - Suggested fix direction: Verify migration order. The FKs in 0003 reference `backup_runs` which is created in 0001 — correct.
   - Confidence: Needs confirmation

---

---

## Post-Fix Status (Prompts 1-3)

| # | Finding | Status |
|---|---------|--------|
| Critical #1 | `GET /clients` and `GET /clients/{ref}` no auth guard | **Fixed** — `_current_user(request)` added |
| Critical #2 | Module-level `get_settings()` with hardcoded fallbacks | **Fixed** — hardcoded kwargs removed, `_env_or()` helper |
| Critical #3 | `_current_user` commits DB with no error handling | **Still Open** — out of scope for this fix pass |
| High #1 | `tryRestoreApiSession()` hardcoded credentials | **Fixed** — function removed from frontend |
| High #2 | Session cleanup never called | **Fixed** — `cleanup_expired()` called on startup |
| High #3 | `is_session_expired` crashes on malformed timestamps | **Fixed** — try/except wraps `fromisoformat` |
| High #4 | `admin_update_user` bypasses repository pattern | **Partially Fixed** — functional, old role not audited |
| Medium #1 | `file_type` set from filename extension only | **Still Open** |
| Medium #2 | `_persist_restore_attempt` accesses private `_db` | **Still Open** |
| Medium #3 | `create_document_record` JSON + multipart in one handler | **Still Open** |
| Medium #4 | No failed-login audit or rate limiting | **Fixed** — `_check_login_rate()`, `login_failed` audit |
| Medium #5 | `store.py` 505 lines of legacy in-memory code | **Fixed** — in-memory fallback removed from `ClientRepository`, `get_security_summary` dynamic |
| Medium #6 | `_build_client_slug_from_model` untyped `object` param | **Still Open** |
| Low #1 | `_log_audit` in main.py instead of dedicated module | **Still Open** |
| Low #2 | `_model_to_dict` lossy string conversion | **Still Open** |
| Low #3 | Migration docs drift (sessions table) | **Still Open** — docs not yet updated |
| Low #4 | `phase1-8.md` migration reference | **Still Open** |

### New additions from fix passes
- **CSRF protection** added — `_csrf_check()` validates origin for state-changing routes
- **Upload size limit** added — `max_upload_size_bytes` config with 413 rejection
- **Login rate limiting** added — 5 attempts/minute per IP
- **Dynamic security summary** — now reflects `settings.remote_access_mode`, `settings.session_timeout_minutes`

---

## Confirmed Good

- Repository pattern is consistently used across all DB access (with the noted exception in `admin_update_user`).
- `ClientStorage` has proper path traversal guards preventing directory escape attacks.
- Backend sessions properly associate cookie `session_id` with persisted PostgreSQL rows.
- Restore execution requires explicit confirmation payload `{"confirm": "yes-do-restore-now"}`.
- Audit logging is consistently applied to write operations.
- Backup manifest and optional pg_dump integration is well-structured.
- CORS and cookie security settings are configurable via env vars.
- Health/readiness endpoints provide useful operational visibility.

---

## File-Level Follow-Up

- [ ] `main.py` line 41-48: Verify `get_settings()` precedence — do env vars override the hardcoded kwargs?
- [ ] `main.py` line 424, 470: Add auth guards to client list and detail endpoints.
- [ ] `main.py` lines 269-270: Add error handling around `db.commit()` in `_current_user`.
- [ ] `security.py` line 26: Add try/except around `fromisoformat`.
- [ ] `main.py` lines 956-958: Add UserRepository.update() method and use it.
- [ ] `main.py` lines 1274-1275: Add content-type detection for file uploads.
- [ ] `main.py` line 1195: Pass db explicitly to `_persist_restore_attempt`.
- [ ] `store.py`: Deprecate entirely or make `get_security_summary` dynamic.