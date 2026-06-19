# Architecture

## Stack

- **Frontend**: React + TypeScript, Vite, React Router
- **Backend**: FastAPI + Python, Starlette SessionMiddleware
- **Database**: PostgreSQL (schema defined, not yet wired into runtime)
- **Auth**: Server-side session cookie (`user_email`, `last_seen_at`), PBKDF2-HMAC-SHA256
- **AI**: Google Gemini `gemini-2.0-flash`, `temperature=0.3`, seeded fallback when unavailable
- **Documents**: Styled HTML preview → frontend HTML-to-PDF or structured DOCX export
- **Deployment**: Docker Compose (Windows office server)

## Persistence state (current)

| Layer | Status |
|-------|--------|
| Users | In-memory (`store.py`) |
| Sessions | In-memory (`store.py`) |
| Clients | In-memory (`store.py`) |
| Fact Find drafts | Browser storage via `client-data-context.tsx` |
| ToB drafts | Browser storage |
| SoS drafts | Browser storage |
| File metadata | Browser storage (placeholder) |
| Generated doc history | Browser storage + seeded |
| Audit logs | In-memory seeded |
| Backups | In-memory seeded |

**Next step**: wire `migrations/0001_initial.sql` into SQLAlchemy models and repositories, replacing in-memory stores.

## Module boundaries

```
Frontend ──► /documents/generate ──► document_generation.py ──► ai.py ──► Gemini
                                                               └──► seeded fallback

Frontend ──► /auth/* ──► store.py (users/sessions) ──► security.py
Frontend ──► /clients/* ──► store.py (clients)
Frontend ──► /admin/* ──► store.py (users/audit/backup)
```

## Key design decisions

1. **No React state for auth** — session is server-side cookie; `auth-context.tsx` just calls `/auth/me` to hydrate
2. **Workflow client stored in page, not route** — `/income-protection` manages selected client internally
3. **Document preview is the export source** — `document-composer.ts` builds styled HTML reused for both review UI and PDF/DOCX export; do not split these
4. **Seeded fallback is intentional** — AI generation must always return *something*; fallback is in `document_generation.py` not in `ai.py`
5. **Role gates are enforced server-side** — admin-only endpoints check session role; frontend gates are UI-only
6. **Port 3001 is canonical** — port 3000 may be in use; always use `127.0.0.1:3001` for frontend, `127.0.0.1:8000` for backend

## Storage layout

```
storage/
  clients/{client_reference}/    — per-client folder (not yet created at runtime)
  backups/                       — PostgreSQL dumps + archive ZIPs
```

## Planned but not implemented

- SQLAlchemy models and repositories
- Real file upload/download
- Client folder creation on client create
- Durable generated document storage
- Real backups (pg_dump + ZIP)
- Autosave timers
- Document pack ZIP download
- HTTPS / Cloudflare Tunnel for remote access
