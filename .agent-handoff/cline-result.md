# Stage 21: Frontend Maintainability Hardening

## Verdict
**Stage 21 is complete as a partial maintainability pass.** One safe extraction delivered. Frontend typecheck is clean. Behavior preserved. Pre-existing vitest failures are documented separately.

## Files Changed

| File | Change |
|------|--------|
| `apps/frontend/src/pages/income-protection-page.tsx` | Extracted `PENSION_SECTION_CONFIGS` (47 lines) from inline `renderPensionSection()` function body to module-level constant. Function simplified from 55 to 31 lines. |
| `.agent-handoff/cline-result.md` | This file |
| `.agent-handoff/validation-log.md` | Updated with accurate validation status |

## What Changed

### Extraction
- **`PENSION_SECTION_CONFIGS`** (47-line `Record<"self" | "partner", Config>`) lifted from the body of `renderPensionSection()` to the file's module-level constants section, between `useAccordionState()` and the `IncomeProtectionPage` export.
- Uses `as const` for full type narrowing, preserving exact string literal types for all field keys.
- `renderPensionSection()` data lookup is now a single line: `const config = PENSION_SECTION_CONFIGS[section];`

### Behavior preserved
- All 5 tabs (Fact Find, Fact Find Update, Statement of Suitability, Files, Generated Documents) render identically
- Workflow save/load unchanged
- File upload/download/delete flows unchanged
- Document generate/preview/download/delete/pack flows unchanged
- No route or API contract changes

## Validation Results

| Gate | Result |
|------|--------|
| Backend (PostgreSQL) | **117 passed, 0 skipped, 0 failed** |
| Frontend TypeScript | **0 errors** |
| Frontend vitest | **91 passed, 4 failed** |

### Vitest failures (all pre-existing, none from Stage 21)

| Test | Reason |
|------|--------|
| `document-api.test.ts` — auto-reauth | `generateDocument()` throws on 401 instead of re-authenticating via `/auth/login` — test expects old auto-reauth behavior |
| `app.test.tsx` — template state (3 tests) | Tests expect template dropdown to show "fact-find-custom" label; actual DOM shows "fact-find" |

All 4 failures exist in the codebase before Stage 21 and are unrelated to the extraction done here.

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

- `income-protection-page.tsx` remains monolithic at ~2600 lines — further decomposition deferred
- 4 pre-existing vitest failures (noted above, outside Stage 21 scope)
- `app.on_event` API deprecated (backend) — deferred