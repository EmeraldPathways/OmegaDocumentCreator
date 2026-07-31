# Infrastructure / Ops Review

Status: complete
Reviewer: Automated review pass

## Scope

- Environment configuration (`.env.example`, `config.py`)
- Docker Compose deployment (`infra/docker/compose.yaml`)
- Cloudflare Tunnel setup (`infra/cloudflared/`)
- Runtime operations (`run-omega.cmd`, startup/shutdown)
- Backup scheduling and restore

---

## Findings

### Critical

1. **No migration runner — SQL files must be applied manually**
   - Files: `apps/api/migrations/0001_initial.sql`, `0003_restore_attempts.sql`, `0004_sessions.sql`
   - Problem: SQL migration files exist but there is no automated migration runner (no Alembic, no Flyway, no custom runner). Operators must manually apply SQL files to PostgreSQL in the correct order.
   - Why it matters: Human error in migration application leads to schema inconsistency. Missing migrations are undetected until runtime errors occur.
   - Suggested fix direction: Add Alembic for migration management with auto-detection and version tracking.
   - Confidence: Confirmed

2. **`get_settings()` called at module level with hardcoded defaults — may override environment**
   - File: `apps/api/app/main.py`, lines 41-48 and `apps/api/app/config.py`
   - Problem: The `settings` object is created at import time with literal string defaults. If `get_settings()` prioritizes kwargs over env vars, the entire configuration is frozen to development values.
   - Why it matters: Production deployment could silently run with `SESSION_SECRET="development-only"`, wrong database URL, and local storage paths.
   - Suggested fix direction: Verify `get_settings()` implementation gives env vars highest priority. Remove hardcoded kwargs from the call.
   - Confidence: Needs confirmation

3. **`run-omega.cmd` — Windows-specific startup without health-check wait**
   - File: `run-omega.cmd`
   - Problem: Starts backend and frontend in separate shell windows with no coordination. No health check before opening the frontend. The backend may not be ready when the browser opens.
   - Why it matters: Users see connection errors on first launch. Unreliable developer experience.
   - Suggested fix direction: Add a loop that polls `GET /health` before opening the browser. Wait up to 30 seconds.
   - Confidence: Confirmed

### High

1. **Docker Compose has no health checks or restart policies**
   - File: `infra/docker/compose.yaml`
   - Problem: Services lack `healthcheck` directives. The PostgreSQL service has no `restart: unless-stopped`. If a database goes down, dependent services fail silently.
   - Why it matters: Production-grade reliability requires restart policies and health checks.
   - Suggested fix direction: Add `healthcheck` blocks for all services. Add `restart: unless-stopped` to PostgreSQL and API services.
   - Confidence: Confirmed

2. **Cloudflare Tunnel setup script requires `cloudflared` binary to be pre-installed — no installation step**
   - File: `infra/cloudflared/setup-tunnel.sh`
   - Problem: The script calls `cloudflared tunnel login` and `cloudflared tunnel create` but does not verify that `cloudflared` is installed. Out-of-box failure on fresh machines.
   - Why it matters: Incomplete automation. Operators must manually install cloudflared before the script works. The "automation" claim is only partially true.
   - Suggested fix direction: Add a check for cloudflared with an install command (e.g., `brew install cloudflared` for macOS or download link for Linux).
   - Confidence: Confirmed

3. **No `.env` validation on startup beyond existence checks**
   - File: `apps/api/app/main.py`, `_startup_db_check()`
   - Problem: Startup only warns about SESSION_SECRET and APP_URL in non-dev. Doesn't validate DATABASE_URL format, FILE_STORAGE_PATH writability (only existence), BACKUP_PATH writability, or required env vars.
   - Why it matters: Misconfiguration is detected at runtime when a route fails, not at startup.
   - Suggested fix direction: Validate all critical env vars on startup. Test DB connectivity, storage writability, backup writability.
   - Confidence: Confirmed

4. **Backup scheduler has no persistence — state lost on restart**
   - File: `apps/api/app/services/scheduler.py`
   - Problem: Scheduler state (last run, next run) is held in module-level variables. On app restart, the state resets. If the interval is 60 minutes and the app restarts at minute 59, a backup is missed.
   - Why it matters: Missed backups = data loss risk. Scheduler state should survive restarts.
   - Suggested fix direction: Persist last backup timestamp in the database. On startup, check if a backup should have run while the app was down and trigger it immediately.
   - Confidence: Confirmed

### Medium

1. **Docker Compose uses `build: .` for the API — no pre-built image**
   - File: `infra/docker/compose.yaml`
   - Problem: The API service builds from source on every `docker compose up`. No published image. Build dependencies (Python, pip) must be available at deploy time.
   - Why it matters: Slower deployment. Build failures at deploy time. Inconsistent with production best practices.
   - Suggested fix direction: Build and publish a Docker image to a registry. Reference the image in compose.
   - Confidence: Confirmed

2. **`FILE_STORAGE_PATH` and `BACKUP_PATH` default to relative paths — ambiguous in Docker**
   - File: `.env.example`, `apps/api/app/config.py`
   - Problem: Default paths like `storage/clients` are relative. In Docker, these resolve relative to the container's working directory, not the host. Mismounting volumes causes data to be written inside the container (lost on restart).
   - Why it matters: Silent data loss. Files appear to save but vanish when the container restarts.
   - Suggested fix direction: Use absolute paths in Docker (e.g., `/data/clients`, `/data/backups`). Document the volume mounts clearly.
   - Confidence: Confirmed

3. **`compose.yaml` exposes PostgreSQL port 5432 to the host — not needed for app operation**
   - File: `infra/docker/compose.yaml`, line 13
   - Problem: `ports: - "5432:5432"` exposes PostgreSQL to the host network. The API and frontend can reach it via the internal Docker network.
   - Why it matters: Unnecessary attack surface. PostgreSQL is accessible from the host, which is especially risky if the host has a public IP.
   - Suggested fix direction: Remove the port mapping from `compose.yaml` or bind to `127.0.0.1:5432:5432`.
   - Confidence: Confirmed

4. **No log aggregation or monitoring**
   - Problem: No structured logging, no log levels, no centralized log collection. Debugging requires tailing container stdout.
   - Why it matters: Operational observability is minimal. Troubleshooting production issues is difficult.
   - Suggested fix direction: Add structured JSON logging. Consider a simple log file with rotation or integration with a cloud provider's logging service.
   - Confidence: Informational

### Low

1. **`.env.example` is comprehensive but has no inline documentation for many values**
   - Problem: Values like `REMOTE_ACCESS_MODE`, `TRUSTED_PROXY_COUNT`, `COOKIE_SAMESITE` have no comments explaining valid options.
   - Suggested fix direction: Add inline comments documenting each variable's valid values and effects.
   - Confidence: Informational

2. **`apps/api/app/db.py` creates a single engine instance — no connection pooling configuration**
   - Problem: SQLAlchemy engine created with defaults. No `pool_size`, `max_overflow`, or `pool_recycle` settings.
   - Why it matters: Connection pool exhaustion under concurrent load. Acceptable for current internal use but limits scalability.
   - Suggested fix direction: Configure pool size and overflow based on expected concurrency.
   - Confidence: Informational

3. **`run-omega.cmd` uses `cmd.exe` — not PowerShell or cross-platform**
   - Problem: The root startup script is Windows-specific. Linux/macOS developers must run the backend and frontend separately.
   - Suggested fix direction: Add a `run-omega.sh` equivalent or use Docker Compose as the primary startup method.
   - Confidence: Informational

---

## Confirmed Good

- `.env.example` covers all documented environment variables.
- Docker Compose properly networks services on an internal bridge network.
- Cloudflare Tunnel config template and setup script exist and are well-structured.
- `config.yaml.example` provides a clear template with placeholders for tunnel credentials.
- `.gitignore` protects tunnel credentials and generated config from being committed.
- Backup scheduler has overlap prevention (`_running` flag).
- Startup verifies storage paths exist and logs errors if they don't.
- Shutdown event properly stops the backup scheduler.

---

## Post-Fix Status (Prompts 1-3)

| # | Finding | Status |
|---|---------|--------|
| Critical #1 | No migration runner | **Fixed** — migrate.py with --status, --dry-run, --force |
| Critical #2 | get_settings() hardcoded defaults override env | **Fixed** — _env_or() helper, env vars take priority |
| Critical #3 | run-omega.cmd no health-check wait | **Still Open** |
| High #1 | Docker Compose no health checks/restart policies | **Fixed** — pg_isready + /health checks, restart: unless-stopped, PG bound to 127.0.0.1 |
| High #2 | Cloudflare Tunnel requires pre-installed binary | **Still Open** |
| High #3 | No .env validation on startup | **Partially Fixed** — startup warns on weak SESSION_SECRET, APP_URL, CORS_ORIGINS |
| High #4 | Backup scheduler state not persisted | **Still Open** |
| Medium #1 | Docker Compose builds from source | **Still Open** |
| Medium #2 | Relative storage paths in Docker | **Still Open** |
| Medium #3 | PostgreSQL port exposed to host | **Fixed** — bound to 127.0.0.1:5432 |
| Medium #4 | No structured logging | **Still Open** |
| Low #1 | .env.example no inline docs | **Still Open** |
| Low #2 | No connection pool configuration | **Still Open** |
| Low #3 | run-omega.cmd Windows-only | **Still Open** |

---

## File-Level Follow-Up

- [ ] Add Alembic or equivalent migration runner.
- [ ] Add health checks and restart policies to Docker Compose.
- [ ] Add cloudflared binary check and install instructions to setup-tunnel.sh.
- [ ] Add comprehensive env validation on startup (writability, connectivity).
- [ ] Persist scheduler state in DB for recovery across restarts.
- [ ] Build and publish a Docker image instead of building from source in compose.
- [ ] Remove or restrict PostgreSQL port exposure in compose.yaml.
- [ ] Add cross-platform startup script (`run-omega.sh`).