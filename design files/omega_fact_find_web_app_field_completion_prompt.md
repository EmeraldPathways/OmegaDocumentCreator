# Omega Fact Find Web App Field Completion Prompt

## Agent Prompt: Complete Omega Fact Find Web App Form Fields

You are working on the Omega Financial Management internal web app. The task is to compare the printed **Financial Health Check / Fact Find** form screenshots against the current web app screenshot and update the web app form so that **every field, checkbox, text box, date field, currency field, textarea, and declaration option from the printed form exists in the web app**.

The printed form screenshots are the source of truth. The current web app already contains some sections, but several fields are missing or incomplete.

---

## Main Objective

Update the **Income Protection → Fact Find Draft** web app form so it fully reflects the printed Omega **Financial Health Check** form.

The web app must include all printed form sections:

1. Services Requested
2. Personal Details
3. Employment Details
4. Income Protection
5. Assets & Liabilities
6. Pension Arrangements — Self
7. Pension Arrangements — Partner
8. Life Insurance & Serious Illness
9. Savings & Investments
10. Additional Relevant Information
11. Client Declarations
12. Data Protection & Marketing Preferences
13. PEP Confirmation
14. Business Source
15. Signatures
16. Request for Information

Keep the current web app layout, accordion/card structure, spacing style, fonts, and existing save/generate workflow unless a small field-mapping change is required.

---

## Safety Rules

### Do Not Change Unrelated Functionality

Do **not** modify:

- Authentication
- Client selection logic
- Routing
- Navigation
- Document generation logic, except where required to map new fields
- Existing save/load behaviour, except to include the new form fields
- Existing client data
- Existing backend endpoints unless absolutely required for field persistence
- Any non-Fact-Find forms such as Statement of Suitability, Files, or Generated Documents

### Work Surgically

Only edit files directly responsible for:

- Fact Find form UI
- Fact Find form data model/types
- Fact Find default values
- Fact Find save/load mapping
- Fact Find validation if already present

Do not refactor unrelated components.

### Preserve Existing Behaviour

The existing fields currently visible in the web app must continue to work.

After changes:

- Save should still work
- Existing data should not disappear
- Generated Output panel should still open
- No console errors
- No TypeScript errors
- No layout-breaking overflow

---

# Required Field Inventory

## 1. Services Requested

Add a section at the top of the Fact Find form.

Include checkboxes for:

- Life Protection
- Income Protection
- Savings & Protection
- Pension Planning

Also include the explanatory text from the print form as static helper text:

> The purpose of this review is to ensure that the plans in place will meet the needs of you and your dependants into the future. If you have a particular area of concern on which you wish to focus, we can limit or review that particular area.

---

## 2. Personal Details

The current web app has partial personal details. Expand it to match the print form.

### Client / Self Fields

Add or confirm these fields exist:

- Name
- Home Address
  - Address line 1
  - Address line 2
  - Address line 3
  - Address line 4, if needed
- Work Address
  - Address line 1
  - Address line 2
  - Address line 3
  - Address line 4, if needed
- Date of Birth
- Home / Mobile
- Work Phone
- Email

### Partner Fields

Add or confirm these fields exist:

- Marital Status
- Partner Name
- Partner Date of Birth
- Partner Address
  - Address line 1
  - Address line 2
  - Address line 3
  - Address line 4, if needed
- Partner Home / Mobile
- Partner Work Phone
- Partner Email
- Dependants

Use the existing two-column layout where possible.

---

## 3. Employment Details

Add or confirm these fields:

- Occupation
- Income / Salary
- Employment status:
  - Employed checkbox
  - Self Employed checkbox

The printed form uses checkboxes. In the web app, this may be implemented as checkbox buttons or a dropdown, but the available options must clearly match the print form.

---

## 4. Income Protection

The current web app already has an Income Protection section, but it is incomplete. Split it into two clear subsections.

### 4A. Income Protection with No Deferred Period

Fields required:

- Provider
- Provider option checkboxes:
  - Dentist Provident
  - Dentist & General
  - Other
- Current Weekly Cover
- Monthly Premium
- Cover to Age:
  - 60 checkbox
  - 65 checkbox

### 4B. Income Protection with Deferred Period

Fields required:

- Provider
- Provider option checkboxes:
  - Friends First
  - Irish Life
  - Other
- Deferred Period:
  - 13 Weeks checkbox
  - 26 Weeks checkbox
  - 52 Weeks checkbox
- Current Weekly Cover
- Monthly Premium
- Cover to Age:
  - 60 checkbox
  - 65 checkbox

Use currency inputs where appropriate.

---

## 5. Assets & Liabilities

This section is missing from the web app and must be added.

### 5A. Assets

Create an Assets subsection with rows for:

- Home
- Land / Property
- Bank / Build Soc
- Credit Union

Each row must have:

- Self value
- Partner value

Use currency fields.

Recommended structure:

| Asset | Self | Partner |
|---|---:|---:|
| Home | € | € |
| Land / Property | € | € |
| Bank / Build Soc | € | € |
| Credit Union | € | € |

### 5B. Liabilities

Create a Liabilities subsection with rows for:

- Mortgage
- Car Loan
- Other Loan Payments
- Others

Each row should support:

- Amount
- Monthly Repayments
- Bank / Mortgage Provider
- Balance Outstanding

Use currency fields for amount, monthly repayments, and balance outstanding.

For **Others**, include a large details textarea with helper text:

> Please give details — utilities & household bills, transport & travel, living costs.

### 5C. Total Liabilities Per Month

Add fields:

- Self
- Partner
- Joint

Use currency inputs.

### 5D. Other Insurance Cover for Liabilities

Add question:

> Are your liabilities covered by any other insurance?

Options:

- Yes checkbox
- No checkbox

Add conditional or always-visible textarea:

> If yes, please provide details.

---

## 6. Pension Arrangements — Self

The current web app appears to have no full pension arrangement section. Add a full section for **Self**.

### Retirement Status

- Are you already retired?
  - Yes checkbox
  - No checkbox
- OR At what age do you plan to retire?
  - Number/text field

### Retirement Income Target

- What would you like your retirement income to be relative to present earnings?
  - Percentage field

### Employee / Director Pension Provisions

Question:

> If an Employee or Director, have you pension provisions in place?

Options:

- Yes checkbox
- No checkbox

If yes, provide fields:

- Scheme Type
- Retirement Age
- Contributions
  - Employer contribution, Defined Contribution only
  - Personal contribution
- Number of years in force

Use currency fields for contribution values.

### Personal Pension Plan

Question:

> If self employed or in non-pensionable employment do you contribute to a personal pension plan?

Options:

- Yes checkbox
- No checkbox

If yes, provide fields:

- Name of company
- Type of policy
- Contribution
- Current Value
- Number of years in force

Use currency fields for Contribution and Current Value.

---

## 7. Pension Arrangements — Partner

Add a separate section for **Partner** with the same fields as the Self pension section.

### Retirement Status

- Are you already retired?
  - Yes checkbox
  - No checkbox
- OR At what age do you plan to retire?
  - Number/text field

### Retirement Income Target

- What would you like your retirement income to be relative to present earnings?
  - Percentage field

### Employee / Director Pension Provisions

Question:

> If an Employee or Director, have you pension provisions in place?

Options:

- Yes checkbox
- No checkbox

If yes, provide fields:

- Scheme Type
- Retirement Age
- Contributions
  - Employer contribution, Defined Contribution only
  - Personal contribution
- Number of years in force

### Personal Pension Plan

Question:

> If self employed or in non-pensionable employment do you contribute to a personal pension plan?

Options:

- Yes checkbox
- No checkbox

If yes, provide fields:

- Name of company
- Type of policy
- Contribution
- Current Value
- Number of years in force

---

## 8. Life Insurance & Serious Illness

The current web app has a partial version. Complete it.

### Mortgage Protection

Add question:

- Mortgage Protection
  - Yes checkbox
  - No checkbox

### Personal / Keyman / Partnership Insurances

Create fields for amount of cover.

Rows:

- Life Insurance
- Serious Illness

Columns:

- Self amount
- Partner amount

Use currency inputs.

Recommended structure:

| Cover Type | Self | Partner |
|---|---:|---:|
| Life Insurance | € | € |
| Serious Illness | € | € |

---

## 9. Savings & Investments

This section must match the printed form.

Add a Savings & Investments section with a repeatable or fixed table.

Minimum three rows.

Columns:

- Financial Institution
- Value
- Start Date
- Term

Also add:

- Comments textarea

Use currency input for Value and date input for Start Date.

---

## 10. Additional Relevant Information

The current web app has a partial version. Ensure it includes three separate textarea fields:

- Personal Circumstances
- Financial Situation
- Needs & Objectives

Each should be a large textarea, not a single-line field.

---

## 11. Client Declarations

Add or confirm these declaration checkboxes:

- I confirm that I wish to proceed with this financial agreement on an execution only basis
- I confirm that I have reviewed the Terms of Business and received a copy

Use checkboxes.

---

## 12. Data Protection & Marketing Preferences

The current web app has partial contact preferences. Expand it to match the print form.

Add static explanatory text from the printed form, or a concise equivalent if the app already has a GDPR helper note.

Add checkboxes:

- I/We do not wish to be contacted and/or receive information on products and services
- I/We agree to be contacted for the provision of marketing information on the products and services offered by Omega Financial Management

Add contact method checkboxes:

- Phone
- SMS
- Email
- Post

These contact method checkboxes can be multi-select.

---

## 13. PEP Confirmation

Add or confirm the PEP section includes:

Checkbox:

- I/We confirm that I/We are not PEP’s nor are we directly related to a PEP as defined by the Criminal Justice Act 2010

Add static helper text:

> A politically exposed person (PEP) is an individual who is or has been entrusted with a prominent public function. Many PEPs hold positions of influence and as a result carry a greater risk if their influence is abused for the purpose of money laundering, corruption or bribery.

Also include fields:

- Politically exposed person confirmation
- Related to a PEP confirmation

The web app currently appears to show “Not confirmed” fields. Replace or supplement these with the actual checkbox wording from the print form.

---

## 14. Business Source

Add or confirm field:

- How did you hear about Omega?

Single-line text input.

---

## 15. Recommendation Acknowledgement

Add the printed statement as a declaration area:

> I/We understood the recommendation is based on the information disclosed and that the actions agreed are to my / our satisfaction.

Add checkbox:

- Confirmed / agreed

---

## 16. Signatures

The current web app has signature fields but should match the printed form.

Add or confirm:

### Client Signatures

- Signature 1
- Signature 1 Date
- Signature 2
- Signature 2 Date

### Financial Advisor Signature

- Financial Advisor’s Signature
- Financial Advisor Signature Date

Use date inputs for dates.

---

## 17. Request for Information

The current web app has this section but it appears incomplete. Update it to match the print form.

Fields required:

- Client Name(s)
- Address
  - Address line 1
  - Address line 2
  - Address line 3
  - Address line 4
- Date of Birth
- Client(s) signature
- Date
- Company
- Policies

Also include the static request text from the printed form, or a concise equivalent:

> I/We request that you furnish Omega Financial Management, Suite 31 The Mall, Beacon Court, Sandyford, Dublin 18 with all of the information they require to prepare a full analysis of all of my Pension, Life Assurance, Income Protection and Investment Policies.

Include the footer/regulatory line where appropriate:

> OFM Financial Ltd T/A Omega Financial Management, regulated by the Central Bank of Ireland.

---

# Suggested Data Model Requirements

Update the Fact Find data model so every field above has a saved value.

Use clear grouped objects, for example:

```ts
factFind: {
  servicesRequested: {
    lifeProtection: boolean;
    incomeProtection: boolean;
    savingsAndProtection: boolean;
    pensionPlanning: boolean;
  };

  personalDetails: {
    clientName: string;
    clientHomeAddress: string[];
    clientWorkAddress: string[];
    clientDateOfBirth: string;
    clientHomeMobile: string;
    clientWorkPhone: string;
    clientEmail: string;

    maritalStatus: string;
    partnerName: string;
    partnerDateOfBirth: string;
    partnerAddress: string[];
    partnerHomeMobile: string;
    partnerWorkPhone: string;
    partnerEmail: string;
    dependants: string;
  };

  employmentDetails: {
    occupation: string;
    incomeSalary: string;
    employed: boolean;
    selfEmployed: boolean;
  };

  incomeProtection: {
    noDeferredPeriod: {
      provider: string;
      dentistProvident: boolean;
      dentistAndGeneral: boolean;
      otherProvider: boolean;
      currentWeeklyCover: string;
      monthlyPremium: string;
      coverToAge60: boolean;
      coverToAge65: boolean;
    };
    deferredPeriod: {
      provider: string;
      friendsFirst: boolean;
      irishLife: boolean;
      otherProvider: boolean;
      deferred13Weeks: boolean;
      deferred26Weeks: boolean;
      deferred52Weeks: boolean;
      currentWeeklyCover: string;
      monthlyPremium: string;
      coverToAge60: boolean;
      coverToAge65: boolean;
    };
  };

  assetsLiabilities: {
    assets: {
      homeSelf: string;
      homePartner: string;
      landPropertySelf: string;
      landPropertyPartner: string;
      bankBuildSocSelf: string;
      bankBuildSocPartner: string;
      creditUnionSelf: string;
      creditUnionPartner: string;
    };
    liabilities: {
      mortgage: LiabilityRow;
      carLoan: LiabilityRow;
      otherLoanPayments: LiabilityRow;
      others: LiabilityRow & { details: string };
    };
    totalLiabilitiesPerMonth: {
      self: string;
      partner: string;
      joint: string;
    };
    liabilitiesCoveredByOtherInsurance: {
      yes: boolean;
      no: boolean;
      details: string;
    };
  };

  pensionArrangements: {
    self: PensionArrangement;
    partner: PensionArrangement;
  };

  lifeInsuranceSeriousIllness: {
    mortgageProtectionYes: boolean;
    mortgageProtectionNo: boolean;
    lifeInsuranceSelf: string;
    lifeInsurancePartner: string;
    seriousIllnessSelf: string;
    seriousIllnessPartner: string;
  };

  savingsInvestments: {
    rows: Array<{
      financialInstitution: string;
      value: string;
      startDate: string;
      term: string;
    }>;
    comments: string;
  };

  additionalRelevantInformation: {
    personalCircumstances: string;
    financialSituation: string;
    needsAndObjectives: string;
  };

  clientDeclarations: {
    executionOnlyBasis: boolean;
    termsOfBusinessReviewed: boolean;
  };

  dataProtectionMarketing: {
    doNotContact: boolean;
    agreeToMarketing: boolean;
    contactByPhone: boolean;
    contactBySms: boolean;
    contactByEmail: boolean;
    contactByPost: boolean;
  };

  pepConfirmation: {
    notPepConfirmed: boolean;
    relatedToPepConfirmed: boolean;
  };

  businessSource: {
    howDidYouHearAboutOmega: string;
  };

  recommendationAcknowledgement: {
    confirmed: boolean;
  };

  signatures: {
    signature1: string;
    signature1Date: string;
    signature2: string;
    signature2Date: string;
    financialAdvisorSignature: string;
    financialAdvisorSignatureDate: string;
  };

  requestForInformation: {
    clientNames: string;
    address: string[];
    dateOfBirth: string;
    clientSignature: string;
    requestDate: string;
    company: string;
    policies: string;
  };
}
```

If the existing project already has a different schema, do not rewrite everything. Extend the existing schema carefully and preserve backwards compatibility.

---

# UI Requirements

Use the existing web app visual style.

Requirements:

- Keep current card and accordion layout.
- Add missing sections as accordions.
- Use two-column layouts where practical.
- Use tables for Assets, Liabilities, Savings & Investments, and Life Insurance.
- Use checkboxes for printed checkbox items.
- Use date inputs for date fields.
- Use textareas for long printed-line sections.
- Use currency inputs or normal text inputs with “€” prefix where the app already follows that pattern.
- Keep labels close to the wording of the printed form.
- Do not redesign the entire page.
- Do not change the navigation tabs.
- Do not remove the Generated Output panel.

---

# Implementation Steps

1. Inspect the current Fact Find component files.
2. Identify the current form state/data model.
3. Create a field-by-field checklist from the printed form screenshots.
4. Add missing fields to the form state/default values.
5. Add missing UI sections in the same visual style as the current web app.
6. Ensure all inputs are controlled and save correctly.
7. Ensure old existing sample data still loads.
8. Check that generated output still works.
9. Run lint/typecheck/build.
10. Manually test the form in the browser.

---

# Acceptance Criteria

The task is complete only when:

- Every field from the printed Financial Health Check form exists in the web app.
- All printed checkboxes exist as checkbox controls or equivalent clear options.
- All printed writing lines exist as text inputs or textareas.
- Assets & Liabilities section is present.
- Pension Arrangements for both Self and Partner are present.
- Savings & Investments section is present.
- Request for Information section is complete.
- Data Protection and Marketing Preferences match the printed form.
- PEP confirmation wording is present.
- Signature fields match the printed form.
- Save/load still works.
- No existing fields are removed.
- No unrelated files are changed.
- No console errors.
- No TypeScript/build errors.

---

# Final Output Required From Agent

When finished, report:

1. Files changed.
2. Sections added.
3. Fields added.
4. Any schema changes made.
5. Validation commands run.
6. Confirmation that no unrelated functionality was changed.

---

OFM Financial Ltd T/A Omega Financial Management, regulated by the Central Bank of Ireland.
