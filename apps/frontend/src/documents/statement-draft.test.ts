import { describe, expect, it } from "vitest";

import { getSeededClientProfile, type SeededClientProfile } from "../data/seeded-clients";
import { resolveStatementDraft } from "./statement-draft";

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
