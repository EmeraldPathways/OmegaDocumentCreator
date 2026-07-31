# Omega Remote Access Rollout Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Expose the Omega app securely for remote staff access using Cloudflare Tunnel and Cloudflare Access without opening inbound office firewall ports.

**Architecture:** Keep the app local-first and private on the office machine or Docker host. Publish only the frontend and API through a Cloudflare Tunnel, protect the frontend with Cloudflare Access email rules, and keep PostgreSQL plus local storage unreachable from the public internet.

**Tech Stack:** Docker Compose, Cloudflare Tunnel (`cloudflared`), Cloudflare Access, FastAPI, React/Vite, PostgreSQL, Windows-first local deployment

## Global Constraints

- Use Cloudflare Tunnel as the primary remote-access path; do not expose raw office ports publicly.
- Keep PostgreSQL and local storage private; only frontend and API routes may be published.
- Preserve current app route structure and backend/API separation.
- Remote mode must use HTTPS origins and secure cookies.
- Do not commit live tunnel credentials, generated `config.yaml`, or production secrets.
- Match existing repo patterns in `infra/docker/compose.yaml`, `infra/cloudflared/config.yaml.example`, `.env.example`, and backend startup validation.
- Prefer small diffs and keep runtime behavior unchanged for local-only users.

---

### Task 1: Finalize the remote-access deployment profile in repo config

**Files:**
- Modify: `infra/docker/compose.yaml`
- Modify: `infra/cloudflared/config.yaml.example`
- Modify: `.env.example`
- Modify: `apps/api/app/config.py`
- Modify: `apps/api/app/main.py`
- Test: `apps/api/tests/test_api.py`

**Interfaces:**
- Consumes: existing env keys from `AppSettings`, existing startup validation in `_startup_db_check()`, existing Compose services `api` and `frontend`
- Produces: a complete remote deployment profile using env keys `APP_URL`, `REMOTE_ACCESS_MODE`, `CORS_ORIGINS`, `CSRF_TRUSTED_ORIGINS`, `COOKIE_SECURE`, and `TRUSTED_PROXY_COUNT`

- [ ] **Step 1: Write the failing backend tests for remote settings parsing**

```python
def test_remote_settings_parse_https_origins_and_proxy_count():
    settings = get_settings(
        APP_URL="https://omega.example.com",
        REMOTE_ACCESS_MODE="remote",
        CORS_ORIGINS="https://omega.example.com,https://omega-api.example.com",
        CSRF_TRUSTED_ORIGINS="https://omega.example.com,https://omega-api.example.com",
        COOKIE_SECURE="true",
        TRUSTED_PROXY_COUNT="1",
    )

    assert settings.app_url == "https://omega.example.com"
    assert settings.remote_access_mode == "remote"
    assert settings.cookie_secure is True
    assert settings.trusted_proxy_count == 1
    assert settings.cors_origins == [
        "https://omega.example.com",
        "https://omega-api.example.com",
    ]
    assert settings.csrf_trusted_origins == [
        "https://omega.example.com",
        "https://omega-api.example.com",
    ]
```

- [ ] **Step 2: Run the focused test to verify the current behavior**

Run:

```powershell
cd apps/api
..\api\.venv\Scripts\python.exe -m pytest tests/test_api.py -k remote_settings_parse_https_origins_and_proxy_count -v
```

Expected: either the test does not exist yet or fails until the coverage is added.

- [ ] **Step 3: Update `.env.example` with the production-ready remote block**

Add or normalize these lines:

```dotenv
APP_URL=https://omega.yourdomain.com
ENVIRONMENT=production
REMOTE_ACCESS_MODE=remote
CORS_ORIGINS=https://omega.yourdomain.com,https://omega-api.yourdomain.com
TRUSTED_PROXY_COUNT=1
CSRF_TRUSTED_ORIGINS=https://omega.yourdomain.com,https://omega-api.yourdomain.com
COOKIE_SECURE=true
COOKIE_SAMESITE=lax
```

Keep them as examples only; do not add real production values.

- [ ] **Step 4: Harden the config/startup expectations for remote mode**

Implement minimal validation in `apps/api/app/config.py` and `apps/api/app/main.py` so remote mode clearly warns on:

```python
if settings.remote_access_mode == "remote":
    if not settings.app_url.startswith("https://"):
        logger.warning("APP_URL should use https:// when REMOTE_ACCESS_MODE=remote.")
    if not settings.cookie_secure:
        logger.warning("COOKIE_SECURE should be true when REMOTE_ACCESS_MODE=remote.")
    if not settings.cors_origins:
        logger.warning("CORS_ORIGINS must be configured for remote access.")
    if not settings.csrf_trusted_origins:
        logger.warning("CSRF_TRUSTED_ORIGINS must be configured for remote access.")
```

- [ ] **Step 5: Update the tunnel example and Compose guidance**

Make `infra/cloudflared/config.yaml.example` match the expected hostnames exactly:

```yaml
tunnel: YOUR_TUNNEL_UUID
credentials-file: /etc/cloudflared/YOUR_TUNNEL_UUID.json

ingress:
  - hostname: omega-api.yourdomain.com
    service: http://api:8000
  - hostname: omega.yourdomain.com
    service: http://frontend:3000
  - service: http_status:404
```

In `infra/docker/compose.yaml`, keep the tunnel commented but update the operator notes so they explicitly say:

```yaml
# Set APP_URL=https://omega.yourdomain.com
# Set COOKIE_SECURE=true
# Set TRUSTED_PROXY_COUNT=1
# Set CORS_ORIGINS and CSRF_TRUSTED_ORIGINS to the public frontend/API origins
```

- [ ] **Step 6: Run the focused backend test**

Run:

```powershell
cd apps/api
..\api\.venv\Scripts\python.exe -m pytest tests/test_api.py -k remote_settings_parse_https_origins_and_proxy_count -v
```

Expected: PASS

- [ ] **Step 7: Run the broader backend verification**

Run:

```powershell
cd apps/api
..\api\.venv\Scripts\python.exe -m pytest tests/test_api.py tests/test_clients.py -v
```

Expected: PASS

- [ ] **Step 8: Commit**

```bash
git add .env.example infra/docker/compose.yaml infra/cloudflared/config.yaml.example apps/api/app/config.py apps/api/app/main.py apps/api/tests/test_api.py
git commit -m "feat: add remote access deployment profile"
```

### Task 2: Add operator documentation for Cloudflare Tunnel and Access

**Files:**
- Create: `docs/remote-access.md`
- Modify: `PROJECT.md`
- Modify: `infra/cloudflared/setup-tunnel.sh`
- Test: `docs/remote-access.md` (manual verification checklist)

**Interfaces:**
- Consumes: tunnel config template, Compose guidance, env keys from Task 1
- Produces: one operator-facing runbook with domain, tunnel, Access, and validation steps

- [ ] **Step 1: Write the documentation skeleton**

Create this structure in `docs/remote-access.md`:

```md
# Remote Access Runbook

## 1. Prerequisites
## 2. Domain and DNS
## 3. Cloudflare Tunnel creation
## 4. Cloudflare Access policy
## 5. Omega environment values
## 6. Docker Compose enablement
## 7. Validation checks
## 8. Rollback
```

- [ ] **Step 2: Document the exact Cloudflare Access rule model**

Document this policy shape:

```text
Application: omega.yourdomain.com
Policy action: Allow
Allowed emails:
- info@omegafinancial.ie
- john@omegafinancial.ie
- aideen@omegafinancial.ie
- andrew@omegafinancial.ie
- sophie@omegafinancial.ie
- declan@omegafinancial.ie
- tadhg@omegafinancial.ie
- aimee@omegafinancial.ie
- alison@omegafinancial.ie
```

Include a note that Cloudflare Access is an outer access gate and does not replace in-app auth/permissions.

- [ ] **Step 3: Add explicit operator commands**

Document commands like:

```bash
docker compose -f infra/docker/compose.yaml up -d
docker compose -f infra/docker/compose.yaml logs -f api
docker compose -f infra/docker/compose.yaml logs -f frontend
docker compose -f infra/docker/compose.yaml logs -f cloudflared
```

Also document validation URLs:

```text
https://omega.yourdomain.com
https://omega-api.yourdomain.com/health
https://omega-api.yourdomain.com/ready
```

- [ ] **Step 4: Make the tunnel setup script self-checking**

At the start of `infra/cloudflared/setup-tunnel.sh`, add a binary check:

```bash
if ! command -v cloudflared >/dev/null 2>&1; then
  echo "cloudflared is not installed. Install it first: https://developers.cloudflare.com/cloudflare-one/connections/connect-networks/downloads/"
  exit 1
fi
```

- [ ] **Step 5: Link the runbook from `PROJECT.md`**

Add a short entry such as:

```md
- Remote access runbook: `docs/remote-access.md`
```

- [ ] **Step 6: Run the documentation verification checklist**

Confirm the runbook contains:

```text
[ ] Hostnames for frontend and API
[ ] Access email allowlist
[ ] Required .env values
[ ] Compose enablement steps
[ ] Health/ready validation URLs
[ ] Rollback steps
```

Expected: every checkbox can be answered from the document alone.

- [ ] **Step 7: Commit**

```bash
git add docs/remote-access.md PROJECT.md infra/cloudflared/setup-tunnel.sh
git commit -m "docs: add cloudflare remote access runbook"
```

### Task 3: Add end-to-end remote deployment verification and rollback procedure

**Files:**
- Modify: `run-omega.cmd`
- Create: `docs/remote-access-checklist.md`
- Modify: `apps/frontend/src/auth/auth-context.tsx`
- Test: `apps/frontend/src/app.test.tsx`

**Interfaces:**
- Consumes: remote env profile and operator runbook from Tasks 1-2
- Produces: a repeatable verification checklist and frontend behavior that does not infer access from local-only assumptions

- [ ] **Step 1: Add a focused frontend test for backend-authoritative auth**

Add a test case shaped like:

```tsx
it("uses backend auth state instead of local email heuristics", async () => {
  // mock /auth/me returning a signed-in non-admin user
  // assert route gating follows the backend payload
})
```

The test must prove remote users are accepted based on `/auth/me`, not guessed from email patterns in the browser.

- [ ] **Step 2: Run the focused frontend test to verify the current behavior**

Run:

```powershell
cd apps/frontend
npm.cmd test -- src/app.test.tsx
```

Expected: fail if the route/auth behavior still depends on legacy assumptions.

- [ ] **Step 3: Remove any remaining local-only assumptions from auth startup**

In `apps/frontend/src/auth/auth-context.tsx`, keep this rule explicit:

```ts
// Effective auth comes from /auth/login and /auth/me.
// sessionStorage mirrors UI state only.
```

If any email-based role inference remains, remove it and trust the backend response shape.

- [ ] **Step 4: Add the operator remote-access checklist**

Create `docs/remote-access-checklist.md` with these validation items:

```md
# Remote Access Checklist

- [ ] Frontend opens through Cloudflare Access login
- [ ] `info@omegafinancial.ie` can sign in remotely
- [ ] `/health` returns the expected `remote_access_mode`
- [ ] `/ready` reports database and storage ready
- [ ] Session cookie is marked Secure
- [ ] File upload works remotely
- [ ] Generated documents download remotely
- [ ] Logout clears the session
- [ ] Local LAN-only startup still works after remote changes
```

- [ ] **Step 5: Add a remote startup note to `run-omega.cmd`**

Add a short operator comment block only, for example:

```cmd
REM Remote mode uses Docker Compose plus Cloudflare Tunnel.
REM This script remains the preferred local-only startup path on 127.0.0.1.
```

Do not make `run-omega.cmd` automatically start remote services.

- [ ] **Step 6: Run frontend verification**

Run:

```powershell
cd apps/frontend
npm.cmd test
npm.cmd run build
```

Expected: PASS

- [ ] **Step 7: Run remote smoke verification after deployment**

Use this checklist after the real tunnel is enabled:

```text
1. Open https://omega.yourdomain.com and confirm Cloudflare Access prompts first.
2. Sign in as info@omegafinancial.ie.
3. Generate a Fact Find.
4. Generate a Quote.
5. Generate a Statement of Suitability.
6. Upload a file and download it again.
7. Confirm storage paths still land under storage/clients locally.
```

Expected: all actions succeed with no direct office port exposure.

- [ ] **Step 8: Commit**

```bash
git add run-omega.cmd docs/remote-access-checklist.md apps/frontend/src/auth/auth-context.tsx apps/frontend/src/app.test.tsx
git commit -m "test: add remote access verification coverage"
```

## Self-Review

### 1. Spec coverage

- Remote-access architecture choice is covered in Task 1 and Task 2.
- Cloudflare Tunnel wiring is covered in Task 1.
- Cloudflare Access allowlist policy is covered in Task 2.
- Secure env/cookie/CORS/CSRF settings are covered in Task 1.
- Operator-facing setup and rollback are covered in Task 2 and Task 3.
- Frontend/backend auth authority under remote access is covered in Task 3.

No known plan gaps remain for a first secure remote rollout.

### 2. Placeholder scan

- No `TBD`, `TODO`, or “implement later” placeholders remain.
- Each task includes exact files, concrete commands, and explicit expected outcomes.

### 3. Type consistency

- Env keys are consistent with `AppSettings` and `.env.example`.
- Remote hostnames are consistent across tunnel config, docs, and validation steps.
- Auth authority is consistently defined as backend-driven across the plan.

## Execution Handoff

Plan complete and saved to `docs/superpowers/plans/2026-07-30-remote-access-rollout.md`. Two execution options:

**1. Subagent-Driven (recommended)** - I dispatch a fresh subagent per task, review between tasks, fast iteration

**2. Inline Execution** - Execute tasks in this session using executing-plans, batch execution with checkpoints

**Which approach?**
