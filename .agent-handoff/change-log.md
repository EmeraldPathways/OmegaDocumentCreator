# Change Log

## Planned Change Areas

### Navigation and Routing

- Introduce a five-page top navigation structure
- Sequence route wiring safely so the app keeps compiling during the split

### Shared Fact Find

- Keep `Fact Find` and `Fact Find Update` as the shared client-information source
- Make this data available to both downstream workflows

### Income Protection Workflow

- Restrict this page to `Quote` and `Statement of Suitability`
- Preserve current quote/statement layout and generation behavior

### Pensions Workflow

- Add a separate pensions-specific `Quote` and `Statement` flow
- Keep pensions drafts and generated outputs separate from income protection

### Files and Documents

- Move the current `Files` and `Generated Documents` surfaces into `Files/Docs`
- Preserve current file-management and generated-document patterns

## Accepted Changes

- 2026-07-17: Added the implementation plan for the five-page workflow split
- 2026-07-17: Added handoff tracking files for controller and agent work
- 2026-07-17: Added five-page top navigation labels with safe temporary destinations pending later route wiring (`60a221a`)
- 2026-07-17: Replaced misleading temporary destinations with disabled pending nav labels for `Fact Find`, `Pensions`, and `Files/Docs` (`7e0975f`)
- 2026-07-17: Added the first shared workflow extraction seam inline without changing current Income Protection behavior
- 2026-07-17: Added the top-level `Fact Find` page and wired the `Fact Find` nav/root route while keeping other future pages deferred
- 2026-07-17: Narrowed top-level `Income Protection` to `Quote` and `Statement of Suitability`
- 2026-07-17: Added top-level `Files/Docs` and redirected legacy `/files` into the shared files/documents workspace

## Pending Changes

- Shared workflow extraction
- Fact Find page
- Income Protection page split
- Files/Docs page
- Pensions workflow separation
- Final regression coverage
