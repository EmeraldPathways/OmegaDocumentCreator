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
    expect(document.html).toContain("statement-section");
    expect(document.html).toContain("statement-footer-contact");
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
    // Footer contact line
    expect(document.html).toContain("Suite 31, The Mall");
    expect(document.html).toContain("info@omegafinancial.ie");
    // Omega branding
    expect(document.html).toContain("Omega Financial");
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