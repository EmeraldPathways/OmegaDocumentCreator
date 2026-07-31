# Omega Web App — UI-Only Redesign Prompt

## Context & Goal

You are performing a **purely visual redesign pass** on the Omega Document Creator web app. The app is a React + TypeScript financial-services workflow tool for insurance document generation. **Do not change any behavior, logic, state, handlers, or data flow.** Only improve layout, spacing, typography, hierarchy, borders, backgrounds, and responsive styling.

The current UI suffers from **card overuse** — nearly every section, form group, and content block is wrapped in a `.card` or `.form-section` container with borders, shadows, and padding, creating visual noise and flattening the hierarchy. The screenshots provided show this clearly across the Settings, Client Detail, and Income Protection pages.

---

## Design Direction

| Current Problem | Target State |
|---|---|
| Cards stacked inside cards | Clean sections with subtle dividers (`border-top`, `border-bottom`) or whitespace-only separation |
| Every form group is a card | Form sections use background tints or left-border accents instead of full card containers |
| Flat visual hierarchy | Stronger typographic scale: section titles at `20px/600wt`, subsection labels at `14px/500wt`, field labels at `12px/500wt` |
| Generic "SaaS purple" feel | Professional financial-services aesthetic: deep navy primary (`#1a365d`), crisp whites, subtle warm grays, restrained shadows |
| Dense, uniform spacing | A clear spacing rhythm: `32px` between major sections, `24px` between subsections, `16px` between fields, `8px` between label and input |
| Tables and lists inside cards | Tables and file lists sit flush on the page background with their own subtle row separators |

**Overall feel:** Think "premium financial advisory platform" — clean, authoritative, scannable, not playful. Like a well-designed CRM or portfolio management tool.

---

## Primary Files to Modify

1. **`apps/frontend/src/styles.css`** — Update the global design system. Add new utility classes, refine existing component styles. This is where the bulk of the visual change lives.
2. **`apps/frontend/src/components/app-shell.tsx`** — Adjust the app shell layout, header spacing, and content wrapper if needed.
3. **`apps/frontend/src/components/*`** — Update any shared components (accordions, form fields, tables, badges, buttons) to use the cleaner styling.
4. **`apps/frontend/src/pages/*`** — Update page-level markup/className wrappers. **Only layout and presentation classes.** Do not touch logic.

### Special Care Required
**`apps/frontend/src/pages/income-protection-page.tsx`** — This page has complex accordion-driven forms and a generated output workspace. Only adjust the **outer layout wrappers, section spacing, and className assignments**. Do not touch:
- Accordion toggle logic
- `updateField` calls
- `factFindAccordion` state
- Generated output rendering logic
- Template picker logic

---

## Files You Must NOT Touch

```
apps/frontend/src/data/client-data-context.tsx
apps/frontend/src/auth/auth-context.tsx
apps/frontend/src/documents/document-api.ts
apps/frontend/src/documents/document-composer.ts
apps/frontend/src/documents/generated-output-workspace.tsx
apps/frontend/src/documents/rich-document-editor.tsx
apps/frontend/src/documents/export-generated-document.ts
apps/frontend/src/documents/pdf-export.ts
apps/frontend/src/documents/word-export.ts
apps/frontend/src/documents/workflow-document-builders.ts
anything under apps/api/
```

---

## Hard Constraints

- **No behavior changes.** Do not modify handlers, state logic, `localStorage` keys, fetch calls, auth flow, generation flow, export flow, or document formatting logic.
- **No new dependencies.** Work with existing CSS and React patterns only.
- **No prop renames** unless strictly required for layout.
- **No test intent changes.** Existing tests must still pass.
- **Desktop and mobile must remain usable.** All responsive breakpoints must be preserved or improved.

---

## Specific Visual Changes to Make

### 1. Global Styles (`styles.css`)

#### Reduce Card Dominance
- Keep `.card` for **true modal/dialog-like containers only** (e.g., confirmation dialogs, modal bodies).
- For page content sections, introduce `.section` and `.section-divided`:
  ```css
  .section { padding: var(--space-6) 0; }
  .section-divided { border-top: 1px solid var(--color-border); }
  .section-divided:first-child { border-top: 0; }
  ```
- Reduce `.card` default shadow from `var(--shadow-md)` to `var(--shadow-sm)` or remove entirely where used for page content.

#### Form Section Restyling
- Replace `.form-section` (which currently has `border: 1px solid var(--color-border); border-radius: var(--radius-lg); padding: var(--space-5); background: var(--color-surface);`) with a cleaner pattern:
  - Remove the full border/shadow container
  - Use a **subtle left accent border** (`border-left: 3px solid var(--color-primary); padding-left: var(--space-4);`) for major form sections
  - Or use a **light background tint** (`background: #fafbfc; padding: var(--space-5); border-radius: var(--radius-lg);`) without a visible border for grouped fields
- Introduce `.form-section-title` as a proper heading: `font-size: var(--font-size-xl); font-weight: var(--font-weight-semibold); color: var(--color-text); margin-bottom: var(--space-4); padding-bottom: var(--space-2); border-bottom: 1px solid var(--color-border);`

#### Field Hierarchy
- `.field-label`: increase weight to `600`, reduce size to `12px`, add `letter-spacing: 0.02em; text-transform: uppercase; color: var(--color-text-muted);` for a more professional label style
- `.field-input`: increase min-height to `42px`, increase padding to `10px 14px`, ensure border color is `var(--color-border-strong)` at rest and `var(--color-secondary)` on focus
- Add `.field-group` for side-by-side fields: `display: grid; grid-template-columns: repeat(2, 1fr); gap: var(--space-4);`

#### Tables
- Remove `.table-wrap` outer border where it wraps page content tables. Keep it for modal-contained tables.
- `.data-table`: remove outer border-radius on page tables. Keep row hover (`background: var(--color-background)`).
- Table headers: keep uppercase + letter-spacing but ensure `background: transparent` on page tables (not the gray header bar).

#### Buttons
- Keep existing button variants but **reduce the hover lift effect** (`transform: translateY(-1px)`) on `.btn-secondary` and `.btn-ghost` — only `.btn-primary` should have the lift.
- Ensure `.btn-sm` is used consistently for table row actions and secondary actions.

#### App Shell
- `.app-header`: reduce padding to `var(--space-2) var(--space-5)` for a tighter, more modern header.
- `.content`: increase max-width to `1280px` (from `1440px` if different) or keep `1440px` but ensure consistent gutters.
- Add a subtle page background pattern or keep the clean `#f7fafc` but ensure sections have enough whitespace to breathe.

#### Workflow Header (Income Protection)
- The `.workflow-header` currently has `border: 1px solid var(--color-border); border-radius: var(--radius-lg); background: var(--color-background); padding: var(--space-4);`
- **Restyle:** Remove the card-like border. Use a clean white background with a **bottom border separator** and stronger typography for the client summary bar. The summary items should be more distinct with label/value pairs clearly separated.

#### Accordion
- `.accordion`: remove the outer `border: 1px solid var(--color-border); border-radius: var(--radius-lg);` when used in page forms. Keep it for standalone collapsible panels.
- `.accordion-header`: add `padding: var(--space-4) 0;` (flush to edges) instead of padded inside a card. Use a `border-bottom: 1px solid var(--color-border);` to separate items.
- `.accordion-body`: when open, add `padding: var(--space-4) 0 var(--space-5);` — no inner card padding.

#### Generated Output Workspace
- The `.generated-output-workspace` has `border: 1px solid var(--color-border); border-radius: var(--radius-xl); background: #fff;`
- **Keep this as-is** — it is a contained workspace and the card styling is appropriate here. Only ensure the outer page wrapper around it has proper spacing.

#### Status Badges
- Keep existing badge colors but ensure they are **smaller and more refined** inside tables: `padding: 2px 8px; font-size: 11px; border-radius: var(--radius-md);`

### 2. Page-Level Changes

#### `clients-page.tsx`
- Remove `.card` wrapper around the main table if present. The table should sit directly on the page background.
- The search/filter bar can remain as a clean white bar with a bottom border, not a card.
- Ensure the "Create Client" button uses `.btn-primary` and sits in a clean `.page-heading` area.

#### `client-detail-page.tsx`
- **This is the most card-heavy page in the screenshots.** Restructure:
  - Replace the stacked `.card` containers (Personal Information, Address, Generated Documents, Files, Dependants) with `.section-divided` blocks.
  - Each section should have a `.section-title` with an icon (reuse existing icons) and an optional action button aligned to the right.
  - The two-column `.profile-grid` (Personal Info + Address) should use a **clean grid without card wrappers** — just labels and values with proper spacing.
  - Generated Documents and Files tables should use `.data-table` directly without card containers.
  - Dependants list can use a clean `.file-list`-style pattern or simple rows with avatars.

#### `settings-page.tsx`
- Remove the two-column card grid (Core App Settings + AI Readiness).
- Use a **single-column layout** with `.section-divided` blocks:
  - Section 1: Core App Settings (Admin email, App URL, File storage path, Backup path, Session timeout)
  - Section 2: AI Readiness (AI Assistant toggle, API key if enabled)
- The "Save Settings" button should be sticky or placed at the bottom of the form, not floating in a card header.
- Path test buttons should be inline with the input field (using `.field-input-wrap` with an inline button suffix).

#### `income-protection-page.tsx`
- **Only touch markup/className/layout wrappers.**
- The `.workflow-header` should be restyled as described above.
- The tab list (`Fact Find`, `Statement of Suitability`, `Files`, `Generated Documents`) should remain functional but can be styled cleaner — ensure the active tab has the primary color background.
- The accordion sections inside the Fact Find tab should use the restyled accordion (no outer card border, flush headers).
- Form fields inside accordions should use the new `.field-group` grid for side-by-side fields.
- The Statement of Suitability form sections (Recommendation basics, Cover summary) should use the new `.form-section` pattern (left accent or light tint) instead of cards.
- The Generated Output section at the bottom should keep its workspace styling but ensure the surrounding page has proper padding.

### 3. Component-Level Changes

#### Accordion Component
- If the accordion component adds an outer `.accordion` class, ensure pages can opt into a "flush" variant. Add `.accordion-flush` class:
  ```css
  .accordion-flush { border: 0; border-radius: 0; background: transparent; }
  .accordion-flush .accordion-item { border-bottom: 1px solid var(--color-border); }
  .accordion-flush .accordion-item:last-child { border-bottom: 0; }
  .accordion-flush .accordion-header { padding: var(--space-4) 0; }
  .accordion-flush .accordion-content { padding: 0 0 var(--space-5); }
  ```

#### Form Field Component
- Ensure the field component renders labels with the new uppercase, muted style.
- Ensure `.field-input-wrap` has the refined border and focus states.

#### Table Component
- Ensure table rows have a subtle hover and clean cell padding. No outer card needed.

---

## Reference: Current UI Patterns (from Screenshots)

### Screenshot 1 — Settings Page
- Two large cards side by side: "Core App Settings" and "AI Readiness"
- Each card has `border: 1px solid #e2e8f0`, `border-radius: 8px`, `box-shadow`, `padding: 20px`
- Fields are stacked vertically with standard labels
- "Save Settings" button is in the top-right of the page heading

### Screenshot 2 — Client Detail Page (Jamie Murphy)
- Multiple stacked cards: Personal Information, Address, Generated Documents, Files, Dependants
- Each card has identical border/shadow/padding
- The two-column grid inside Personal Information/Address uses card-internal padding
- Tables for Generated Documents and Files are inside cards
- Action buttons (Edit Client, Open Income Protection, Delete Client, Save Documents) are in a row above the cards

### Screenshot 3 — Income Protection / Statement of Suitability
- Workflow header with client selector and summary bar (inside a card)
- Tab navigation below header
- Form sections ("Recommendation basics", "Cover summary") are each card containers
- Fields are in a two-column grid inside cards
- Generated Output section at bottom is a large bordered workspace

### Screenshot 4 — Income Protection / Fact Find
- Very long page with many accordion sections, each inside the tab panel
- Each accordion section contains many fields
- The overall tab panel has a card border
- Generated Output workspace at bottom

---

## Verification

After making changes, run the following tests to ensure no behavior was broken:

```bash
.\node_modules\.bin\vitest.cmd run src/app.test.tsx src/documents/workflow-document-builders.test.ts src/documents/export-generated-document.test.ts --cache=false
```

All tests must pass. If a test fails due to a className change that affects a query selector, adjust the selector in the test to match the new markup **only if** the test intent remains the same.

---

## Definition of Done

- [ ] The app looks noticeably cleaner and less card-heavy
- [ ] Forms are easier to scan with stronger label/input hierarchy
- [ ] No JavaScript/TypeScript logic was changed (handlers, state, effects, context, API calls)
- [ ] No new npm dependencies were added
- [ ] Desktop layout is polished and professional
- [ ] Mobile layout remains usable (responsive breakpoints preserved)
- [ ] All specified tests pass
- [ ] The generated output workspace, document editor, PDF preview, and export flows remain visually intact

---

## Output Format

Provide the updated file contents for each modified file. Use **small, focused diffs** — prefer updating existing CSS rules and className assignments rather than rewriting entire components. If a page file requires significant markup restructuring, provide the full file with clear comments indicating what changed.

---

**Repo:** `https://github.com/EmeraldPathways/OmegaDocumentCreator/tree/BIS-Intergration`

**Branch:** `BIS-Intergration`

**Screenshots:** Use the 4 provided screenshots (`127.0.0.1_3007_income-protection.png` through `(3).png`) as the baseline for what the current UI looks like. The redesigned UI should be a clear visual improvement over these.
