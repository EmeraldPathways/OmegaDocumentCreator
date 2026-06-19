# Patterns & Gotchas

## Auth pattern

- Backend sets the cookie on `POST /auth/login`.
- Frontend validates an existing session with `GET /auth/me`.
- No Bearer token flow exists.

```ts
await fetch("/auth/me");
```

## Client identifiers

- Client routes and store helpers use `client_reference`.
- Current format is `CLI-YYYY-NNNN`, not `OMG-001`.

## Document generation pattern

1. `income-protection-page.tsx` collects the workflow snapshot.
2. `document-api.ts` posts:

```json
{
  "client_reference": "CLI-2026-0002",
  "document_type": "Statement of Suitability",
  "template_id": "default",
  "workflow_snapshot": {}
}
```

3. `document_generation.py` builds the prompt and fallback/integration behavior.
4. `document-api.ts` normalizes the backend response into camelCase fields.
5. `workflow-document-builders.ts` + `document-composer.ts` produce the styled exportable HTML.

## Session handling

- Backend session keys in live code: `user_email`, `last_seen_at`
- No `role` session key is stored directly.
- Admin checks happen after `_current_user()` resolves the user record from `store.py`.

## Password helpers

```python
hash_password(password: str) -> str
verify_password(password: str, password_hash: str) -> bool
is_session_expired(last_seen_at: str | None, timeout_minutes: int) -> bool
```

## Frontend workflow persistence

- `client-data-context.tsx` is the only frontend workflow persistence layer.
- It writes browser state to `localStorage` under `omega-client-records`.
- Selected auth user is mirrored separately in `sessionStorage`.

## Local run paths

- Root: `run-omega.cmd`
- Frontend: `apps/frontend/run-frontend.cmd` -> `127.0.0.1:3007`
- Backend: `apps/api/run-api.cmd` -> `127.0.0.1:8007`

## Migration reality

- `apps/api/migrations/0001_initial.sql` defines users, clients, dependants, employment/protection tables, documents, terms of business, statement of suitability, files, and audit logs.
- There is no `sessions` table in the migration.

## Known drift to avoid

- Do not document unused routed pages as live UX.
- Do not describe Terms of Business as a live Income Protection tab unless `moduleTabs` is changed.
- Do not describe `/clients` as supporting `?search=` unless backend code adds it.
