# Phase: Quote Tab Separation And Restart

## Verdict
Quote-tab separation is implemented, the Quote generation path now uses the Quote-tab local values instead of stale shared Fact Find values, and the live stack was restarted successfully on `3007` / `8007`.

## Files Changed

| File | Change |
|------|--------|
| `apps/frontend/src/pages/income-protection-page.tsx` | Added Quote-local form state, Quote age derivation, Quote-form accordion, Quote-only gating, and Quote-specific workflow snapshot injection for generation/editor build |
| `apps/frontend/src/app.test.tsx` | Added Quote tab coverage, Quote form helper, and request-body verification for Quote generation |
| `.clinerules` | Added PowerShell `2>&1` warning for this repo's Windows command streaming behavior |
| `PROJECT.md` | Updated current Quote-tab behavior and truthful verification status |
| `.agent-handoff/codex-task.md` | Marked task complete and recorded current validation commands |
| `.agent-handoff/cline-result.md` | This file |
| `.agent-handoff/validation-log.md` | Updated |

## What Changed

### Quote form ownership
- Added Quote-tab-local state for annual cover amount, cover-to-age, occupation class, deferred period, smoker, and optional PHI indexation
- Added read-only shared-profile fields for Name, Date of Birth, and derived Age on the Quote tab
- Split the Quote UI into `Quote Form` and `Generated Output` accordions

### Quote generation behavior
- Replaced Quote gating so required Quote inputs come from the Quote tab instead of shared Fact Find IP fields
- Kept the Fact Find IP accordion visible while removing required markers from the fields that are now Quote-owned
- Fixed the functional gap by building a `quoteWorkflowSnapshot` and sending it to `/documents/statement-quote`
- Updated Quote generated-output rebuilding so the Quote workspace uses the same Quote-local values after generation

### Verification reality
- The targeted request-body verification passes
- The repo-root launcher restarted the stack successfully
- One broader Quote render assertion path in `src/app.test.tsx` still needs follow-up before claiming a clean full frontend suite

## Verification Commands

```powershell
Push-Location apps\frontend; node_modules\.bin\vitest.cmd run src/app.test.tsx -t "posts Quote form values in the quote generation workflow snapshot" --no-cache
Invoke-WebRequest -UseBasicParsing http://127.0.0.1:3007 | Select-Object -ExpandProperty StatusCode
Invoke-WebRequest -UseBasicParsing http://127.0.0.1:8007/health | Select-Object -ExpandProperty StatusCode
```
