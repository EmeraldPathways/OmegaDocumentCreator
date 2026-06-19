# Scope: Income Protection Workflow

Use this scope when working on the Income Protection module tabs, workflow state, or client data flow.

## Entry point

- `apps/frontend/src/pages/income-protection-page.tsx` — the entire workflow lives here

## Tabs

| Tab | Status |
|-----|--------|
| Client Details | Complete — reads from shared client data |
| Fact Find | Stage 5 — browser-persistent draft, AI generation, preview, export |
| Terms of Business | Stage 6 — browser-persistent draft, AI generation, preview, export |
| Statement of Suitability | Stage 7 — browser-persistent draft, AI generation, preview, export |
| Files | Stage 8 — frontend scaffold only, no real upload |
| Generated Documents | Stage 9 — browser-backed history, reopenable previews |

## Shared state

All workflow data flows through `client-data-context.tsx`.
Selected workflow client is managed inside `income-protection-page.tsx` — not in the route.
Client can be changed via: search field, dropdown, or `Add Client`.

```typescript
const { clientData, updateClientData } = useClientData();
// clientData[ref].factFind, clientData[ref].tob, clientData[ref].sos
```

## Validation (Stage 11)

- Fact Find: missing-field checklist blocks `Generate DOCX` / `Generate PDF` when essential fields missing
- Statement of Suitability: same pattern
- `Save Draft` is always available — not blocked by validation

## Route

- `/income-protection` — main route
- `/clients/:ref/income-protection` — redirect helper into above

## What's not yet done

- Backend-backed persistence for all tabs
- Autosave timers
- Real file upload (Files tab)
- Real generated document storage (Generated Documents tab)
- Full required-field coverage across all tabs
