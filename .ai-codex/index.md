# Omega Document Creator — File Index

Read this before any file exploration. Use symbol lookup or scoped reads instead of full-file reads.

## Backend (`apps/api/app/`)

| File | Purpose |
|------|---------|
| `main.py` | FastAPI app, all route mounts, CORS, session middleware |
| `store.py` | ALL seeded in-memory data — users, clients, audit logs, backups |
| `security.py` | PBKDF2 password hash/verify, session timeout logic |
| `config.py` | Env var loading — AI, DB, storage, session settings |
| `ai.py` | Gemini client wrapper, prompt dispatch, fallback switch |
| `document_generation.py` | Prompt builders for each doc type, structured response parsing |
| `migrations/0001_initial.sql` | Full MVP schema — users, clients, dependants, employment, protection, life/SI, fact find, ToB, SoS, files, documents, audit logs |

## Backend Tests (`apps/api/tests/`)

| File | Purpose |
|------|---------|
| `test_api.py` | All endpoint coverage — auth, clients, admin, documents, audit, backup |
| `test_security.py` | Password hash/verify unit tests |

## Frontend (`apps/frontend/src/`)

| File | Purpose |
|------|---------|
| `App.tsx` | All React Router routes |
| `components/app-shell.tsx` | Top nav, client search bar, role-gated nav links |
| `auth/auth-context.tsx` | Session state, login/logout calls, current user |
| `data/client-data-context.tsx` | Shared workflow client state, draft persistence (browser-backed) |
| `data/seeded-clients.ts` | Seeded client records for dev/fallback |
| `styles.css` | Omega burgundy/grey/white design tokens, global layout |

## Frontend — Documents (`apps/frontend/src/documents/`)

| File | Purpose |
|------|---------|
| `document-api.ts` | API calls to `/documents/generate` |
| `document-composer.ts` | Builds styled HTML from AI response sections |
| `document-preview.tsx` | Inline-editable preview component |
| `document-templates.ts` | Template metadata for each doc type |
| `document-types.ts` | TypeScript types for generated doc shapes |
| `export-generated-document.ts` | Saves export record into generated-doc history |
| `pdf-export.ts` | HTML-to-PDF frontend export |
| `word-export.ts` | Structured DOCX frontend export |
| `template-picker.tsx` | UI for selecting doc type before generation |

## Frontend — Pages (`apps/frontend/src/pages/`)

| File | Purpose |
|------|---------|
| `login-page.tsx` | Login form, backend session cookie creation |
| `clients-page.tsx` | Client list, search, new client button |
| `client-profile-page.tsx` | Client detail view with docs/files area |
| `client-form-page.tsx` | Create and edit client forms |
| `income-protection-page.tsx` | Main workflow — all tabs (Client Details, Fact Find, ToB, SoS, Files, Generated Docs) |
| `admin-page.tsx` | Users, audit logs, backups, security panels |
| `settings-page.tsx` | AI provider config, app settings |

## Infrastructure

| File | Purpose |
|------|---------|
| `.env.example` | All env vars — DB, storage, session, AI, admin seed |
| `run-omega.cmd` | Starts both frontend and backend in separate Windows shells |
| `run-frontend.cmd` | Frontend only — Vite on `127.0.0.1:3001` |
| `run-api.cmd` | Backend only — Uvicorn on `127.0.0.1:8000` |
| `apps/frontend/vite.run.config.ts` | Vite config for local run (port 3001, cache `.vite-run-cache`) |

## Do Not Read

- `node_modules/`
- `apps/api/.venv/`
- `apps/frontend/dist/`
- `apps/frontend/.vite-run-cache/`
- `storage/`
- `*.lock` files
- `*.log` files
