# Fix: Lock Down Frontend Settings Page to Admin Only

## Verdict
**The frontend `/settings` route and Settings navigation are now restricted to the admin user (`andrew@omegafinancial.ie`) only.** Non-admin users can no longer see Settings in the top nav or user menu dropdown, and cannot access `/settings` by direct URL (they are redirected to `/login`).

Previous session result (Frontend Proxy / CSRF / Test DB Isolation) retained below.

---

# Previous: Frontend Proxy / CSRF / Test DB Isolation

## Verdict
**The live frontend development path is now working on the real `3007` proxy for login, workflow save, and document generation.** The final blocking issue was not CSRF: the Vite dev server was not proxying `/clients`, so workflow fetch/save never reached the backend. The backend test suite is also isolated from the live development database and no longer wipes live users/clients during pytest runs.

## Root Causes

1. **CSRF origin mismatch**: `_csrf_check()` originally trusted only `APP_URL` (`http://127.0.0.1:8007`), rejecting the frontend origin (`http://127.0.0.1:3007`).
2. **CSRF middleware leak**: `HTTPException` raised in middleware surfaced as `500` instead of `403` JSON.
3. **Missing CORS config**: `CORS_ORIGINS` was empty.
4. **Backend tests shared the live DB**: `db_test_helpers.py` fell back to `DATABASE_URL`, so destructive test setup dropped live tables.
5. **Vite proxy omitted `/clients`**: the frontend workflow API calls `/clients/:clientReference/workflow`, but the dev server only proxied `/auth`, `/documents`, and `/health`, causing `404` and the UI state `Saved locally - server unavailable`.
6. **Live sample data mismatch**: the live DB only had `CLI-2026-0001`, while the common workflow/test flow expected `CLI-2026-0002`.

## Files Changed

| File | Change |
|------|--------|
| `apps/api/app/main.py` | `_csrf_check()` trusts `CSRF_TRUSTED_ORIGINS`; middleware converts `HTTPException` to `JSONResponse`. |
| `apps/api/app/config.py` | Added `csrf_trusted_origins` field and origin-list parsing helper. |
| `apps/api/tests/test_api.py` | Added trusted-origin and proper-403 regression tests. |
| `apps/api/tests/db_test_helpers.py` | Test suite now requires `TEST_DATABASE_URL`, rejects unsafe targets before app import, and blocks live DB reuse. |
| `apps/frontend/vite.config.ts` | Added missing `/clients` proxy to `http://127.0.0.1:8007`. |
| `.env.example` | Added `TEST_DATABASE_URL` and `CSRF_TRUSTED_ORIGINS` documentation. |
| `.agent-handoff/cline-result.md` | This file. |
| `.agent-handoff/validation-log.md` | Updated verification log. |

## What Was Fixed

### Frontend-origin auth/generation path
- `CORS_ORIGINS=http://127.0.0.1:3007`
- `CSRF_TRUSTED_ORIGINS=http://127.0.0.1:3007`
- middleware now returns proper `403` JSON for blocked origins

### Frontend workflow proxy
- Vite now proxies `/clients` as well as `/auth`, `/documents`, and `/health`
- workflow fetch/save now reaches FastAPI on `8007`
- the `Saved locally - server unavailable` fallback no longer triggers for normal workflow saves when the backend is up

### Test DB isolation
- backend tests no longer fall back to `DATABASE_URL`
- guardrail runs before `app.config` / `dotenv.load_dotenv()`
- `TEST_DATABASE_URL` must be set and must point at a dedicated `_test` database

### Live sample data
- the live dev DB must contain the client being used by the workflow
- `CLI-2026-0002` was restored in the live DB during verification

## Verification Commands

```powershell
# Backend tests on isolated test DB
$env:PYTHONPATH="apps\api"
$env:TEST_DATABASE_URL="postgresql://omega:omega_dev_password@127.0.0.1:5432/omega_test"
apps\api\.venv\Scripts\python -m pytest apps/api/tests -q

# Frontend typecheck
Push-Location apps\frontend; node_modules\.bin\tsc.cmd --noEmit --project tsconfig.app.json

# Frontend vitest
Push-Location apps\frontend; node_modules\.bin\vitest.cmd run --no-cache

# Live 3007 smoke flow
$base='http://127.0.0.1:3007'
$origin='http://127.0.0.1:3007'
$session=New-Object Microsoft.PowerShell.Commands.WebRequestSession
$loginBody=@{email='andrew@omegafinancial.ie'; password='Omega123'} | ConvertTo-Json
Invoke-WebRequest -UseBasicParsing -Uri "$base/auth/login" -Method POST -WebSession $session -Headers @{Origin=$origin;'Content-Type'='application/json'} -Body $loginBody
Invoke-WebRequest -UseBasicParsing -Uri "$base/clients/CLI-2026-0002/workflow" -WebSession $session
Invoke-WebRequest -UseBasicParsing -Uri "$base/clients/CLI-2026-0002/workflow" -Method PUT -WebSession $session -Headers @{Origin=$origin;'Content-Type'='application/json'} -Body (@{ letterDate='2026-06-24'; premium='165.50'; termsIssuedDate='2026-01-10'; fullName='Jamie Murphy'; provider='Aviva'; productType='Income Protection'; recommendedCover='EUR2,500 monthly'; needsObjectives='Protect monthly income during illness.' } | ConvertTo-Json)
Invoke-WebRequest -UseBasicParsing -Uri "$base/documents/generate" -Method POST -WebSession $session -Headers @{Origin=$origin;'Content-Type'='application/json'} -Body (@{ client_reference='CLI-2026-0002'; document_type='Statement of Suitability'; template_id='income-protection-statement'; workflow_snapshot=@{ full_name='Jamie Murphy'; provider='Aviva'; product_type='Income Protection'; recommended_cover='EUR2,500 monthly'; needs_objectives='Protect monthly income during illness.' } } | ConvertTo-Json -Depth 6)
```

## Live Runtime Results

| Test | HTTP | Result |
|------|------|--------|
| Admin login via `3007` | 200 | PASS |
| Workflow fetch via `3007` | 200 | PASS |
| Workflow save via `3007` | 200 | PASS |
| Statement of Suitability generate via `3007` | 200 | PASS |

## Remaining Limitations

- Statement generation remains intentionally gated by frontend required-field validation in `income-protection-page.tsx`.
- The live workflow path depends on the selected client existing in the live DB; `CLI-2026-0002` is not bootstrapped automatically by app startup.
- The direct detached `run-frontend.cmd` launch was unreliable in this session; foreground Vite startup on `3007` worked and showed the updated proxy config.
