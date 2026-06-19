# Patterns & Gotchas

## Auth pattern

Session cookie is set by backend on `POST /auth/login`.
Frontend reads current user via `GET /auth/me` on mount.
All protected API calls rely on the cookie — no Bearer token.

```typescript
// Correct — cookie is sent automatically
const res = await fetch('/auth/me', { credentials: 'include' });
```

Never pass auth headers. Never store token in localStorage.

## API call pattern (frontend)

```typescript
const res = await fetch(`/api/clients/${ref}`, {
  method: 'PATCH',
  credentials: 'include',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify(payload),
});
if (!res.ok) throw new Error(await res.text());
```

## Client reference

Clients are keyed by `client_reference` (e.g. `OMG-001`), not numeric ID.
Use this in all routes and API calls.

## Document generation pattern

1. Frontend collects workflow data from `client-data-context`
2. Calls `document-api.ts` → `POST /documents/generate` with `{ doc_type, client_data }`
3. Backend `document_generation.py` builds prompt → calls `ai.py` → returns `{ title, summary, sections[], warnings[], generated_html }`
4. Frontend `document-composer.ts` wraps response in styled HTML shell
5. `document-preview.tsx` renders editable preview
6. Export via `pdf-export.ts` or `word-export.ts` using composed HTML

Do not call Gemini directly from the frontend.
Do not bypass `document-composer.ts` for export — it is the single source of styled output.

## In-memory store pattern (current)

All seeded data lives in `store.py` as module-level mutable dicts/lists.
When replacing with DB: create a `repositories/` folder, one file per entity, matching the same function signatures so routes don't change.

```python
# Current (store.py)
def get_client(ref: str) -> dict | None:
    return CLIENTS.get(ref)

# Future (repositories/clients.py) — same signature
def get_client(ref: str) -> dict | None:
    return db.query(Client).filter_by(reference=ref).first()
```

## Password hashing (security.py)

```python
hash_password(plain: str) -> str      # PBKDF2-HMAC-SHA256
verify_password(plain, hashed) -> bool
check_session_timeout(last_seen) -> bool
```

Never store plain passwords. Never roll a custom scheme — use these functions.

## Role check pattern (backend)

```python
def require_admin(request: Request):
    if request.session.get("role") != "admin":
        raise HTTPException(403)
```

Always enforce server-side. Frontend role checks are display-only.

## Frontend draft persistence

All workflow draft state flows through `client-data-context.tsx`.
Draft values are saved to browser storage keyed by `client_reference`.
Do not persist workflow data anywhere else until backend persistence is wired.

```typescript
const { clientData, updateClientData } = useClientData();
updateClientData(clientRef, { factFind: { ...updates } });
```

## Vite / run config

- Local run: `run-frontend.cmd` → `vite.run.config.ts` → port `3001`
- Do not use `vite.config.ts` for local dev — it may bind port 3000
- Backend: `run-api.cmd` → `127.0.0.1:8000`
- Both: `run-omega.cmd` from repo root

## Known warnings (non-blocking)

- FastAPI `testclient` emits Starlette/httpx deprecation warning — ignore
- React Router future-flag warnings in tests — ignore

## SQL migration

`migrations/0001_initial.sql` defines the full MVP schema.
Tables: `users`, `clients`, `dependants`, `employment_details`, `protection_details`, `life_si_details`, `fact_find`, `terms_of_business`, `statement_of_suitability`, `files`, `documents`, `audit_logs`.
Foreign keys and indexes are included.
Do not alter this file without updating backend tests that verify table/column presence.

## Test commands

```powershell
# Backend
cd "apps/api"
.\.venv\Scripts\python -m unittest discover -s tests

# Frontend
cd "apps/frontend"
npm.cmd test
```
