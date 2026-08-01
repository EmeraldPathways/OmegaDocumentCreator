import { describe, expect, it } from "vitest";

import { createEmptyClientProfile } from "./seeded-clients";
import { mapBackendClientToSeeded, normalizeClient } from "./client-data-context";

describe("client data normalization", () => {
  it("does not inherit seeded demo values when normalizing an unknown client", () => {
    const normalized = normalizeClient(
      createEmptyClientProfile({
        clientReference: "CLI-2026-9999",
        firstName: "Jamie",
        surname: "New",
      }),
    );

    expect(normalized.clientReference).toBe("CLI-2026-9999");
    expect(normalized.firstName).toBe("Jamie");
    expect(normalized.surname).toBe("New");
    expect(normalized.fullName).toBe("");
    expect(normalized.partnerName).toBe("");
    expect(normalized.provider).toBe("");
    expect(normalized.recommendedCover).toBe("");
    expect(normalized.savedQuotes).toHaveLength(0);
    expect(normalized.documentDrafts.Quote.lastGeneratedHtml).toBe("");
  });

  it("does not map unknown backend clients onto CLI-2026-0001 defaults", () => {
    const mapped = mapBackendClientToSeeded({
      client_reference: "CLI-2026-9998",
      first_name: "Nora",
      surname: "Fresh",
      status: "Draft",
    });

    expect(mapped.clientReference).toBe("CLI-2026-9998");
    expect(mapped.firstName).toBe("Nora");
    expect(mapped.surname).toBe("Fresh");
    expect(mapped.partnerName).toBe("");
    expect(mapped.townCity).toBe("");
    expect(mapped.provider).toBe("");
    expect(mapped.recommendedCover).toBe("");
    expect(mapped.documentDrafts.Quote.lastGeneratedHtml).toBe("");
    expect(mapped.savedQuotes).toHaveLength(0);
  });
});
