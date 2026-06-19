# Scope: Auth & Admin

Use this scope when editing login/session behavior, admin users, audit logs, backups, or security summaries.

## Entry points

- `apps/api/app/main.py` - `/auth/*` and `/admin/*` routes
- `apps/api/app/security.py` - password/session helpers
- `apps/api/app/store.py` - seeded users, audit logs, backup runs, security summary
- `apps/frontend/src/auth/auth-context.tsx` - frontend session mirror
- `apps/frontend/src/pages/admin-page.tsx` - admin UI

## Live auth facts

- Backend session keys: `user_email`, `last_seen_at`
- Admin enforcement comes from `_require_admin()` after resolving the current user
- Frontend stores a lightweight user mirror in `sessionStorage`, but the backend cookie remains authoritative

## Password scheme

- `hash_password()` and `verify_password()` in `security.py`
- PBKDF2-HMAC-SHA256 with a random salt

## Admin panels in current code

| Panel | Backing state |
|-------|---------------|
| Users | Seeded in-memory users |
| Audit Logs | Seeded in-memory audit list |
| Backups | Seeded in-memory backup runs |
| Security | Seeded in-memory security summary |

## Current limitations

- No DB-backed users
- No durable audit persistence
- No real backup execution/scheduling
- No live remote-access infrastructure wiring
