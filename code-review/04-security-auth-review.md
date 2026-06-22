# Security / Auth Review

Status: complete
Reviewer: Automated review pass

## Scope

- Authentication (login/logout/session)
- Authorization (staff vs admin)
- Cookie security
- Input validation
- Destructive operations (delete, restore)
- Credentials management

---

## Findings

### Critical

1. **Two client routes are publicly unauthenticated exposing PII**
   - File: `apps/api/app/main.py`, lines 424, 470
   - Routes: `GET /clients`, `GET /clients/{client_reference}`
   - Problem: No `_current_user()` call. Full client records (name, email, phone, DOB, address, dependants) returned to unauthenticated requests.
   - Why it matters: Direct PII data breach. Violates the API surface contract which states these require auth.
   - Suggested fix direction: Add `_current_user(request)` at the top of both functions.
   - Confidence: Confirmed

2. **`tryRestoreApiSession()` — hardcoded admin credentials in browser bundle**
   - File: `apps/frontend/src/documents/document-api.ts`
   - Function: `tryRestoreApiSession()`
   - Problem: Hardcoded `admin@omega.local` / `ChangeMe123!` shipped in client-side JavaScript.
   - Why it matters: Trivial credential extraction from browser DevTools. If dev defaults are still in production, admin access is compromised.
   - Suggested fix direction: Remove entirely. Use proper auth redirect on 401.
   - Confidence: Confirmed

3. **`SESSION_SECRET="development-only"` potentially used in production**
   - File: `apps/api/app/main.py`, line 45
   - Problem: The module-level `get_settings()` call passes `SESSION_SECRET="development-only"` as a default. If env var doesn't override, the session secret is predictable.
   - Why it matters: Predictable session secret = anyone can forge session cookies and impersonate any user.
   - Suggested fix direction: Remove hardcoded default. Make `SESSION_SECRET` required with no default in non-dev environments.
   - Confidence: Needs confirmation — depends on `get_settings()` precedence

### High

1. **No CSRF protection on state-changing endpoints**
   - File: `apps/api/app/main.py` — all POST/PUT/PATCH/DELETE routes
   - Problem: Cookie-based session auth with no CSRF tokens. Any authenticated route can be called cross-origin if the browser auto-sends cookies.
   - Why it matters: Cross-site request forgery. An attacker on a different origin could trigger state changes (create clients, upload files, generate documents) if the victim has an active session.
   - Suggested fix direction: Add CSRF token middleware (e.g., Starlette's CSRF or a custom `X-CSRF-Token` header check for non-GET requests). Ensure the frontend reads the token from a cookie and sends it as a header.
   - Confidence: Confirmed

2. **Cookie `same_site` and `https_only` configurable but no enforcement to default to strict values**
   - File: `apps/api/app/main.py`, lines 68-73
   - Problem: `https_only` and `same_site` are configurable but there's no check preventing weak settings. A misconfiguration could set `https_only=false` and `same_site="none"` without warning.
   - Why it matters: Weak cookie settings expose sessions to MITM and CSRF attacks.
   - Suggested fix direction: Log a warning on startup if `COOKIE_SECURE=false` or `COOKIE_SAMESITE="none"` in non-development environments.
   - Confidence: Confirmed

3. **No failed-login audit logging or rate limiting**
   - File: `apps/api/app/main.py`, lines 371-396
   - Problem: Only successful logins are audited. No tracking of failed attempts. No per-IP or per-account rate limiting.
   - Why it matters: Brute-force attacks are undetectable. No defense against password spraying.
   - Suggested fix direction: Log failed attempts with IP, email, and timestamp. Implement per-IP rate limiting (e.g., 5 attempts per minute).
   - Confidence: Confirmed

4. **`_current_user` calls `db.commit()` after updating `last_seen_at` — errors are unhandled**
   - File: `apps/api/app/main.py`, lines 269-270
   - Problem: If `db.commit()` fails, the cookie session has already been updated but the DB hasn't. Next request sees stale cookie `last_seen_at` but correct DB state.
   - Why it matters: Session state inconsistency. Could allow session reuse past intended expiry.
   - Suggested fix direction: Wrap commit in try/except; clear the session cookie on failure.
   - Confidence: Confirmed

5. **`is_session_expired` crashes on malformed timestamps (no try/except)**
   - File: `apps/api/app/security.py`, lines 21-26
   - Problem: `datetime.fromisoformat(last_seen_at)` — unhandled parse error → 500 response.
   - Why it matters: Any request with a corrupted cookie causes a server crash. Potential DoS via malformed cookies.
   - Suggested fix direction: Wrap in try/except; return `True` (treat as expired) on parse failure.
   - Confidence: Confirmed

### Medium

1. **Password hashing uses `hashlib.pbkdf2_hmac` directly — correct algorithm but manual implementation**
   - File: `apps/api/app/security.py`, lines 9-18
   - Problem: Manual salt generation and format (`{salt}${digest}`). No built-in upgrade path if parameters change (iterations, algorithm).
   - Why it matters: Works correctly but lacks future-proofing. Cannot upgrade hash parameters for existing passwords without a migration strategy.
   - Suggested fix direction: Consider `passlib` or include algorithm metadata in the stored hash format (e.g., `$pbkdf2-sha256$200000$salt$digest`).
   - Confidence: Confirmed

2. **Admin user management (`PATCH /admin/users/{user_id}`) allows changing role without confirmation or audit of old role**
   - File: `apps/api/app/main.py`, lines 944-968
   - Problem: An admin can change any user's role in a single request. No "are you sure?" confirmation. The audit log records the new role but not the old role.
   - Why it matters: Privilege escalation could go unnoticed. Auditors cannot see what role was changed from/to — only the new value.
   - Suggested fix direction: Include previous values in the audit log. Add a confirmation step for role changes.
   - Confidence: Confirmed

3. **`DELETE /clients/{ref}/files/{id}` and `DELETE /clients/{ref}/documents/{id}` — no confirmation, no soft-delete**
   - File: `apps/api/app/main.py`, lines 855-893, 1371-1407
   - Problem: Delete operations are immediate and permanent. No soft-delete, no recycle bin, no undo. Auth requires only a valid session (not admin).
   - Why it matters: Accidental deletion by staff is irreversible. No recovery path.
   - Suggested fix direction: Add soft-delete with a retention period. Or require admin role for destructive operations.
   - Confidence: Confirmed

4. **Restore execution (`POST /admin/backups/{backup_id}/restore`) — confirmation string `"yes-do-restore-now"` is predictable**
   - File: `apps/api/app/main.py`, line 1119
   - Problem: The confirmation payload is a static string. Any admin who knows this string can trigger a destructive restore.
   - Why it matters: The confirmation gate is weak. A CSRF attack combined with knowledge of the string could trigger restore.
   - Suggested fix direction: Generate a unique confirmation token per restore attempt and require it in the request. Or require typing the backup ID as confirmation.
   - Confidence: Confirmed

### Low

1. **No `User-Agent` or `X-Forwarded-For` header validation**
   - Problem: No header-based fingerprinting or anomaly detection for sessions.
   - Why it matters: Minor. Session hijacking via cookie theft is not detected.
   - Suggested fix direction: Store `user_agent` and `ip_address` with session rows and validate on each request. Invalidate session on mismatch.
   - Confidence: Informational

2. **`TrustedHostMiddleware` import commented out — not actually used**
   - File: `apps/api/app/main.py`, line 10, then only referenced in a comment at line 77
   - Problem: `TrustedHostMiddleware` is imported but never applied. Host header attacks are possible.
   - Why it matters: Minor in internal deployment. Could be relevant if exposed via Cloudflare Tunnel.
   - Suggested fix direction: Apply `TrustedHostMiddleware` with allowed hosts from config.
   - Confidence: Informational

3. **Audit logs record IP via `request.client.host` — may be 127.0.0.1 behind a reverse proxy**
   - File: `apps/api/app/main.py`, line 305
   - Problem: If behind a reverse proxy (nginx, Cloudflare Tunnel), `request.client.host` is always the proxy's IP, not the real client IP. `X-Forwarded-For` headers need to be trusted.
   - Why it matters: Audit logs lose real client IP information, making forensic investigation impossible.
   - Suggested fix direction: Trust `X-Forwarded-For` when `trusted_proxy_count > 0` and use the real client IP.
   - Confidence: Confirmed

---

## Confirmed Good

- Password hashing uses PBKDF2-SHA256 with 200,000 iterations — strong defaults.
- `verify_password` uses `hmac.compare_digest` — timing-attack resistant.
- Login enforces active user status check (`UserStatus.ACTIVE`).
- Logout invalidates both cookie and persisted session row.
- `_require_admin` properly delegates to `_current_user` then checks role.
- Session timeout is configurable via env var `SESSION_TIMEOUT_MINUTES`.
- Admin-only routes (user management, backups, restore, audit logs) all use `_require_admin`.
- Cookie `https_only` and `same_site` settings are configurable for different deployment scenarios.

---

## Post-Fix Status (Prompts 1-3)

| # | Finding | Status |
|---|---------|--------|
| Critical #1 | GET /clients and GET /clients/{ref} unauthenticated | **Fixed** — `_current_user(request)` added |
| Critical #2 | tryRestoreApiSession() hardcoded credentials | **Fixed** — function removed |
| Critical #3 | SESSION_SECRET override risk | **Fixed** — hardcoded kwargs removed, `_env_or()` helper |
| High #1 | No CSRF protection | **Fixed** — `_csrf_check()` origin validation |
| High #2 | Weak cookie defaults no enforcement | **Partially Fixed** — startup warns in non-dev |
| High #3 | No failed-login audit or rate limiting | **Fixed** — `_check_login_rate()`, `login_failed` audit |
| High #4 | `_current_user` db.commit() no error handling | **Still Open** |
| High #5 | `is_session_expired` crash on malformed timestamps | **Fixed** — try/except around fromisoformat |
| Medium #1 | Manual password hashing implementation | **Still Open** |
| Medium #2 | Role change no old-role audit | **Still Open** |
| Medium #3 | Hard deletes no soft-delete/recycle bin | **Still Open** |
| Medium #4 | Restore confirmation string predictable | **Still Open** |
| Low #1 | No User-Agent/IP session fingerprinting | **Still Open** |
| Low #2 | TrustedHostMiddleware not applied | **Still Open** |
| Low #3 | Audit logs lose real IP behind proxy | **Still Open** |

---

## File-Level Follow-Up

- [ ] Add auth guards to `GET /clients` and `GET /clients/{ref}`.
- [ ] Remove `tryRestoreApiSession()` with hardcoded credentials.
- [ ] Enforce strong defaults for COOKIE_SECURE and COOKIE_SAMESITE in non-dev.
- [ ] Add CSRF protection to all state-changing endpoints.
- [ ] Add failed-login logging and rate limiting.
- [ ] Wrap `datetime.fromisoformat` in try/except in `is_session_expired`.
- [ ] Include old values in audit log for role changes.
- [ ] Add soft-delete or admin-only requirement for file/document deletion.
- [ ] Use real client IP from X-Forwarded-For in audit logs when behind proxy.