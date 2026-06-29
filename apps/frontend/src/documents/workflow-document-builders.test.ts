import { describe, expect, it } from "vitest";

import { getSeededClientProfile, type SeededClientProfile } from "../data/seeded-clients";
import { buildWorkflowDocument, buildWorkflowEditorDocument } from "./workflow-document-builders";

function cloneProfile(clientReference: string) {
  return JSON.parse(JSON.stringify(getSeededClientProfile(clientReference))) as SeededClientProfile;
}

describe("buildWorkflowDocument", () => {
  it("returns composed statement html as a letter/document view merging saved draft narrative sections with workflow values", () => {
    const profile = cloneProfile("CLI-2026-0002");
    profile.documentDrafts["Statement of Suitability"].lastGeneratedSections = [
      {
        id: "recommendation",
        title: "Recommendation Section",
        bodyHtml: "<p>AI recommendation narrative for Jamie Murphy.</p>",
      },
      {
        id: "needs",
        title: "Needs and Objectives",
        bodyHtml: "<p>AI needs narrative tailored to the client goals.</p>",
      },
      {
        id: "warnings",
        title: "Warnings",
        bodyHtml: "<p>Benefits may be limited by underwriting and policy definitions.</p>",
      },
    ];
    profile.documentDrafts["Statement of Suitability"].integrationRequests = [
      {
        provider: "BestAdvice",
        requestType: "Phi",
        status: "sent",
        requestedAt: "2026-06-19T10:00:00+00:00",
        requestFields: [{ label: "DOB", value: "08/11/1990" }],
        quoteResults: [{ providerName: "Acme Life", levelPremium: "42.10" }],
        errors: [],
      },
    ];

    const document = buildWorkflowDocument(profile, "Statement of Suitability");

    expect(document.title).toBe("Statement of Suitability");
    // Statement uses only its own cleaner blocks — no banner, no footer
    expect(document.html).toContain("statement-document-body");
    expect(document.html).not.toContain("class=\"document-section");
    expect(document.html).not.toContain("Signatures and Record");
    expect(document.html).toContain("statement-letter-header");
    expect(document.html).toContain("statement-logo");
    expect(document.html).toContain("statement-address-block");
    expect(document.html).toContain("statement-opening");
    expect(document.html).toContain("statement-important-notice");
    expect(document.html).toContain("statement-section");
    expect(document.html).toContain("statement-quote-block");
    expect(document.html).toContain("statement-closing");
    expect(document.html).toContain("statement-declaration");
    expect(document.html).toContain("statement-important-info");
    // Statement must NOT contain old shared blocks
    expect(document.html).not.toContain("document-banner");
    expect(document.html).not.toContain("signatures-footer");
    // Narrative content from saved draft sections
    expect(document.html).toContain("AI recommendation narrative for Jamie Murphy.");
    expect(document.html).toContain("AI needs narrative tailored to the client goals.");
    expect(document.html).toContain("Benefits may be limited by underwriting and policy definitions.");
    // Personal Circumstances / Financial Situation headings
    expect(document.html).toContain("Personal Circumstances");
    expect(document.html).toContain("Financial Situation");
    expect(document.html).toContain("Recommendation");
    expect(document.html).toContain("Warnings");
    // Letter metadata
    expect(document.html).toContain("Dear Jamie Murphy");
    expect(document.html).toContain("2026-06-06");
    expect(document.html).toContain("15 Sea Road");
    expect(document.html).toContain("Important Notice – Statement of Suitability");
    expect(document.html).toContain("product(s) or service(s) offered or recommended");
    expect(document.html).toContain("Please review all of the contents of this recommendation carefully");
    expect(document.html).toContain("Kind regards.");
    expect(document.html).toContain("Yours sincerely");
    expect(document.html).toContain("statement-signature-area");
    // Omega branding
    expect(document.html).toContain("Omega Financial");
    // Declaration and important information blocks (Statement-only)
    expect(document.html).toContain("Declaration to be completed by Client:");
    expect(document.html).toContain("I am happy to proceed on the basis of the recommendation given to me and wish to affect the policy recommended.");
    expect(document.html).toContain("Amanda McLaughlin");
    expect(document.html).toContain("statement-declaration");
    expect(document.html).toContain("statement-important-info");
    expect(document.html).toContain("It is vital to make full disclosure of relevant facts");
    expect(document.html).toContain("I wish to confirm that I have read the Customer Information Booklet");
  });

  it("falls back to fact find values for statement personal and financial sections when dedicated statement fields are blank", () => {
    const profile = cloneProfile("CLI-2026-0002");
    profile.personalCircumstances = "";
    profile.financialSituation = "";
    profile.occupation = "Doctor";
    profile.employmentStatus = "Employed";
    profile.maritalStatus = "Single";
    profile.income = "60000";
    profile.recommendedCover = "30000";
    profile.deferredPeriod = "13 weeks";
    profile.coverAge = "65";
    profile.premium = "165.50";

    const document = buildWorkflowDocument(profile, "Statement of Suitability");

    expect(document.html).toContain("Occupation: Doctor.");
    expect(document.html).toContain("Employment status: Employed.");
    expect(document.html).toContain("Marital status: Single.");
    expect(document.html).toContain("Annual income: 60000.");
    expect(document.html).toContain("Recommended cover: 30000.");
    expect(document.html).toContain("Deferred period: 13 weeks.");
    expect(document.html).not.toContain("Monthly premium: 165.50.");
  });

  it("renders BIS quote results as a statement comparison table immediately after the introduction using fact find values", () => {
    const profile = cloneProfile("CLI-2026-0002");
    profile.dateOfBirth = "1996-06-29";
    profile.letterDate = "2026-06-29";
    profile.recommendedCover = "30000";
    profile.deferredPeriod = "13 weeks";
    profile.coverAge = "65";
    profile.smokerStatus = "Non-Smoker";
    profile.phiOccupationalClass = "2";
    profile.documentDrafts["Statement of Suitability"].integrationRequests = [
      {
        provider: "BestAdvice",
        requestType: "Phi",
        status: "sent",
        requestedAt: "2026-06-29T10:00:00+00:00",
        requestFields: [{ label: "Age", value: "30" }],
        quoteResults: [
          {
            providerName: "Aviva",
            policyType: "Reviewable",
            levelPremium: "102.50",
            escalation3Premium: "116.40",
          },
          {
            providerName: "Irish Life",
            policyType: "Guaranteed",
            levelPremium: "136.53",
            escalation5Premium: "149.78",
          },
        ],
        errors: [],
      },
    ];

    const document = buildWorkflowDocument(profile, "Statement of Suitability");

    expect(document.html).toContain("statement-quote-table");
    expect(document.html).toContain("Income Protection Quote Comparison");
    expect(document.html).toContain("Cover amount: 30000");
    expect(document.html).toContain("Age: 30");
    expect(document.html).toContain("Deferred period: 13 weeks");
    expect(document.html).toContain("Cover to age: 65");
    expect(document.html).toContain("Smoker status: Non-Smoker");
    expect(document.html).toContain("Occupation class: 2");
    expect(document.html).toContain("Aviva");
    expect(document.html).toContain("Reviewable");
    expect(document.html).toContain("102.50");
    expect(document.html).toContain("116.40");
    expect(document.html).toContain("Irish Life");
    expect(document.html).toContain("Guaranteed");
    expect(document.html).toContain("149.78");
    expect(document.html).not.toContain("Indexation:");
    expect(document.html.indexOf("Income Protection Quote Comparison")).toBeGreaterThan(document.html.indexOf("statement-opening"));
    expect(document.html.indexOf("Income Protection Quote Comparison")).toBeLessThan(document.html.indexOf("Personal Circumstances"));
  });

  it("renders a populated statement recommendation using quote and fact find values", () => {
    const profile = cloneProfile("CLI-2026-0002");
    profile.documentDrafts["Statement of Suitability"].lastGeneratedSections = [];
    profile.provider = "";
    profile.productType = "Income Protection";
    profile.income = "46666.67";
    profile.recommendedCover = "35000";
    profile.deferredPeriod = "13 Week";
    profile.coverAge = "65";
    profile.premium = "";
    profile.netMonthlyCost = "72.98";
    profile.recommendationAcknowledged = "Yes";
    profile.documentDrafts["Statement of Suitability"].integrationRequests = [
      {
        provider: "BestAdvice",
        requestType: "Phi",
        status: "sent",
        requestedAt: "2026-06-29T10:00:00+00:00",
        requestFields: [{ label: "Age", value: "30" }],
        quoteResults: [
          {
            providerName: "Aviva",
            policyType: "Guaranteed",
            levelPremium: "121.62",
          },
        ],
        errors: [],
      },
    ];

    const document = buildWorkflowDocument(profile, "Statement of Suitability");

    expect(document.html).toContain("Recommendation: Aviva 13 Week deferred plan for €35,000 per annum");
    expect(document.html).toContain("We recommend an Aviva Income Protection 13 Week deferred plan for €35,000 to cover you to age 65.");
    expect(document.html).toContain("As this represents 75% of your salary");
    expect(document.html).toContain("The gross cost of this 13 Week deferred period plan is €121.62 less tax relief @40% giving a net cost of €72.98pm.");
    expect(document.html).toContain("We have discussed affordability of this plan and you are happy to proceed.");
    expect(document.html).toContain("The premium offered by Aviva for this type of cover is competitive");
    expect(document.html).toContain("The monthly premium receives 40% tax relief on this plan.");
  });

  it("preserves fact find contact address and employment coverage when no generated draft exists", () => {
    const profile = cloneProfile("CLI-2026-0001");
    profile.documentDrafts["Fact Find"].lastGeneratedSections = [];
    profile.servicesRequestedLifeProtection = "Yes";
    profile.assetHomeSelf = "350000";
    profile.liabilityMortgageBalanceOutstanding = "180000";
    profile.selfRetirementAge = "60";
    profile.savingsInvestmentRows[0] = {
      financialInstitution: "AIB",
      value: "12000",
      startDate: "2024-01-01",
      term: "5 years",
    };
    profile.recommendationAcknowledged = "Yes";
    profile.requestInfoAddressLine1 = "31 The Mall";

    const document = buildWorkflowDocument(profile, "Fact Find");

    expect(document.title).toBe("Fact Find");
    // Logo block present for Fact Find
    expect(document.html).toContain("document-top-logo");
    expect(document.html).toContain("document-banner");
    expect(document.html).toContain("client-summary-grid");
    expect(document.html).toContain("Income Protection Fact Find");
    expect(document.html).toContain("Income Protection cover review requested.");
    expect(document.html).toContain("Please confirm that the information captured in this fact find is complete and accurate.");
    expect(document.html).toContain("Dublin");
    expect(document.html).toContain("Married");
    expect(document.html).toContain("Employed");
    expect(document.html).toContain("52000");
    expect(document.html).toContain("26 weeks");
    expect(document.html).toContain("Services Requested");
    expect(document.html).toContain("Life Protection");
    expect(document.html).toContain("350000");
    expect(document.html).toContain("180000");
    expect(document.html).toContain("Pension Arrangements");
    expect(document.html).toContain("AIB");
    expect(document.html).toContain("Recommendation Acknowledgement");
    expect(document.html).toContain("Request for Information");
    expect(document.html).toContain("31 The Mall");
    expect(document.html).toContain("Not recorded");
    expect(document.html).toContain("signatures-footer");
  });

  it("preserves terms of business issue confirmations and contact preferences", () => {
    const profile = cloneProfile("CLI-2026-0002");
    profile.documentDrafts["Terms of Business"].lastGeneratedSections = [];

    const document = buildWorkflowDocument(profile, "Terms of Business");

    expect(document.title).toBe("Terms of Business");
    expect(document.html).toContain("document-banner");
    expect(document.html).toContain("client-summary-grid");
    expect(document.html).toContain("January 2026");
    expect(document.html).toContain("Email");
    expect(document.html).toContain("Pending confirmation");
    expect(document.html).toContain("No preference recorded");
    expect(document.html).toContain("Yes");
    expect(document.html).toContain("Issue with Income Protection recommendation pack.");
    expect(document.html).toContain("signatures-footer");
  });

  it("returns editor-safe html for fact find drafts", () => {
    const profile = cloneProfile("CLI-2026-0002");

    const document = buildWorkflowEditorDocument(profile, "Fact Find");

    expect(document.html).toContain('<article class="workflow-document workflow-document-fact-find">');
    expect(document.html).toContain('class="document-top-logo"');
    expect(document.html).toContain('class="document-banner"');
    expect(document.html).toContain("<h1>Income Protection Fact Find</h1>");
    expect(document.html).toContain('class="client-summary-grid"');
    expect(document.html).toContain('class="document-section"');
    expect(document.html).toContain('class="document-callout document-callout-warning"');
    expect(document.html).toContain('class="signatures-footer"');
    expect(document.html).toContain('class="grid-label">Client</span><strong>Jamie Murphy</strong>');
  });
});
