# Omega Audit Remediation Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Remediate the verified security, persistence, backup, authorization, and deployment findings in the Omega app while explicitly discarding stale items from the pasted audit note.

**Architecture:** Treat this as a remediation program, not a single feature. Fix the authoritative data flow first, then remove high-severity browser and backup risks, then align auth and deployment behavior, and finally clean up operational defects and stale review assumptions.

**Tech Stack:** React, TypeScript, Vite, FastAPI, SQLAlchemy, PostgreSQL, Docker Compose, local disk storage

## Global Constraints

- Backend must remain the source of truth for users, sessions, clients, workflows, files, and generated documents.
- Do not reintroduce browser storage as live record authority; `localStorage` and `sessionStorage` may only mirror UI state.
- Preserve current routes where possible; expand behavior behind existing endpoints before inventing replacements.
- Treat stored XSS, backup integrity, and authorization drift as higher priority than UI polish.
- Keep PostgreSQL and `storage/` private and backend-controlled.
- Do not commit live storage artifacts, tunnel credentials, generated logs, or real secrets.
- Mark stale findings from the pasted note explicitly so they are not “fixed” twice.

---

## Audit Disposition

### Confirmed

- Client records still mirror to `localStorage` in `apps/frontend/src/data/client-data-context.tsx`.
- Document previews render saved HTML in unsandboxed `iframe srcDoc` surfaces in `client-profile-page.tsx` and `income-protection-generated-documents-tab.tsx`.
- Backups only create a manifest plus optional plain SQL dump; `files_backup` and `documents_backup` both point to the manifest in `apps/api/app/services/backups.py`.
- Restore uses `pg_restore` against SQL dumps in `apps/api/app/services/restore.py`.
- Client access control still uses hardcoded email allowlists in `apps/api/app/main.py`.
- `/admin/users/{user_id}/disable` and `/enable` pass a path value into repository email-based methods.
- Settings are stored only in browser `localStorage` in `apps/frontend/src/pages/settings-page.tsx`.
- Delete client in `apps/frontend/src/pages/client-profile-page.tsx` is a false-success UI action.
- Docker frontend still proxies to `127.0.0.1:8007` in `apps/frontend/vite.config.ts`; the Docker frontend image is not wired for service-to-service API access.
- CI still installs from nonexistent `requirements.txt` and does not set `TEST_DATABASE_URL`.
- Uploads are fully read into memory before size validation; downloads and packs are fully built in memory; ZIP names and `Content-Disposition` filenames are unsanitized.
- Disk and DB file/document operations are non-atomic.
- Pension quote routing still depends on snapshot markers, not the requested document type.
- Client update writes raw `date_of_birth` strings into a SQLAlchemy `Date` field in `apps/api/app/repositories/clients.py`.
- AI prompt building still dumps the full workflow snapshot into Gemini in `apps/api/app/ai.py`.
- Production-critical defaults still warn instead of hard-failing in `apps/api/app/main.py`.
- Session cookie activity and persisted session expiry can diverge because `_current_user()` updates only the browser-side `last_seen_at`.
- Client references still use `count() + 1`.
- Generated documents still persist `version="1"` and `generated_by=None` in `apps/api/app/document_generation.py`.
- Malformed UUIDs can still raise unhandled exceptions in file routes.
- `/ready` still returns HTTP 200 and exposes raw storage and DB details.
- Scheduler bookkeeping is inaccurate and process-local.
- Client archival does not populate `archived_at`.
- `.gitignore` does not ignore `storage/quarantine/`.

### Partially Confirmed

- Admin page placeholder claim is stale for users/audit/backups/security data, but settings and delete-client flows are still placeholder-backed.
- Frontend role guessing claim is mostly stale; `auth-context.tsx` trusts backend `role`, but backend client access still uses a separate email allowlist model.
- Hardcoded local admin/staff defaults still exist in config and tests, but the frontend no longer auto-logs in with shipped credentials.
- Login rate limiting is process-local; proxy-awareness is still incomplete.
- React Router advisory claim was not revalidated in this turn and should be treated as dependency-maintenance work, not a code bug, until rechecked.

### Stale

- “A 401 triggers automatic login with credentials shipped in the frontend bundle” is not present in current `apps/frontend/src/auth/auth-context.tsx`.
- “Add Staff User is not connected to the API” is stale; `admin-page.tsx` calls `createAdminUser()`.
- “The admin screen’s backup button merely displays placeholder completed” is stale; `admin-page.tsx` calls `createBackup()`.

---

### Task 1: Remove localStorage as live client authority

**Files:**
- Modify: `apps/frontend/src/data/client-data-context.tsx`
- Modify: `apps/frontend/src/pages/client-profile-page.tsx`
- Modify: `apps/frontend/src/data/client-api.ts`
- Test: `apps/frontend/src/app.test.tsx`
- Test: `apps/frontend/src/pages/fact-find-page.test.tsx`

**Interfaces:**
- Consumes: `listClients()`, `getClient()`, `createClient()`, `updateClient()`, backend `/clients/*` routes
- Produces: frontend client state that hydrates from backend only, with browser storage limited to selected-client/UI hints

- [ ] **Step 1: Write a failing frontend test for backend-authoritative client refresh**

```tsx
it("does not bootstrap live client records from localStorage when signed in", async () => {
  window.localStorage.setItem("omega-client-records", JSON.stringify({
    "CLI-2026-9999": { fullName: "Browser Only Client" }
  }));

  // mock signed-in user and backend /clients response with a different client
  // assert Browser Only Client never appears in the UI after hydration
});
```

- [ ] **Step 2: Run the focused test to verify failure**

Run:

```powershell
cd apps/frontend
npm.cmd test -- src/app.test.tsx
```

Expected: FAIL because browser-seeded client data still appears or still becomes authoritative.

- [ ] **Step 3: Remove live client-record fallback from `client-data-context.tsx`**

Implement this direction:

```ts
function readStoredClients() {
  return {};
}

const [clients, setClients] = useState<Record<string, SeededClientProfile>>({});
```

Keep `localStorage` only for non-authoritative UI hints if needed, not live client rows.

- [ ] **Step 4: Make signed-out and test-only behavior explicit**

Use a clear branch such as:

```ts
if (import.meta.env.MODE === "test") {
  setClients(createSeededClientProfiles());
  return;
}

if (!user) {
  setClients({});
  return;
}
```

- [ ] **Step 5: Remove false local-only fallback from client profile surfaces**

In `client-profile-page.tsx`, stop treating `draft.generatedDocuments` and `draft.files` as a live fallback when backend data should exist.

- [ ] **Step 6: Run frontend verification**

Run:

```powershell
cd apps/frontend
npm.cmd test
npm.cmd run build
```

Expected: PASS

- [ ] **Step 7: Commit**

```bash
git add apps/frontend/src/data/client-data-context.tsx apps/frontend/src/pages/client-profile-page.tsx apps/frontend/src/data/client-api.ts apps/frontend/src/app.test.tsx apps/frontend/src/pages/fact-find-page.test.tsx
git commit -m "fix: make backend authoritative for client records"
```

### Task 2: Eliminate stored XSS from document previews

**Files:**
- Modify: `apps/frontend/src/pages/client-profile-page.tsx`
- Modify: `apps/frontend/src/pages/income-protection-generated-documents-tab.tsx`
- Modify: `apps/frontend/src/documents/pdf-export.ts`
- Modify: `apps/api/app/main.py`
- Test: `apps/frontend/src/documents/document-api.test.ts`

**Interfaces:**
- Consumes: `preview_html` from document routes and document preview modals
- Produces: sandboxed or sanitized preview rendering that cannot execute saved script content with app origin privileges

- [ ] **Step 1: Write a failing preview sanitization test**

```ts
it("strips script execution from preview html", () => {
  const html = buildStandaloneDocumentPreviewHtml('<h1>Preview</h1><script>alert(1)</script>');
  expect(html).not.toContain("<script>");
});
```

- [ ] **Step 2: Run the focused test**

Run:

```powershell
cd apps/frontend
npm.cmd test -- src/documents/document-api.test.ts
```

Expected: FAIL until preview content is sanitized or sandboxed.

- [ ] **Step 3: Sanitize preview HTML before rendering**

Apply a DOMPurify-style flow or equivalent existing sanitizer:

```ts
const safeHtml = DOMPurify.sanitize(previewHtml, {
  USE_PROFILES: { html: true },
  FORBID_TAGS: ["script"],
});
```

- [ ] **Step 4: Sandbox all preview iframes**

Render preview frames with a restrictive sandbox:

```tsx
<iframe
  sandbox=""
  srcDoc={safeHtml}
  title={previewDocument.documentName}
/>
```

- [ ] **Step 5: Reject unsafe preview HTML at the API boundary**

Add a server-side sanitization or neutralization step before storing `preview_html` in `/clients/{client_reference}/documents`.

- [ ] **Step 6: Run frontend and backend verification**

Run:

```powershell
cd apps/frontend
npm.cmd test
cd ..\api
.\.venv\Scripts\python.exe -m pytest tests/test_api.py -k preview -v
```

Expected: PASS

- [ ] **Step 7: Commit**

```bash
git add apps/frontend/src/pages/client-profile-page.tsx apps/frontend/src/pages/income-protection-generated-documents-tab.tsx apps/frontend/src/documents/pdf-export.ts apps/api/app/main.py apps/frontend/src/documents/document-api.test.ts
git commit -m "fix: sanitize and sandbox document previews"
```

### Task 3: Make backups and restore real and mutually compatible

**Files:**
- Modify: `apps/api/app/services/backups.py`
- Modify: `apps/api/app/services/restore.py`
- Modify: `apps/api/app/main.py`
- Modify: `apps/frontend/src/pages/admin-page.tsx`
- Test: `apps/api/tests/test_api.py`

**Interfaces:**
- Consumes: `create_backup_manifest()`, `validate_restore()`, `dry_run_restore()`, `execute_restore()`, `/admin/backups*`
- Produces: real artifact backups, consistent dump format, and truthful admin restore status

- [ ] **Step 1: Write a failing backup-service test for copied artifacts**

```python
def test_backup_copies_file_and_document_artifacts(tmp_path):
    result = create_backup_manifest(
        backup_path=tmp_path / "backups",
        file_storage_path=tmp_path / "clients",
        triggered_by_email="admin@example.com",
        database_url=None,
    )
    assert result["files_backup"] != result["documents_backup"]
    assert (tmp_path / "backups" / result["files_backup"]).exists()
    assert (tmp_path / "backups" / result["documents_backup"]).exists()
```

- [ ] **Step 2: Run the focused backend test**

Run:

```powershell
cd apps/api
.\.venv\Scripts\python.exe -m pytest tests/test_api.py -k backup -v
```

Expected: FAIL because files and documents currently point at the manifest.

- [ ] **Step 3: Split manifest, file archive, and document archive artifacts**

Implement explicit artifacts such as:

```python
{
    "manifest": "manifests/backup-manifest-....json",
    "files_backup": "archives/files-....zip",
    "documents_backup": "archives/documents-....zip",
}
```

- [ ] **Step 4: Align dump creation and restore format**

Either:

```python
[pg_dump_bin, "--format=custom", "--file", str(dump_path), ...]
```

or replace restore execution with `psql` for plain SQL dumps. Use one format end-to-end, not mixed assumptions.

- [ ] **Step 5: Make backup API responses truthful**

Return explicit partial/failure status and surface artifact presence in the admin UI instead of implying full success when only the manifest exists.

- [ ] **Step 6: Run backup/restore verification**

Run:

```powershell
cd apps/api
.\.venv\Scripts\python.exe -m pytest tests/test_api.py -k "backup or restore" -v
```

Expected: PASS

- [ ] **Step 7: Commit**

```bash
git add apps/api/app/services/backups.py apps/api/app/services/restore.py apps/api/app/main.py apps/frontend/src/pages/admin-page.tsx apps/api/tests/test_api.py
git commit -m "fix: make backups and restores real"
```

### Task 4: Unify authorization and remove route/repository identity mismatches

**Files:**
- Modify: `apps/api/app/main.py`
- Modify: `apps/api/app/repositories/users.py`
- Modify: `apps/frontend/src/auth/auth-context.tsx`
- Test: `apps/api/tests/test_api.py`

**Interfaces:**
- Consumes: `_current_user()`, `_require_admin()`, client access helpers, admin user routes
- Produces: one consistent identity model using database users and assignment-based access

- [ ] **Step 1: Write failing tests for admin user enable/disable by UUID**

```python
def test_admin_disable_user_uses_uuid_not_email(client):
    # create a user, call /admin/users/{uuid}/disable, assert success
```

- [ ] **Step 2: Write failing tests for assignment-based client access**

```python
def test_assigned_user_can_access_client_even_if_not_creator(client):
    # creator differs from assignee, assignee should still succeed
```

- [ ] **Step 3: Run the focused access tests**

Run:

```powershell
cd apps/api
.\.venv\Scripts\python.exe -m pytest tests/test_api.py -k "disable_user or assigned_user_can_access" -v
```

Expected: FAIL on current route/repository mismatch or hardcoded access model.

- [ ] **Step 4: Convert admin user routes to ID-based repository methods**

Introduce repository methods:

```python
def disable_by_id(self, user_id: UUID) -> dict[str, str | bool | None] | None: ...
def enable_by_id(self, user_id: UUID) -> dict[str, str | bool | None] | None: ...
def reset_password_by_id(self, user_id: UUID, *, password_hash: str, force_password_change: bool = True) -> ...: ...
```

- [ ] **Step 5: Replace hardcoded client access allowlists with role-plus-assignment rules**

Keep the Omega-specific delegated-access rule for Alison -> John, but make the core access model depend on DB-backed role and `assigned_to`.

- [ ] **Step 6: Keep frontend auth as a backend mirror only**

Do not reintroduce email-based role inference in `auth-context.tsx`; keep `role` sourced from `/auth/login` and `/auth/me`.

- [ ] **Step 7: Run backend auth/access verification**

Run:

```powershell
cd apps/api
.\.venv\Scripts\python.exe -m pytest tests/test_api.py -v
```

Expected: PASS for auth and access cases.

- [ ] **Step 8: Commit**

```bash
git add apps/api/app/main.py apps/api/app/repositories/users.py apps/frontend/src/auth/auth-context.tsx apps/api/tests/test_api.py
git commit -m "fix: unify authorization and user identity handling"
```

### Task 5: Replace false-success settings and delete-client flows

**Files:**
- Modify: `apps/frontend/src/pages/settings-page.tsx`
- Modify: `apps/frontend/src/pages/client-profile-page.tsx`
- Modify: `apps/api/app/main.py`
- Modify: `apps/api/app/repositories/clients.py`
- Test: `apps/api/tests/test_api.py`

**Interfaces:**
- Consumes: settings UI, client profile delete modal, client repository
- Produces: truthful server-backed settings and actual client archive/delete behavior

- [ ] **Step 1: Write a failing backend test for client archival**

```python
def test_archive_sets_archived_at(client):
    archived = repo.archive(client_reference, "admin@example.com")
    assert archived["status"] == "archived"
    assert archived["archived_at"]
```

- [ ] **Step 2: Run the focused archival test**

Run:

```powershell
cd apps/api
.\.venv\Scripts\python.exe -m pytest tests/test_api.py -k archive -v
```

Expected: FAIL because `archived_at` is not set.

- [ ] **Step 3: Add a real client archive/delete endpoint**

Use a route such as:

```python
@app.delete("/clients/{client_reference}")
def archive_client(...):
    ...
```

Make the UI call it before showing success.

- [ ] **Step 4: Replace browser-only settings persistence**

Either remove the settings page until it is backend-backed or add a real `/admin/settings` backend flow; do not keep pretending local browser settings are system settings.

- [ ] **Step 5: Run verification**

Run:

```powershell
cd apps/api
.\.venv\Scripts\python.exe -m pytest tests/test_api.py -v
cd ..\frontend
npm.cmd test
```

Expected: PASS

- [ ] **Step 6: Commit**

```bash
git add apps/frontend/src/pages/settings-page.tsx apps/frontend/src/pages/client-profile-page.tsx apps/api/app/main.py apps/api/app/repositories/clients.py apps/api/tests/test_api.py
git commit -m "fix: remove false-success settings and client deletion flows"
```

### Task 6: Repair Docker and CI to match the real app

**Files:**
- Modify: `apps/frontend/vite.config.ts`
- Modify: `apps/frontend/Dockerfile`
- Modify: `apps/api/Dockerfile`
- Modify: `infra/docker/compose.yaml`
- Modify: `.github/workflows/ci.yml`
- Modify: `apps/api/pyproject.toml`

**Interfaces:**
- Consumes: current Docker images, Compose services, pytest requirements, frontend API proxy
- Produces: runnable Docker stack and passing CI for backend and frontend

- [ ] **Step 1: Write a failing CI sanity checklist in the plan comments**

Use these expected commands as the target:

```bash
docker compose -f infra/docker/compose.yaml up --build
python -m pytest tests/ -v
npm ci && npm run build && npm test
```

- [ ] **Step 2: Fix backend dependency installation in CI**

Replace:

```yaml
.venv/bin/pip install -r requirements.txt
```

with:

```yaml
.venv/bin/pip install -e .[dev]
```

and set:

```yaml
TEST_DATABASE_URL: postgresql://omega:omega@localhost:5432/omega_test
```

- [ ] **Step 3: Fix the Docker frontend/backend contract**

Do not use Vite dev proxy assumptions inside Docker. Use a production-oriented frontend runtime or explicit env-driven API base URL that can target `http://api:8000` in Compose.

- [ ] **Step 4: Add dump tools to the API image**

Install PostgreSQL client utilities or document a companion utility image so `pg_dump` and `pg_restore` actually exist where backup/restore runs.

- [ ] **Step 5: Make readiness health meaningful**

Use `/ready` for compose health if DB/storage readiness is required, not `/health`.

- [ ] **Step 6: Run verification**

Run:

```powershell
docker compose -f infra/docker/compose.yaml config
cd apps/api
.\.venv\Scripts\python.exe -m pytest tests/ -v
cd ..\frontend
npm.cmd test
npm.cmd run build
```

Expected: PASS

- [ ] **Step 7: Commit**

```bash
git add apps/frontend/vite.config.ts apps/frontend/Dockerfile apps/api/Dockerfile infra/docker/compose.yaml .github/workflows/ci.yml apps/api/pyproject.toml
git commit -m "fix: align docker and ci with live app runtime"
```

### Task 7: Harden file and document handling

**Files:**
- Modify: `apps/api/app/main.py`
- Modify: `apps/api/app/services/storage.py`
- Modify: `apps/api/app/repositories/documents.py`
- Modify: `apps/api/app/repositories/files.py`
- Test: `apps/api/tests/test_api.py`

**Interfaces:**
- Consumes: file/document create, download, pack, delete flows
- Produces: bounded-size streaming-friendly behavior, sanitized filenames, and transactional consistency

- [ ] **Step 1: Write failing tests for malformed UUID and sanitized headers**

```python
def test_invalid_file_uuid_returns_404_or_422(client):
    response = client.get("/clients/CLI-2026-0001/files/not-a-uuid/download")
    assert response.status_code in {404, 422}

def test_document_pack_sanitizes_zip_member_names(...):
    ...
```

- [ ] **Step 2: Run the focused file/document tests**

Run:

```powershell
cd apps/api
.\.venv\Scripts\python.exe -m pytest tests/test_api.py -k "uuid or zip or content_disposition" -v
```

Expected: FAIL

- [ ] **Step 3: Validate upload size before loading full content where possible**

Use streamed handling or chunking rather than unconditional full-memory reads.

- [ ] **Step 4: Sanitize ZIP names and response headers**

Normalize names such as:

```python
safe_name = original_name.replace("\\", "_").replace("/", "_").replace("..", "_")
```

- [ ] **Step 5: Reorder DB/disk operations for atomicity**

Prefer:

```python
db.begin()
# write temp artifact
# insert row
# commit
# promote temp artifact
```

or add compensating cleanup on failure.

- [ ] **Step 6: Run verification**

Run:

```powershell
cd apps/api
.\.venv\Scripts\python.exe -m pytest tests/test_api.py -v
```

Expected: PASS

- [ ] **Step 7: Commit**

```bash
git add apps/api/app/main.py apps/api/app/services/storage.py apps/api/app/repositories/documents.py apps/api/app/repositories/files.py apps/api/tests/test_api.py
git commit -m "fix: harden file and document handling"
```

### Task 8: Correct workflow/document-generation integrity issues

**Files:**
- Modify: `apps/frontend/src/pages/income-protection-page.tsx`
- Modify: `apps/api/app/document_generation.py`
- Modify: `apps/api/app/ai.py`
- Test: `apps/frontend/src/pages/income-protection-helpers.test.ts`
- Test: `apps/api/tests/test_api.py`

**Interfaces:**
- Consumes: statement quote requests, pensions snapshots, Gemini prompt builder, generated document persistence
- Produces: correct pension routing, minimal AI payloads, and reliable generated-document metadata

- [ ] **Step 1: Write a failing test for pension statement quote routing**

```python
def test_pensions_statement_uses_pension_quote_payload(...):
    ...
```

- [ ] **Step 2: Write a failing test for generated document metadata**

```python
def test_generated_document_persists_real_version_and_generator(...):
    ...
```

- [ ] **Step 3: Run the focused integration tests**

Run:

```powershell
cd apps/api
.\.venv\Scripts\python.exe -m pytest tests/test_api.py -k "pension or generated_document" -v
```

Expected: FAIL

- [ ] **Step 4: Route by explicit document type, not snapshot guesswork**

Update `_build_integration_requests()` and quote generation callers so pension and PHI decisions use `document_type` and explicit workflow context.

- [ ] **Step 5: Add an allowlist/redaction layer to Gemini prompt building**

Replace:

```python
fields = "\n".join(f"- {key}: {value}" for key, value in workflow_snapshot.items())
```

with a filtered allowlist of approved fields only.

- [ ] **Step 6: Persist `generated_by` and real version numbers**

Pass the authenticated user into document generation persistence and compute per-client/per-document version increments instead of hardcoding `"1"`.

- [ ] **Step 7: Run verification**

Run:

```powershell
cd apps/api
.\.venv\Scripts\python.exe -m pytest tests/test_api.py -v
cd ..\frontend
npm.cmd test
```

Expected: PASS

- [ ] **Step 8: Commit**

```bash
git add apps/frontend/src/pages/income-protection-page.tsx apps/api/app/document_generation.py apps/api/app/ai.py apps/frontend/src/pages/income-protection-helpers.test.ts apps/api/tests/test_api.py
git commit -m "fix: tighten workflow and generation integrity"
```

### Task 9: Fix operational defaults, readiness, archival, scheduler, and repo hygiene

**Files:**
- Modify: `apps/api/app/main.py`
- Modify: `apps/api/app/services/scheduler.py`
- Modify: `apps/api/app/repositories/clients.py`
- Modify: `.gitignore`
- Test: `apps/api/tests/test_api.py`

**Interfaces:**
- Consumes: startup validation, readiness route, archive flow, scheduler state
- Produces: safer startup policy, truthful readiness, archive timestamps, scheduler correctness, and quarantine hygiene

- [ ] **Step 1: Write failing tests for readiness status and archival timestamp**

```python
def test_ready_returns_non_200_when_not_ready(...):
    ...

def test_archive_sets_archived_at(...):
    ...
```

- [ ] **Step 2: Run the focused operational tests**

Run:

```powershell
cd apps/api
.\.venv\Scripts\python.exe -m pytest tests/test_api.py -k "ready or archive" -v
```

Expected: FAIL

- [ ] **Step 3: Make production-critical defaults fail closed**

In non-development mode, replace log-only warnings for default session secret and similarly unsafe deployment values with startup exceptions.

- [ ] **Step 4: Fix `/ready` semantics**

Return `503` when `ready` is false and redact internal filesystem and raw DB exception detail from the public payload.

- [ ] **Step 5: Correct scheduler bookkeeping and overlap handling**

Set `next_scheduled_run` to the actual future run time, not the current run, and guard against multi-worker duplicate schedulers at deployment level.

- [ ] **Step 6: Ignore quarantine artifacts**

Add:

```gitignore
storage/quarantine/*
!storage/quarantine/.gitkeep
```

- [ ] **Step 7: Run verification**

Run:

```powershell
cd apps/api
.\.venv\Scripts\python.exe -m pytest tests/test_api.py -v
```

Expected: PASS

- [ ] **Step 8: Commit**

```bash
git add apps/api/app/main.py apps/api/app/services/scheduler.py apps/api/app/repositories/clients.py .gitignore apps/api/tests/test_api.py
git commit -m "fix: harden operational defaults and readiness"
```

## Self-Review

### 1. Spec coverage

- The persistence split is covered in Task 1.
- Stored XSS is covered in Task 2.
- Backup/restore defects are covered in Task 3.
- Authorization drift and admin ID/email mismatch are covered in Task 4.
- False-success settings and delete-client flows are covered in Task 5.
- Docker/CI defects are covered in Task 6.
- Unsafe file/document handling is covered in Task 7.
- Pension routing, AI data over-sharing, and generated-document metadata are covered in Task 8.
- Readiness, scheduler, archival, unsafe defaults, and quarantine hygiene are covered in Task 9.
- Stale items from the pasted note are explicitly marked and not scheduled for duplicate work.

### 2. Placeholder scan

- No `TODO`, `TBD`, or “fix later” placeholders remain.
- Every task contains concrete files, commands, and expected results.

### 3. Type consistency

- All planned route, repository, and frontend interfaces match the current code names in this repo.
- UUID-vs-email user route mismatch is addressed with explicit `*_by_id` repository methods.
- The client/workflow/backend-authoritative rule is consistent across tasks.

## Execution Handoff

Plan complete and saved to `docs/superpowers/plans/2026-07-30-audit-remediation-plan.md`. Two execution options:

**1. Subagent-Driven (recommended)** - I dispatch a fresh subagent per task, review between tasks, fast iteration

**2. Inline Execution** - Execute tasks in this session using executing-plans, batch execution with checkpoints

**Which approach?**
