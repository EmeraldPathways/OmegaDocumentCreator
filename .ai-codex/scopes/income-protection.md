# Scope: Income Protection Workflow

Use this scope when editing the live workflow page or its backend-backed state flow.

## Entry point

- `apps/frontend/src/pages/income-protection-page.tsx`

## Live tabs in `moduleTabs`

| Tab | Notes |
|-----|-------|
| Fact Find | Live draft/generate/export flow |
| Statement of Suitability | Live draft/generate/export flow |
| Files | Backend upload/list/download flow |
| Generated Documents | Backend-backed history, download, and pack download |

## Important state flow

- shared client/workflow data comes from `client-data-context.tsx`
- selected workflow client is local page state only, not persisted to `localStorage`
- workflow persistence uses `fetchWorkflow()` and `saveWorkflow()`
- files use `file-api.ts`
- generated documents use `generated-document-api.ts`

## Current validation behavior

- Fact Find generation blocks when required fields are missing
- Statement of Suitability generation blocks when required fields are missing
- draft save writes to the backend, not to browser persistence

## Route behavior

- `/income-protection` - live workflow route
- `/clients/:clientReference/income-protection` - redirect helper into `/income-protection`

## Do not assume

- Terms of Business is persisted through the workflow API, but it is not a live top-level workflow tab right now
- Client Details is not a separate top-level workflow tab right now
- there is no workflow `localStorage` fallback anymore
- generated document history on this page is backend-backed only
