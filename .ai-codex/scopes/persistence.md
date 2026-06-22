# Scope: Persistence

Use this scope when working with data storage, repositories, or the PostgreSQL cutover.

## Goal

Replace `store.py` seeded data and frontend browser storage with real backend persistence.

## Current status (post-Phase 8)

All previously in-memory/seeded layers have been cut over to PostgreSQL:

| Layer | Pre-cutover | Post-cutover | Phase |
|-------|-------------|-------------|-------|
| Users | In-memory (`store.py`) | PostgreSQL via `UserRepository` | 2 |
| Clients | In-memory (`store.py`) | PostgreSQL via `ClientRepository` | 2 |
| Workflow drafts | Browser storage | PostgreSQL via `WorkflowRepository` | 3 |
| Uploaded files | Browser storage + seeded | Disk + PostgreSQL via `FileRepository` | 4 |
| Generated document history | In-memory + browser | PostgreSQL via `DocumentRepository` | 5 |
| Exported artifacts (PDF/DOCX) | None | Disk under FILE_STORAGE_PATH | 5 |
| Audit logs | In-memory seeded | PostgreSQL via `AuditLogRepository` | 6 |
| Backup runs | In-memory seeded | PostgreSQL via `BackupRepository` + manifest artifacts on disk | 7 |

## Remaining partially-implemented or intentionally not implemented

- **Database dump/restore**: Backup manifests record metadata only; no `pg_dump` integration. Restore operations not implemented.
- **Backup scheduling**: No automated/scheduled backup mechanism.
- **Session table in DB**: Session stored in cookie only; no `sessions` table in PostgreSQL.
- **store.py cleanup**: `SEEDED_USERS`, `SEEDED_CLIENTS`, `_DRAFT_STORE`, and related templates remain in `store.py` for backward compatibility with `ClientRepository._to_detail_response()` and frontend seeded-client fallback paths. `list_audit_logs`, `create_backup_run`, and `latest_backup_run` have been removed (superceded by PostgreSQL).
- **Frontend `localStorage`**: Still used by `client-data-context.tsx` for immediate UX caching; workflow saves are backed by `PUT /clients/{ref}/workflow`.

## Entry points

- `apps/api/app/main.py` - route imports and live call sites
- `apps/api/app/config.py` - `DATABASE_URL`, storage paths, remote-access settings
- `apps/api/app/repositories/` - all DB-backed repository implementations
- `apps/api/app/services/` - storage service, backup service
- `apps/api/app/models.py` - SQLAlchemy model definitions
- `apps/frontend/src/data/client-data-context.tsx` - frontend workflow caching (localStorage with backend-backed saves)
- `apps/frontend/src/data/file-api.ts` - file upload/download API client
- `apps/frontend/src/documents/generated-document-api.ts` - document list/create/download API client

## Constraints

- Preserve current route contracts unless the API is intentionally expanded.
- Keep `client_reference` as the external client identifier.
- Keep file storage rooted under `FILE_STORAGE_PATH`; backup artifacts under `BACKUP_PATH`.
- Cookie-session auth should stay cookie-based unless explicitly redesigned.
- Do not expose raw filesystem paths to clients — use relative paths.