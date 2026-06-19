# API Surface

## Backend endpoints

### Auth
| Method | Path | Auth | Notes |
|--------|------|------|-------|
| `POST` | `/auth/login` | public | body: `{ email, password }`; returns `{ user }` |
| `POST` | `/auth/logout` | session | clears session |
| `GET` | `/auth/me` | session | returns `{ user }` |

### Clients
| Method | Path | Auth | Notes |
|--------|------|------|-------|
| `GET` | `/clients` | none in route | returns `{ items }`; current code does not call `_current_user()` |
| `POST` | `/clients` | session | create client |
| `GET` | `/clients/{client_reference}` | none in route | returns `{ item }`; current code does not call `_current_user()` |
| `PATCH` | `/clients/{client_reference}` | session | update client |
| `PATCH` | `/clients/{client_reference}/archive` | admin | archive client |

### Documents
| Method | Path | Auth | Notes |
|--------|------|------|-------|
| `POST` | `/documents/generate` | session | body: `{ client_reference, document_type, template_id, workflow_snapshot }` |

### Admin
| Method | Path | Auth |
|--------|------|------|
| `GET` | `/admin/users` | admin |
| `POST` | `/admin/users` | admin |
| `PATCH` | `/admin/users/{email}` | admin |
| `PATCH` | `/admin/users/{email}/disable` | admin |
| `GET` | `/admin/audit-logs` | admin |
| `POST` | `/admin/backups/run` | admin |
| `GET` | `/admin/security-summary` | admin |

### Health
| Method | Path | Auth |
|--------|------|------|
| `GET` | `/health` | public |

## Document types in live frontend/backend flow

- `Fact Find`
- `Terms of Business`
- `Statement of Suitability`

## Backend session keys

- `user_email`
- `last_seen_at`

## Frontend routes in `App.tsx`

| Path | Behavior |
|------|----------|
| `/` | Redirects to `/income-protection` |
| `/login` | Login page |
| `/clients` | Clients page |
| `/clients/new` | Client form page |
| `/clients/:clientReference` | Client profile page |
| `/clients/:clientReference/edit` | Client form page |
| `/clients/:clientReference/income-protection` | Redirect helper to `/income-protection` |
| `/income-protection` | Live workflow page |
| `/documents` | Redirects to `/clients` |
| `/documents/:clientReference` | Redirects to `/clients/:clientReference` |
| `/files` | Files page |
| `/settings` | Settings page |
| `/admin` | Admin page, wrapped in `RequireAdmin` |

## Not implemented

- File upload/download API endpoints
- Document download/save API endpoints
- Workflow persistence API endpoints
- Backup scheduling endpoints
