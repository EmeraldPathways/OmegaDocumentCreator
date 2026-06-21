# UI Redesign Handoff — 19 June 2026

## Context

This handoff covers the visual redesign work completed on the Omega Document Creator frontend. The goal was to reduce card overuse, strengthen typographic hierarchy, and create a cleaner financial-services aesthetic **without changing any behavior, state, handlers, or data flow**.

After an initial pass that removed too many cards and made the UI feel flat, subtle `.section-card` containers were reintroduced to give pages clear definition and high contrast while keeping the overall look lighter than the original heavy `.card` styling.

---

## Files Modified

| File | Change Summary |
|---|---|
| `apps/frontend/src/styles.css` | Added `.section-card`, `.section-divided`, `.accordion-flush`, `.table-wrap-flush`, `.field-group`; restyled `.workflow-header`, `.field-label`, `.field-input`, buttons; reduced card shadows. |
| `apps/frontend/src/components/ui/accordion.tsx` | Added optional `flush` prop for borderless page accordions. |
| `apps/frontend/src/pages/clients-page.tsx` | Removed heavy card around table; kept clean search header and flush table. |
| `apps/frontend/src/pages/client-profile-page.tsx` | Wrapped profile, documents, files, and dependants sections in `.section-card`. |
| `apps/frontend/src/pages/settings-page.tsx` | Converted to single-column `.section-card` sections; path test buttons inline with inputs; save actions at bottom. |
| `apps/frontend/src/pages/income-protection-page.tsx` | Wrapped workflow in `.section-card`; accordions use `flush`; removed inner card from Signatures accordion. |

---

## Key CSS Classes

### Section containers

```css
.section-card {
  background: var(--color-surface);
  border: 1px solid var(--color-border);
  border-radius: var(--radius-lg);
  box-shadow: var(--shadow-sm);
  padding: var(--space-5);
}

.section-divided {
  border-top: 1px solid var(--color-border);
  padding-top: var(--space-6);
}
```

Use `.section-card` when a page block needs clear visual definition (Settings, Client Profile, Income Protection workflow). Use `.section-divided` for cleaner separated blocks where a full card is not needed.

### Form sections

```css
.form-section {
  background: #fafbfc;
  border-radius: var(--radius-lg);
  padding: var(--space-5);
}
```

Used inside Income Protection accordions for grouped fields (e.g., "Recommendation basics", "Cover summary").

### Field hierarchy

```css
.field-label {
  font-size: var(--font-size-small);
  font-weight: var(--font-weight-semibold);
  letter-spacing: 0.02em;
  text-transform: uppercase;
  color: var(--color-text-muted);
}

.field-input {
  min-height: 42px;
  padding: 10px 14px;
}
```

### Tables

- `.table-wrap` — keep for tables inside modals/dialogs.
- `.table-wrap-flush` — use for page tables (no outer border/radius, transparent header).

### Accordions

- `<Accordion>` — default bordered card style (keep for standalone panels).
- `<Accordion flush>` — borderless, full-width items with bottom separators (use in workflow forms).

### Buttons

Only `.btn-primary` retains the hover lift. `.btn-secondary` and `.btn-ghost` no longer lift, making secondary actions feel lighter.

---

## Component-Level Notes

### Accordion

```tsx
export function Accordion({ children, flush }: { children: ReactNode; flush?: boolean }) {
  return <div className={`accordion${flush ? " accordion-flush" : ""}`}>{children}</div>;
}
```

`flush` is opt-in and does not affect existing accordion behavior.

### Input / inline action suffix

Settings path test buttons are placed inside `.field-input-wrap` as `.btn.field-suffix`. The style rule `.field-input-wrap .field-suffix.btn` handles spacing and color.

### Workflow header

The Income Protection workflow header now sits inside `.section-card`. It keeps a bottom border to separate the client summary from the tabs. Summary labels are uppercase/semibold; values wrap with `overflow-wrap: break-word` to prevent long emails from overflowing.

---

## Testing

All specified tests pass:

```bash
cd apps/frontend
./node_modules/.bin/vitest.cmd run src/app.test.tsx src/documents/workflow-document-builders.test.ts src/documents/export-generated-document.test.ts --cache=false
```

Result: **73 passed** across 3 test files.

`./node_modules/.bin/tsc.cmd --noEmit` also passes.

### Known pre-existing build issues

`npm run build` reports TypeScript errors in files that were explicitly out of scope for this redesign:

- `src/documents/export-generated-document.ts(49,36)`: `Property 'children' does not exist on type 'never'`.
- `src/documents/word-export.ts(90,9)`: `Type 'string' is not assignable to type '"svg" | "jpg" | "png" | "bmp"'`.

These are not caused by the UI changes and should be handled separately.

---

## Visual Result Summary

- **Settings**: single-column cards, inline path test buttons, bottom save action.
- **Clients**: clean metric cards, flush table, subtle search header.
- **Client Profile**: each major section (info, documents, files, dependants) is a clearly defined card.
- **Income Protection**: whole workflow is a contained card; tabs and flush accordions inside; generated output workspace unchanged.

---

## Constraints Preserved

- No JavaScript/TypeScript logic, state, handlers, or API calls were changed.
- No new dependencies added.
- Generated output workspace, document editor, PDF preview, and export flows remain visually intact.
- Responsive breakpoints preserved.
