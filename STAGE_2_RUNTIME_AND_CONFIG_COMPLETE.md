# Stage 2 Runtime and Config Complete

- Date completed: 2026-08-12
- Branch used: `office-pc-stage1`
- Commit SHA at completion checkpoint: `ec7dd1fccd8eabad903300c90dc4edfa89e6087a`
- Stage status: complete
- Next stage decision: go to Stage 3

## Scope Completed
- Frontend Docker runtime changed from Vite development server to production build plus nginx runtime
- Stable internal frontend container port kept at `3000`
- Docker host-mounted client and backup storage made configurable through:
  - `CLIENT_FILES_HOST_PATH`
  - `BACKUPS_HOST_PATH`
- Backend container contract aligned so runtime storage paths inside the container are always:
  - `FILE_STORAGE_PATH=/data/clients`
  - `BACKUP_PATH=/data/backups`
- Backend container database contract aligned so Docker always uses:
  - `DATABASE_URL=postgresql+psycopg://{POSTGRES_USER}:{POSTGRES_PASSWORD}@postgres:5432/{POSTGRES_DB}`
- `.env.example` updated to document explicit local host paths and the non-synced working-folder rule
- Backend config path resolution fixed so Docker image startup no longer crashes when no repo-root `.env` file exists inside the container
- Client storage contract updated so every client year gets the required product folders and year-root artifacts can live outside workflow subfolders

## Detailed Description

### 1. Frontend production runtime
- Before:
  - the frontend Docker image ran `npm run dev`
  - the container depended on the Vite development server
  - this was not a production runtime shape
- After:
  - the frontend Docker image now builds the static app in a Node build stage
  - nginx serves the built frontend in the final image
  - nginx proxies backend app routes to `http://api:8000`
  - SPA routing is handled with `try_files ... /index.html`
- Why this mattered:
  - Stage 2 required a production-shaped frontend runtime instead of a dev server

### 2. Host path contract for files and backups
- Before:
  - Compose hardcoded repo-local bind mounts:
    - `../../storage/clients`
    - `../../storage/backups`
  - this did not match the office-PC requirement for explicit machine-local storage paths
- After:
  - Compose now binds:
    - `${CLIENT_FILES_HOST_PATH}:/data/clients`
    - `${BACKUPS_HOST_PATH}:/data/backups`
  - `.env.example` documents those host-path variables directly
- Why this mattered:
  - the office PC must be configured with deliberate local storage locations rather than implicit repo folders

### 3. Backend container storage truth
- Before:
  - the API container could still inherit `FILE_STORAGE_PATH` and `BACKUP_PATH` from the repo `.env`
  - that created a mismatch between mounted Docker paths and the backend's live storage settings
- After:
  - Compose explicitly forces:
    - `FILE_STORAGE_PATH=/data/clients`
    - `BACKUP_PATH=/data/backups`
  - the bind mounts and backend runtime now point at the same in-container locations
- Why this mattered:
  - a storage mount is not enough if the application is still writing somewhere else

### 4. Backend container database truth
- Before:
  - the API container could inherit a host-style `DATABASE_URL` such as `127.0.0.1:5432`
  - inside Docker, that points at the API container itself, not the `postgres` service
- After:
  - Compose explicitly sets `DATABASE_URL` to use the Docker service hostname `postgres`
- Why this mattered:
  - Docker runtime must be self-consistent regardless of the developer machine's local backend settings

### 5. Production proxy safeguards
- Added nginx safeguards needed to preserve existing app behavior:
  - `client_max_body_size 50m`
  - longer proxy timeouts for backend-backed requests
- Why this mattered:
  - the production frontend should not silently break existing file-upload or long-running document flows

### 6. Docker image startup fix discovered during verification
- Before:
  - `apps/api/app/config.py` assumed `Path(__file__).resolve().parents[3]` always existed
  - this worked in the repo checkout but failed inside the Docker image at `/app/app/config.py`
  - the API container crashed before migrations completed
- After:
  - config root resolution now:
    - prefers a parent directory containing `.env`
    - otherwise falls back to a parent directory containing `pyproject.toml`
  - backend tests were extended to cover both cases
- Why this mattered:
  - Stage 2 verification exposed a real deployment-only startup defect that had to be fixed before the runtime contract was honest

### 7. Client storage taxonomy contract
- Before:
  - storage folders were created on demand only
  - Fact Find-style workflow hints collapsed into `income-protection`
  - there was no guaranteed `pensions`, `savings`, or `investments` folder contract for each client year
- After:
  - each client year is provisioned with:
    - year-root `files` and `documents`
    - `income-protection/files` and `income-protection/documents`
    - `pensions/files` and `pensions/documents`
    - `savings/files` and `savings/documents`
    - `investments/files` and `investments/documents`
  - Fact Find, Fact Find Update, and Terms of Business now resolve to the year root
  - Quote and Statement of Suitability remain under `income-protection`
- Why this mattered:
  - the storage tree now matches the intended office-PC client folder taxonomy and advisor workflow expectations

## Files Changed
- `.env.example`
- `apps/api/app/config.py`
- `apps/api/app/main.py`
- `apps/api/app/services/storage.py`
- `apps/api/tests/test_settings.py`
- `apps/api/tests/test_storage.py`
- `apps/frontend/Dockerfile`
- `apps/frontend/nginx.conf`
- `infra/docker/compose.yaml`

## Verification Run
- `python -m pytest apps/api/tests/test_settings.py apps/api/tests/test_admin_settings.py`
- `npx.cmd tsc --noEmit`
- `docker compose -f infra/docker/compose.yaml config`
  - verified with explicit temporary host paths injected for:
    - `CLIENT_FILES_HOST_PATH`
    - `BACKUPS_HOST_PATH`
- `docker compose -f infra/docker/compose.yaml up -d --build`
  - verified against temporary local folders under `.tmp/stage2-docker/`
- `Invoke-WebRequest -UseBasicParsing http://127.0.0.1:8000/ready`
- `Invoke-WebRequest -UseBasicParsing http://127.0.0.1:3000`
- `docker compose -f infra/docker/compose.yaml down`

## Results
- Backend config and admin-settings tests passed.
- Frontend TypeScript check passed.
- Storage taxonomy tests passed.
- Compose resolved successfully with explicit host paths.
- Docker build succeeded for both:
  - API image
  - frontend production image
- API container started healthy on `127.0.0.1:8000`.
- Frontend container served successfully on `127.0.0.1:3000`.
- Temporary smoke-run containers were shut down after verification.

## Final Runtime Contract From Stage 2
- PostgreSQL container:
  - internal port `5432`
  - host binding `127.0.0.1:5432`
- API container:
  - internal port `8000`
  - host binding `127.0.0.1:8000`
  - database host inside Docker: `postgres`
  - storage roots inside Docker:
    - `/data/clients`
    - `/data/backups`
- Frontend container:
  - internal port `3000`
  - host binding `127.0.0.1:3000`
  - served by nginx from a built static frontend
- Host machine storage contract:
  - client files come from `CLIENT_FILES_HOST_PATH`
  - backups come from `BACKUPS_HOST_PATH`
  - these must be explicit local machine paths, not synced working folders
- Advisor document intake contract:
  - advisors add working files through Omega upload
  - SharePoint is not the live working storage path
- Client folder taxonomy:
  - `{client}/{year}/files` and `{client}/{year}/documents` for Fact Find-style year-root artifacts
  - `{client}/{year}/income-protection/{files|documents}` for Quote and Statement of Suitability artifacts
  - `{client}/{year}/pensions/{files|documents}`, `{client}/{year}/savings/{files|documents}`, and `{client}/{year}/investments/{files|documents}` as the product-folder baseline

## Out Of Scope For Stage 2
- final Cloudflare access topology
- final restart model classification as attended or unattended
- final SharePoint archive or export operating procedure
- final Windows office-PC runbook rewrite
- tagged release candidate assembly
- clean-machine office-PC installation proof

## Open Issues
- No remaining Stage 2 runtime or config blockers are open.
- `ODC - Remote access and Windows.md`, `OFFICE_PC_PORTING_READINESS_PLAN.md`, and `OFFICE_PC_PORTING_STAGED_EXECUTION_PLAN.md` remain locally modified from the documentation updates that preceded Stage 2.
- Temporary verification folders remain under `.tmp/stage2-docker/` and can be kept for later Docker checks or removed later.

## Go / No-Go
- Go for Stage 3.
- Recommended next focus:
  - lock the supported restart model
  - define the Cloudflare remote-access topology
  - define backup and restore operating rules
  - define the final SharePoint archive or export position without sync-based intake
