ALTER TABLE users
    ADD COLUMN IF NOT EXISTS force_password_change BOOLEAN NOT NULL DEFAULT FALSE;

ALTER TABLE clients
    ADD COLUMN IF NOT EXISTS assigned_to UUID REFERENCES users(id);

CREATE INDEX IF NOT EXISTS idx_clients_assigned_to ON clients (assigned_to);
