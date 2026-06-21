# Fact Find Update Tab Prompt

## Agent Prompt: Add a “Fact Find Update” Tab

You are working on the Omega Financial Management internal document creator web app.

The task is to add a new tab beside **Fact Find** called:

**Fact Find Update**

This tab is for collecting updated client information at a future review meeting. It must use the same general web app layout style as the existing **Statement of Suitability** screen shown in the reference screenshot, but the fields and section order must match the printed **Financial Health Check** update page exactly.

---

## Main Requirement

Add a new workflow tab in the Income Protection screen.

Current tabs:

- Fact Find
- Statement of Suitability
- Files
- Generated Documents

Required tabs:

- Fact Find
- **Fact Find Update**
- Statement of Suitability
- Files
- Generated Documents

The new tab should open a new form called:

**Fact Find Update Draft**

Do not replace or modify the existing Fact Find form.

---

## Safety Rules

Do **not** change:

- Existing Fact Find tab behaviour
- Existing Statement of Suitability tab behaviour
- Client selector
- Routing
- Authentication
- Generated Documents tab
- Existing document generation logic unless a small mapping is needed for the new form
- Any backend logic unrelated to saving/loading the new Fact Find Update data

Only edit files needed for:

- Adding the new tab
- Adding the new Fact Find Update form UI
- Adding its form state/default values
- Saving/loading the new form data if required

---

## Layout Requirements

Use the same visual style as the current app:

- Same page width
- Same card style
- Same accordion/card structure
- Same Save button style
- Same input styling
- Same spacing system
- Same typography
- Same generated output panel style if the app pattern requires it

The new form should visually follow the printed page layout:

1. Additional Relevant Information
2. Client Declarations
3. Data Protection & Marketing Preferences

---

## Form Title

At the top of the tab content, show:

**Fact Find Update Draft**

Inside the form card, show:

**Fact Find Update Form**  
Status: **partial** if incomplete, matching the existing app pattern.

Include the same Save button behaviour as the other forms.

---

## Section 1: Additional Relevant Information

Section heading:

**Additional Relevant Information**

Helper text:

**Please use an additional page if required**

Add three large full-width textareas in this order:

### Personal Circumstances

Textarea label:

**Personal Circumstances**

This should be a large textarea, visually similar to the lined area on the printed form.

### Financial Situation

Textarea label:

**Financial Situation**

This should be a large textarea.

### Needs & Objectives

Textarea label:

**Needs & Objectives**

This should be a large textarea.

---

## Section 2: Client Declarations

Section heading:

**Client Declarations**

Add two checkbox fields.

Checkbox 1 label:

**I confirm that I wish to proceed with this financial agreement on an execution only basis**

Checkbox 2 label:

**I confirm that I have reviewed the Terms of Business and received a copy**

Use proper checkbox controls, not dropdowns.

---

## Section 3: Data Protection & Marketing Preferences

Section heading:

**Data Protection & Marketing Preferences**

Add the following paragraph as static text:

**We collect your personal details in order to provide the highest standard of service to you. We take great care with the information provided; taking steps to keep it secure and to ensure it is used only for legitimate purposes. The information you have provided will be treated as confidential and will be retained by Omega Financial Management in electronic format for the purposes of providing financial services. We will use your contact details when we need to contact you in respect of the policy(ies) that you have with us. Under the General Data Protection Regulation 2018 you have various rights relating to your Personal Data.**

Do not add extra marketing checkboxes unless they already exist elsewhere in the app and are required by the project structure. This specific tab should match the uploaded printed update page.

---

## Suggested Data Model

Add a separate object for this form. Do not reuse or overwrite the existing Fact Find object.

Example:

```ts
factFindUpdate: {
  additionalRelevantInformation: {
    personalCircumstances: string;
    financialSituation: string;
    needsAndObjectives: string;
  };

  clientDeclarations: {
    executionOnlyBasis: boolean;
    termsOfBusinessReviewed: boolean;
  };

  dataProtectionMarketingPreferences: {
    acknowledgementText: string;
  };
}
```

If the existing app uses a different state structure, follow the existing pattern and add these fields safely.

---

## Generated Output Panel

If the current app pattern requires every form tab to include a Generated Output panel, add one for this tab.

Label it:

**Generated Output**

Template name:

**Fact Find Update**

The generated draft can initially output a simple structured summary using the entered values:

- Personal Circumstances
- Financial Situation
- Needs & Objectives
- Client Declarations
- Data Protection & Marketing Preferences

Do not change the generated output behaviour for Fact Find or Statement of Suitability.

---

## Acceptance Criteria

The task is complete when:

- A new **Fact Find Update** tab appears beside **Fact Find**
- Clicking it opens a separate **Fact Find Update Draft** page
- The form has the three required sections in the correct order
- The three textarea fields exist and save correctly
- The two declaration checkboxes exist and save correctly
- The Data Protection & Marketing Preferences paragraph appears exactly as specified
- The existing Fact Find tab still works
- The existing Statement of Suitability tab still works
- Save/load works for the new form
- No unrelated files or logic were changed
- No TypeScript errors
- No console errors
- Layout matches the existing clean Omega app style

---

## Final Report Required

When finished, report:

1. Files changed
2. New component or tab added
3. New data fields added
4. Save/load behaviour confirmed
5. Validation commands run
6. Confirmation that existing Fact Find and Statement of Suitability were not changed

---

OFM Financial Ltd T/A Omega Financial Management, regulated by the Central Bank of Ireland.
