# Scope: Auth & Admin

Use this scope when working on login, session, user management, audit logs, or backups.

## Auth entry points

- `apps/api/app/security.py` — hash/verify passwords, check session timeout
- `apps/api/app/store.py` — `USERS` dict, session tracking
- `apps/api/app/main.py` — `/auth/*` routes
- `apps/frontend/src/auth/auth-context.tsx` — session hydration, login/logout

## Session keys

- `user_email: str`
- `last_seen_at: str` (ISO)
- `role: str` — `"admin"` | `"staff"`

## Password scheme

PBKDF2-HMAC-SHA256 with random salt. Always use `hash_password()` and `verify_password()` from `security.py`.

## Role enforcement

- Server-side: check `request.session.get("role") == "admin"` in admin routes
- Frontend: `auth-context.tsx` exposes `user.role` for display gating only

## Admin panel tabs (admin-page.tsx)

| Tab | Status |
|-----|--------|
| Users | Functional — create, update, disable |
| Audit Logs | Stage 12 — seeded in-memory only |
| Backups | Stage 13 — seeded, `Run Backup Now` placeholder |
| Security | Stage 14 — seeded security summary panel |

## Seeded users (from .env.example)

- `ADMIN_EMAIL` / `ADMIN_PASSWORD` — admin role
- `STAFF_EMAIL` / `STAFF_PASSWORD` — staff role

## What's not yet done

- DB-backed user persistence
- DB-backed audit log persistence
- Comprehensive audit action tracking (currently only seeded entries)
- Real PostgreSQL dump backup
- Scheduled backup
- Client-specific audit history views
- HTTPS / Cloudflare Tunnel for remote access
