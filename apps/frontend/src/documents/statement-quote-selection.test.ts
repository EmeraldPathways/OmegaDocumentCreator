import { describe, expect, it } from "vitest";

import { getSeededClientProfile } from "../data/seeded-clients";
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

  it("initializes the statement selected quote key on seeded profiles", () => {
    const profile = getSeededClientProfile("CLI-2026-0002");

    expect(profile.statementSelectedQuoteKey).toBeTypeOf("string");
  });
});
