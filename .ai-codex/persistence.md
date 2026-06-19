# Scope: Persistence

Use this scope when working on replacing in-memory stores with PostgreSQL-backed repositories.

## Goal

Replace `store.py` in-memory data with real DB persistence using SQLAlchemy + the schema in `migrations/0001_initial.sql`.

## Entry points

- `apps/api/app/store.py` — current in-memory store (read to understand signatures)
- `apps/api/migrations/0001_initial.sql` — target schema (read for table/column names)
- `apps/api/app/main.py` — imports from store; update imports after repo switch
- `apps/api/app/config.py` — `DATABASE_URL` already defined here

## Tables to wire (in order)

1. `users` — replace `USERS` dict
2. `sessions` — replace session dict tracking
3. `clients` — replace `CLIENTS` dict
4. `fact_find` — replace browser-only draft
5. `terms_of_business` — replace browser-only draft
6. `statement_of_suitability` — replace browser-only draft
7. `files` — new (currently placeholder)
8. `documents` — replace browser-only generated doc history
9. `audit_logs` — replace seeded list

## Planned folder structure

```
apps/api/app/
  db/
    connection.py     — SQLAlchemy engine + session factory
    models.py         — ORM models matching 0001_initial.sql
  repositories/
    users.py
    clients.py
    documents.py
    files.py
    audit.py
```

## Pattern to follow

Keep repository function signatures identical to current `store.py` functions.
Update `main.py` imports only — routes should not change.

## Critical constraints

- Do not alter `migrations/0001_initial.sql` without updating `test_api.py` table-presence tests
- `client_reference` is the client key (e.g. `OMG-001`), not a numeric ID
- Session is still cookie-based — do not move session to DB unless explicitly asked
- `FILE_STORAGE_PATH` from config is the base path for `storage/clients/{ref}/`

## Frontend changes needed

When backend persistence is live, update `client-data-context.tsx` to:
- load drafts from API instead of browser storage
- save drafts to API endpoints instead of browser storage
- keep the same context shape so pages don't change

## Test commands

```powershell
cd "apps/api"
.\.venv\Scripts\python -m unittest discover -s tests
```
