import { describe, expect, it } from "vitest";

import { getSeededClientProfile, type SeededClientProfile } from "../data/seeded-clients";
import { resolveFactFindDraft, resolveFactFindUpdateDraft, resolveStatementDraft } from "./statement-draft";

function cloneProfile(clientReference: string) {
  return JSON.parse(JSON.stringify(getSeededClientProfile(clientReference))) as SeededClientProfile;
}

describe("resolveStatementDraft", () => {
  it("rebuilds composed statement html when quote data changes", () => {
    const profile = cloneProfile("CLI-2026-0002");
    profile.documentDrafts["Statement of Suitability"].editedHtml =
      '<article class="workflow-document workflow-document-statement-of-suitability"><div class="statement-document-body"><p>The gross cost of this 26 deferred period plan is €165.50 less tax relief @40% giving a net cost of €99.30pm.</p></div></article>';
    profile.documentDrafts["Statement of Suitability"].lastGeneratedSections = [];
    profile.maritalStatus = "Single";
    profile.income = "50000";
    profile.provider = "Zurich Life";
    profile.productType = "Income Protection";
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

    const draft = resolveStatementDraft(profile);

    expect(draft.editedHtml).toContain("177.74");
    expect(draft.editedHtml).toContain("106.64pm");
    expect(draft.editedHtml).not.toContain("165.50");
    expect(draft.editedHtml).not.toContain("99.30pm");
  });
});

describe("resolveFactFindDraft", () => {
  it("rebuilds composed fact find html when fact find small is selected", () => {
    const profile = cloneProfile("CLI-2026-0002");
    profile.factFindType = "small";
    profile.documentDrafts["Fact Find"].editedHtml =
      '<article class="workflow-document workflow-document-fact-find workflow-document-fact-find-all"><div class="document-inline-header"><div class="statement-letter-header"></div></div><div class="document-grid"><h2>Assets &amp; Liabilities</h2></div><div class="document-grid"><h2>Pension Arrangements</h2></div><div class="document-grid"><h2>Life Insurance &amp; Serious Illness</h2></div><div class="document-section"><h2>Savings &amp; Investments</h2></div></article>';

    const draft = resolveFactFindDraft(profile);

    expect(draft.editedHtml).toContain("workflow-document-fact-find-small");
    expect(draft.editedHtml).not.toContain("Assets &amp; Liabilities");
    expect(draft.editedHtml).not.toContain("Pension Arrangements");
    expect(draft.editedHtml).not.toContain("Life Insurance &amp; Serious Illness");
    expect(draft.editedHtml).not.toContain("Savings &amp; Investments");
  });

  it("rebuilds composed fact find html when fact find all is selected", () => {
    const profile = cloneProfile("CLI-2026-0002");
    profile.factFindType = "all";
    profile.assetHomeSelf = "350000";
    profile.liabilityMortgageBalanceOutstanding = "180000";
    profile.selfRetirementAge = "60";
    profile.selfEmployeeDirectorSchemeType = "Executive Pension";
    profile.selfLifeInsuranceAmount = "100000";
    profile.savingsInvestmentRows[0] = {
      financialInstitution: "AIB",
      value: "12000",
      startDate: "2024-01-01",
      term: "5 years",
    };
    profile.documentDrafts["Fact Find"].editedHtml =
      '<article class="workflow-document workflow-document-fact-find workflow-document-fact-find-small"><div class="document-inline-header"><div class="statement-letter-header"></div></div><div class="document-grid"><h2>Client Summary</h2></div></article>';

    const draft = resolveFactFindDraft(profile);

    expect(draft.editedHtml).toContain("workflow-document-fact-find-all");
    expect(draft.editedHtml).toContain("Assets &amp; Liabilities");
    expect(draft.editedHtml).toContain("Pension Arrangements");
    expect(draft.editedHtml).toContain("Life Insurance &amp; Serious Illness");
    expect(draft.editedHtml).toContain("Savings &amp; Investments");
  });

  it("rebuilds composed fact find html when the new signing and request layout is missing", () => {
    const profile = cloneProfile("CLI-2026-0002");
    profile.documentDrafts["Fact Find"].editedHtml =
      '<article class="workflow-document workflow-document-fact-find workflow-document-fact-find-all"><div class="document-inline-header"><div class="statement-letter-header"></div></div><div class="document-section"><h2>Signatures and Record</h2></div></article>';

    const draft = resolveFactFindDraft(profile);

    expect(draft.editedHtml).toContain("fact-find-signing-block");
    expect(draft.editedHtml).toContain("fact-find-request-row");
  });

  it("rebuilds legacy non-composed fact find html into the current workflow layout", () => {
    const profile = cloneProfile("CLI-2026-0002");
    profile.documentDrafts["Fact Find"].editedHtml =
      "<p>Legacy Fact Find output</p>";

    const draft = resolveFactFindDraft(profile);

    expect(draft.editedHtml).toContain("workflow-document-fact-find");
    expect(draft.editedHtml).toContain("fact-find-signing-block");
    expect(draft.editedHtml).not.toContain("Legacy Fact Find output");
  });

  it("rebuilds composed fact find html when signature lines still contain saved values", () => {
    const profile = cloneProfile("CLI-2026-0002");
    profile.documentDrafts["Fact Find"].editedHtml =
      '<article class="workflow-document workflow-document-fact-find workflow-document-fact-find-all"><div class="document-inline-header"><div class="statement-letter-header"></div></div><div class="document-section"><h2>Signatures and Record</h2><div class="fact-find-signing-block"><div class="fact-find-signature-row"><p class="fact-find-signature-value">Jamie Murphy</p></div><div class="fact-find-signature-row"><p class="fact-find-signature-value">17/07/2026</p></div></div></div></article>';

    const draft = resolveFactFindDraft(profile);

    expect(draft.editedHtml).toContain('class="fact-find-signature-value">&nbsp;</p>');
    expect(draft.editedHtml).not.toContain('class="fact-find-signature-value">Jamie Murphy</p>');
    expect(draft.editedHtml).not.toContain('class="fact-find-signature-value">17/07/2026</p>');
  });

  it("rebuilds composed fact find html when request signing lines or company policies row use the old layout", () => {
    const profile = cloneProfile("CLI-2026-0002");
    profile.documentDrafts["Fact Find"].editedHtml =
      '<article class="workflow-document workflow-document-fact-find workflow-document-fact-find-all"><div class="document-inline-header"><div class="statement-letter-header"></div></div><div class="document-section"><h2>Request for Information</h2><div class="fact-find-request-row"><div class="fact-find-request-field"><p class="fact-find-request-value">Steve Johnson</p><p class="fact-find-request-label">Client(s)</p></div><div class="fact-find-request-field fact-find-request-field-date"><p class="fact-find-request-value">15/01/2026</p><p class="fact-find-request-label">Date</p></div></div><div class="fact-find-request-row"><div class="fact-find-request-field"><p class="fact-find-request-value">Aviva</p><p class="fact-find-request-label">Company:</p></div></div><div class="fact-find-request-row"><div class="fact-find-request-field"><p class="fact-find-request-value">Income Protection</p><p class="fact-find-request-label">Policies:</p></div></div></div></article>';

    const draft = resolveFactFindDraft(profile);

    expect(draft.editedHtml).toContain('class="fact-find-request-value">&nbsp;</p>');
    expect(draft.editedHtml).not.toContain('class="fact-find-request-value">Steve Johnson</p>');
    expect(draft.editedHtml).not.toContain('class="fact-find-request-value">15/01/2026</p>');
    expect(draft.editedHtml).toContain("Company:");
    expect(draft.editedHtml).toContain("Policies:");
  });

  it("rebuilds composed fact find html when services requested is below client summary or not in the card container", () => {
    const profile = cloneProfile("CLI-2026-0002");
    profile.documentDrafts["Fact Find"].editedHtml =
      '<article class="workflow-document workflow-document-fact-find workflow-document-fact-find-all"><div class="document-inline-header"><div class="statement-letter-header"></div></div><div class="client-summary-grid"><h2>Client Summary</h2></div><div class="document-section"><h2>Services Requested</h2><ul><li>Income Protection</li></ul></div></article>';

    const draft = resolveFactFindDraft(profile);

    expect(draft.editedHtml).toContain('class="client-summary-grid"><h2>Services Requested</h2>');
    expect(draft.editedHtml.indexOf("<h2>Services Requested</h2>")).toBeLessThan(draft.editedHtml.indexOf("<h2>Client Summary</h2>"));
    expect(draft.editedHtml).toContain('<span class="grid-label">Requested service</span>');
  });

  it("rebuilds composed fact find html when an old fallback recommendation section is present without generated recommendation data", () => {
    const profile = cloneProfile("CLI-2026-0002");
    profile.factFindType = "small";
    profile.documentDrafts["Fact Find"].lastGeneratedSections = [];
    profile.documentDrafts["Fact Find"].editedHtml =
      '<article class="workflow-document workflow-document-fact-find workflow-document-fact-find-small"><div class="document-inline-header"><div class="statement-letter-header"></div></div><div class="client-summary-grid"><h2>Services Requested</h2><div class="grid-items"><div class="grid-item"><span class="grid-label">Requested service</span><strong>Income Protection</strong></div></div></div><div class="client-summary-grid"><h2>Client Summary</h2></div><div class="document-section"><h2>Recommendation Section</h2><p>Income protection fact find draft generated for Test Client.</p></div><div class="document-section"><h2>Signatures and Record</h2><div class="fact-find-signing-block"><div class="fact-find-signature-row"><p class="fact-find-signature-value">&nbsp;</p></div></div></div><div class="document-section"><h2>Request for Information</h2><div class="fact-find-request-row"><div class="fact-find-request-field fact-find-request-field-signature"><p class="fact-find-request-value">&nbsp;</p><p class="fact-find-request-label">Client(s)</p></div><div class="fact-find-request-field fact-find-request-field-date fact-find-request-field-signature"><p class="fact-find-request-value">&nbsp;</p><p class="fact-find-request-label">Date</p></div></div><div class="fact-find-request-row"><div class="fact-find-request-field"><p class="fact-find-request-value">&nbsp;</p><p class="fact-find-request-label">Company:</p></div><div class="fact-find-request-field"><p class="fact-find-request-value">Income Protection</p><p class="fact-find-request-label">Policies:</p></div></div></div></article>';

    const draft = resolveFactFindDraft(profile);

    expect(draft.editedHtml).not.toContain("Recommendation Section");
    expect(draft.editedHtml).not.toContain("Income protection fact find draft generated for Test Client.");
  });

  it("rebuilds composed fact find html when income protection arrangement fields change", () => {
    const profile = cloneProfile("CLI-2026-0002");
    profile.documentDrafts["Fact Find"].lastGeneratedSections = [];
    profile.documentDrafts["Fact Find"].editedHtml =
      '<article class="workflow-document workflow-document-fact-find workflow-document-fact-find-all"><div class="document-inline-header"><div class="statement-letter-header"></div></div><div class="document-grid"><h2>Income Protection Arrangements</h2><div class="grid-items"><div class="grid-item"><span class="grid-label">No deferred provider</span><strong>Aviva</strong></div><div class="grid-item"><span class="grid-label">Deferred provider</span><strong>Not recorded</strong></div></div></div></article>';
    profile.incomeProtectionNoDeferredProvider = "Aviva";
    profile.incomeProtectionNoDeferredCurrentWeeklyCover = "200.00";
    profile.incomeProtectionNoDeferredMonthlyPremium = "200.00";
    profile.incomeProtectionNoDeferredCoverToAge65 = "Yes";
    profile.incomeProtectionDeferredProvider = "";
    profile.incomeProtectionDeferredCurrentWeeklyCover = "";
    profile.incomeProtectionDeferred13Weeks = "";
    profile.incomeProtectionDeferred26Weeks = "";
    profile.incomeProtectionDeferred52Weeks = "";
    profile.incomeProtectionDeferredCoverToAge60 = "";
    profile.incomeProtectionDeferredCoverToAge65 = "";
    profile.incomeProtectionDeferredMonthlyPremium = "";

    const draft = resolveFactFindDraft(profile);

    expect(draft.editedHtml).toContain("Income Protection Arrangements");
    expect(draft.editedHtml).toContain(">Aviva<");
    expect(draft.editedHtml).toContain("200.00");
    expect(draft.editedHtml).toContain(">65<");
    expect(draft.editedHtml).toContain('<span class="grid-label">No deferred provider</span><strong>Aviva</strong>');
    expect(draft.editedHtml).toContain('<span class="grid-label">No deferred current weekly cover</span><strong>200.00</strong>');
    expect(draft.editedHtml).toContain('<span class="grid-label">No deferred monthly premium</span><strong>200.00</strong>');
    expect(draft.editedHtml).toContain('<span class="grid-label">No deferred cover to age</span><strong>65</strong>');
  });
});

describe("resolveFactFindUpdateDraft", () => {
  it("rebuilds composed fact find update html when the new signing layout is missing", () => {
    const profile = cloneProfile("CLI-2026-0002");
    profile.documentDrafts["Fact Find Update"].editedHtml =
      '<article class="workflow-document workflow-document-fact-find-update"><div class="document-inline-header"><div class="statement-letter-header"></div></div><div class="document-section"><h2>Signatures and Record</h2></div></article>';

    const draft = resolveFactFindUpdateDraft(profile);

    expect(draft.editedHtml).toContain("fact-find-signing-block");
    expect(draft.editedHtml).toContain("FINANCIAL ADVISOR'S SIGNATURE");
  });

  it("rebuilds legacy non-composed fact find update html into the current workflow layout", () => {
    const profile = cloneProfile("CLI-2026-0002");
    profile.documentDrafts["Fact Find Update"].editedHtml =
      "<p>Legacy Fact Find Update output</p>";

    const draft = resolveFactFindUpdateDraft(profile);

    expect(draft.editedHtml).toContain("workflow-document-fact-find-update");
    expect(draft.editedHtml).toContain("fact-find-signing-block");
    expect(draft.editedHtml).not.toContain("Legacy Fact Find Update output");
  });

  it("rebuilds composed fact find update html when client summary still uses the old larger layout", () => {
    const profile = cloneProfile("CLI-2026-0002");
    profile.documentDrafts["Fact Find Update"].editedHtml =
      '<article class="workflow-document workflow-document-fact-find-update"><div class="document-inline-header"><div class="statement-letter-header"></div></div><div class="client-summary-grid"><h2>Client Summary</h2><div class="grid-items"><div class="grid-item"><span class="grid-label">Client</span><strong>Jamie Murphy</strong></div><div class="grid-item"><span class="grid-label">Reference</span><strong>CLI-2026-0002</strong></div><div class="grid-item"><span class="grid-label">Date of birth</span><strong>01/01/1990</strong></div><div class="grid-item"><span class="grid-label">Occupation</span><strong>Teacher</strong></div><div class="grid-item"><span class="grid-label">Advisor</span><strong>Omega Advisor</strong></div></div></div><div class="document-section"><h2>Signatures and Record</h2><div class="fact-find-signing-block"></div></div></article>';

    const draft = resolveFactFindUpdateDraft(profile);

    expect(draft.editedHtml).toContain('<span class="grid-label">Client</span>');
    expect(draft.editedHtml).toContain('<span class="grid-label">Reference</span>');
    expect(draft.editedHtml).toContain('<span class="grid-label">Advisor</span>');
    expect(draft.editedHtml).not.toContain("Date of birth");
    expect(draft.editedHtml).not.toContain("Occupation");
  });
});
