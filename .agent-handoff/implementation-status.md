# Implementation Status

## Active Branch

- `page-split`

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

## Next Review Gate

- Start the first real top-level page split from the new extraction seam
- Add top-level `Income Protection` page with only `Quote` and `Statement`
- Add top-level `Files/Docs` page with the current `Files` and `Generated Documents`
- Start the separate `Pensions` flow
- keep shared Fact Find input but separate pensions draft/output state
