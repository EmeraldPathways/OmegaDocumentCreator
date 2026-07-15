import { describe, expect, it } from "vitest";

import { getSeededClientProfile, type SeededClientProfile } from "../data/seeded-clients";
import { buildStatementQuoteKey } from "./statement-quote-selection";
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
    profile.documentDrafts["Quote"].integrationRequests = [
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
    expect(document.html).toContain("Needs and Objectives");
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
    expect(document.html.indexOf("statement-important-notice")).toBeGreaterThan(document.html.indexOf("statement-letter-header"));
    expect(document.html.indexOf("statement-important-notice")).toBeLessThan(document.html.indexOf("statement-opening"));
    expect(document.html.indexOf("Needs and Objectives")).toBeGreaterThan(document.html.indexOf("Financial Situation"));
    expect(document.html.indexOf("Needs and Objectives")).toBeLessThan(document.html.indexOf("Recommendation"));
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

  it("uses only fact-find needs text in the standalone statement needs section", () => {
    const profile = cloneProfile("CLI-2026-0002");
    profile.personalCircumstances = "Personal facts.";
    profile.financialSituation = "Financial facts.";
    profile.needsObjectives = "Needs facts.";
    profile.documentDrafts["Statement of Suitability"].lastGeneratedSections = [];

    const document = buildWorkflowDocument(profile, "Statement of Suitability");

    const needsIndex = document.html.indexOf("<h2>Needs and Objectives</h2>");
    const recommendationIndex = document.html.indexOf("<h2>Recommendation</h2>");

    expect(needsIndex).toBeGreaterThan(-1);
    expect(recommendationIndex).toBeGreaterThan(needsIndex);
    expect(document.html).toContain("<h2>Needs and Objectives</h2><p>Needs facts.</p>");
    expect(document.html).not.toContain("<h2>Needs and Objectives</h2><p>Personal facts.</p>");
    expect(document.html).not.toContain("<h2>Needs and Objectives</h2><p>Financial facts.</p>");
  });

  it("renders BIS quote results in the standalone quote document using fact find values", () => {
    const profile = cloneProfile("CLI-2026-0002");
    profile.maritalStatus = "Single";
    profile.income = "50000";
    profile.dateOfBirth = "1996-06-29";
    profile.letterDate = "2026-06-29";
    profile.recommendedCover = "30000";
    profile.deferredPeriod = "13 weeks";
    profile.coverAge = "65";
    profile.smokerStatus = "Non-Smoker";
    profile.phiOccupationalClass = "2";
    (profile as SeededClientProfile & { zurichDiscountActive?: string }).zurichDiscountActive = "Yes";
    profile.documentDrafts["Quote"].integrationRequests = [
      {
        provider: "BestAdvice",
        requestType: "Phi",
        status: "sent",
        requestedAt: "2026-06-29T10:00:00+00:00",
        requestFields: [{ label: "DeferredPeriod", value: "13 Week" }],
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
          {
            providerName: "Royal London",
            policyType: "Guaranteed",
            levelPremium: "100.00",
          },
          {
            providerName: "Zurich Life",
            policyType: "Guaranteed",
            levelPremium: "144.10",
          },
        ],
        errors: [],
      },
    ];

    const document = buildWorkflowDocument(profile, "Quote");

    expect(document.html).toContain("statement-quote-table");
    expect(document.html).toContain("Income Protection Quote Comparison");
    expect(document.html).toContain("Cover amount: 30000");
    expect(document.html).toContain("Date of birth: 29/06/1996");
    expect(document.html).toContain("Deferred period: 13 weeks");
    expect(document.html).toContain("Cover to age: 65");
    expect(document.html).toContain("Smoker status: Non-Smoker");
    expect(document.html).toContain("Occupation class: 2");
    expect(document.html).toContain("Reviewable Rates");
    expect(document.html).toContain("Guaranteed Rates");
    expect(document.html).toContain("After Tax Discount");
    expect(document.html).not.toContain("Policy Type");
    expect(document.html).toContain("Aviva");
    expect(document.html).toContain("102.50");
    expect(document.html).toContain("61.50");
    expect(document.html).toContain("Irish Life");
    expect(document.html).toContain("81.92");
    expect(document.html).toContain("Royal London");
    expect(document.html).toContain("51.00");
    expect(document.html).toContain("Zurich Life");
    expect(document.html).toContain("15.00");
    expect(document.html).toContain("25.22");
    expect(document.html).toContain("71.33");
    expect(document.html).not.toContain("Esc 3%");
    expect(document.html).not.toContain("Esc 5%");
    expect(document.html).not.toContain("Indexation:");
    expect(document.html).not.toContain("statement-opening");
    expect(document.html).not.toContain("Personal Circumstances");
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
    profile.documentDrafts["Quote"].integrationRequests = [
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
    expect(document.html).toContain(
      "The gross cost of this 13 Week deferred period plan is €121.62 (15.00% discount on premium applied) less tax relief @40% giving a net cost of €62.03pm.",
    );
    expect(document.html).toContain("We have discussed affordability of this plan and you are happy to proceed.");
    expect(document.html).toContain("The premium offered by Aviva for this type of cover is competitive");
    expect(document.html).toContain("The monthly premium receives 40% tax relief on this plan.");
  });

  it("overrides Zurich to 17.5 percent whenever the toggle is active", () => {
    const profile = cloneProfile("CLI-2026-0002");
    profile.maritalStatus = "Single";
    profile.income = "50000";
    profile.dateOfBirth = "1996-06-29";
    profile.recommendedCover = "30000";
    profile.deferredPeriod = "13 weeks";
    profile.coverAge = "65";
    profile.smokerStatus = "Non-Smoker";
    profile.phiOccupationalClass = "2";
    profile.occupation = "Teacher";
    (profile as SeededClientProfile & { zurichDiscountActive?: string }).zurichDiscountActive = "Yes";
    profile.documentDrafts["Quote"].integrationRequests = [
      {
        provider: "BestAdvice",
        requestType: "Phi",
        status: "sent",
        requestedAt: "2026-06-29T10:00:00+00:00",
        requestFields: [{ label: "DeferredPeriod", value: "13 Week" }],
        quoteResults: [
          {
            providerName: "Zurich Life",
            policyType: "Guaranteed",
            levelPremium: "144.10",
          },
        ],
        errors: [],
      },
    ];

    const document = buildWorkflowDocument(profile, "Quote");

    expect(document.html).toContain("Zurich Life");
    expect(document.html).toContain("25.22");
    expect(document.html).toContain("71.33");
  });

  it.skip("prefers live quote premium and request deferred period over stale statement fields", () => {
    const profile = cloneProfile("CLI-2026-0002");
    profile.documentDrafts["Statement of Suitability"].lastGeneratedSections = [];
    profile.provider = "Aviva";
    profile.productType = "Income Protection";
    profile.income = "50000";
    profile.recommendedCover = "30000";
    profile.deferredPeriod = "26 weeks";
    profile.coverAge = "65";
    profile.premium = "165.50";
    profile.netMonthlyCost = "100.00";
    profile.recommendationAcknowledged = "Yes";
    profile.documentDrafts["Statement of Suitability"].integrationRequests = [
      {
        provider: "BestAdvice",
        requestType: "Phi",
        status: "sent",
        requestedAt: "2026-06-29T10:00:00+00:00",
        requestFields: [{ label: "DeferredPeriod", value: "13 weeks" }],
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

    expect(document.html).toContain("Recommendation: Aviva 13 weeks deferred plan for â‚¬30,000 per annum");
    expect(document.html).toContain("The gross cost of this 13 weeks deferred period plan is â‚¬121.62 less tax relief @18% giving a net cost of â‚¬100.00pm.");
    expect(document.html).not.toContain("26 weeks deferred plan");
    expect(document.html).not.toContain("â‚¬165.50");
  });

  it("uses returned quote request fields and quote results in the statement recommendation text", () => {
    const profile = cloneProfile("CLI-2026-0002");
    profile.documentDrafts["Statement of Suitability"].lastGeneratedSections = [];
    profile.provider = "Old Provider";
    profile.productType = "Income Protection";
    profile.income = "50000";
    profile.recommendedCover = "28000";
    profile.deferredPeriod = "26 weeks";
    profile.coverAge = "65";
    profile.premium = "165.50";
    profile.netMonthlyCost = "100.00";
    profile.recommendationAcknowledged = "Yes";
    profile.documentDrafts["Quote"].integrationRequests = [
      {
        provider: "BestAdvice",
        requestType: "Phi",
        status: "sent",
        requestedAt: "2026-06-29T10:00:00+00:00",
        requestFields: [
          { label: "AnnualAmount", value: "30000" },
          { label: "DeferredPeriod", value: "13 weeks" },
          { label: "NRA", value: "67" },
        ],
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

    expect(document.html).toContain("Recommendation: Aviva 13 weeks deferred plan");
    expect(document.html).toContain("30,000 per annum");
    expect(document.html).toContain("to cover you to age 67.");
    expect(document.html).toContain("guaranteed premium basis");
    expect(document.html).toContain("121.62 per month before tax relief");
    expect(document.html).toContain("The gross cost of this 13 weeks deferred period plan is");
    expect(document.html).not.toContain("26 weeks deferred plan");
    expect(document.html).not.toContain("165.50");
    expect(document.html).not.toContain("28,000");
    expect(document.html).not.toContain("age 65");
  });

  it("uses the first quote result for statement pricing and keeps the quote table out of the statement", () => {
    const profile = cloneProfile("CLI-2026-0002");
    profile.documentDrafts["Statement of Suitability"].lastGeneratedSections = [];
    profile.provider = "Zurich Life";
    profile.productType = "Income Protection";
    profile.income = "50000";
    profile.recommendedCover = "30000";
    profile.deferredPeriod = "26 weeks";
    profile.coverAge = "65";
    profile.premium = "165.50";
    profile.netMonthlyCost = "100.00";
    profile.recommendationAcknowledged = "Yes";
    profile.documentDrafts["Quote"].integrationRequests = [
      {
        provider: "BestAdvice",
        requestType: "Phi",
        status: "sent",
        requestedAt: "2026-06-29T10:00:00+00:00",
        requestFields: [{ label: "DeferredPeriod", value: "26 weeks" }],
        quoteResults: [
          {
            providerName: "Aviva",
            policyType: "Reviewable",
            levelPremium: "177.74",
            escalation3Premium: "197.24",
          },
          {
            providerName: "Irish Life",
            policyType: "Guaranteed",
            levelPremium: "199.99",
          },
        ],
        errors: [],
      },
    ];

    const document = buildWorkflowDocument(profile, "Statement of Suitability");

    expect(document.html).toContain("Recommendation: Aviva 26 weeks deferred plan");
    expect(document.html).toContain("We recommend an Aviva Income Protection 26 weeks deferred plan");
    expect(document.html).toContain("The gross cost of this 26 weeks deferred period plan is");
    expect(document.html).toContain("177.74");
    expect(document.html).toContain("less tax relief @40%");
    expect(document.html).toContain("106.64pm");
    expect(document.html).not.toContain("165.50");
    expect(document.html).not.toContain("statement-quote-table");
    expect(document.html).not.toContain("197.24");
  });

  it("uses the picked quote row for statement recommendation pricing", () => {
    const profile = cloneProfile("CLI-2026-0002");
    profile.documentDrafts["Statement of Suitability"].lastGeneratedSections = [];
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
    profile.statementSelectedQuoteKey = buildStatementQuoteKey(
      0,
      1,
      profile.documentDrafts["Quote"].integrationRequests[0].quoteResults[1],
    );

    const document = buildWorkflowDocument(profile, "Statement of Suitability");

    expect(document.html).toContain("Irish Life");
    expect(document.html).toContain("165.00 per month before tax relief");
    expect(document.html).toContain("The gross cost of this 26 deferred period plan is €165.00");
    expect(document.html).not.toContain("177.74");
  });

  it("uses 20 percent tax relief for single clients at or below the Irish cutoff", () => {
    const profile = cloneProfile("CLI-2026-0002");
    profile.documentDrafts["Statement of Suitability"].lastGeneratedSections = [];
    profile.maritalStatus = "Single";
    profile.provider = "";
    profile.productType = "Income Protection";
    profile.income = "44000";
    profile.recommendedCover = "30000";
    profile.deferredPeriod = "26 weeks";
    profile.coverAge = "65";
    profile.premium = "";
    profile.netMonthlyCost = "";
    profile.recommendationAcknowledged = "Yes";
    profile.documentDrafts["Quote"].integrationRequests = [
      {
        provider: "BestAdvice",
        requestType: "Phi",
        status: "sent",
        requestedAt: "2026-06-29T10:00:00+00:00",
        requestFields: [{ label: "DeferredPeriod", value: "26 weeks" }],
        quoteResults: [
          {
            providerName: "Aviva",
            policyType: "Reviewable",
            levelPremium: "177.74",
          },
        ],
        errors: [],
      },
    ];

    const document = buildWorkflowDocument(profile, "Statement of Suitability");

    expect(document.html).toContain("less tax relief @20%");
    expect(document.html).toContain("142.19pm");
  });

  it("does not append stale generated recommendation html onto the statement recommendation", () => {
    const profile = cloneProfile("CLI-2026-0002");
    profile.documentDrafts["Statement of Suitability"].lastGeneratedSections = [
      {
        id: "recommendation",
        title: "Recommendation",
        bodyHtml: "<p>The gross cost of this 26 deferred period plan is €165.50 less tax relief @40% giving a net cost of €99.30pm.</p>",
      },
    ];
    profile.provider = "Zurich Life";
    profile.productType = "Income Protection";
    profile.maritalStatus = "Single";
    profile.income = "50000";
    profile.recommendedCover = "30000";
    profile.deferredPeriod = "26 weeks";
    profile.coverAge = "65";
    profile.premium = "165.50";
    profile.netMonthlyCost = "99.30";
    profile.recommendationAcknowledged = "Yes";
    profile.documentDrafts["Quote"].integrationRequests = [
      {
        provider: "BestAdvice",
        requestType: "Phi",
        status: "sent",
        requestedAt: "2026-06-29T10:00:00+00:00",
        requestFields: [{ label: "DeferredPeriod", value: "26 weeks" }],
        quoteResults: [
          {
            providerName: "Aviva",
            policyType: "Reviewable",
            levelPremium: "177.74",
          },
        ],
        errors: [],
      },
    ];

    const document = buildWorkflowDocument(profile, "Statement of Suitability");

    expect(document.html).toContain("177.74");
    expect(document.html).toContain("106.64pm");
    expect(document.html).not.toContain("99.30pm");
    expect(document.html).not.toContain("165.50");
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

  it("renders fact find personal circumstances, financial situation, and needs sections verbatim from generated draft sections", () => {
    const profile = cloneProfile("CLI-2026-0002");
    profile.documentDrafts["Fact Find"].lastGeneratedSections = [
      {
        id: "personal-circumstances",
        title: "Personal Circumstances",
        bodyHtml: "<p>Personal line 1.</p><p>Personal line 2.</p>",
      },
      {
        id: "financial-situation",
        title: "Financial Situation",
        bodyHtml: "<p>Financial line 1.</p><p>Financial line 2.</p>",
      },
      {
        id: "needs-and-objectives",
        title: "Needs and Objectives",
        bodyHtml: "<p>Needs line 1.</p><p>Needs line 2.</p>",
      },
    ];

    const document = buildWorkflowDocument(profile, "Fact Find");

    expect(document.html).toContain("<h2>Personal Circumstances</h2>");
    expect(document.html).toContain("<p>Personal line 1.</p><p>Personal line 2.</p>");
    expect(document.html).toContain("<h2>Financial Situation</h2>");
    expect(document.html).toContain("<p>Financial line 1.</p><p>Financial line 2.</p>");
    expect(document.html).toContain("<h2>Needs and Objectives</h2>");
    expect(document.html).toContain("<p>Needs line 1.</p><p>Needs line 2.</p>");
  });

  it("renders fact find update personal circumstances, financial situation, and needs sections verbatim from workflow values", () => {
    const profile = cloneProfile("CLI-2026-0002");
    profile.factFindUpdatePersonalCircumstances = "Update personal line 1\nUpdate personal line 2";
    profile.factFindUpdateFinancialSituation = "Update financial line 1\nUpdate financial line 2";
    profile.factFindUpdateNeedsAndObjectives = "Update needs line 1\nUpdate needs line 2";

    const document = buildWorkflowDocument(profile, "Fact Find Update");

    expect(document.html).toContain("<h2>Personal Circumstances</h2>");
    expect(document.html).toContain("Update personal line 1<br />Update personal line 2");
    expect(document.html).toContain("<h2>Financial Situation</h2>");
    expect(document.html).toContain("Update financial line 1<br />Update financial line 2");
    expect(document.html).toContain("<h2>Needs and Objectives</h2>");
    expect(document.html).toContain("Update needs line 1<br />Update needs line 2");
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
