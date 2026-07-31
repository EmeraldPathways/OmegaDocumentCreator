# API Surface

## Backend endpoints

### Health
| Method | Path | Auth | Notes |
|--------|------|------|-------|
| `GET` | `/health` | public | returns app URL, environment, remote-access mode |
| `GET` | `/ready` | public | returns DB/storage readiness |

### Auth
| Method | Path | Auth | Notes |
|--------|------|------|-------|
| `POST` | `/auth/login` | public | body: `{ email, password }`; creates persisted session row; disabled users get `403` |
| `POST` | `/auth/logout` | session | clears cookie and invalidates exact session row |
| `GET` | `/auth/me` | session | validates persisted `session_id`; extends session expiry; returns `{ user }` |

### Users / Assignments
| Method | Path | Auth | Notes |
|--------|------|------|-------|
| `GET` | `/users/assignable` | session | returns active assignable users used by client assignment UI |

### Clients
| Method | Path | Auth | Notes |
|--------|------|------|-------|
| `GET` | `/clients` | session | access-filtered client list; returns `{ items }` |
| `POST` | `/clients` | session | create client; supports `assigned_to` |
| `GET` | `/clients/{client_reference}` | session | access-filtered detail; returns `{ item }` |
| `PATCH` | `/clients/{client_reference}` | session | update client; supports `assigned_to` |
| `PATCH` | `/clients/{client_reference}/archive` | admin | archive client |

### Workflow
| Method | Path | Auth | Notes |
|--------|------|------|-------|
| `GET` | `/clients/{client_reference}/workflow` | session | access-filtered persisted workflow fields |
| `PUT` | `/clients/{client_reference}/workflow` | session | saves persisted workflow fields |

### Files
| Method | Path | Auth | Notes |
|--------|------|------|-------|
| `POST` | `/clients/{client_reference}/files` | session | multipart upload into client/year/workflow storage |
| `GET` | `/clients/{client_reference}/files` | session | list files |
| `GET` | `/clients/{client_reference}/files/{file_id}/download` | session | download stored file; invalid UUID fails with `404` |
| `DELETE` | `/clients/{client_reference}/files/{file_id}` | session | delete DB row plus disk artifact |

### Documents
| Method | Path | Auth | Notes |
|--------|------|------|-------|
| `POST` | `/documents/generate` | session | body: `{ client_reference, document_type, template_id, workflow_snapshot }` |
| `POST` | `/documents/statement-quote` | session | returns quote comparison data for statements |
| `GET` | `/clients/{client_reference}/documents` | session | list generated documents |
| `POST` | `/clients/{client_reference}/documents` | session | create document record plus optional artifact upload |
| `GET` | `/clients/{client_reference}/documents/{document_id}/download` | session | download stored PDF/DOCX artifact; invalid UUID fails with `404` |
| `GET` | `/clients/{client_reference}/documents/pack` | session | download ZIP of stored artifacts |
| `DELETE` | `/clients/{client_reference}/documents/{document_id}` | session | delete DB row plus disk artifacts |

### Admin
| Method | Path | Auth | Notes |
|--------|------|------|-------|
| `GET` | `/admin/users` | admin | list DB users |
| `POST` | `/admin/users` | admin | create user with `admin`, `manager`, or `staff` role |
| `PATCH` | `/admin/users/{user_id}` | admin | update name, role, status, force-password-change |
| `POST` | `/admin/users/{user_id}/reset-password` | admin | set temporary password and optional force-password-change |
| `PATCH` | `/admin/users/{user_id}/disable` | admin | disable user account |
| `PATCH` | `/admin/users/{user_id}/enable` | admin | enable user account |
| `GET` | `/admin/audit-logs` | admin | list audit rows; filters include `user_email`, `action`, `entity_type`, `client_reference`, `date_from`, `date_to` |
| `GET` | `/admin/backups` | admin | list backup runs |
| `POST` | `/admin/backups` | admin | create backup manifest and optional dump |
| `POST` | `/admin/backups/{backup_id}/validate-restore` | admin | validate backup and issue short-lived restore approval token |
| `POST` | `/admin/backups/{backup_id}/dry-run-restore` | admin | dry-run restore and issue short-lived restore approval token |
| `POST` | `/admin/backups/{backup_id}/restore` | admin | destructive restore; requires confirmation token and phrase |
| `GET` | `/admin/backups/{backup_id}/restore-attempts` | admin | list restore attempts |
| `GET` | `/admin/backups/schedule-status` | admin | scheduler status |
| `GET` | `/admin/security-summary` | admin | current security summary payload |
| `GET` | `/admin/security` | admin | live security health counts |
| `GET` | `/admin/settings` | admin | current live settings payload |
| `PUT` | `/admin/settings` | admin | update settings |
| `POST` | `/admin/settings/test-path` | admin | validate configured filesystem path |

## Backend session keys

- `session_id`
- `user_email`
- `last_seen_at`

## Frontend routes in `App.tsx`

| Path | Behavior |
|------|----------|
| `/` | redirects to `/fact-find` |
| `/login` | login page |
| `/clients` | clients page |
| `/clients/new` | client form page |
| `/clients/:clientReference` | client profile page |
| `/clients/:clientReference/edit` | client form page |
| `/clients/:clientReference/income-protection` | redirect helper to `/income-protection` |
| `/fact-find` | fact-find workflow route |
| `/income-protection` | income-protection workflow route |
| `/pensions` | pensions workflow route |
| `/files-docs` | files/docs workspace route |
| `/documents` | redirects to `/clients` |
| `/documents/:clientReference` | redirects to `/clients/:clientReference` |
| `/files` | redirects to `/files-docs` |
| `/settings` | admin-only settings page |
| `/admin` | admin-only admin page |
