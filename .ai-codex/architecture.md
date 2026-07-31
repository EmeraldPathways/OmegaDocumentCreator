# Architecture

## Stack

- Frontend: React + TypeScript, Vite, React Router
- Backend: FastAPI + Python, Starlette `SessionMiddleware`, PostgreSQL via SQLAlchemy
- Database: PostgreSQL for all live application records
- Auth: cookie session plus persisted PostgreSQL `sessions` table
- AI: Gemini transport via `ai.py` with seeded fallback in `document_generation.py`
- Documents: preview/edit/export plus backend document history and artifact persistence
- Storage: local disk under repo `storage/`
- Deployment: Windows-first local scripts, Docker Compose, optional Cloudflare Tunnel guidance

## Current persistence state

| Layer | Source of truth |
|-------|-----------------|
| Users | PostgreSQL via `UserRepository` |
| Sessions | PostgreSQL via `SessionRepository` plus cookie session middleware |
| Clients | PostgreSQL via `ClientRepository` |
| Access policy | Persisted role plus backend policy allowlists/delegation in `main.py` |
| Client assignment | PostgreSQL `assigned_to` on clients |
| Workflow drafts | PostgreSQL via `WorkflowRepository` |
| Uploaded files | Disk plus PostgreSQL via `FileRepository` |
| Generated document history | PostgreSQL via `DocumentRepository` |
| Exported artifacts | Disk under `FILE_STORAGE_PATH` with relative paths in DB |
| Audit logs | PostgreSQL via `AuditLogRepository` |
| Backup runs | PostgreSQL via `BackupRepository` plus disk manifests |
| Restore attempts | PostgreSQL via `BackupRepository` / `RestoreAttempt` |

## Live boundaries

```text
Frontend
  -> /auth/*
  -> /users/assignable
  -> /clients/*
  -> /clients/{ref}/workflow
  -> /clients/{ref}/files
  -> /clients/{ref}/documents
  -> /documents/generate
  -> /documents/statement-quote
  -> /admin/*
  -> /health, /ready

/documents/generate
  -> document_generation.py
  -> ai.py
  -> ClientRepository
  -> DocumentRepository

Artifact storage
  -> storage/clients/{Last, First - omega-00000}/{year}/{workflow}/{files|documents}/
  -> storage/backups/
```

## Key decisions reflected in code

1. Auth authority is server-side. Frontend mirrors session/user state only for UX.
2. Backend records are authoritative for clients, workflows, files, and generated documents.
3. Client access is enforced from one model across workflow/file/document routes.
4. `created_by` remains creator metadata; `assigned_to` is the working owner.
5. `manager` is a first-class persisted role for global non-admin record visibility.
6. Restore execution requires a short-lived approval token plus explicit confirmation text.
7. All live client artifacts belong inside the client/year/workflow storage tree.

## Remote-access and operations wiring

- CORS middleware is applied only when `CORS_ORIGINS` is explicitly configured
- CSRF checks validate Origin/Referer for state-changing routes
- session cookie security comes from `COOKIE_SECURE` and `COOKIE_SAMESITE`
- `/health` reports environment and remote-access mode
- `/ready` reports DB and storage readiness
- startup validates deploy-critical settings outside development
- startup verifies DB/storage configuration before serving requests
- startup/shutdown manage the backup scheduler lifecycle

## Useful implementation notes

- Root route redirects to `/fact-find`
- `/fact-find`, `/income-protection`, `/pensions`, and `/files-docs` are wrapped in `RequireAuth`
- `/admin` and `/settings` are wrapped in `RequireAdmin`
- Pensions remains a real route even if top-nav visibility is conditional
- document pack ZIP output is built in-memory from stored PDF/DOCX artifacts
- startup can promote the known global-access Omega users from `staff` to `manager`

## Current follow-up areas

- `income-protection-page.tsx` is still large and should be split further without behavior changes
- ~~expired session cleanup is implemented but not automatically scheduled~~ → session cleanup runs on startup
- frontend still keeps a client cache and selected client hint in browser storage for UX rehydration
- bundle-size warning remains on frontend production build
