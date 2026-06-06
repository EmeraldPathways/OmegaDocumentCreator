# Income Protection Shell Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add a client-bound Income Protection shell route with shared client summary details and six placeholder workflow tabs.

**Architecture:** Keep Stage 4 frontend-only and reuse the existing seeded client scaffold. Extract seeded client data into a focused shared module, add one new page for the Income Protection shell, wire a client-specific route, and cover the route with small render tests.

**Tech Stack:** React, TypeScript, React Router, Vitest, Testing Library, CSS

---

### Task 1: Create the failing route tests

**Files:**
- Modify: `apps/frontend/src/app.test.tsx`
- Test: `apps/frontend/src/app.test.tsx`

- [ ] **Step 1: Write the failing test**

```tsx
it("renders the income protection shell for a selected client route", () => {
  render(
    <MemoryRouter initialEntries={["/clients/CLI-2026-0002/income-protection"]}>
      <App />
    </MemoryRouter>,
  );

  expect(screen.getByRole("heading", { name: "Income Protection" })).toBeInTheDocument();
  expect(screen.getByText("Jamie Murphy")).toBeInTheDocument();
  expect(screen.getByText("CLI-2026-0002")).toBeInTheDocument();
});

it("renders the Stage 4 tab labels", () => {
  render(
    <MemoryRouter initialEntries={["/clients/CLI-2026-0002/income-protection"]}>
      <App />
    </MemoryRouter>,
  );

  expect(screen.getByRole("tab", { name: "Client Details" })).toBeInTheDocument();
  expect(screen.getByRole("tab", { name: "Fact Find" })).toBeInTheDocument();
  expect(screen.getByRole("tab", { name: "Terms of Business" })).toBeInTheDocument();
  expect(screen.getByRole("tab", { name: "Statement of Suitability" })).toBeInTheDocument();
  expect(screen.getByRole("tab", { name: "Files" })).toBeInTheDocument();
  expect(screen.getByRole("tab", { name: "Generated Documents" })).toBeInTheDocument();
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `cd "apps/frontend"; npm.cmd test -- --run src/app.test.tsx`
Expected: FAIL because `/clients/:clientReference/income-protection` is not routed yet

### Task 2: Add shared client scaffold data and the new page

**Files:**
- Create: `apps/frontend/src/data/seeded-clients.ts`
- Create: `apps/frontend/src/pages/income-protection-page.tsx`
- Modify: `apps/frontend/src/pages/client-profile-page.tsx`
- Modify: `apps/frontend/src/pages/client-form-page.tsx`
- Modify: `apps/frontend/src/App.tsx`

- [ ] **Step 1: Write minimal shared scaffold data**

```ts
export const seededClientProfiles = {
  "CLI-2026-0001": {
    clientReference: "CLI-2026-0001",
    fullName: "Test Client",
    status: "Draft",
    title: "Mr",
    email: "test.client@example.com",
    mobileNumber: "0870000001",
    workPhone: "",
    dateOfBirth: "1985-04-12",
    maritalStatus: "Married",
    createdBy: "Omega Admin",
    updatedBy: "Omega Admin",
    townCity: "Dublin",
    county: "Dublin",
    partnerName: "Taylor Client",
    dependants: [],
  },
};
```

- [ ] **Step 2: Add the shell route and page**

```tsx
<Route
  path="/clients/:clientReference/income-protection"
  element={<IncomeProtectionPage />}
/>
```

- [ ] **Step 3: Add a client profile action into the shell**

```tsx
<Link
  className="primary-action action-link"
  to={`/clients/${client.clientReference}/income-protection`}
>
  Open Income Protection
</Link>
```

- [ ] **Step 4: Run tests to verify they pass**

Run: `cd "apps/frontend"; npm.cmd test -- --run src/app.test.tsx`
Expected: PASS

### Task 3: Add minimal shell styling and run the frontend suite

**Files:**
- Modify: `apps/frontend/src/styles.css`
- Test: `apps/frontend/src/app.test.tsx`

- [ ] **Step 1: Add focused CSS for summary cards, tabs, and placeholder panel**

```css
.module-tab-list {
  display: flex;
  flex-wrap: wrap;
  gap: 10px;
}
```

- [ ] **Step 2: Run the full frontend test suite**

Run: `cd "apps/frontend"; npm.cmd test`
Expected: PASS
