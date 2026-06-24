# Stage 21 Validation Log

## Date: 2026-06-24

## Objective
Reduce maintainability risk in `income-protection-page.tsx` with a safe extraction. Deliver accurate validation reporting — no overclaiming.

## Changes Validated

### Extraction
- `apps/frontend/src/pages/income-protection-page.tsx`: Extracted `PENSION_SECTION_CONFIGS` (47-line `Record<"self" | "partner", Config>`) from inline `renderPensionSection()` body to module-level constant with `as const`. Function reduced from 55 to 31 lines. Single-line data lookup replaces inline config object.

## Validation Results

| Gate | Result |
|------|--------|
| Backend (PostgreSQL) | **117 passed, 0 skipped, 0 failed** |
| Frontend TypeScript | **0 errors** |
| Frontend vitest | **91 passed, 4 failed** (all pre-existing) |

### Vitest failures detail

| Test file | Test | Root cause |
|-----------|------|------------|
| `document-api.test.ts` | auto-reauth | `generateDocument()` throws on 401; test expects old auto-reauth via `/auth/login` |
| `app.test.tsx` | template state (×3) | Template dropdown rendering mismatch — test expects "fact-find-custom", DOM shows "fact-find" |

All 4 failures predate Stage 21. No new failures introduced.

## Verification Commands

```powershell
# Backend tests
$env:PYTHONPATH="apps\api"; apps\api\.venv\Scripts\python -m pytest apps/api/tests/test_api.py -v

# Frontend typecheck
Set-Location apps\frontend; node_modules\.bin\tsc.cmd --noEmit --project tsconfig.app.json

# Frontend tests
Set-Location apps\frontend; node_modules\.bin\vitest.cmd run
```

## Remaining Limitations

- `income-protection-page.tsx` remains monolithic at ~2600 lines
- 4 pre-existing vitest failures (outside Stage 21 scope)
- `app.on_event` API deprecated (backend)