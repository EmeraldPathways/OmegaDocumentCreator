# Fix Document Editor/Preview Styling to Match Export Output

## Problem

The in-app document editor and PDF preview show **plain, unformatted text** while the exported PDF and Word documents render with **proper Omega branding, section styling, and professional layout**.

### Bad (Current Editor/Preview)
- Plain `<h2>` headings with no styling
- Grid sections rendered as simple `<p><strong>Label:</strong> Value</p>` paragraphs
- No banner, no callout boxes, no signature footer styling
- Content looks like a raw text dump

### Good (Target — Export Output)
- `document-banner` with eyebrow, title, and subtitle in a styled card
- `client-summary-grid` with `grid-item` cards and `grid-label` styling
- `document-section` with proper heading hierarchy
- `document-callout` with left border accent and tinted background
- `signatures-footer` with structured advisor/client signature blocks
- All wrapped in `workflow-document` with consistent typography

---

## Root Cause

In `apps/frontend/src/documents/document-composer.ts`, there are two rendering functions:

1. **`renderBlock()`** — used for PDF/Word export. Outputs semantic HTML with full CSS classes:
   - `<header class="document-banner">` with `document-eyebrow`, `document-subtitle`
   - `<section class="client-summary-grid">` with `grid-items`, `grid-item`, `grid-label`
   - `<div class="document-section">`, `<div class="document-callout">`
   - `<footer class="signatures-footer">`

2. **`renderEditorBlock()`** — used for the in-app editor/preview. Outputs **plain HTML with zero CSS classes**:
   - `<p><strong>eyebrow</strong></p>` instead of `document-banner`
   - `<h2>title</h2>` + `<p><strong>Label:</strong> Value</p>` instead of `client-summary-grid`
   - No `document-section`, no `document-callout`, no `signatures-footer`

The CSS in `styles.css` already has comprehensive styling for the editor under `.generated-output-editor .ProseMirror .workflow-document` and its child classes. The styles simply never apply because the editor HTML lacks the class attributes.

Additionally, `renderComposedDocumentHtml()` wraps export output in `<article class="workflow-document">`, but `renderComposedDocumentEditorHtml()` does not — so even if classes were present, the `.workflow-document` scoped CSS selectors would still miss.

---

## Files to Modify

### Primary Fix
**`apps/frontend/src/documents/document-composer.ts`**

Update `renderEditorBlock()` to output the **same HTML structure and CSS classes** as `renderBlock()`, with one adjustment: replace semantic elements (`<header>`, `<section>`, `<aside>`, `<footer>`) with `<div>` equivalents to avoid ProseMirror schema conflicts, while keeping all class names identical.

Also update `renderComposedDocumentEditorHtml()` to wrap output in `<article class="workflow-document">` to match the export wrapper.

### Verify No Regression
**`apps/frontend/src/documents/word-export.ts`**

The Word export parser (`extractBlocksFromElement`) already looks for these exact classes:
- `document-banner`
- `client-summary-grid` / `document-grid`
- `document-section`
- `document-callout`
- `signatures-footer`

Using the same classes in the editor output will actually **improve** Word export consistency since the parser will find the same structure regardless of whether content came from the editor or export path.

---

## Specific Changes Required

### 1. Update `renderEditorBlock()` in `document-composer.ts`

Change each case to match `renderBlock()` structure with `<div>` wrappers:

#### Banner block
```typescript
// BEFORE (plain)
case "banner":
  return [
    `<p><strong>${escapeHtml(block.eyebrow)}</strong></p>`,
    `<h2>${escapeHtml(block.title)}</h2>`,
    `<p>${escapeHtml(block.subtitle)}</p>`,
  ].join("");

// AFTER (styled — matches renderBlock but uses div)
case "banner":
  return [
    '<div class="document-banner">',
    `<p class="document-eyebrow">${escapeHtml(block.eyebrow)}</p>`,
    `<h1>${escapeHtml(block.title)}</h1>`,
    `<p class="document-subtitle">${escapeHtml(block.subtitle)}</p>`,
    '</div>',
  ].join("");
```

#### Grid block
```typescript
// BEFORE (plain)
case "grid":
  return [
    `<h2>${escapeHtml(block.title)}</h2>`,
    ...block.items.map((item) => `<p><strong>${escapeHtml(item.label)}:</strong> ${escapeHtml(valueOrFallback(item.value))}</p>`),
  ].join("");

// AFTER (styled — matches renderBlock but uses div)
case "grid":
  return [
    `<div class="${block.className ?? "document-grid"}">`,
    `<h2>${escapeHtml(block.title)}</h2>`,
    '<div class="grid-items">',
    block.items.map((item) =>
      `<div class="grid-item"><span class="grid-label">${escapeHtml(item.label)}</span><strong>${escapeHtml(valueOrFallback(item.value))}</strong></div>`
    ).join(""),
    '</div>',
    '</div>',
  ].join("");
```

#### Section block
```typescript
// BEFORE (plain)
case "section":
  return `<h2>${escapeHtml(block.title)}</h2>${block.bodyHtml}`;

// AFTER (styled)
case "section":
  return `<div class="document-section"><h2>${escapeHtml(block.title)}</h2>${block.bodyHtml}</div>`;
```

#### Callout block
```typescript
// BEFORE (plain)
case "callout":
  return `<h2>${escapeHtml(block.title)}</h2>${block.bodyHtml}`;

// AFTER (styled)
case "callout":
  return `<div class="document-callout"><h2>${escapeHtml(block.title)}</h2>${block.bodyHtml}</div>`;
```

#### Footer block
```typescript
// BEFORE (plain)
case "footer":
  return [
    `<h2>${escapeHtml(block.title)}</h2>`,
    `<p><strong>Advisor:</strong> ${escapeHtml(block.advisorName)}</p>`,
    `<p><strong>Client signature:</strong> ${escapeHtml(block.clientSignature)}</p>`,
    `<p><strong>Client signature date:</strong> ${escapeHtml(block.clientSignatureDate)}</p>`,
    `<p><strong>Advisor signature:</strong> ${escapeHtml(block.advisorSignature)}</p>`,
    ...block.complianceCopy.map((line) => `<p>${escapeHtml(line)}</p>`),
  ].join("");

// AFTER (styled — matches renderBlock but uses div)
case "footer":
  return [
    '<div class="signatures-footer">',
    `<h2>${escapeHtml(block.title)}</h2>`,
    `<p><strong>Advisor:</strong> ${escapeHtml(block.advisorName)}</p>`,
    `<p><strong>Client signature:</strong> ${escapeHtml(block.clientSignature)}</p>`,
    `<p><strong>Client signature date:</strong> ${escapeHtml(block.clientSignatureDate)}</p>`,
    `<p><strong>Advisor signature:</strong> ${escapeHtml(block.advisorSignature)}</p>`,
    ...block.complianceCopy.map((line) => `<p>${escapeHtml(line)}</p>`),
    '</div>',
  ].join("");
```

### 2. Update `renderComposedDocumentEditorHtml()` in `document-composer.ts`

```typescript
// BEFORE
export function renderComposedDocumentEditorHtml(document: ComposedDocument) {
  return document.blocks.map((block) => renderEditorBlock(block)).join("");
}

// AFTER — wrap in workflow-document to match export styling
export function renderComposedDocumentEditorHtml(document: ComposedDocument) {
  return `<article class="workflow-document">${document.blocks
    .map((block) => renderEditorBlock(block))
    .join("")}</article>`;
}
```

### 3. Ensure ProseMirror Editor Schema Supports the Classes

In **`apps/frontend/src/documents/rich-document-editor.tsx`** (or wherever the ProseMirror schema is defined), verify that the editor schema allows:
- `<div>` elements with `class` attributes
- `<h1>` elements
- `<span>` elements with `class` attributes
- `<p>`, `<strong>`, `<ul>`, `<li>` (should already be supported)

If the schema strips `class` attributes from `<div>` elements, update the schema to preserve them for the known document classes:
`document-banner`, `document-eyebrow`, `document-subtitle`, `client-summary-grid`, `document-grid`, `grid-items`, `grid-item`, `grid-label`, `document-section`, `document-callout`, `signatures-footer`, `workflow-document`.

If the schema does not support `<h1>` inside the editor content, change the banner heading to `<h2>` or update the schema. The CSS already styles `.workflow-document h1` so the element must be preserved.

---

## Visual Reference

### Screenshot: BAD PDF Editor (Current)
- Shows "Omega Financial Management" as plain bold text
- "Income Protection Fact Find" as plain h2
- Client Summary as a flat list of `<p><strong>Label:</strong> Value</p>`
- No banner card, no grid cards, no section borders, no callout styling

### Screenshot: BAD Word Editor (Current)
- Same plain text rendering in the ProseMirror editor
- No `document-banner` styling (no beige background, no rounded corners)
- No `client-summary-grid` item cards
- No `document-callout` left border accent

### Screenshot: GOOD PDF Editor (Target)
- Omega Financial logo at top
- Document title in styled banner with beige background and rounded corners
- "Personal Circumstances", "Financial Situation", "Recommendation" as properly styled sections with underlined headings
- Clean, professional letter format

### Screenshot: GOOD Word Editor (Target)
- "Strictly Private & Confidential" header
- Proper letter formatting with address block
- Section headings with bottom borders
- Bold warnings, signature blocks with lines
- Professional document appearance

---

## Constraints

- **Do not change the document data model** (`ComposedBlock`, `ComposedDocument`, `GeneratedDocumentSection`, etc.)
- **Do not change the export logic** in `pdf-export.ts` or `word-export.ts` — the fix is purely in the composer rendering
- **Do not change the document builder logic** (`composeWorkflowDocument`, `buildFactFindBlocks`, etc.) — only the HTML rendering functions
- **Preserve all existing CSS classes** used by `renderBlock()` — the editor must use the exact same class names so the existing `styles.css` rules apply automatically
- **Do not add new npm dependencies**
- **Ensure existing tests still pass**:
  ```bash
  .\node_modules\.bin\vitest.cmd run src/documents/workflow-document-builders.test.ts src/documents/export-generated-document.test.ts --cache=false
  ```

---

## Definition of Done

- [ ] The ProseMirror editor (Edit tab) shows documents with the same styling as the PDF export: banner card, grid items, section borders, callout accents, signature footer
- [ ] The PDF Preview tab shows the same styled content (since it also uses the composed HTML)
- [ ] The `renderEditorBlock()` function outputs the same CSS classes as `renderBlock()`
- [ ] The editor HTML is wrapped in `<article class="workflow-document">`
- [ ] Word export continues to work correctly (parser finds the same classes)
- [ ] No changes to document composition logic, data models, or export engines
- [ ] All specified tests pass

---

## Repo

`https://github.com/EmeraldPathways/OmegaDocumentCreator/tree/BIS-Intergration`

**Branch:** `BIS-Intergration`
