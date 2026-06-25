# Phase: Income Protection / Clients UI Cleanup

## Verdict
**Five narrow frontend-only fixes applied to the Income Protection workflow and Client pages.** All targeted tests pass (79/80), with one pre-existing JSDOM `setTimeout` failure unchanged.

## Files Changed

| File | Change |
|------|--------|
| `apps/frontend/src/pages/income-protection-page.tsx` | Currency prefixes £→€ (4 fields), "Add Client"→"Create Client" in header, default Files tab status "Waiting for upload"→"Ready" |
| `apps/frontend/src/pages/client-profile-page.tsx` | Removed duplicate "Add Dependant" button from empty-state, updated empty-state copy |
| `apps/frontend/src/app.test.tsx` | Updated 3 assertions: "Add Client"→"Create Client" (×2), "Waiting for upload"→"Ready" (×1); repaired corrupted test name |
| `.agent-handoff/cline-result.md` | This file |
| `.agent-handoff/validation-log.md` | Updated |

## What Changed

### Fix #1: Currency cleanup
- Changed 4 visible `£` prefixes to `€` in income-protection-page.tsx (ff-income, ff-premium, sos-premium, sos-netMonthlyCost)
- All other currency inputs already used `€` or `EUR`. Now consistent across Fact Find and Statement of Suitability.

### Fix #2: Remove duplicate "Add Dependant"
- Removed the empty-state `Button` from the dependants section of client-profile-page.tsx
- The section header "Add Dependant" button remains as the single action
- Empty-state now directs users to use the header button

### Fix #3: Clean misleading Files tab status copy
- Default `fileUploadStatus` changed from `"Upload: Waiting for upload"` to `"Upload: Ready"`
- Displayed as "Ready" in the Files tab badge instead of "Waiting for upload"

### Fix #4: Standardise "Add Client" → "Create Client"
- Changed the Income Protection page header link from "Add Client" to "Create Client"
- Now consistent with the Clients page ("Create Client") and client-form-page ("Create Client")

### Fix #5: No additional copy changes
- The dependent empty-state message was updated as an adjacent fix to the duplicate button removal, directing users to the header action.

## Verification Commands

```powershell
# Frontend typecheck
Push-Location apps\frontend; node_modules\.bin\tsc.cmd --noEmit --project tsconfig.app.json

# Frontend vitest
Push-Location apps\frontend; node_modules\.bin\vitest.cmd run --no-cache