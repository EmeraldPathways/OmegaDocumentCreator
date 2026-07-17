# Statement Policy Picker Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace the current top section of the Statement of Suitability form with only a Statement date field and a quote-derived policy picker, then make Statement generation use the selected quote row instead of the first returned quote row.

**Architecture:** Keep the existing Statement page layout and document-generation flow intact. Add one small shared frontend helper for quote-option building and selected-quote lookup, persist a `statementSelectedQuoteKey` on the workflow profile, wire the Statement form to that key, and update the Statement composer to resolve provider/premium/policy data from the selected quote instead of `quotes[0]`.

**Tech Stack:** React 18, TypeScript, Vitest, existing frontend workflow state in `income-protection-page.tsx`, existing Statement document composition in `document-composer.ts`

## Global Constraints

- Branch name must remain `statement-update-v2`.
- Preserve existing document workspace patterns; no redesign of the Statement page outside the top section.
- The top Statement section must contain only the Statement date field and the policy picker.
- The policy picker options must be pulled from returned quote data already stored in `integrationRequests`.
- Do not add dependencies.
- Keep the diff surgical and frontend-only unless investigation during implementation proves a backend change is unavoidable.

---

## File Structure

- Create: `apps/frontend/src/documents/statement-quote-selection.ts`
  Responsibility: shared quote option/key helpers used by both the Statement form and Statement composer.
- Create: `apps/frontend/src/documents/statement-quote-selection.test.ts`
  Responsibility: focused unit coverage for quote-option generation and selected-quote resolution.
- Modify: `apps/frontend/src/data/seeded-clients.ts`
  Responsibility: add the persisted `statementSelectedQuoteKey` field to the seeded workflow profile type and defaults.
- Modify: `apps/frontend/src/pages/client-form-page.tsx`
  Responsibility: initialize the new `statementSelectedQuoteKey` field for new client drafts.
- Modify: `apps/frontend/src/pages/income-protection-page.tsx`
  Responsibility: replace the top Statement form section with date + policy picker, derive picker options from Quote/Statement integration requests, and persist the selected key.
- Modify: `apps/frontend/src/documents/document-composer.ts`
  Responsibility: use the persisted selected quote key to choose the quote row that drives Statement recommendation text and pricing.
- Modify: `apps/frontend/src/documents/workflow-document-builders.test.ts`
  Responsibility: regression coverage proving Statement generation honors the selected policy instead of the first quote row.

## Task 1: Add Shared Statement Quote Selection Helpers

**Files:**
- Create: `apps/frontend/src/documents/statement-quote-selection.ts`
- Test: `apps/frontend/src/documents/statement-quote-selection.test.ts`

**Interfaces:**
- Consumes: `IntegrationRequestArtifact`, `IntegrationQuoteResult` from `apps/frontend/src/documents/document-types.ts`
- Produces:
  - `type StatementQuoteOption = { key: string; label: string; providerName: string; policyType: string; levelPremium: string; requestIndex: number; quoteIndex: number }`
  - `function buildStatementQuoteOptions(requests: IntegrationRequestArtifact[]): StatementQuoteOption[]`
  - `function findStatementQuoteOption(requests: IntegrationRequestArtifact[], selectedKey: string | undefined): StatementQuoteOption | null`
  - `function buildStatementQuoteKey(requestIndex: number, quoteIndex: number, quote: IntegrationQuoteResult): string`

- [ ] **Step 1: Write the failing test**

```ts
import { describe, expect, it } from "vitest";

import type { IntegrationRequestArtifact } from "./document-types";
import {
  buildStatementQuoteKey,
  buildStatementQuoteOptions,
  findStatementQuoteOption,
} from "./statement-quote-selection";

const requests: IntegrationRequestArtifact[] = [
  {
    provider: "BestAdvice",
    requestType: "Phi",
    status: "sent",
    requestedAt: "2026-07-15T09:00:00+00:00",
    requestFields: [],
    quoteResults: [
      { providerName: "Aviva", policyType: "Reviewable", levelPremium: "177.74" },
      { providerName: "Irish Life", policyType: "Reviewable", levelPremium: "165.00" },
    ],
    errors: [],
  },
];

describe("statement quote selection helpers", () => {
  it("builds stable policy-picker options from returned quote rows", () => {
    const options = buildStatementQuoteOptions(requests);

    expect(options).toEqual([
      expect.objectContaining({
        key: buildStatementQuoteKey(0, 0, requests[0].quoteResults[0]),
        label: "Aviva | Reviewable | €177.74",
      }),
      expect.objectContaining({
        key: buildStatementQuoteKey(0, 1, requests[0].quoteResults[1]),
        label: "Irish Life | Reviewable | €165.00",
      }),
    ]);
  });

  it("returns the selected quote option by persisted key", () => {
    const selectedKey = buildStatementQuoteKey(0, 1, requests[0].quoteResults[1]);

    const selected = findStatementQuoteOption(requests, selectedKey);

    expect(selected).toEqual(
      expect.objectContaining({
        key: selectedKey,
        providerName: "Irish Life",
        policyType: "Reviewable",
        levelPremium: "165.00",
      }),
    );
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npm.cmd test -- src/documents/statement-quote-selection.test.ts`
Expected: FAIL with module-not-found or exported symbol errors for `statement-quote-selection.ts`

- [ ] **Step 3: Write minimal implementation**

```ts
import type { IntegrationQuoteResult, IntegrationRequestArtifact } from "./document-types";

export type StatementQuoteOption = {
  key: string;
  label: string;
  providerName: string;
  policyType: string;
  levelPremium: string;
  requestIndex: number;
  quoteIndex: number;
};

function formatEuroLabel(value: string | undefined) {
  const normalized = value?.trim() ?? "";
  return normalized ? `€${Number(normalized).toFixed(2)}` : "No premium";
}

export function buildStatementQuoteKey(
  requestIndex: number,
  quoteIndex: number,
  quote: IntegrationQuoteResult,
) {
  return [
    requestIndex,
    quoteIndex,
    quote.providerName?.trim() ?? "",
    quote.policyType?.trim() ?? "",
    quote.levelPremium?.trim() ?? "",
  ].join("::");
}

export function buildStatementQuoteOptions(requests: IntegrationRequestArtifact[]): StatementQuoteOption[] {
  return requests.flatMap((request, requestIndex) =>
    request.quoteResults.map((quote, quoteIndex) => ({
      key: buildStatementQuoteKey(requestIndex, quoteIndex, quote),
      label: [
        quote.providerName?.trim() || "Unknown provider",
        quote.policyType?.trim() || "Unspecified policy",
        formatEuroLabel(quote.levelPremium),
      ].join(" | "),
      providerName: quote.providerName?.trim() ?? "",
      policyType: quote.policyType?.trim() ?? "",
      levelPremium: quote.levelPremium?.trim() ?? "",
      requestIndex,
      quoteIndex,
    })),
  );
}

export function findStatementQuoteOption(
  requests: IntegrationRequestArtifact[],
  selectedKey: string | undefined,
) {
  if (!selectedKey) {
    return null;
  }

  return buildStatementQuoteOptions(requests).find((option) => option.key === selectedKey) ?? null;
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npm.cmd test -- src/documents/statement-quote-selection.test.ts`
Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add apps/frontend/src/documents/statement-quote-selection.ts apps/frontend/src/documents/statement-quote-selection.test.ts
git commit -m "feat: add statement quote selection helpers"
```

### Task 2: Persist the Selected Statement Policy Key in Workflow State

**Files:**
- Modify: `apps/frontend/src/data/seeded-clients.ts`
- Modify: `apps/frontend/src/pages/client-form-page.tsx`
- Test: `apps/frontend/src/documents/statement-quote-selection.test.ts`

**Interfaces:**
- Consumes: existing `SeededClientProfile` and client creation defaults
- Produces:
  - `SeededClientProfile["statementSelectedQuoteKey"]: string`
  - default empty value for new and seeded profiles

- [ ] **Step 1: Write the failing test**

Add this test case to `apps/frontend/src/documents/statement-quote-selection.test.ts`:

```ts
import { getSeededClientProfile } from "../data/seeded-clients";

it("initializes the statement selected quote key on seeded profiles", () => {
  const profile = getSeededClientProfile("CLI-2026-0002");

  expect(profile.statementSelectedQuoteKey).toBeTypeOf("string");
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npm.cmd test -- src/documents/statement-quote-selection.test.ts`
Expected: FAIL with TypeScript or property access errors for `statementSelectedQuoteKey`

- [ ] **Step 3: Write minimal implementation**

Update `apps/frontend/src/data/seeded-clients.ts`:

```ts
export type SeededClientProfile = {
  // existing fields...
  requestCompanyName: string;
  requestPolicies: string;
  requestLetterDate: string;
  statementSelectedQuoteKey: string;
  documentDrafts: Record<SupportedDocumentType, GeneratedDocumentDraft>;
  // existing fields...
};
```

Add the default value on seeded records:

```ts
statementSelectedQuoteKey: "",
```

Update `apps/frontend/src/pages/client-form-page.tsx` client defaults:

```ts
requestCompanyName: "",
requestPolicies: "",
requestLetterDate: "",
statementSelectedQuoteKey: "",
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npm.cmd test -- src/documents/statement-quote-selection.test.ts`
Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add apps/frontend/src/data/seeded-clients.ts apps/frontend/src/pages/client-form-page.tsx apps/frontend/src/documents/statement-quote-selection.test.ts
git commit -m "feat: persist statement selected quote key"
```

### Task 3: Replace the Top Statement Section With Date + Policy Picker

**Files:**
- Modify: `apps/frontend/src/pages/income-protection-page.tsx`
- Modify: `apps/frontend/src/documents/statement-quote-selection.ts`
- Test: `apps/frontend/src/app.test.tsx`

**Interfaces:**
- Consumes:
  - `buildStatementQuoteOptions(requests)`
  - `statementSelectedQuoteKey: string`
  - Statement form `updateField(...)`
- Produces:
  - a Statement top section containing only `letterDate` and `statementSelectedQuoteKey`
  - automatic defaulting to the first available quote option when the stored key is blank or stale

- [ ] **Step 1: Write the failing test**

Add this test to `apps/frontend/src/app.test.tsx`:

```ts
it("shows only statement date and a quote-derived policy picker in the statement top section", async () => {
  renderApp();

  fireEvent.click(screen.getByText("Statement of Suitability"));

  expect(screen.getByLabelText(/Letter date/i)).toBeInTheDocument();
  expect(screen.getByLabelText(/Policy picker/i)).toBeInTheDocument();
  expect(screen.queryByLabelText(/Statement type/i)).not.toBeInTheDocument();
  expect(screen.queryByLabelText(/Product type/i)).not.toBeInTheDocument();
  expect(screen.queryByLabelText(/Advisor name/i)).not.toBeInTheDocument();
  expect(screen.getByText(/Irish Life/i)).toBeInTheDocument();
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npm.cmd test -- src/app.test.tsx -t "shows only statement date and a quote-derived policy picker in the statement top section"`
Expected: FAIL because the old fields still render and the new picker does not exist

- [ ] **Step 3: Write minimal implementation**

Add a local helper near the top of `apps/frontend/src/pages/income-protection-page.tsx`:

```ts
function getStatementQuoteRequests(profile: SeededClientProfile) {
  const quoteRequests = profile.documentDrafts["Quote"]?.integrationRequests ?? [];
  const statementRequests = profile.documentDrafts["Statement of Suitability"]?.integrationRequests ?? [];
  return quoteRequests.length > 0 ? quoteRequests : statementRequests;
}
```

Inside the Statement tab render branch:

```tsx
const statementQuoteRequests = getStatementQuoteRequests(resolvedDraft);
const statementQuoteOptions = buildStatementQuoteOptions(statementQuoteRequests);
const hasStatementQuoteOptions = statementQuoteOptions.length > 0;
const selectedStatementQuoteKey =
  statementQuoteOptions.some((option) => option.key === resolvedDraft.statementSelectedQuoteKey)
    ? resolvedDraft.statementSelectedQuoteKey
    : (statementQuoteOptions[0]?.key ?? "");
```

Replace the top form section with:

```tsx
<section className="form-section">
  <h3 className="form-section-title">Statement basics</h3>
  <div className="form-grid">
    <Input
      id="sos-letterDate"
      label={requiredLabel("Statement date")}
      onChange={(event) => updateField("letterDate", event.target.value)}
      type="date"
      value={resolvedDraft.letterDate}
    />
    <Select
      id="sos-statementSelectedQuoteKey"
      label={requiredLabel("Policy picker")}
      onChange={(event) => updateField("statementSelectedQuoteKey", event.target.value)}
      options={
        hasStatementQuoteOptions
          ? statementQuoteOptions.map((option) => ({ label: option.label, value: option.key }))
          : [{ label: "Generate a quote first", value: "" }]
      }
      value={selectedStatementQuoteKey}
    />
  </div>
</section>
```

Add a small effect near the other local state syncing:

```ts
useEffect(() => {
  if (activeTab.id !== "statement-of-suitability") return;
  if (!statementQuoteOptions.length) return;
  if (resolvedDraft.statementSelectedQuoteKey && statementQuoteOptions.some((option) => option.key === resolvedDraft.statementSelectedQuoteKey)) {
    return;
  }
  updateField("statementSelectedQuoteKey", statementQuoteOptions[0].key);
}, [activeTab.id, resolvedDraft.statementSelectedQuoteKey, statementQuoteOptions, updateField]);
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npm.cmd test -- src/app.test.tsx -t "shows only statement date and a quote-derived policy picker in the statement top section"`
Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add apps/frontend/src/pages/income-protection-page.tsx apps/frontend/src/app.test.tsx apps/frontend/src/documents/statement-quote-selection.ts
git commit -m "feat: replace statement header fields with policy picker"
```

### Task 4: Make Statement Composition Use the Selected Policy

**Files:**
- Modify: `apps/frontend/src/documents/document-composer.ts`
- Modify: `apps/frontend/src/documents/statement-quote-selection.ts`
- Test: `apps/frontend/src/documents/workflow-document-builders.test.ts`

**Interfaces:**
- Consumes:
  - `statementSelectedQuoteKey: string`
  - `buildStatementQuoteOptions(requests)`
  - existing Statement recommendation builders
- Produces:
  - `findSelectedQuote(profile, requests)` that honors the selected picker value first
  - Statement recommendation/provider/premium text sourced from the picked quote row

- [ ] **Step 1: Write the failing test**

Add this test to `apps/frontend/src/documents/workflow-document-builders.test.ts`:

```ts
it("uses the picked quote row for statement recommendation pricing", () => {
  const profile = cloneProfile("CLI-2026-0002");
  profile.documentDrafts["Statement of Suitability"].lastGeneratedSections = [];
  profile.statementSelectedQuoteKey = "0::1::Irish Life::Reviewable::165.00";
  profile.recommendedCover = "55000";
  profile.deferredPeriod = "26";
  profile.coverAge = "65";
  profile.premium = "132.00";
  profile.netMonthlyCost = "79.20";
  profile.income = "60000";
  profile.documentDrafts["Quote"].integrationRequests = [
    {
      provider: "BestAdvice",
      requestType: "Phi",
      status: "sent",
      requestedAt: "2026-07-15T09:00:00+00:00",
      requestFields: [
        { label: "AnnualAmount", value: "55000" },
        { label: "DeferredPeriod", value: "26" },
        { label: "NRA", value: "65" },
      ],
      quoteResults: [
        { providerName: "Aviva", policyType: "Reviewable", levelPremium: "177.74" },
        { providerName: "Irish Life", policyType: "Reviewable", levelPremium: "165.00" },
      ],
      errors: [],
    },
  ];

  const document = buildWorkflowDocument(profile, "Statement of Suitability");

  expect(document.html).toContain("Irish Life");
  expect(document.html).toContain("165.00 per month before tax relief");
  expect(document.html).toContain("The gross cost of this 26 deferred period plan is €165.00");
  expect(document.html).not.toContain("177.74");
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npm.cmd test -- src/documents/workflow-document-builders.test.ts -t "uses the picked quote row for statement recommendation pricing"`
Expected: FAIL because `findSelectedQuote()` still returns the first quote row

- [ ] **Step 3: Write minimal implementation**

Update `findSelectedQuote()` in `apps/frontend/src/documents/document-composer.ts`:

```ts
import { buildStatementQuoteOptions } from "./statement-quote-selection";

function findSelectedQuote(profile: SeededClientProfile, requests: IntegrationRequestArtifact[]) {
  const options = buildStatementQuoteOptions(requests);
  const selectedOption = options.find((option) => option.key === profile.statementSelectedQuoteKey);

  if (selectedOption) {
    return requests[selectedOption.requestIndex]?.quoteResults[selectedOption.quoteIndex] ?? null;
  }

  const firstQuoteWithPremium = requests
    .flatMap((request) => request.quoteResults)
    .find((quote) => (quote.levelPremium?.trim() ?? "").length > 0);

  return firstQuoteWithPremium ?? null;
}
```

Do not change the rest of the recommendation builder in this task unless required by the failing test.

- [ ] **Step 4: Run test to verify it passes**

Run: `npm.cmd test -- src/documents/workflow-document-builders.test.ts -t "uses the picked quote row for statement recommendation pricing"`
Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add apps/frontend/src/documents/document-composer.ts apps/frontend/src/documents/workflow-document-builders.test.ts apps/frontend/src/documents/statement-quote-selection.ts
git commit -m "feat: drive statement recommendation from picked quote"
```

### Task 5: Regression Sweep for Statement Form and Quote Selection

**Files:**
- Modify: `apps/frontend/src/app.test.tsx`
- Modify: `apps/frontend/src/documents/workflow-document-builders.test.ts`
- Test: `apps/frontend/src/documents/statement-quote-selection.test.ts`

**Interfaces:**
- Consumes: all prior task outputs
- Produces: final regression coverage for policy picker rendering, selected quote persistence, and Statement recommendation pricing

- [ ] **Step 1: Write the failing regression additions**

Add one extra app-level test to `apps/frontend/src/app.test.tsx`:

```ts
it("persists the selected statement policy key when the user changes the policy picker", async () => {
  renderApp();

  fireEvent.click(screen.getByText("Statement of Suitability"));
  fireEvent.change(screen.getByLabelText(/Policy picker/i), {
    target: { value: "0::1::Irish Life::Reviewable::165.00" },
  });

  await waitFor(() => {
    const storedClients = JSON.parse(localStorage.getItem("omega-client-records") ?? "{}");
    expect(storedClients["CLI-2026-0002"]?.statementSelectedQuoteKey).toBe("0::1::Irish Life::Reviewable::165.00");
  });
});
```

- [ ] **Step 2: Run tests to verify the new regression fails if wiring is incomplete**

Run: `npm.cmd test -- src/app.test.tsx -t "persists the selected statement policy key when the user changes the policy picker"`
Expected: FAIL until the picker is fully bound into persisted workflow state

- [ ] **Step 3: Write minimal implementation adjustments**

If the regression still fails after Tasks 1-4, limit changes to:

```ts
// ensure updateField("statementSelectedQuoteKey", value) is used by the Select
// ensure merge/persist workflow paths do not drop the new field
// ensure the picker value is derived from the stored key after rerender
```

No new abstractions beyond the helper file from Task 1.

- [ ] **Step 4: Run the final focused regression suite**

Run:

```bash
npm.cmd test -- src/documents/statement-quote-selection.test.ts
npm.cmd test -- src/documents/workflow-document-builders.test.ts -t "uses the picked quote row for statement recommendation pricing"
npm.cmd test -- src/app.test.tsx -t "shows only statement date and a quote-derived policy picker in the statement top section"
npm.cmd test -- src/app.test.tsx -t "persists the selected statement policy key when the user changes the policy picker"
```

Expected: PASS for all targeted tests

- [ ] **Step 5: Commit**

```bash
git add apps/frontend/src/app.test.tsx apps/frontend/src/documents/workflow-document-builders.test.ts apps/frontend/src/documents/statement-quote-selection.test.ts apps/frontend/src/pages/income-protection-page.tsx apps/frontend/src/documents/document-composer.ts apps/frontend/src/data/seeded-clients.ts apps/frontend/src/pages/client-form-page.tsx
git commit -m "test: cover statement policy picker flow"
```
