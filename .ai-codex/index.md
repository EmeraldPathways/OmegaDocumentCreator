# Omega Document Creator - File Index

Read this before broader repo exploration.

## Backend (`apps/api/app/`)

| File | Purpose |
|------|---------|
| `main.py` | FastAPI app, live REST routes, session middleware, auth/admin guards |
| `store.py` | Seeded in-memory users, clients, audit logs, backup runs, generated-doc history |
| `security.py` | `hash_password()`, `verify_password()`, `is_session_expired()` |
| `config.py` | Env/settings loader, storage path creation, session timeout config |
| `ai.py` | Prompt builder + Gemini transport |
| `document_generation.py` | Document orchestration, seeded fallback, PHI integration request |
| `domain/users.py` | User role/status enums and record model |
| `domain/clients.py` | Client status enum, `build_client_reference()`, storage slug helper |
| `migrations/0001_initial.sql` | MVP schema draft for users, clients, workflows, documents, files, audit logs |

## Frontend (`apps/frontend/src/`)

| File | Purpose |
|------|---------|
| `App.tsx` | Live React Router routes |
| `components/app-shell.tsx` | Shared shell/nav |
| `auth/auth-context.tsx` | Login/logout calls, sessionStorage mirror, `/auth/me` validation |
| `data/client-data-context.tsx` | Browser-backed client/workflow state |
| `data/seeded-clients.ts` | Seeded workflow/client records |
| `styles.css` | Global styling tokens/layout |

## Frontend Documents (`apps/frontend/src/documents/`)

| File | Purpose |
|------|---------|
| `document-api.ts` | Calls `POST /documents/generate`, normalizes backend response |
| `document-composer.ts` | Shared composition/render helpers used by workflow builders |
| `document-preview.tsx` | Preview helpers/components reused by generated output flows |
| `document-templates.ts` | Template metadata/default drafts |
| `document-types.ts` | Draft/document TS types |
| `generated-output-workspace.tsx` | Live generation/review/export workspace UI |
| `workflow-document-builders.ts` | Builds composed HTML for each supported document type |
| `export-generated-document.ts` | Export flow + generated-history/file updates |
| `pdf-export.ts` | Frontend PDF export |
| `word-export.ts` | Frontend DOCX export |
| `template-picker.tsx` | Template selector UI |

## Frontend Pages (`apps/frontend/src/pages/`)

| File | Purpose |
|------|---------|
| `login-page.tsx` | Login form |
| `clients-page.tsx` | Client list |
| `client-profile-page.tsx` | Client detail/profile view |
| `client-form-page.tsx` | Client create/edit form |
| `income-protection-page.tsx` | Live Income Protection workflow |
| `files-page.tsx` | Standalone files page |
| `admin-page.tsx` | Users, audit logs, backups, security panels |
| `settings-page.tsx` | Settings page |
| `dashboard-page.tsx` | Exists but is not routed in `App.tsx` |
| `documents-page.tsx` | Exists but is not routed in `App.tsx` |
| `client-documents-page.tsx` | Exists but is not routed in `App.tsx` |
| `income-protection-hub-page.tsx` | Exists but is not routed in `App.tsx` |

## Infrastructure

| File | Purpose |
|------|---------|
| `.env.example` | Env template |
| `run-omega.cmd` | Starts backend and frontend shell windows |
| `apps/frontend/run-frontend.cmd` | Frontend runner |
| `apps/api/run-api.cmd` | Backend runner |
| `apps/frontend/vite.run.config.ts` | Local frontend host/port config (`127.0.0.1:3007`) |
| `infra/docker/compose.yaml` | Docker Compose definition |
| `STAGE4_HANDOFF.md` | Prior workflow handoff notes |

## Do Not Read

- `node_modules/`
- `apps/api/.venv/`
- `apps/frontend/dist/`
- `apps/frontend/.vite-run-cache/`
- `storage/`
- `*.lock`
- `*.log`
