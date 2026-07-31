# Scope: Persistence

Use this scope when working with data storage, repositories, backups, restore, sessions, or storage cleanup.

## Goal

Maintain the PostgreSQL-backed implementation and avoid regressing any completed cutovers.

## Current status

| Layer | Current source of truth |
|-------|-------------------------|
| Users | PostgreSQL via `UserRepository` |
| Sessions | PostgreSQL via `SessionRepository` plus cookie session |
| Clients | PostgreSQL via `ClientRepository` |
| Client assignment | PostgreSQL `assigned_to` on clients |
| Workflow drafts | PostgreSQL via `WorkflowRepository` |
| Uploaded files | Disk + PostgreSQL via `FileRepository` |
| Generated document history | PostgreSQL via `DocumentRepository` |
| Exported artifacts (PDF/DOCX) | Disk under `FILE_STORAGE_PATH` |
| Audit logs | PostgreSQL via `AuditLogRepository` |
| Backup runs | PostgreSQL + disk manifests via `BackupRepository` / `create_backup_manifest()` |
| Restore attempts | PostgreSQL via `RestoreAttempt` |

## Storage layout

```text
storage/
  backups/
  clients/
    {Last, First - omega-00000}/
      {year}/
        {workflow}/
          files/
          documents/
```

## What is no longer true

- workflow persistence is not browser-only
- generated document history is not browser-only
- files/documents are not placeholder behavior
- sessions are not cookie-only
- quarantine folders are not part of the intended steady-state storage model

## Active constraints

- preserve route contracts unless payload expansion is intentional
- keep `client_reference` as the external identifier
- keep all artifacts inside the client/year/workflow tree
- keep backup artifacts rooted under `BACKUP_PATH`
- do not expose raw filesystem paths to clients
- on write failures, clean up newly written artifacts before returning errors

## Entry points

- `apps/api/app/main.py` - live route call sites and access checks
- `apps/api/app/config.py` - `DATABASE_URL`, storage paths, restore, scheduler, remote-access settings
- `apps/api/app/models.py` - SQLAlchemy model definitions
- `apps/api/app/repositories/` - DB-backed repositories
- `apps/api/app/services/backups.py` - manifest and optional `pg_dump`
- `apps/api/app/services/restore.py` - validate/dry-run/execute restore logic
- `apps/api/app/services/scheduler.py` - scheduled backup lifecycle
- `apps/api/app/services/storage.py` - disk storage and safe deletion
- `apps/frontend/src/data/workflow-api.ts` - workflow persistence client
- `apps/frontend/src/data/file-api.ts` - file API client
- `apps/frontend/src/documents/generated-document-api.ts` - document API client

## Follow-up areas

- legacy `apps/api/storage/` and flat client folders should stay out of the live path
- frontend still carries a client cache for UX rehydration
- missing-file reconciliation and operator cleanup reporting can still be improved
