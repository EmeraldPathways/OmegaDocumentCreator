# Fact Find Accordion Consolidation Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Reduce the number of Fact Find accordions in `Fact Find Small` and `Fact Find All` by regrouping related sections without changing fields, document scope, or generation behavior.

**Architecture:** Keep the existing `IncomeProtectionPage` as the single source of truth for Fact Find rendering. Change only the Fact Find accordion grouping, then realign the required-field navigation and progress metadata to the new section ids so validation and guided navigation still work.

**Tech Stack:** React, TypeScript, existing in-file accordion state helpers, existing UI components

## Global Constraints

- Preserve the current fields and business logic; this is a regrouping change, not a content redesign.
- Touch only the Fact Find rendering and its directly related navigation/progress wiring in `apps/frontend/src/pages/income-protection-page.tsx`.
- Keep `Fact Find Small` and `Fact Find All` on the same data model and conditional-rendering approach.
- Do not change backend APIs, document composition, or non-Fact-Find tabs.

---

### Task 1: Save the regrouping map

**Files:**
- Modify: `apps/frontend/src/pages/income-protection-page.tsx`

**Interfaces:**
- Consumes: existing Fact Find accordion ids, generation requirement targets, and section progress items
- Produces: new Fact Find section ids `client-profile`, `income-protection`, `financial-position`, `pension-arrangements`, `advice-context`, `declarations-consent`, and `authorisation-sign-off`

- [ ] **Step 1: Map the target accordion structure**

```ts
const factFindSections = {
  clientProfile: ["services-requested", "personal-details", "employment-details"],
  incomeProtection: ["income-protection"],
  financialPosition: ["assets-liabilities", "savings-investments", "life-insurance"],
  pensionArrangements: ["pension-self", "pension-partner"],
  adviceContext: ["additional-info", "business-source"],
  declarationsConsent: ["client-declarations", "marketing-preferences", "pep", "recommendation-acknowledgement"],
  authorisationSignOff: ["signatures", "request-for-information"],
} as const;
```

- [ ] **Step 2: Keep the mode split explicit**

```ts
const showExtendedFactFindSections = factFindType !== "small";
```

- [ ] **Step 3: Preserve conditional partner rendering inside the merged sections**

```tsx
{showPartnerFields ? <section>...</section> : null}
```

### Task 2: Realign validation and progress metadata

**Files:**
- Modify: `apps/frontend/src/pages/income-protection-page.tsx`

**Interfaces:**
- Consumes: `factFindGenerationRequirements`, `factFindSectionProgressItems`, `surfaceRequirementErrors()`
- Produces: navigation targets and progress cards that open the merged sections instead of removed accordion ids

- [ ] **Step 1: Point required Fact Find fields at the merged client profile section**

```ts
target: { tabId: "fact-find", sectionId: "client-profile", fieldId: "ff-fullName" }
```

- [ ] **Step 2: Collapse required progress into the merged sections**

```ts
{
  id: "client-profile",
  title: "Client profile",
  completeCount: 8,
  requiredCount: 8,
  complete: true,
}
```

- [ ] **Step 3: Keep the income protection progress item intact**

```ts
{
  id: "income-protection",
  title: "Income protection",
  completeCount: 3,
  requiredCount: 3,
  complete: true,
}
```

### Task 3: Regroup the Fact Find JSX

**Files:**
- Modify: `apps/frontend/src/pages/income-protection-page.tsx`

**Interfaces:**
- Consumes: existing Fact Find field render helpers and accordion state
- Produces: fewer Fact Find accordions with unchanged field content

- [ ] **Step 1: Merge setup fields into `Client Profile`**

```tsx
<AccordionItem id="client-profile" title="Client Profile">
  {/* Services Requested */}
  {/* Personal Details */}
  {/* Employment Details */}
</AccordionItem>
```

- [ ] **Step 2: Merge the extended financial-history panels for `Fact Find All`**

```tsx
{showExtendedFactFindSections ? (
  <AccordionItem id="financial-position" title="Financial Position">
    {/* Assets & Liabilities */}
    {/* Savings & Investments */}
    {/* Life Insurance & Serious Illness */}
  </AccordionItem>
) : null}
```

- [ ] **Step 3: Merge pension sections for `Fact Find All`**

```tsx
{showExtendedFactFindSections ? (
  <AccordionItem id="pension-arrangements" title="Pension Arrangements">
    {renderPensionSection("self")}
    {showPartnerFields ? renderPensionSection("partner") : null}
  </AccordionItem>
) : null}
```

- [ ] **Step 4: Merge narrative and compliance tail sections**

```tsx
<AccordionItem id="advice-context" title="Advice Context">...</AccordionItem>
<AccordionItem id="declarations-consent" title="Declarations & Consent">...</AccordionItem>
<AccordionItem id="authorisation-sign-off" title="Authorisation & Sign-off">...</AccordionItem>
```

### Task 4: Verify the surgical change

**Files:**
- Modify: `apps/frontend/src/pages/income-protection-page.tsx`

**Interfaces:**
- Consumes: local TypeScript build
- Produces: confidence that the regrouping compiles and did not break required-field references

- [ ] **Step 1: Run a focused typecheck**

```bash
npx.cmd tsc --noEmit
```

- [ ] **Step 2: Review the Fact Find diff for scope control**

```bash
git diff -- apps/frontend/src/pages/income-protection-page.tsx docs/superpowers/plans/2026-07-30-fact-find-accordion-consolidation.md
```

- [ ] **Step 3: Confirm unchanged scope**

```text
Expect: only Fact Find accordion grouping, section ids, and plan file changed.
```
