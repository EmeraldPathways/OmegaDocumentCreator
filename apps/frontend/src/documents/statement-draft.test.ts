import { describe, expect, it } from "vitest";

import { getSeededClientProfile, type SeededClientProfile } from "../data/seeded-clients";
import { resolveFactFindDraft, resolveStatementDraft } from "./statement-draft";

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
});
