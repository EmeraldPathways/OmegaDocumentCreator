# API Surface

## REST endpoints (backend)

### Auth
| Method | Path | Auth | Notes |
|--------|------|------|-------|
| POST | `/auth/login` | public | body: `{ email, password }` → sets session cookie |
| POST | `/auth/logout` | session | clears session |
| GET | `/auth/me` | session | returns `{ email, role, name }` |

### Clients
| Method | Path | Auth | Notes |
|--------|------|------|-------|
| GET | `/clients` | session | list, supports `?search=` |
| POST | `/clients` | session | create client |
| GET | `/clients/{ref}` | session | get by `client_reference` |
| PATCH | `/clients/{ref}` | session | update fields |
| PATCH | `/clients/{ref}/archive` | admin | archive |

### Documents
| Method | Path | Auth | Notes |
|--------|------|------|-------|
| POST | `/documents/generate` | session | body: `{ doc_type, client_data }` → `{ title, summary, sections, warnings, generated_html }` |

### Admin
| Method | Path | Auth | Notes |
|--------|------|------|-------|
| GET | `/admin/users` | admin | list staff |
| POST | `/admin/users` | admin | create user |
| PATCH | `/admin/users/{email}` | admin | update user |
| PATCH | `/admin/users/{email}/disable` | admin | disable user |
| GET | `/admin/audit-logs` | admin | seeded log list |
| GET | `/admin/security-summary` | admin | seeded security summary |
| POST | `/admin/backups/run` | admin | trigger backup (seeded) |

### Health
| Method | Path | Auth |
|--------|------|------|
| GET | `/health` | public |

## Not yet implemented
- `GET /files` / `POST /files` — file upload/download
- `GET /documents/{id}/download` — document download
- `POST /admin/backups/schedule` — scheduled backups
- Any Income Protection persistence endpoints

## Document types (`doc_type` values)
- `fact_find`
- `terms_of_business`
- `statement_of_suitability`

## Document generation response shape
```typescript
{
  title: string;
  summary: string;
  sections: Array<{ heading: string; content: string }>;
  warnings: string[];
  generated_html: string;
}
```

## Session keys (backend)
- `user_email: str`
- `last_seen_at: str` (ISO datetime)
- `role: str` — `"admin"` | `"staff"`

## Frontend routes
| Path | Page |
|------|------|
| `/` | Dashboard / module roadmap |
| `/login` | Login |
| `/clients` | Client list |
| `/clients/new` | Create client |
| `/clients/:ref` | Client profile |
| `/clients/:ref/edit` | Edit client |
| `/clients/:ref/income-protection` | Redirect → `/income-protection` |
| `/income-protection` | Workflow tabs |
| `/files` | Files (scaffold) |
| `/settings` | Settings |
| `/admin` | Admin panel |
| `/documents` | Redirect → `/clients` |
| `/documents/:ref` | Redirect → `/clients/:ref` |
