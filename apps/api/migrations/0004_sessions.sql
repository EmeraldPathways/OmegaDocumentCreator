-- 0004_sessions.sql
-- Add PostgreSQL-backed session persistence.

CREATE TABLE IF NOT EXISTS sessions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_email TEXT NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    expires_at TIMESTAMPTZ NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_sessions_user_email ON sessions (user_email);
CREATE INDEX IF NOT EXISTS idx_sessions_expires_at ON sessions (expires_at);