# Architecture

## Stack

- Frontend: React + TypeScript, Vite, React Router
- Backend: FastAPI + Python, Starlette `SessionMiddleware`, PostgreSQL via SQLAlchemy
- Database: PostgreSQL for live app data
- Auth: cookie session plus persisted PostgreSQL `sessions` table
- AI: Gemini transport via `ai.py` with seeded fallback in `document_generation.py`
- Documents: workflow builders plus preview/edit plus PDF/DOCX export and backend artifact persistence
- Deployment: Windows-first local scripts, Docker Compose, optional Cloudflare Tunnel sidecar

## Current persistence state

| Layer | Status |
|-------|--------|
| Users | PostgreSQL via `UserRepository` |
| Sessions | PostgreSQL via `SessionRepository` plus cookie session middleware |
| Clients | PostgreSQL via `ClientRepository` |
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
  -> /clients/*
  -> /clients/{ref}/workflow
  -> /clients/{ref}/files
  -> /clients/{ref}/documents
  -> /documents/generate
  -> /admin/*
  -> /health, /ready

/documents/generate
  -> document_generation.py
  -> ai.py
  -> DocumentRepository
  -> ClientRepository

Income Protection UI
  -> workflow-api.ts
  -> file-api.ts
  -> generated-document-api.ts
  -> generated-output-workspace.tsx
  -> workflow-document-builders.ts
  -> document-composer.ts
  -> pdf-export.ts / word-export.ts
```

## Key decisions reflected in code

1. Auth authority is server-side. Frontend only mirrors auth in `sessionStorage`.
2. Workflow/client persistence no longer uses `localStorage`.
3. Generated document history in the workflow UI is backend-backed only.
4. Admin access is enforced in `main.py` via `_require_admin()`.
5. The live local startup ports are `127.0.0.1:3007` for frontend and `127.0.0.1:8007` for backend.
6. Client references use the `CLI-YYYY-NNNN` format from `domain/clients.py`.

## Remote-access and operations wiring

- CORS middleware is applied when `CORS_ORIGINS` is configured
- session cookie security comes from `COOKIE_SECURE` and `COOKIE_SAMESITE`
- `/health` returns app URL, environment, and remote access mode
- `/ready` returns DB and storage readiness details
- startup validates deploy-critical settings outside development
- startup verifies storage roots and seeds default users when needed
- startup/shutdown also manage the backup scheduler lifecycle

## Useful implementation notes

- `App.tsx` routes `/` to `/income-protection`
- `income-protection-page.tsx` currently exposes tabs for Fact Find, Statement of Suitability, Files, and Generated Documents
- Terms of Business remains persisted through the workflow API, but it is not a live top-level tab in `moduleTabs`
- document pack ZIP output is built in-memory from stored PDF/DOCX artifacts

## Remaining gaps

- restore workflow still needs broader operator hardening
- expired session cleanup is implemented but not automatically scheduled
- no frontend delete UI for files/documents
- Cloudflare Tunnel setup is scripted, but deployment remains operator-driven
