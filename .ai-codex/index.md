# Omega Document Creator - File Index

Read this before broader repo exploration.

## Backend (`apps/api/app/`)

| File | Purpose |
|------|---------|
| `main.py` | FastAPI app, auth/session guards, client/workflow/files/documents/admin routes |
| `db.py` | SQLAlchemy engine/session plumbing |
| `models.py` | Live SQLAlchemy models for users, clients, workflows, files, documents, audits, backups, restore attempts, sessions |
| `config.py` | Env/settings loader, storage roots, backup/restore, CORS/CSRF, remote-access config |
| `security.py` | `hash_password()`, `verify_password()`, `is_session_expired()` |
| `document_generation.py` | AI generation orchestration, quote/statement routing, seeded fallback, artifact metadata |
| `ai.py` | Gemini prompt transport with field allowlisting |
| `repositories/` | DB-backed repositories for users, clients, workflows, files, documents, audits, backups, sessions |
| `services/storage.py` | Durable client/year/workflow file storage helpers |
| `services/backups.py` | Backup manifest creation and optional `pg_dump` integration |
| `services/restore.py` | Restore validation, dry-run, and execute helpers |
| `services/scheduler.py` | Backup scheduler lifecycle |

## Frontend (`apps/frontend/src/`)

| File | Purpose |
|------|---------|
| `App.tsx` | Live React Router routes and auth/admin wrappers |
| `auth/auth-context.tsx` | Login/logout, `/auth/me`, session mirror, backend-derived user state |
| `data/client-data-context.tsx` | Shared client/workflow state, backend rehydration, selected-client cache |
| `data/client-api.ts` | Client CRUD and assignable-user lookups |
| `data/workflow-api.ts` | Backend workflow load/save client |
| `data/file-api.ts` | Backend file upload/list/download/delete client |
| `data/admin-api.ts` | Admin users/audit/backups/security/settings API client |
| `documents/generated-document-api.ts` | Backend generated document list/create/download/pack/delete client |
| `pages/income-protection-page.tsx` | Shared workflow shell for Fact Find, Fact Find Update, Quote, Statement |
| `pages/pensions-page.tsx` | Pensions quote/statement workflow page |
| `pages/files-docs-page.tsx` | File and generated-document workspace route |
| `pages/admin-page.tsx` | Live admin users, audit, backups, security, settings UI |

## Infrastructure

| File | Purpose |
|------|---------|
| `.env.example` | Env template |
| `run-omega.cmd` | Starts backend and frontend shell windows |
| `apps/frontend/run-frontend.cmd` | Frontend runner |
| `apps/api/run-api.cmd` | Backend runner |
| `infra/docker/compose.yaml` | Docker Compose definition and local Postgres/runtime stack |
| `infra/cloudflared/config.yaml.example` | Cloudflare Tunnel config template |
| `infra/cloudflared/setup-tunnel.sh` | Cloudflare Tunnel setup automation |

## Do Not Read

- `node_modules/`
- `apps/api/.venv/`
- `apps/frontend/dist/`
- `apps/frontend/.vite-run-cache/`
- `*.lock`
- `*.log`
