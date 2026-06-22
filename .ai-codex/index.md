# Omega Document Creator - File Index

Read this before broader repo exploration.

## Backend (`apps/api/app/`)

| File | Purpose |
|------|---------|
| `main.py` | FastAPI app, live REST routes, auth/admin guards, backup/restore routes |
| `db.py` | SQLAlchemy engine/session plumbing |
| `models.py` | Live SQLAlchemy models including sessions and restore attempts |
| `config.py` | Env/settings loader, storage path creation, backup/remote-access config |
| `security.py` | `hash_password()`, `verify_password()`, `is_session_expired()` |
| `document_generation.py` | AI document generation and persistence orchestration |
| `ai.py` | Gemini transport |
| `repositories/` | DB-backed repositories for users, clients, workflows, files, documents, audit logs, backups, sessions |
| `services/storage.py` | Durable file/artifact storage helpers |
| `services/backups.py` | Backup manifest creation and optional `pg_dump` integration |
| `services/restore.py` | Restore validation, dry-run, and execution helpers |
| `services/scheduler.py` | Backup scheduler lifecycle |
| `migrations/0001_initial.sql` | Base schema |
| `migrations/0003_restore_attempts.sql` | Restore attempt schema |
| `migrations/0004_sessions.sql` | Session schema |

## Frontend (`apps/frontend/src/`)

| File | Purpose |
|------|---------|
| `App.tsx` | Live React Router routes |
| `auth/auth-context.tsx` | Login/logout calls, `/auth/me` validation, sessionStorage mirror for auth only |
| `data/client-data-context.tsx` | Shared client/workflow state without `localStorage` persistence |
| `data/workflow-api.ts` | Backend workflow load/save API client |
| `data/file-api.ts` | Backend file upload/list/download API client |
| `documents/generated-document-api.ts` | Backend document list/create/download/pack API client |
| `pages/income-protection-page.tsx` | Live Income Protection workflow, files, generated documents |
| `pages/admin-page.tsx` | Users, audit logs, backups, security panels |

## Infrastructure

| File | Purpose |
|------|---------|
| `.env.example` | Env template |
| `run-omega.cmd` | Starts backend and frontend shell windows |
| `apps/frontend/run-frontend.cmd` | Frontend runner |
| `apps/api/run-api.cmd` | Backend runner |
| `infra/docker/compose.yaml` | Docker Compose definition plus cloudflared sidecar guidance |
| `infra/cloudflared/config.yaml.example` | Cloudflare Tunnel config template |
| `infra/cloudflared/setup-tunnel.sh` | Cloudflare Tunnel setup automation |

## Do Not Read

- `node_modules/`
- `apps/api/.venv/`
- `apps/frontend/dist/`
- `apps/frontend/.vite-run-cache/`
- `storage/`
- `*.lock`
- `*.log`
