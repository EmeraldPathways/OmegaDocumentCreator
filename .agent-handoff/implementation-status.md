# Implementation Status

## Active Branch

- `page-split2`

## Active Goal

- Split the current workflow into five top-level pages while preserving the existing design/layout:
  - `Clients`
  - `Fact Find`
  - `Income Protection`
  - `Pensions`
  - `Files/Docs`

## Confirmed Rules

- `Clients` stays functionally unchanged.
- `Fact Find` is the shared information source for both downstream workflows.
- `Income Protection` has its own separate `Quote` and `Statement of Suitability` flow.
- `Pensions` has its own separate `Quote` and `Statement` flow.
- `Files/Docs` will carry the current `Files` and `Generated Documents` surfaces.
- Preserve the current design, layout, editor behavior, preview behavior, and export behavior.
- Delay wiring new top-level routes until the target page files exist.

## Current Execution State

- Detailed plan saved in `docs/superpowers/plans/2026-07-17-five-top-pages-workflow-split.md`
- Subagent-driven execution started on Friday, July 17, 2026
- Task 1 complete:
  - five labels added to the top navigation
  - no premature route wiring
  - temporary misleading destinations removed
  - pending workflow pages are visible but disabled until their routes exist
- Task 2 ready:
  - shared workflow page layout extraction
  - shared document section mapping
  - preserve current design and current workflow behavior while decomposing the page
- Task 2 complete inline:
  - added reusable workflow page shell
  - added reusable workflow section wrapper
  - kept `IncomeProtectionPage` behavior unchanged by routing the active tab through the new wrapper seam
- Task 3 complete inline:
  - added top-level `Fact Find` page
  - narrowed the visible tabs to `Fact Find` and `Fact Find Update`
  - wired the `Fact Find` nav item and root route without enabling the other future pages yet
- Task 4 complete inline:
  - narrowed top-level `Income Protection` to `Quote` and `Statement of Suitability`
  - preserved the selected-client workflow path and existing visual layout
- Task 5 complete inline:
  - added top-level `Files/Docs`
  - moved the current `Files` and `Generated Documents` workspace into its own route
  - preserved legacy `/files` as a redirect
- Task 6 complete inline:
  - added the top-level `Pensions` page
  - reused the shared workflow shell with separate `Pensions Quote` and `Pensions Statement` draft keys
  - preserved the existing quote/statement layout pattern while keeping pensions namespaced away from income protection
- Task 7 complete inline:
  - replaced stale route assertions with focused five-page route coverage in `app.test.tsx`
  - restored statement recommendation merge behavior while filtering stale saved pricing paragraphs
  - restored guaranteed Aviva statement discount handling expected by the legacy quote/statement flow
  - aligned fact-find document assertions with the current inline-header layout
  - confirmed `app.test.tsx`, `app-shell.test.tsx`, `workflow-document-builders.test.ts`, and `npx.cmd tsc --noEmit --project tsconfig.app.json` pass on Friday, July 17, 2026

## Next Review Gate

- Verify broader regression coverage beyond route-level split checks
- Decide whether any extra seeded profile defaults or preview assertions should be promoted into dedicated regression tests
