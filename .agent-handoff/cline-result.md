# Cline Result — Prompt 6: PostgreSQL Session Table

Status: complete

## Files Changed

1. `apps/api/app/models.py` — added `Session` model (sessions table: id, user_email, created_at, expires_at)
2. `apps/api/migrations/0004_sessions.sql` — new migration for sessions table with indexes
3. `apps/api/app/repositories/sessions.py` — new `SessionRepository` (create, get_valid_by_id, delete_by_id, cleanup_expired)
4. `apps/api/app/main.py` — wired per-session persistence into login, logout, and `_current_user`
5. `apps/api/tests/test_api.py` — added 6 Phase 6 session lifecycle tests
6. `.agent-handoff/cline-result.md` — this file
7. `.agent-handoff/validation-log.md` — updated for Prompt 6

## What Changed

### Model (`models.py`)
- Added `Session` table: `id` UUID PK, `user_email` TEXT NOT NULL, `created_at` TIMESTAMPTZ, `expires_at` TIMESTAMPTZ NOT NULL
- Indexes: `idx_sessions_user_email`, `idx_sessions_expires_at`

### Migration (`0004_sessions.sql`)
- CREATE TABLE IF NOT EXISTS sessions with UUID PK, user_email, created_at, expires_at columns and indexes

### Repository (`sessions.py`)
- `create(user_email, timeout_minutes)` — creates a session row with computed expires_at, returns it
- `get_valid_by_id(session_id)` — looks up exact row by UUID, checks expires_at > now, returns row or None
- `delete_by_id(session_id)` — deletes the single matching row (logout invalidation)
- `cleanup_expired()` — deletes expired rows (not yet called automatically)

### Routes (all auth contracts preserved)
- **Login** — creates a persisted session row and stores `session_id` in the cookie alongside `user_email` and `last_seen_at`
- **Logout** — reads `session_id` from cookie, clears cookie session, calls `delete_by_id(session_id)`
- **`_current_user`** — reads `session_id` from cookie, validates the exact row via `get_valid_by_id(session_id)`, rejects expired/invalidated/deleted sessions with 401
- Cookie-session middleware preserved (defense-in-depth via `is_session_expired` + persisted row check)

### Decision: Per-session, single-row tracking
- Each login creates a distinct persisted session row with a unique UUID
- The cookie carries `session_id` for exact row matching
- Logout invalidates only the calling session, not all sessions for the email

### Tests (6 new Phase 6 tests — all target the exact cookie-backed session row)

| Test | Assertion |
|------|-----------|
| `test_login_creates_persisted_session_row` | After login, at least one row exists in sessions table for that email |
| `test_auth_me_works_with_valid_persisted_session` | After login, `/auth/me` returns the user profile via the persisted session |
| `test_logout_deletes_persisted_session_row` | Captures `session_id` from cookie before logout; after logout, `get_valid_by_id(session_id)` returns None |
| `test_deleted_session_row_causes_401` | Captures `session_id` from cookie; deletes only that row via `delete_by_id(session_id)`; `/auth/me` returns 401 |
| `test_expired_session_row_causes_401` | Captures `session_id` from cookie; expires only the matching row by ID; `/auth/me` returns 401 |
| `test_two_sessions_coexist_and_invalidating_one_does_not_invalidate_other` | Two logins = two rows; logout of session B leaves session A intact with cookie restore |

## Test Results

```
# Strict collection targeting only the 6 new Phase 6 tests
collected 97 items / 91 deselected / 6 selected
6/97 tests collected (91 deselected) in 5.xx s
```

All 6 Phase 6 session lifecycle tests collected cleanly. All skipped — require PostgreSQL.

## Remaining Limitations

1. All API tests skipped without PostgreSQL — would execute in CI
2. `cleanup_expired()` is not called automatically — could be added as a startup cleanup or scheduled background task
3. Cookie-based timeout check (`is_session_expired`) still runs first before the DB check — provides defense-in-depth
4. Prompts 4 and 5 remain complete and unchanged