# Omega Web App — UI-Only Redesign Prompt (Updated with Contrast & Accordion State Feedback)

## Context & Goal

You are performing a **purely visual redesign pass** on the Omega Document Creator web app. The app is a React + TypeScript financial-services workflow tool for insurance document generation. **Do not change any behavior, logic, state, handlers, or data flow.** Only improve layout, spacing, typography, hierarchy, borders, backgrounds, colors, and responsive styling.

The current UI suffers from **card overuse** and **insufficient contrast** — sections blend into each other, accordion states are indistinguishable, and critical action buttons (Save, Add Client, Edit Client) lack visual prominence and are poorly positioned. The screenshots provided show this clearly across the Settings, Client Detail, and Income Protection pages.

---

## Design Direction

| Current Problem | Target State |
|---|---|
| Cards stacked inside cards | Clean sections with subtle dividers (`border-top`, `border-bottom`) or whitespace-only separation |
| Every form group is a card | Form sections use background tints or left-border accents instead of full card containers |
| Flat visual hierarchy / low contrast | Stronger typographic scale, deeper shadows on active elements, high-contrast text, distinct background tints for active/open sections |
| Generic "SaaS purple" feel | Professional financial-services aesthetic: deep navy primary (`#1a365d`), crisp whites, subtle warm grays, restrained but purposeful shadows |
| Dense, uniform spacing | A clear spacing rhythm: `32px` between major sections, `24px` between subsections, `16px` between fields, `8px` between label and input |
| Tables and lists inside cards | Tables and file lists sit flush on the page background with their own subtle row separators |
| Accordion open/closed states look identical | Open accordions have a distinct visual treatment (colored left border, tinted background, bold title). Closed accordions are neutral. |
| Save / Add / Edit buttons are invisible | Action buttons use primary styling, sticky positioning where appropriate, and sit in clear action zones |

**Overall feel:** Think "premium financial advisory platform" — clean, authoritative, scannable, high-contrast, not playful. Like a well-designed CRM or portfolio management tool.

---

## Primary Files to Modify

1. **`apps/frontend/src/styles.css`** — Update the global design system. Add new utility classes, refine existing component styles, add accordion state styles, enhance contrast. This is where the bulk of the visual change lives.
2. **`apps/frontend/src/components/app-shell.tsx`** — Adjust the app shell layout, header spacing, and content wrapper if needed.
3. **`apps/frontend/src/components/*`** — Update any shared components (accordions, form fields, tables, badges, buttons) to use the cleaner, higher-contrast styling.
4. **`apps/frontend/src/pages/*`** — Update page-level markup/className wrappers. **Only layout and presentation classes.** Do not touch logic.

### Special Care Required
**`apps/frontend/src/pages/income-protection-page.tsx`** — This page has complex accordion-driven forms and a generated output workspace. Only adjust the **outer layout wrappers, section spacing, button placement, and className assignments**. Do not touch:
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

### 1. Global Styles (`styles.css`) — Contrast & Hierarchy

#### Increase Contrast Across the App
- **Text contrast:** Ensure `var(--color-text)` is sufficiently dark against all backgrounds. Do not use `var(--color-text-muted)` for any label that is critical to form comprehension.
- **Border contrast:** Use `var(--color-border-strong)` (`#cbd5e0`) as the default border for inputs, cards, and dividers. Reserve `var(--color-border)` (`#e2e8f0`) for very subtle separators only.
- **Shadow depth:** Increase shadow on elevated elements:
  - `var(--shadow-md)`: `0 2px 4px rgba(0, 0, 0, 0.08)` (was `0 1px 3px rgba(0,0,0,0.1)`)
  - `var(--shadow-lg)`: `0 8px 16px rgba(0, 0, 0, 0.1)` (was `0 4px 6px`)
  - Add `var(--shadow-focus): 0 0 0 3px rgba(49, 130, 206, 0.25);` for stronger focus rings.
- **Background contrast:** Page background should feel distinct from surface. If `var(--color-background)` is too close to white, darken slightly to `#f1f5f9` or add a very subtle texture.

#### Reduce Card Dominance
- Keep `.card` for **true modal/dialog-like containers only** (e.g., confirmation dialogs, modal bodies).
- For page content sections, introduce `.section` and `.section-divided`:
  ```css
  .section { padding: var(--space-6) 0; }
  .section-divided { border-top: 2px solid var(--color-border-strong); }
  .section-divided:first-child { border-top: 0; }
  ```
- Reduce `.card` default shadow from `var(--shadow-md)` to `var(--shadow-sm)` or remove entirely where used for page content.

#### Form Section Restyling
- Replace `.form-section` (which currently has `border: 1px solid var(--color-border); border-radius: var(--radius-lg); padding: var(--space-5); background: var(--color-surface);`) with a cleaner pattern:
  - Remove the full border/shadow container
  - Use a **subtle left accent border** (`border-left: 3px solid var(--color-primary); padding-left: var(--space-4);`) for major form sections
  - Or use a **light background tint** (`background: #f8fafc; padding: var(--space-5); border-radius: var(--radius-lg);`) without a visible border for grouped fields
- Introduce `.form-section-title` as a proper heading: `font-size: var(--font-size-xl); font-weight: var(--font-weight-semibold); color: var(--color-text); margin-bottom: var(--space-4); padding-bottom: var(--space-2); border-bottom: 2px solid var(--color-border-strong);`

#### Field Hierarchy
- `.field-label`: increase weight to `600`, reduce size to `12px`, add `letter-spacing: 0.02em; text-transform: uppercase; color: var(--color-text-muted);` for a more professional label style
- `.field-input`: increase min-height to `42px`, increase padding to `10px 14px`, ensure border color is `var(--color-border-strong)` at rest and `var(--color-secondary)` on focus with the stronger `var(--shadow-focus)`
- Add `.field-group` for side-by-side fields: `display: grid; grid-template-columns: repeat(2, 1fr); gap: var(--space-4);`

#### Tables
- Remove `.table-wrap` outer border where it wraps page content tables. Keep it for modal-contained tables.
- `.data-table`: remove outer border-radius on page tables. Keep row hover (`background: var(--color-background)`).
- Table headers: keep uppercase + letter-spacing but ensure `background: transparent` on page tables (not the gray header bar). Add a `border-bottom: 2px solid var(--color-border-strong);` for header separation.

#### Buttons — Prominence & Clarity
- **Primary button (`.btn-primary`)**: Must be visually dominant. Ensure `background: var(--color-primary); color: white;` with strong shadow on hover. Use `transform: translateY(-1px); box-shadow: var(--shadow-lg);` on hover.
- **Secondary button (`.btn-secondary`)**: Remove the hover lift effect. Use `border: 1px solid var(--color-border-strong);` with a subtle background change on hover.
- **Danger button (`.btn-danger`)**: Keep red but ensure it does not compete with primary. Use only for destructive actions.
- **Ghost button (`.btn-ghost`)**: Remove hover lift entirely. Use for low-priority actions.
- **Sticky action bar**: Introduce `.sticky-action-bar` for pages with long forms:
  ```css
  .sticky-action-bar {
    position: sticky;
    bottom: 0;
    display: flex;
    align-items: center;
    justify-content: flex-end;
    gap: var(--space-3);
    padding: var(--space-4) var(--space-5);
    background: rgba(255, 255, 255, 0.95);
    backdrop-filter: blur(8px);
    border-top: 2px solid var(--color-border-strong);
    z-index: 40;
  }
  ```

#### App Shell
- `.app-header`: reduce padding to `var(--space-2) var(--space-5)` for a tighter, more modern header. Ensure the bottom border is `var(--color-border-strong)` for stronger separation from content.
- `.content`: increase max-width to `1280px` (from `1440px` if different) or keep `1440px` but ensure consistent gutters.
- Add a subtle page background pattern or keep the clean `#f7fafc` but ensure sections have enough whitespace to breathe.

#### Workflow Header (Income Protection)
- The `.workflow-header` currently has `border: 1px solid var(--color-border); border-radius: var(--radius-lg); background: var(--color-background); padding: var(--space-4);`
- **Restyle:** Remove the card-like border. Use a clean white background with a **bottom border separator** (`border-bottom: 2px solid var(--color-border-strong);`) and stronger typography for the client summary bar. The summary items should be more distinct with label/value pairs clearly separated.
- **Action buttons in workflow header:** The "Add Client" and "Edit Client" buttons must be repositioned into a clear **action zone** — either directly under the client selector dropdown as a horizontal button group, or in a dedicated `.workflow-header-actions` row that is visually distinct (e.g., a light tinted background bar with right-aligned buttons). Do not let them float ambiguously in the header grid.

#### Accordion — Open/Closed State Colors (CRITICAL)
This is the most important visual fix. Currently, accordion sections look identical whether open or closed.

Add these accordion state styles:

```css
/* Base accordion item */
.accordion-item {
  border-bottom: 1px solid var(--color-border-strong);
  transition: background var(--transition-fast);
}

/* Closed state — neutral */
.accordion-item:not(.is-open) .accordion-header {
  background: transparent;
  color: var(--color-text-muted);
}
.accordion-item:not(.is-open) .accordion-header:hover {
  background: var(--color-background);
  color: var(--color-text);
}

/* Open state — distinct visual treatment */
.accordion-item.is-open {
  background: #f8fafc;
  border-left: 3px solid var(--color-primary);
}
.accordion-item.is-open .accordion-header {
  color: var(--color-primary);
  font-weight: var(--font-weight-semibold);
  background: rgba(26, 54, 93, 0.04);
}
.accordion-item.is-open .accordion-chevron {
  color: var(--color-primary);
}

/* Accordion body when open */
.accordion-item.is-open .accordion-content {
  background: transparent;
  padding: var(--space-4) var(--space-5) var(--space-5);
}
```

Also add **tab-level state colors** for the workflow tabs (`Fact Find`, `Statement of Suitability`, `Files`, `Generated Documents`):
- Active tab: keep `background: var(--color-primary); color: white;` but add a subtle bottom border or shadow to make it pop.
- Inactive tabs: ensure they are clearly inactive with `color: var(--color-text-muted);` and no background.
- Add a progress indicator color on the tab itself (the small dot): make it larger (`10px`) and more saturated when complete.

#### Generated Output Workspace
- The `.generated-output-workspace` has `border: 1px solid var(--color-border); border-radius: var(--radius-xl); background: #fff;`
- **Keep this as-is** — it is a contained workspace and the card styling is appropriate here. Only ensure the outer page wrapper around it has proper spacing.
- **However**, ensure the "Generated Output" accordion/section header uses the same open-state styling as above when expanded.

#### Status Badges
- Keep existing badge colors but ensure they are **smaller and more refined** inside tables: `padding: 2px 8px; font-size: 11px; border-radius: var(--radius-md);`
- Ensure badge borders are visible (`border: 1px solid currentColor; opacity: 0.3;`) for stronger definition.

---

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
- **Action buttons** (Edit Client, Open Income Protection, Delete Client, Save Documents): Group these into a single `.page-actions` bar at the top of the page, right-aligned. Use `.btn-primary` for the most common action (Edit Client or Open Income Protection), `.btn-secondary` for Save Documents, and `.btn-danger` for Delete Client. Ensure they are large enough (`padding: var(--space-2) var(--space-5);`) and have clear icons + text labels.

#### `settings-page.tsx`
- Remove the two-column card grid (Core App Settings + AI Readiness).
- Use a **single-column layout** with `.section-divided` blocks:
  - Section 1: Core App Settings (Admin email, App URL, File storage path, Backup path, Session timeout)
  - Section 2: AI Readiness (AI Assistant toggle, API key if enabled)
- The "Save Settings" button should be **sticky at the bottom** of the viewport using `.sticky-action-bar` so it is always visible while scrolling through settings. It must use `.btn-primary` with a save icon.
- Path test buttons should be inline with the input field (using `.field-input-wrap` with an inline button suffix).

#### `income-protection-page.tsx`
- **Only touch markup/className/layout wrappers.**
- The `.workflow-header` should be restyled as described above.
- **Add Client / Edit Client buttons:** Move these out of the header grid and place them in a dedicated `.workflow-header-actions` flex row directly beneath the client selector. Style this row with a light background (`#f8fafc`) and a top border so it feels like a toolbar. Use `.btn-primary` for "Add Client" and `.btn-secondary` for "Edit Client". Ensure both have icons and are large enough to be easily clickable.
- **Save button:** The "Save" button in the "Fact Find Draft" section must be **prominent and sticky**. Wrap it in a `.sticky-action-bar` at the bottom of the form area so it is always accessible. Use `.btn-primary` with a disk icon. Do not let it sit as a small inline button.
- The tab list (`Fact Find`, `Statement of Suitability`, `Files`, `Generated Documents`) should remain functional but styled cleaner — ensure the active tab has the primary color background and a subtle shadow.
- The accordion sections inside the Fact Find tab must use the **new accordion state styling** (`is-open` class with left border, tinted background, bold title). Ensure the accordion component or the page passes the `is-open` class to the accordion item wrapper when expanded.
- Form fields inside accordions should use the new `.field-group` grid for side-by-side fields.
- The Statement of Suitability form sections (Recommendation basics, Cover summary) should use the new `.form-section` pattern (left accent or light tint) instead of cards.
- The Generated Output section at the bottom should keep its workspace styling but ensure the surrounding page has proper padding. If the Generated Output is inside an accordion, that accordion must also use the open-state styling when expanded.

---

### 3. Component-Level Changes

#### Accordion Component
- The accordion component must expose an `is-open` class on the `.accordion-item` wrapper when expanded. This is critical for the CSS state styling to work.
- Add `.accordion-flush` class for page forms:
  ```css
  .accordion-flush { border: 0; border-radius: 0; background: transparent; }
  .accordion-flush .accordion-item { border-bottom: 1px solid var(--color-border-strong); }
  .accordion-flush .accordion-item:last-child { border-bottom: 0; }
  .accordion-flush .accordion-header { padding: var(--space-4) 0; }
  .accordion-flush .accordion-content { padding: 0 0 var(--space-5); }
  ```
- Ensure the accordion chevron icon rotates smoothly and changes color to `var(--color-primary)` when open.

#### Form Field Component
- Ensure the field component renders labels with the new uppercase, muted style.
- Ensure `.field-input-wrap` has the refined border (`var(--color-border-strong)`) and stronger focus states (`var(--shadow-focus)`).

#### Table Component
- Ensure table rows have a subtle hover and clean cell padding. No outer card needed.
- Ensure table header bottom border is `2px solid var(--color-border-strong)` for stronger separation.

#### Button Component
- Ensure all buttons have a minimum touch target size of `36px` height.
- Ensure primary buttons have a clear icon + text pairing for critical actions (Save, Add Client, Edit Client).

---

## Reference: Current UI Patterns (from Screenshots)

### Screenshot 1 — Settings Page
- Two large cards side by side: "Core App Settings" and "AI Readiness"
- Each card has `border: 1px solid #e2e8f0`, `border-radius: 8px`, `box-shadow`, `padding: 20px`
- Fields are stacked vertically with standard labels
- "Save Settings" button is in the top-right of the page heading — not sticky, not prominent

### Screenshot 2 — Client Detail Page (Jamie Murphy)
- Multiple stacked cards: Personal Information, Address, Generated Documents, Files, Dependants
- Each card has identical border/shadow/padding
- The two-column grid inside Personal Information/Address uses card-internal padding
- Tables for Generated Documents and Files are inside cards
- Action buttons (Edit Client, Open Income Protection, Delete Client, Save Documents) are in a row above the cards but lack visual hierarchy

### Screenshot 3 — Income Protection / Statement of Suitability
- Workflow header with client selector and summary bar (inside a card)
- Tab navigation below header
- Form sections ("Recommendation basics", "Cover summary") are each card containers
- Fields are in a two-column grid inside cards
- Generated Output section at bottom is a large bordered workspace
- Save button is small and not prominent

### Screenshot 4 — Income Protection / Fact Find (Updated Screenshot)
- Very long page with many accordion sections inside the tab panel
- Accordion sections (Services Required, Personal Details, Employment Details, Income Protection, Assets & Liabilities, Pension Arrangements, Savings & Investments, Life Insurance & Serious Illness, Additional Relevant Information, Client Declarations) all look identical whether open or closed
- The "Save" button in the Fact Find Draft header is small and easily missed
- "Add Client" and "Edit Client" buttons are positioned awkwardly in the workflow header grid without clear visual separation
- The overall page feels flat and low-contrast

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
- [ ] **Contrast is significantly improved** — sections, borders, and text are clearly distinguishable
- [ ] **Accordion open/closed states are visually distinct** — open sections have a colored left border, tinted background, and bold title; closed sections are neutral
- [ ] **Save button is prominent and sticky** on long forms (Fact Find, Settings)
- [ ] **Add Client / Edit Client buttons are clearly positioned** in a dedicated action zone with strong visual presence
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

**Screenshots:** Use the 4 provided screenshots (`127.0.0.1_3007_income-protection.png` through `(3).png`) plus the updated Fact Find screenshot (`127.0.0.1_3007_income-protection(1).png`) as the baseline for what the current UI looks like. The redesigned UI should be a clear visual improvement over these.
