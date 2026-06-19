# Scope: Persistence

Use this scope when replacing seeded/browser-backed state with runtime persistence.

## Goal

Replace `store.py` seeded data and frontend browser storage with real backend persistence.

## Entry points

- `apps/api/app/store.py` - current seeded backend interfaces
- `apps/api/migrations/0001_initial.sql` - target schema draft
- `apps/api/app/main.py` - route imports and live call sites
- `apps/api/app/config.py` - `DATABASE_URL`, storage paths
- `apps/frontend/src/data/client-data-context.tsx` - current browser persistence

## Important realities

- The migration includes `users`, `clients`, `dependants`, `employment_details`, `protection_details`, `life_serious_illness_details`, `fact_find`, `documents`, `terms_of_business`, `statement_of_suitability`, `files`, and `audit_logs`.
- There is no `sessions` table in the current migration.
- Cookie-session auth should stay cookie-based unless explicitly redesigned.

## Current replacement targets

1. `SEEDED_USERS`
2. `SEEDED_CLIENTS`
3. `SEEDED_AUDIT_LOGS`
4. `SEEDED_BACKUP_RUNS`
5. Frontend `localStorage` workflow/client state

## Constraints

- Preserve current route contracts unless the API is intentionally expanded.
- Keep `client_reference` as the external client identifier.
- Keep file storage rooted under `FILE_STORAGE_PATH`.
- Do not document DB-backed workflow saves as implemented until both backend endpoints and frontend calls exist.
