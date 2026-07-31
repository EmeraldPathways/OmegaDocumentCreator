# Scope: Auth & Admin

Use this scope when editing login/session behavior, admin users, audit logs, backups, restore, security summaries, or settings.

## Entry points

- `apps/api/app/main.py` - `/auth/*`, `/users/assignable`, and `/admin/*` routes
- `apps/api/app/security.py` - password/session helpers
- `apps/api/app/repositories/users.py` - DB-backed user CRUD, password resets, login stamps
- `apps/api/app/repositories/sessions.py` - persisted session rows and expiry updates
- `apps/frontend/src/auth/auth-context.tsx` - frontend session mirror
- `apps/frontend/src/data/admin-api.ts` - admin API client
- `apps/frontend/src/pages/admin-page.tsx` - admin UI

## Live auth facts

- Backend session keys: `session_id`, `user_email`, `last_seen_at`
- `_current_user()` validates the persisted session row and extends session expiry
- Admin enforcement comes from `_require_admin()` after resolving the current user
- Frontend mirrors the current user in `sessionStorage`, but the backend cookie/session row remain authoritative
- Live roles are `admin`, `manager`, and `staff`
- `manager` grants global client/workflow/file/document visibility without admin-panel access
- startup currently promotes the known full-record Omega users to `manager`

## Password scheme

- `hash_password()` and `verify_password()` live in `security.py`
- PBKDF2-HMAC-SHA256 with a random salt
- Malformed hashes fail closed during verification

## Live admin panels

| Panel | Backing state |
|-------|---------------|
| Users | PostgreSQL via `/admin/users` |
| Audit Logs | PostgreSQL via `/admin/audit-logs` |
| Backups | PostgreSQL + backup manifests via `/admin/backups*` |
| Security | Live backend counts and summary via `/admin/security*` |
| Settings | Live backend settings via `/admin/settings*` |

## Live admin capabilities

- create user
- update name, role, status, and force-password-change flag
- reset password to a temporary value
- disable or enable accounts
- review last login
- filter audit logs including `client_reference`
- validate, dry-run, and execute restores

## Constraints

- do not reintroduce seeded fallback users into live startup
- login failures must surface as `401` or `403`, not `500`
- disabled users must not authenticate
- do not let session-role coercion collapse `manager` back to `staff`
- restore execute must continue requiring approval token plus confirmation text
