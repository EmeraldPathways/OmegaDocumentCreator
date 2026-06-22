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
| `POST` | `/auth/login` | public | body: `{ email, password }`; creates persisted session row |
| `POST` | `/auth/logout` | session | clears cookie and invalidates exact session row |
| `GET` | `/auth/me` | session | validates persisted `session_id`; returns `{ user }` |

### Clients
| Method | Path | Auth | Notes |
|--------|------|------|-------|
| `GET` | `/clients` | session | returns `{ items }` |
| `POST` | `/clients` | session | create client |
| `GET` | `/clients/{client_reference}` | session | returns `{ item }` |
| `PATCH` | `/clients/{client_reference}` | session | update client |
| `PATCH` | `/clients/{client_reference}/archive` | admin | archive client |

### Workflow
| Method | Path | Auth | Notes |
|--------|------|------|-------|
| `GET` | `/clients/{client_reference}/workflow` | session | returns persisted workflow fields |
| `PUT` | `/clients/{client_reference}/workflow` | session | saves persisted workflow fields |

### Files
| Method | Path | Auth | Notes |
|--------|------|------|-------|
| `POST` | `/clients/{client_reference}/files` | session | multipart upload |
| `GET` | `/clients/{client_reference}/files` | session | list files |
| `GET` | `/clients/{client_reference}/files/{file_id}/download` | session | download stored file |
| `DELETE` | `/clients/{client_reference}/files/{file_id}` | session | delete DB row plus disk artifact |

### Documents
| Method | Path | Auth | Notes |
|--------|------|------|-------|
| `POST` | `/documents/generate` | session | body: `{ client_reference, document_type, template_id, workflow_snapshot }` |
| `GET` | `/clients/{client_reference}/documents` | session | list generated documents |
| `POST` | `/clients/{client_reference}/documents` | session | create document record plus optional artifact upload |
| `GET` | `/clients/{client_reference}/documents/{document_id}/download` | session | download stored PDF/DOCX artifact |
| `GET` | `/clients/{client_reference}/documents/pack` | session | download ZIP of stored artifacts |
| `DELETE` | `/clients/{client_reference}/documents/{document_id}` | session | delete DB row plus disk artifacts |

### Admin
| Method | Path | Auth | Notes |
|--------|------|------|-------|
| `GET` | `/admin/users` | admin | list users |
| `POST` | `/admin/users` | admin | create user |
| `PATCH` | `/admin/users/{user_id}` | admin | update user |
| `GET` | `/admin/audit-logs` | admin | list DB-backed audit rows |
| `GET` | `/admin/backups` | admin | list backup runs |
| `POST` | `/admin/backups` | admin | create backup manifest and optional dump |
| `POST` | `/admin/backups/{backup_id}/validate-restore` | admin | validate manifest/dump restore prerequisites |
| `POST` | `/admin/backups/{backup_id}/dry-run-restore` | admin | `pg_restore --list` style check |
| `POST` | `/admin/backups/{backup_id}/restore` | admin | explicit destructive restore with confirmation |
| `GET` | `/admin/backups/{backup_id}/restore-attempts` | admin | list restore attempts |
| `GET` | `/admin/backups/schedule-status` | admin | scheduler status |
| `GET` | `/admin/security-summary` | admin | current security summary payload |

## Document types in live flow

- `Fact Find`
- `Terms of Business`
- `Statement of Suitability`

## Backend session keys

- `session_id`
- `user_email`
- `last_seen_at`

## Frontend routes in `App.tsx`

| Path | Behavior |
|------|----------|
| `/` | redirects to `/income-protection` |
| `/login` | login page |
| `/clients` | clients page |
| `/clients/new` | client form page |
| `/clients/:clientReference` | client profile page |
| `/clients/:clientReference/edit` | client form page |
| `/clients/:clientReference/income-protection` | redirect helper to `/income-protection` |
| `/income-protection` | live workflow page |
| `/documents` | redirects to `/clients` |
| `/documents/:clientReference` | redirects to `/clients/:clientReference` |
| `/files` | files page |
| `/settings` | settings page |
| `/admin` | admin page wrapped in `RequireAdmin` |

**Post-fix (2026-06):** Client routes now require authentication. CSRF protection validates Origin/Referer for state-changing endpoints. Upload size limited by MAX_UPLOAD_SIZE_BYTES config. Migration runner available via `python -m app.migrate`.
