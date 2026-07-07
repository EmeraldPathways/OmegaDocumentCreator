# Docker-Only Move Plan

## Goal

Move Omega Document Creator from the current hybrid local setup to a stable Docker-only runtime suitable for an always-on work-computer host, with Cloudflare Tunnel added after the Docker stack is stable.

## Current Findings

1. The current Docker path is only partial.
   - `infra/docker/compose.yaml` defines `postgres`, `api`, and `frontend`.
   - The frontend container currently runs `npm run dev`, which is not the right runtime for always-on hosting.

2. The frontend container still depends on local-dev proxy assumptions.
   - `apps/frontend/vite.config.ts` proxies API traffic to `http://127.0.0.1:8007`.
   - Inside Docker, that is wrong because `127.0.0.1` points to the frontend container itself, not the API container.

3. The live local `.env` is still native-dev shaped.
   - It points `DATABASE_URL` to `127.0.0.1:5432`.
   - It uses `APP_URL=http://127.0.0.1:8007`.
   - It uses frontend-origin values for `3007` and `8007`.

4. The Docker-oriented `.env.example` already points in the right direction.
   - `DATABASE_URL` uses `postgres`.
   - `FILE_STORAGE_PATH` and `BACKUP_PATH` use `/data/...`.

5. The API container may be missing hosted-mode system dependencies.
   - The app config expects `soffice`, `pg_dump`, and `pg_restore`.
   - The current API Dockerfile only installs the Python app.

## Plan

### 1. Rework the frontend container into a production container

- Replace the current frontend Dockerfile with a multi-stage build.
- Build the frontend with `npm run build`.
- Serve the built `dist/` output with `nginx`.
- Add SPA fallback routing so refreshes on `/clients/...` and similar routes work.

### 2. Add a real reverse proxy for backend routes

- In the frontend container, proxy:
  - `/auth`
  - `/clients`
  - `/documents`
  - `/admin`
  - `/health`
  - `/ready`
- Route those to `http://api:8000`.
- Stop depending on Vite dev proxy behavior for hosted mode.

### 3. Split Docker-hosted config from native local config

- Add a dedicated hosted env file such as `.env.docker`.
- Set Docker-hosted values for:
  - `DATABASE_URL=postgresql+psycopg2://...@postgres:5432/...`
  - `FILE_STORAGE_PATH=/data/clients`
  - `BACKUP_PATH=/data/backups`
  - hosted `APP_URL`
  - hosted `CORS_ORIGINS`
  - hosted `CSRF_TRUSTED_ORIGINS`
  - `COOKIE_SECURE=true` once behind HTTPS
  - correct `TRUSTED_PROXY_COUNT`
- Keep the current `.env` available for native local development if needed.

### 4. Harden the API container for always-on use

- Keep the API on internal Docker port `8000`.
- Verify startup migration behavior is acceptable for hosted boot.
- Install required system binaries in the API image if those features must work in hosted mode:
  - `soffice`
  - `pg_dump`
  - `pg_restore`
- If some features are intentionally deferred, document that explicitly.

### 5. Align Compose with persistent hosted storage

- Keep persistent storage for:
  - Postgres data
  - client file storage
  - backups
- Ensure the API actually uses `/data/clients` and `/data/backups` in Docker-hosted mode.
- Keep health checks and restart policies.
- Avoid exposing unnecessary host ports once Cloudflare Tunnel is in front, unless local admin access needs them.

### 6. Verify Docker-only before adding Cloudflare

- Run `docker compose -f infra/docker/compose.yaml --env-file .env.docker up --build`.
- Verify:
  - login/logout
  - `/auth/me`
  - client CRUD
  - workflow save/load
  - file upload/download
  - document generation/export
  - persistence after restart
- Treat this as the acceptance gate before adding Cloudflare Tunnel.

### 7. Add Cloudflare Tunnel last

- Enable the `cloudflared` service after the Docker-only stack is proven stable.
- Point ingress at Docker service names.
- Switch app identity and security settings to the real public hostnames.
- Re-test auth cookies, CSRF, and remote access through the tunnel.

## Recommended Implementation Order

1. Frontend production container and reverse proxy
2. Docker-hosted env/config split
3. API container hardening
4. Compose persistence verification
5. Full Docker-only smoke test
6. Cloudflare Tunnel

## Verification Command

```powershell
docker compose -f infra/docker/compose.yaml --env-file .env.docker up --build
```

## DeepSeek Prompt

Use this prompt in DeepSeek as a scoped implementation handoff:

```text
You are working in:
D:\GOOGLE DRIVE\EMERALD PATHWAYS\WEB WORK\AI CODING\VS CODE\work\Omega Document Creator

Task:
Implement the Docker-only hosting move for this repo. Do not touch unrelated app logic. Keep changes surgical and production-oriented.

Context:
- This repo currently runs locally in hybrid mode:
  - Postgres in Docker
  - API locally on 127.0.0.1:8007
  - Frontend locally on 127.0.0.1:3007
- The target is an always-on Docker-only hosted runtime on the work computer.
- Cloudflare Tunnel will be added later, after the Docker-only stack is stable.

What is already true in the repo:
- `infra/docker/compose.yaml` already defines `postgres`, `api`, and `frontend`
- `apps/api/Dockerfile` exists
- `apps/frontend/Dockerfile` exists
- `.env.example` already reflects Docker-style values better than the current live `.env`

Problems that must be fixed:
1. The frontend Dockerfile currently runs `npm run dev`, which is not acceptable for an always-on hosted runtime.
2. The frontend relies on Vite dev proxy behavior and proxies to `127.0.0.1:8007`, which is wrong inside Docker.
3. The hosted config needs to use Docker service names and `/data/...` paths.
4. The final Docker runtime must support the existing frontend SPA routes and backend API routes.
5. The resulting setup must be suitable for later Cloudflare Tunnel adoption.

Implementation requirements:
1. Replace the frontend container with a production-style container:
   - multi-stage build
   - build with `npm run build`
   - serve built assets with `nginx`
   - support SPA route fallback
2. Add reverse proxy handling in the frontend container for:
   - `/auth`
   - `/clients`
   - `/documents`
   - `/admin`
   - `/health`
   - `/ready`
   to `http://api:8000`
3. Add a Docker-hosted env file, for example `.env.docker`, with Docker-appropriate values.
4. Update `infra/docker/compose.yaml` to use the Docker-hosted env file or otherwise make the Docker-hosted path explicit and reliable.
5. Ensure persistent storage is correctly wired for:
   - Postgres data
   - client files
   - backups
6. Review the API image and install required system dependencies only if they are needed for hosted features already expected to work.
7. Do not remove the existing local-native workflow unless a file clearly needs a note explaining the new hosted path.

Files to inspect first:
- `infra/docker/compose.yaml`
- `apps/frontend/Dockerfile`
- `apps/frontend/package.json`
- `apps/frontend/vite.config.ts`
- `apps/api/Dockerfile`
- `apps/api/app/config.py`
- `.env.example`

Expected outputs:
1. Code/config changes that make Docker-only hosting viable
2. A short summary of what changed
3. Exact verification commands
4. Any remaining blockers or deferred items

Acceptance criteria:
- `docker compose -f infra/docker/compose.yaml --env-file .env.docker up --build` is the intended hosted startup command
- frontend is no longer running a Vite dev server in Docker
- frontend API traffic resolves correctly to the API container
- Docker-hosted config no longer depends on `127.0.0.1:8007` or native-only storage paths
- The result is structurally ready for Cloudflare Tunnel to be added afterward
```
