# Architecture

## Stack

- Frontend: React + TypeScript, Vite, React Router
- Backend: FastAPI + Python, Starlette `SessionMiddleware`, PostgreSQL via SQLAlchemy
- Database: PostgreSQL (live); SQLAlchemy models full-coverage; repositories wired into all routes
- Auth: Session cookie with `user_email` and `last_seen_at`
- AI: Gemini transport via `ai.py`; seeded fallback decided in `document_generation.py`
- Documents: workflow builders + document composer -> preview/edit -> PDF/DOCX export
- Deployment: Windows-first local run scripts plus Docker Compose files

## Current persistence state (PostgreSQL-backed)

| Layer | Status |
|-------|--------|
| Users | PostgreSQL via `UserRepository` |
| Session identity | Cookie session middleware |
| Clients | PostgreSQL via `ClientRepository` |
| Workflow drafts | PostgreSQL via `WorkflowRepository` (/clients/*/workflow) |
| Uploaded files | Disk + PostgreSQL via `FileRepository` |
| Generated document history | PostgreSQL via `DocumentRepository` |
| Exported artifacts (PDF/DOCX) | Disk under FILE_STORAGE_PATH with relative paths in DB |
| Audit logs | PostgreSQL via `AuditLogRepository` |
| Backup runs | PostgreSQL via `BackupRepository` with manifest artifacts on disk under BACKUP_PATH |

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

/document/generate
  -> document_generation.py
  -> ai.py
  -> DocumentRepository -> PostgreSQL (document records + frozen HTML)
  -> ClientRepository -> PostgreSQL (client lookup)

Income Protection UI
  -> generated-output-workspace.tsx
  -> workflow-document-builders.ts
  -> document-composer.ts
  -> pdf-export.ts / word-export.ts
```

## Key decisions reflected in code

1. Auth is cookie-based; frontend mirrors session state in `sessionStorage` but does not own authority.
2. Selected workflow client lives inside `income-protection-page.tsx` and is mirrored to `localStorage`.
3. Admin access is enforced from `_require_admin()` in `main.py`, not from frontend checks.
4. The live local startup ports are `127.0.0.1:3007` for frontend and `127.0.0.1:8007` for backend.
5. Client references use the `CLI-YYYY-NNNN` format from `domain/clients.py`.

## Remote-access wiring (Phase 8)

- CORS middleware applied when `CORS_ORIGINS` env var is set; `allow_credentials=True`
- Session cookie security: `https_only` from `COOKIE_SECURE`, `same_site` from `COOKIE_SAMESITE`
- Proxy-aware handling documented; uvicorn `--proxy-headers` recommended for production
- Startup validates SESSION_SECRET, APP_URL, CORS_ORIGINS, TRUSTED_PROXY_COUNT for non-dev environments
- Startup checks FILE_STORAGE_PATH and BACKUP_PATH directory existence
- `/health` returns status + environment + remote_access_mode
- `/ready` returns ready boolean + per-check DB and storage availability

## Useful implementation notes

- `App.tsx` routes `/` directly to `/income-protection`; dashboard/document hub pages exist but are not wired.
- `income-protection-page.tsx` currently exposes tabs for Fact Find, Statement of Suitability, Files, and Generated Documents.
- Terms of Business remains in seeded data and document utilities, but it is not a live top-level tab in `moduleTabs`.

## Not yet implemented

- Full PostgreSQL dump/restore operations (backup manifest records metadata only; no pg_dump integration)
- Restore functionality from backup manifests
- Document pack ZIP download
- Automated backup scheduling
- Session table in DB (session stored in cookie only)