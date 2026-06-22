# Scope: Persistence

Use this scope when working with data storage, repositories, backups, restore, sessions, or the remaining post-cutover hardening work.

## Goal

Maintain the PostgreSQL-backed implementation and avoid regressing any of the completed cutovers.

## Current status

The persistence roadmap is complete through Phase 16.

| Layer | Current source of truth | Phase |
|-------|-------------------------|-------|
| Users | PostgreSQL via `UserRepository` | 2 |
| Clients | PostgreSQL via `ClientRepository` | 2 |
| Workflow drafts | PostgreSQL via `WorkflowRepository` | 3 |
| Uploaded files | Disk + PostgreSQL via `FileRepository` | 4 |
| Generated document history | PostgreSQL via `DocumentRepository` | 5 |
| Exported artifacts (PDF/DOCX) | Disk under `FILE_STORAGE_PATH` | 5 |
| Audit logs | PostgreSQL via `AuditLogRepository` | 6 |
| Backup runs | PostgreSQL + disk manifests via `BackupRepository` / `create_backup_manifest()` | 7 |
| Restore attempts | PostgreSQL via `RestoreAttempt` | 9-10 follow-up |
| Sessions | PostgreSQL via `SessionRepository` plus cookie session | 14 |

## What is no longer true

- workflow persistence is not browser-backed anymore
- generated document history is not browser-backed anymore
- file upload/download is not placeholder behavior anymore
- session identity is not cookie-only anymore

## Remaining partial areas

- restore workflow exists, but still needs broader operator hardening
- ~~expired session cleanup exists, but is not automatically scheduled~~ → session cleanup runs on startup
- document pack only includes stored artifacts, not preview-only rows
- frontend delete UI for files/documents is still missing

## Post-fix updates (2026-06)
- Session cleanup is now called on startup
- File upload size limit enforced via max_upload_size_bytes config (default 50MB)
- Migration runner (migrate.py) tracks applied migrations with `_migrations` table
- CSRF origin validation added for state-changing routes
- Remaining: document pack still excludes preview-only rows
- Remaining: frontend delete UI for files/documents still missing

## Entry points

- `apps/api/app/main.py` - route imports and live call sites
- `apps/api/app/config.py` - `DATABASE_URL`, storage paths, restore, scheduler, and remote-access settings
- `apps/api/app/models.py` - SQLAlchemy model definitions
- `apps/api/app/repositories/` - all DB-backed repositories
- `apps/api/app/services/backups.py` - manifest and optional `pg_dump`
- `apps/api/app/services/restore.py` - validate/dry-run/execute restore logic
- `apps/api/app/services/scheduler.py` - scheduled backup lifecycle
- `apps/api/app/services/storage.py` - disk storage and safe deletion
- `apps/frontend/src/data/workflow-api.ts` - workflow persistence client
- `apps/frontend/src/data/file-api.ts` - file API client
- `apps/frontend/src/documents/generated-document-api.ts` - document API client

## Constraints

- preserve current route contracts unless the API is intentionally expanded
- keep `client_reference` as the external client identifier
- keep file storage rooted under `FILE_STORAGE_PATH`
- keep backup artifacts rooted under `BACKUP_PATH`
- do not expose raw filesystem paths to clients
- do not reintroduce browser `localStorage` as workflow or generated-document authority
