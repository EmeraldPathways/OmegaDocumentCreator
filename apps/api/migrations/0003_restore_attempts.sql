-- Phase 1 migration follow-up: restore_attempts table
-- Tracks every restore attempt (dry-run and execute) against backup runs.

CREATE TABLE restore_attempts (
    id UUID PRIMARY KEY,
    backup_run_id UUID NOT NULL REFERENCES backup_runs(id) ON DELETE CASCADE,
    status TEXT NOT NULL,
    mode TEXT NOT NULL,
    started_by UUID REFERENCES users(id),
    dump_file TEXT,
    error_message TEXT,
    created_at TIMESTAMPTZ NOT NULL
);

CREATE INDEX idx_restore_attempts_backup_run_id ON restore_attempts (backup_run_id);