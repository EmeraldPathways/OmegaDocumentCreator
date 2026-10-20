import { describe, expect, it } from "vitest";

import type { IntegrationRequestArtifact } from "./document-types";
import {
  buildQuotePickerOptions,
  buildQuotePickerKey,
  findQuotePickerQuote,
} from "./quote-picker-selection";

function request(deferredPeriod: string, premium: string): IntegrationRequestArtifact {
  return {
    provider: "BestAdvice",
    requestType: "Phi",
    status: "sent",
    requestedAt: "2026-10-20T10:00:00+00:00",
    requestFields: [{ label: "DeferredPeriod", value: deferredPeriod }],
    quoteResults: [
      { providerName: "Aviva", policyType: "Guaranteed", levelPremium: premium },
      { providerName: "Zurich Life", policyType: "Guaranteed", levelPremium: "120.00" },
    ],
    errors: [],
  };
}

describe("quote picker selection", () => {
  it("deduplicates provider and policy choices across deferred-period requests", () => {
    const options = buildQuotePickerOptions([request("4", "100.00"), request("8", "90.00")]);

    expect(options).toEqual([
      {
        key: "aviva::guaranteed",
        label: "Aviva | Guaranteed",
        providerName: "Aviva",
        policyType: "Guaranteed",
      },
      {
        key: "zurich life::guaranteed",
        label: "Zurich Life | Guaranteed",
        providerName: "Zurich Life",
        policyType: "Guaranteed",
      },
    ]);
  });

  it("finds the selected provider and policy in a different deferred-period request", () => {
    const requests = [request("4", "100.00"), request("8", "90.00")];
    const selectedKey = buildQuotePickerKey({ providerName: "Aviva", policyType: "Guaranteed" });

    expect(findQuotePickerQuote(requests[1], selectedKey)).toEqual({
      providerName: "Aviva",
      policyType: "Guaranteed",
      levelPremium: "90.00",
    });
  });
});
