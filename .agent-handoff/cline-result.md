# Stage 22: Lifecycle And CI Hardening

## Verdict
**Stage 22 is complete with the required fix pass applied.** Deprecated `@app.on_event` hooks replaced with lifespan. CI automation added. Full backend test suite wired. Vitest runs as a hard gate. All doc claims about localStorage corrected to match current frontend code. Verification passes across all gates.

## Files Changed

| File | Change |
|------|--------|
| `apps/api/app/main.py` | Replaced deprecated `@app.on_event("startup")` / `@app.on_event("shutdown")` with `@asynccontextmanager` lifespan. All startup/shutdown behaviors preserved. |
| `.github/workflows/ci.yml` | New — GitHub Actions CI: backend pytest (PostgreSQL 16, full `tests/` suite) + frontend tsc + vitest |
| `scripts/validate.ps1` | New — one-command local validation: migrations → pytest (full suite) → tsc → vitest (hard gate) |
| `.clinerules` | New — commands that don't work in this PowerShell/Windows environment |
| `.agent-handoff/cline-result.md` | Updated |
| `.agent-handoff/validation-log.md` | Updated |
| `phases.md` | Updated — corrected localStorage claims, verification baseline, test counts |
| `PROJECT.md` | Updated — corrected localStorage claims, stage status, testing section |
| `.ai-codex/index.md` | Updated — `client-data-context.tsx` description corrected |
| `.ai-codex/architecture.md` | Updated — persistence state corrected |
| `.ai-codex/patterns.md` | Updated — frontend workflow persistence description corrected |
| `.ai-codex/scopes/persistence.md` | Updated — constraint corrected |
| `.ai-codex/scopes/income-protection.md` | Updated — selected client state description corrected |

## What Changed

### 1. FastAPI lifespan migration
- Removed `@app.on_event("startup")` and `@app.on_event("shutdown")` decorators (deprecated in FastAPI)
- Extracted `_startup_db_check()` and `_shutdown_scheduler()` as plain functions
- Wired via `@asynccontextmanager async def _app_lifespan(inner_app)` assigned to `app.router.lifespan_context`
- All behaviors preserved: DB check, bootstrap seeding, session cleanup, storage checks, deploy-critical settings validation, scheduler start/stop

### 2. CI automation
- `.github/workflows/ci.yml`: backend job with PostgreSQL 16 service runs `pytest tests/ -v` (full suite), frontend job runs `tsc --noEmit` + `vitest run`
- Triggers on push/PR to main

### 3. One-command local validation
- `scripts/validate.ps1`: runs DB migrations → `pytest tests/ -v` → `tsc --noEmit` → `vitest run`
- All gates are hard failures
- Supports `-SkipFrontend` / `-SkipBackend` flags

### 4. Doc drift fix
The frontend code has always used `localStorage` in `client-data-context.tsx` (for client record caching) and `income-protection-page.tsx` (for selected client reference). Previous docs claimed "no localStorage persistence remains" which was incorrect. All `.ai-codex/*`, `PROJECT.md`, `phases.md`, and handoff files now accurately describe the current state: backend is authoritative for workflow persistence, client records are cached in `localStorage` for quick rehydration.

## Verification Results

| Gate | Result |
|------|--------|
| Backend pytest (full suite, PostgreSQL) | **164 passed, 0 failed** |
| Frontend TypeScript | **0 errors** |
| Frontend vitest | **7 files, 80 tests, 0 failed** |

## Verification Commands

```powershell
# Full backend test suite
$env:PYTHONPATH="apps\api"; apps\api\.venv\Scripts\python -m pytest apps/api/tests -v

# One-command validation
.\scripts\validate.ps1

# Frontend typecheck
Push-Location apps\frontend; node_modules\.bin\tsc.cmd --noEmit --project tsconfig.app.json

# Frontend tests
Push-Location apps\frontend; node_modules\.bin\vitest.cmd run
```

## Remaining Limitations

- `income-protection-page.tsx` remains monolithic at ~2600 lines
- `app.router.lifespan_context` assignment works; `FastAPI(lifespan=...)` constructor param would be cleaner for a future pass
- CI requires GitHub Actions runner with Docker (PostgreSQL service container)
- Frontend uses `localStorage` for client record caching and selected client reference; not a regression, just documentation was previously inaccurate