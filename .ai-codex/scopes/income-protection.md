# Scope: Income Protection Workflow

Use this scope when editing the live workflow page or its client-state flow.

## Entry point

- `apps/frontend/src/pages/income-protection-page.tsx`

## Live tabs in `moduleTabs`

| Tab | Notes |
|-----|-------|
| Fact Find | Live draft/generate/export flow |
| Statement of Suitability | Live draft/generate/export flow |
| Files | Frontend scaffold/placeholder actions |
| Generated Documents | Browser-backed history and preview modal |

## Important state flow

- Shared client/workflow data comes from `client-data-context.tsx`.
- Selected workflow client is local page state mirrored to `localStorage`.
- The header currently offers a dropdown selector plus links to add/edit the client.

## Current validation behavior

- Fact Find generation blocks when required fields are missing.
- Statement of Suitability generation blocks when required fields are missing.
- Draft field edits can still be saved to browser state.

## Route behavior

- `/income-protection` - live workflow route
- `/clients/:clientReference/income-protection` - writes the selected client to `localStorage`, then redirects

## Do not assume

- Terms of Business is not a live top-level workflow tab right now.
- Client Details is not a separate top-level workflow tab right now.
- There is no backend workflow persistence for this page yet.
