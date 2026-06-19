# Architecture

## Stack

- Frontend: React + TypeScript, Vite, React Router
- Backend: FastAPI + Python, Starlette `SessionMiddleware`
- Database: PostgreSQL migration exists; runtime still uses seeded in-memory stores
- Auth: Session cookie with `user_email` and `last_seen_at`
- AI: Gemini transport via `ai.py`; seeded fallback decided in `document_generation.py`
- Documents: workflow builders + document composer -> preview/edit -> PDF/DOCX export
- Deployment: Windows-first local run scripts plus Docker Compose files

## Current persistence state

| Layer | Status |
|-------|--------|
| Users | In-memory (`store.py`) |
| Session identity | Cookie session middleware |
| Clients | In-memory (`store.py`) |
| Workflow drafts | Browser storage via `client-data-context.tsx` |
| File metadata | Browser storage + seeded defaults |
| Generated document history | In-memory backend copies plus browser-backed frontend state |
| Audit logs | In-memory seeded |
| Backup runs | In-memory seeded |

## Live boundaries

```text
Frontend
  -> /auth/*
  -> /clients/*
  -> /admin/*
  -> /documents/generate

/documents/generate
  -> document_generation.py
  -> ai.py
  -> store.py save_generated_document_draft()

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

## Useful implementation notes

- `App.tsx` routes `/` directly to `/income-protection`; dashboard/document hub pages exist but are not wired.
- `income-protection-page.tsx` currently exposes tabs for Fact Find, Statement of Suitability, Files, and Generated Documents.
- Terms of Business remains in seeded data and document utilities, but it is not a live top-level tab in `moduleTabs`.

## Not yet implemented

- Runtime PostgreSQL repositories
- Backend workflow persistence APIs
- Real file upload/download
- Durable generated-document storage/download
- Real backup execution
- Document pack ZIP download
