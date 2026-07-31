# Scope: Income Protection Workflow

Use this scope when editing the shared workflow shell, fact-find sections, quote/statement gates, or backend-backed file/document flow.

## Entry point

- `apps/frontend/src/pages/income-protection-page.tsx`

## Live workflow sections

| Route family | Live sections |
|--------------|---------------|
| `/fact-find` | `Fact Find`, `Fact Find Update` |
| `/income-protection` | `Quote`, `Statement of Suitability` |
| `/files-docs` | `Files`, `Generated Documents` |

## Important state flow

- shared client/workflow data comes from `client-data-context.tsx`
- selected workflow client is mirrored locally for rehydration only
- workflow persistence uses `fetchWorkflow()` and `saveWorkflow()`
- files use `file-api.ts`
- generated documents use `generated-document-api.ts`
- quote and statement gates depend on shared workflow data plus page-local quote state

## Current validation behavior

- Fact Find generation blocks when required shared fields are missing
- Fact Find Update generation uses the update section data, not the main fact-find section
- Quote generation and Statement generation each use their own gating helpers
- shared gates can read fields that live outside the visible section, so cross-page mappings must stay in sync
- draft save writes to the backend, not to browser-only persistence

## Route behavior

- `/fact-find` - fact-find workflow route
- `/income-protection` - quote/statement route
- `/files-docs` - files/generated-documents route
- `/clients/:clientReference/income-protection` - redirect helper into `/income-protection`

## Do not assume

- Terms of Business is not a live top-level route in the split workflow
- generated document history on these pages is backend-backed
- files/documents permissions are broader or narrower than client access; they inherit client access
