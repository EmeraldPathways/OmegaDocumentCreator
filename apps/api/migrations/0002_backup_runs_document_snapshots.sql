-- Phase 1 migration follow-up: backup_runs table and durable document snapshot fields
-- These were identified as known runtime gaps during Phase 1 planning.

-- 1. backup_runs table (persisted backup run history)
CREATE TABLE backup_runs (
    id UUID PRIMARY KEY,
    status TEXT NOT NULL,
    triggered_by UUID REFERENCES users(id),
    database_backup TEXT,
    files_backup TEXT,
    documents_backup TEXT,
    error_message TEXT,
    created_at TIMESTAMPTZ NOT NULL
);

CREATE INDEX idx_backup_runs_created_at ON backup_runs (created_at);

-- 2. Durable document snapshot fields for generated history
-- preview_title and preview_html store the frozen preview content
-- so generated-document history rows can be reopened after restart
-- without re-running AI generation.
ALTER TABLE documents
    ADD COLUMN preview_title TEXT,
    ADD COLUMN preview_html TEXT;