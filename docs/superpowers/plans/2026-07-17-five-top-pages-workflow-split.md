# Five Top Pages Workflow Split Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Split the current workflow into five top-level pages: `Clients`, `Fact Find`, `Income Protection`, `Pensions`, and `Files/Docs`, while preserving the current Omega design and layout everywhere and making Fact Find the shared information source for both downstream advice flows.

**Architecture:** Keep the existing visual shell, page layout, document editor, preview, export, and file-management patterns. Extract the current `IncomeProtectionPage` into a reusable workflow workspace component that can render the existing sections in different page combinations. Treat `Fact Find` as the shared client-information source for both advice flows, then keep `Income Protection` and `Pensions` as separate downstream quote/statement namespaces so their drafts, generated documents, statuses, and generation logic do not collide.

**Tech Stack:** React, TypeScript, React Router, existing client-data context, existing workflow API, existing generated-document APIs, existing TipTap-based generated-output editor.

## Global Constraints

- Preserve the current design, spacing, layout, editor behavior, preview behavior, and export behavior.
- `Clients` must remain functionally unchanged.
- `Fact Find` page must contain only `Fact Find` and `Fact Find Update`.
- `Income Protection` page must contain only `Quote` and `Statement`.
- `Pensions` must use the same UI pattern as the current Income Protection workflow, but with its own `Quote` and `Statement`.
- `Files/Docs` must carry the current `Files` and `Generated Documents` surfaces out of the existing Income Protection page.
- `Fact Find` data is shared input for both `Income Protection` and `Pensions`.
- `Income Protection` and `Pensions` must each keep their own separate quote/statement flow, draft state, generation status, and generated outputs.
- Keep changes surgical; reuse the current workflow code and extracted tab components instead of redesigning the UI.
- Preserve existing client selection behavior based on the shared selected-client storage pattern.
- Keep document generation parity across edit, PDF preview, and export for every moved workflow surface.

---

## File Structure

- Modify: `apps/frontend/src/App.tsx`
  - Add the new top-level routes and keep legacy redirects working.
- Modify: `apps/frontend/src/components/app-shell.tsx`
  - Replace the current top navigation with five workflow entries while preserving the existing shell styling.
- Modify: `apps/frontend/src/pages/income-protection-page.tsx`
  - Shrink this file from a single all-in-one workspace into a shared workflow renderer plus the remaining module-specific logic.
- Modify: `apps/frontend/src/pages/income-protection-helpers.tsx`
  - Replace the one-size-fits-all `moduleTabs` model with a section configuration that can be reused by multiple pages.
- Modify: `apps/frontend/src/data/client-data-context.tsx`
  - Add storage support for pension quote/statement drafts without breaking the current income-protection draft keys.
- Modify: `apps/frontend/src/documents/document-types.ts`
  - Extend document typing so pension quote/statement drafts and generated documents are distinct from income-protection quote/statement drafts.
- Create: `apps/frontend/src/pages/fact-find-page.tsx`
  - Top-level page rendering only the Fact Find surfaces.
- Create: `apps/frontend/src/pages/income-protection-documents-page.tsx`
  - Top-level page rendering only the income-protection Quote and Statement surfaces.
- Create: `apps/frontend/src/pages/pensions-page.tsx`
  - Top-level page rendering the pension Quote and Statement surfaces with the same layout pattern.
- Create: `apps/frontend/src/pages/files-docs-page.tsx`
  - Top-level page rendering the current backend files and generated-documents history surfaces together.
- Create: `apps/frontend/src/pages/workflow-page-layout.tsx`
  - Shared page wrapper for client selector, summary bar, status header, and section rendering.
- Create: `apps/frontend/src/pages/workflow-document-sections.tsx`
  - Shared renderers for Fact Find, Fact Find Update, Quote, Statement, file list, and generated-document list.
- Modify: `apps/frontend/src/app.test.tsx`
  - Update route assertions for the new top-level navigation.
- Modify: `apps/frontend/src/app-shell.test.tsx`
  - Update top-nav expectations to the five-page structure.
- Modify: `apps/frontend/src/documents/workflow-document-builders.test.ts`
  - Add coverage for any new pension document types or builder routing added by the implementation.

## Assumptions To Keep Stable During Implementation

- `Files/Docs` should show the same current client files and generated-document history that the existing Income Protection page shows today, and later include pension-generated documents once that workflow is added.
- The shared client profile remains the source of truth for person-level fields such as name, DOB, occupation, income, and contact details.
- `Fact Find` remains the shared editable data-entry surface that both downstream workflows read from when pre-filling or validating document generation.
- `Pensions` needs separate draft persistence keys even if it reuses much of the same form UI as the current Quote and Statement sections.
- Existing client profile routes such as `/clients/:clientReference/income-protection` should continue to land the user in the appropriate new workflow surface rather than breaking old links.

### Task 1: Split top-level navigation and routes without changing page design

**Files:**
- Modify: `apps/frontend/src/App.tsx`
- Modify: `apps/frontend/src/components/app-shell.tsx`
- Test: `apps/frontend/src/app.test.tsx`
- Test: `apps/frontend/src/app-shell.test.tsx`

**Interfaces:**
- Consumes:
  - `AppShell`
  - `IncomeProtectionPage`
  - `FilesPage`
  - existing `react-router-dom` route structure
- Produces:
  - routes:
    - `/clients`
    - `/fact-find`
    - `/income-protection`
    - `/pensions`
    - `/files-docs`
  - legacy redirects:
    - `/files` -> `/files-docs`
    - `/clients/:clientReference/income-protection` -> `/income-protection`
  - nav labels:
    - `Clients`
    - `Fact Find`
    - `Income Protection`
    - `Pensions`
    - `Files/Docs`

- [ ] **Step 1: Write the failing route test**

```tsx
it("renders the five top-level workflow links", async () => {
  renderAppAt("/");

  expect(await screen.findByRole("link", { name: /clients/i })).toBeInTheDocument();
  expect(screen.getByRole("link", { name: /fact find/i })).toBeInTheDocument();
  expect(screen.getByRole("link", { name: /income protection/i })).toBeInTheDocument();
  expect(screen.getByRole("link", { name: /pensions/i })).toBeInTheDocument();
  expect(screen.getByRole("link", { name: /files\/docs/i })).toBeInTheDocument();
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npm.cmd test -- --no-cache app-shell.test.tsx app.test.tsx`
Expected: FAIL because the current shell only exposes `Clients`, `Income Protection`, and `Settings`.

- [ ] **Step 3: Update navigation and routes**

```tsx
const navItems = [
  { label: "Clients", to: "/clients", icon: Users },
  { label: "Fact Find", to: "/fact-find", icon: ClipboardList },
  { label: "Income Protection", to: "/income-protection", icon: Shield },
  { label: "Pensions", to: "/pensions", icon: Landmark },
  { label: "Files/Docs", to: "/files-docs", icon: FolderOpen },
  { label: "Settings", to: "/settings", icon: Settings },
];
```

```tsx
<Route path="/" element={<Navigate replace to="/fact-find" />} />
<Route path="/fact-find" element={<FactFindPage />} />
<Route path="/income-protection" element={<IncomeProtectionDocumentsPage />} />
<Route path="/pensions" element={<PensionsPage />} />
<Route path="/files-docs" element={<FilesDocsPage />} />
<Route path="/files" element={<Navigate replace to="/files-docs" />} />
```

- [ ] **Step 4: Run tests to verify they pass**

Run: `npm.cmd test -- --no-cache app-shell.test.tsx app.test.tsx`
Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add apps/frontend/src/App.tsx apps/frontend/src/components/app-shell.tsx apps/frontend/src/app.test.tsx apps/frontend/src/app-shell.test.tsx
git commit -m "feat: split omega top navigation into five workflow pages"
```

### Task 2: Extract a shared workflow page layout from the current all-in-one Income Protection page

**Files:**
- Create: `apps/frontend/src/pages/workflow-page-layout.tsx`
- Create: `apps/frontend/src/pages/workflow-document-sections.tsx`
- Modify: `apps/frontend/src/pages/income-protection-page.tsx`
- Modify: `apps/frontend/src/pages/income-protection-helpers.tsx`
- Test: `apps/frontend/src/app.test.tsx`

**Interfaces:**
- Consumes:
  - `IncomeProtectionFilesTab`
  - `IncomeProtectionGeneratedDocumentsTab`
  - `useClientData()`
  - existing document generation handlers from `income-protection-page.tsx`
- Produces:
  - `WorkflowPageLayout(props: WorkflowPageLayoutProps): JSX.Element`
  - `WorkflowDocumentSections(props: WorkflowDocumentSectionsProps): JSX.Element`
  - `type WorkflowSectionId = "fact-find" | "fact-find-update" | "income-protection-quote" | "income-protection-statement" | "pensions-quote" | "pensions-statement" | "files" | "generated-documents"`
  - `const workflowPageSections: Record<WorkflowPageKind, WorkflowSectionId[]>`

- [ ] **Step 1: Write the failing extraction test**

```tsx
it("shows only the sections configured for the page", () => {
  render(
    <WorkflowDocumentSections
      sectionIds={["fact-find", "fact-find-update"]}
      clientReference="C-1001"
      workflowKind="fact-find"
    />,
  );

  expect(screen.getByText(/fact find form/i)).toBeInTheDocument();
  expect(screen.getByText(/fact find update form/i)).toBeInTheDocument();
  expect(screen.queryByText(/quote form/i)).not.toBeInTheDocument();
  expect(screen.queryByText(/statement form/i)).not.toBeInTheDocument();
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npm.cmd test -- --no-cache app.test.tsx`
Expected: FAIL because no shared section renderer exists yet.

- [ ] **Step 3: Extract the shared layout and section map**

```tsx
export type WorkflowPageKind =
  | "fact-find"
  | "income-protection"
  | "pensions"
  | "files-docs";

export const workflowPageSections: Record<WorkflowPageKind, WorkflowSectionId[]> = {
  "fact-find": ["fact-find", "fact-find-update"],
  "income-protection": ["income-protection-quote", "income-protection-statement"],
  pensions: ["pensions-quote", "pensions-statement"],
  "files-docs": ["files", "generated-documents"],
};
```

```tsx
export function WorkflowPageLayout({
  title,
  eyebrow,
  subtitle,
  clientReference,
  onClientChange,
  children,
}: WorkflowPageLayoutProps) {
  return (
    <div className="page-stack">
      <section className="panel">
        <div className="page-heading">
          <div>
            <p className="eyebrow">{eyebrow}</p>
            <h1>{title}</h1>
            <p className="module-subtitle">{subtitle}</p>
          </div>
        </div>
        {children}
      </section>
    </div>
  );
}
```

- [ ] **Step 4: Refactor the current all-in-one page to call the extracted renderers**

```tsx
return (
  <WorkflowPageLayout
    title="Income Protection"
    eyebrow="Module workspace"
    subtitle="Manage the selected client's quote and statement documents."
    clientReference={selectedClientReference}
    onClientChange={setSelectedClientReference}
  >
    <WorkflowDocumentSections
      sectionIds={workflowPageSections["income-protection"]}
      clientReference={selectedClientReference}
      workflowKind="income-protection"
    />
  </WorkflowPageLayout>
);
```

- [ ] **Step 5: Run focused tests**

Run: `npm.cmd test -- --no-cache app.test.tsx`
Expected: PASS with route-level rendering still intact.

- [ ] **Step 6: Commit**

```bash
git add apps/frontend/src/pages/workflow-page-layout.tsx apps/frontend/src/pages/workflow-document-sections.tsx apps/frontend/src/pages/income-protection-page.tsx apps/frontend/src/pages/income-protection-helpers.tsx apps/frontend/src/app.test.tsx
git commit -m "refactor: extract shared workflow page layout"
```

### Task 3: Create the top-level Fact Find page from the existing Fact Find and Fact Find Update surfaces

**Files:**
- Create: `apps/frontend/src/pages/fact-find-page.tsx`
- Modify: `apps/frontend/src/App.tsx`
- Modify: `apps/frontend/src/pages/income-protection-page.tsx`
- Test: `apps/frontend/src/app.test.tsx`

**Interfaces:**
- Consumes:
  - `WorkflowPageLayout`
  - `WorkflowDocumentSections`
  - `workflowPageSections["fact-find"]`
  - existing Fact Find handlers, save actions, and generation actions
- Produces:
  - `FactFindPage(): JSX.Element`
  - top-level page content limited to `Fact Find` and `Fact Find Update`

- [ ] **Step 1: Write the failing page test**

```tsx
it("renders only fact-find sections on the fact-find route", async () => {
  renderAppAt("/fact-find");

  expect(await screen.findByText(/fact find form/i)).toBeInTheDocument();
  expect(screen.getByText(/fact find update form/i)).toBeInTheDocument();
  expect(screen.queryByText(/quote form/i)).not.toBeInTheDocument();
  expect(screen.queryByText(/statement form/i)).not.toBeInTheDocument();
  expect(screen.queryByText(/generated documents/i)).not.toBeInTheDocument();
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npm.cmd test -- --no-cache app.test.tsx`
Expected: FAIL because `/fact-find` does not exist yet.

- [ ] **Step 3: Add the new page**

```tsx
export function FactFindPage() {
  return (
    <WorkflowModulePage
      pageKind="fact-find"
      title="Fact Find"
      eyebrow="Module workspace"
      subtitle="Manage the selected client's Fact Find and Fact Find Update documents."
    />
  );
}
```

- [ ] **Step 4: Reuse existing Fact Find document sections**

```tsx
case "fact-find":
  return renderFactFindSection();
case "fact-find-update":
  return renderFactFindUpdateSection();
```

- [ ] **Step 5: Run test to verify it passes**

Run: `npm.cmd test -- --no-cache app.test.tsx`
Expected: PASS

- [ ] **Step 6: Commit**

```bash
git add apps/frontend/src/pages/fact-find-page.tsx apps/frontend/src/App.tsx apps/frontend/src/pages/income-protection-page.tsx apps/frontend/src/app.test.tsx
git commit -m "feat: add top-level fact find workspace"
```

### Task 4: Create the top-level Income Protection page with only Quote and Statement

**Files:**
- Create: `apps/frontend/src/pages/income-protection-documents-page.tsx`
- Modify: `apps/frontend/src/App.tsx`
- Modify: `apps/frontend/src/pages/income-protection-page.tsx`
- Test: `apps/frontend/src/app.test.tsx`
- Test: `apps/frontend/src/documents/workflow-document-builders.test.ts`

**Interfaces:**
- Consumes:
  - `WorkflowPageLayout`
  - `WorkflowDocumentSections`
  - `workflowPageSections["income-protection"]`
  - existing Quote and Statement generation/saving/export logic
- Produces:
  - `IncomeProtectionDocumentsPage(): JSX.Element`
  - top-level page content limited to `Quote` and `Statement`

- [ ] **Step 1: Write the failing page test**

```tsx
it("renders only quote and statement on the income-protection route", async () => {
  renderAppAt("/income-protection");

  expect(await screen.findByText(/quote form/i)).toBeInTheDocument();
  expect(screen.getByText(/statement form/i)).toBeInTheDocument();
  expect(screen.queryByText(/fact find form/i)).not.toBeInTheDocument();
  expect(screen.queryByText(/generated documents/i)).not.toBeInTheDocument();
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npm.cmd test -- --no-cache app.test.tsx`
Expected: FAIL because `/income-protection` still renders the all-in-one page.

- [ ] **Step 3: Add the new top-level Income Protection page**

```tsx
export function IncomeProtectionDocumentsPage() {
  return (
    <WorkflowModulePage
      pageKind="income-protection"
      title="Income Protection"
      eyebrow="Module workspace"
      subtitle="Manage the selected client's quote and statement of suitability."
    />
  );
}
```

- [ ] **Step 4: Keep the existing Quote and Statement handlers unchanged where possible**

```tsx
case "income-protection-quote":
  return renderQuoteSection({ workflowKind: "income-protection" });
case "income-protection-statement":
  return renderStatementSection({ workflowKind: "income-protection" });
```

- [ ] **Step 5: Run focused tests**

Run: `npm.cmd test -- --no-cache app.test.tsx workflow-document-builders.test.ts`
Expected: PASS

- [ ] **Step 6: Commit**

```bash
git add apps/frontend/src/pages/income-protection-documents-page.tsx apps/frontend/src/App.tsx apps/frontend/src/pages/income-protection-page.tsx apps/frontend/src/app.test.tsx apps/frontend/src/documents/workflow-document-builders.test.ts
git commit -m "feat: split quote and statement into top-level income protection page"
```

### Task 5: Move Files and Generated Documents into a dedicated Files/Docs top-level page

**Files:**
- Create: `apps/frontend/src/pages/files-docs-page.tsx`
- Modify: `apps/frontend/src/pages/files-page.tsx`
- Modify: `apps/frontend/src/App.tsx`
- Modify: `apps/frontend/src/pages/income-protection-page.tsx`
- Modify: `apps/frontend/src/pages/income-protection-files-tab.tsx`
- Modify: `apps/frontend/src/pages/income-protection-generated-documents-tab.tsx`
- Test: `apps/frontend/src/app.test.tsx`

**Interfaces:**
- Consumes:
  - `IncomeProtectionFilesTab`
  - `IncomeProtectionGeneratedDocumentsTab`
  - `workflowPageSections["files-docs"]`
  - existing file upload/download/delete flows
  - existing generated-document download/preview/pack flows
- Produces:
  - `FilesDocsPage(): JSX.Element`
  - top-level page content limited to `Files` and `Generated Documents`

- [ ] **Step 1: Write the failing page test**

```tsx
it("renders files and generated documents on the files-docs route", async () => {
  renderAppAt("/files-docs");

  expect(await screen.findByText(/files/i)).toBeInTheDocument();
  expect(screen.getByText(/generated documents/i)).toBeInTheDocument();
  expect(screen.queryByText(/fact find form/i)).not.toBeInTheDocument();
  expect(screen.queryByText(/quote form/i)).not.toBeInTheDocument();
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npm.cmd test -- --no-cache app.test.tsx`
Expected: FAIL because `/files-docs` does not exist yet.

- [ ] **Step 3: Add the new page using the existing extracted tab components**

```tsx
export function FilesDocsPage() {
  return (
    <WorkflowModulePage
      pageKind="files-docs"
      title="Files/Docs"
      eyebrow="Client storage"
      subtitle="Manage uploaded files and generated documents for the selected client."
    />
  );
}
```

- [ ] **Step 4: Update legacy `FilesPage` links and redirects**

```tsx
<Link className="table-link" to="/files-docs">
  Open files/docs
</Link>
```

- [ ] **Step 5: Run focused tests**

Run: `npm.cmd test -- --no-cache app.test.tsx`
Expected: PASS

- [ ] **Step 6: Commit**

```bash
git add apps/frontend/src/pages/files-docs-page.tsx apps/frontend/src/pages/files-page.tsx apps/frontend/src/App.tsx apps/frontend/src/pages/income-protection-page.tsx apps/frontend/src/pages/income-protection-files-tab.tsx apps/frontend/src/pages/income-protection-generated-documents-tab.tsx apps/frontend/src/app.test.tsx
git commit -m "feat: move files and generated documents into files docs page"
```

### Task 6: Add a separate pensions workflow namespace with its own Quote and Statement

**Files:**
- Create: `apps/frontend/src/pages/pensions-page.tsx`
- Modify: `apps/frontend/src/data/client-data-context.tsx`
- Modify: `apps/frontend/src/documents/document-types.ts`
- Modify: `apps/frontend/src/pages/income-protection-page.tsx`
- Modify: `apps/frontend/src/pages/income-protection-helpers.tsx`
- Modify: `apps/frontend/src/documents/workflow-document-builders.test.ts`
- Modify: `apps/frontend/src/app.test.tsx`

**Interfaces:**
- Consumes:
  - current Quote and Statement UI sections
  - existing generated-document persistence pattern
  - current selected-client workflow behavior
- Produces:
  - additional supported document types:
    - `"Pensions Quote"`
    - `"Pensions Statement"`
  - `PensionsPage(): JSX.Element`
  - pension-specific draft helpers:
    - `getPensionsDocumentDraft(documentType: "Pensions Quote" | "Pensions Statement")`
    - `savePensionsGeneratedDraft(clientReference: string, documentType: "Pensions Quote" | "Pensions Statement", draft: Partial<GeneratedDocumentDraft>)`

- [ ] **Step 1: Write the failing type and rendering test**

```tsx
it("renders the pensions page with pension-specific quote and statement sections", async () => {
  renderAppAt("/pensions");

  expect(await screen.findByText(/quote form/i)).toBeInTheDocument();
  expect(screen.getByText(/statement form/i)).toBeInTheDocument();
  expect(screen.getByRole("heading", { name: /pensions/i })).toBeInTheDocument();
});
```

```ts
it("normalizes pension document drafts separately from income protection drafts", () => {
  const drafts = normalizeDocumentDrafts({
    Quote: { editedHtml: "<p>IP quote</p>" },
    "Pensions Quote": { editedHtml: "<p>Pension quote</p>" },
  });

  expect(drafts.Quote.editedHtml).toContain("IP quote");
  expect(drafts["Pensions Quote"].editedHtml).toContain("Pension quote");
});
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `npm.cmd test -- --no-cache app.test.tsx workflow-document-builders.test.ts`
Expected: FAIL because pension draft keys and `/pensions` route do not exist.

- [ ] **Step 3: Extend document types and client-data normalization**

```ts
export type SupportedDocumentType =
  | "Fact Find"
  | "Fact Find Update"
  | "Quote"
  | "Statement of Suitability"
  | "Pensions Quote"
  | "Pensions Statement";
```

```ts
return {
  "Fact Find": normalizeDraft(defaultDrafts["Fact Find"], documentDrafts?.["Fact Find"]),
  "Fact Find Update": normalizeDraft(defaultDrafts["Fact Find Update"], documentDrafts?.["Fact Find Update"]),
  Quote: normalizeDraft(defaultDrafts.Quote, documentDrafts?.Quote),
  "Statement of Suitability": normalizeDraft(defaultDrafts["Statement of Suitability"], documentDrafts?.["Statement of Suitability"]),
  "Pensions Quote": normalizeDraft(defaultDrafts["Pensions Quote"], documentDrafts?.["Pensions Quote"]),
  "Pensions Statement": normalizeDraft(defaultDrafts["Pensions Statement"], documentDrafts?.["Pensions Statement"]),
};
```

- [ ] **Step 4: Add the pensions page reusing the current Quote and Statement design**

```tsx
export function PensionsPage() {
  return (
    <WorkflowModulePage
      pageKind="pensions"
      title="Pensions"
      eyebrow="Module workspace"
      subtitle="Manage the selected client's pension quote and pension statement documents."
    />
  );
}
```

```tsx
case "pensions-quote":
  return renderQuoteSection({
    workflowKind: "pensions",
    documentType: "Pensions Quote",
  });
case "pensions-statement":
  return renderStatementSection({
    workflowKind: "pensions",
    documentType: "Pensions Statement",
  });
```

- [ ] **Step 5: Run focused tests**

Run: `npm.cmd test -- --no-cache app.test.tsx workflow-document-builders.test.ts`
Expected: PASS

- [ ] **Step 6: Commit**

```bash
git add apps/frontend/src/pages/pensions-page.tsx apps/frontend/src/data/client-data-context.tsx apps/frontend/src/documents/document-types.ts apps/frontend/src/pages/income-protection-page.tsx apps/frontend/src/pages/income-protection-helpers.tsx apps/frontend/src/documents/workflow-document-builders.test.ts apps/frontend/src/app.test.tsx
git commit -m "feat: add separate pensions quote and statement workflow"
```

### Task 7: Regression verification for route split, draft persistence, and document parity

**Files:**
- Modify: `apps/frontend/src/app.test.tsx`
- Modify: `apps/frontend/src/app-shell.test.tsx`
- Modify: `apps/frontend/src/documents/workflow-document-builders.test.ts`
- Modify: `apps/frontend/src/documents/pdf-export.test.ts`
- Modify: `apps/frontend/src/documents/word-export.test.ts`

**Interfaces:**
- Consumes:
  - new page routes
  - pension document types
  - shared export/document builders
- Produces:
  - regression coverage for route visibility
  - regression coverage for pension draft typing
  - regression coverage for PDF/DOCX export parity after the split

- [ ] **Step 1: Add failing regression assertions**

```ts
it.each([
  "/fact-find",
  "/income-protection",
  "/pensions",
  "/files-docs",
])("renders the selected workflow page without leaking sections from another page: %s", async (route) => {
  renderAppAt(route);
  expect(await screen.findByRole("heading", { level: 1 })).toBeInTheDocument();
});
```

```ts
it("builds export HTML for pension drafts with the same wrapper classes as income-protection drafts", () => {
  const html = buildPdfStyledHtml("<section class='workflow-document'>Example</section>");
  expect(html).toContain("workflow-document");
});
```

- [ ] **Step 2: Run tests to verify they fail where coverage is missing**

Run: `npm.cmd test -- --no-cache app.test.tsx app-shell.test.tsx workflow-document-builders.test.ts pdf-export.test.ts word-export.test.ts`
Expected: FAIL until new route expectations and pension coverage are added.

- [ ] **Step 3: Complete the regression coverage**

```ts
expect(screen.queryByText(/fact find form/i)).not.toBeInTheDocument();
expect(screen.queryByText(/quote form/i)).not.toBeInTheDocument();
expect(screen.queryByText(/generated documents/i)).not.toBeInTheDocument();
```

```ts
expect(normalizedDrafts["Pensions Quote"].generationStatus).toBe("idle");
expect(normalizedDrafts["Pensions Statement"].generationStatus).toBe("idle");
```

- [ ] **Step 4: Run the full targeted frontend test set**

Run: `npm.cmd test -- --no-cache app.test.tsx app-shell.test.tsx workflow-document-builders.test.ts pdf-export.test.ts word-export.test.ts`
Expected: PASS

- [ ] **Step 5: Run type-checking**

Run: `npx.cmd tsc --noEmit --project tsconfig.app.json`
Expected: PASS

- [ ] **Step 6: Commit**

```bash
git add apps/frontend/src/app.test.tsx apps/frontend/src/app-shell.test.tsx apps/frontend/src/documents/workflow-document-builders.test.ts apps/frontend/src/documents/pdf-export.test.ts apps/frontend/src/documents/word-export.test.ts
git commit -m "test: cover five-page workflow split and pensions parity"
```

## Risks To Watch During Execution

- The current `income-protection-page.tsx` mixes page layout, workflow state, document generation, file handling, and generated-document history; extraction errors are more likely than pure route errors.
- `Quote` currently has custom request-state handling that is different from `Statement`, so reuse must preserve those branches exactly for income protection and duplicate them carefully for pensions.
- Old links from client profile pages may still expect `/clients/:clientReference/income-protection`; those redirects should stay valid during and after the split.
- `Files/Docs` depends on backend-backed generated-document history; moving it must not accidentally fall back to stale local arrays.
- Pension drafts must not reuse the existing `Quote` or `Statement of Suitability` keys, or the two workflows will overwrite each other.
- Shared Fact Find reads must remain one-way into Income Protection and Pensions; generating or saving one downstream flow must not mutate the other downstream flow’s drafts.

## Verification Checklist

- `Clients` page is unchanged.
- `/fact-find` shows only Fact Find and Fact Find Update.
- `/income-protection` shows only Quote and Statement.
- `/pensions` shows only pension Quote and pension Statement.
- `/files-docs` shows only Files and Generated Documents.
- Fact Find changes are available to both downstream workflows as shared source information.
- Income Protection and Pensions keep separate drafts, statuses, generated documents, and exports.
- Existing styling, page shell, summary bar, editor, preview, and export look the same as before.
- Saving and reopening a client preserves both income-protection drafts and pension drafts independently.
- Generated documents still download and export correctly from the new pages.

## Self-Review

- Spec coverage: all five requested top pages are mapped to explicit tasks; the user’s “same design and layout” constraint and the explicit “shared Fact Find, separate downstream flows” rule are carried through the architecture and global constraints.
- Placeholder scan: no `TODO`, `TBD`, or “write tests later” placeholders remain.
- Type consistency: the plan uses one workflow-page model and one pension draft naming scheme consistently: `Pensions Quote` and `Pensions Statement`.

## Execution Handoff

Plan complete and saved to `docs/superpowers/plans/2026-07-17-five-top-pages-workflow-split.md`. Two execution options:

**1. Subagent-Driven (recommended)** - I dispatch a fresh subagent per task, review between tasks, fast iteration

**2. Inline Execution** - Execute tasks in this session using executing-plans, batch execution with checkpoints

Which approach?
