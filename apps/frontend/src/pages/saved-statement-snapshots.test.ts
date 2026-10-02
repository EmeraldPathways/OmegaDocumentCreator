import { describe, expect, it } from "vitest";

import type { SavedStatementSnapshot } from "../data/seeded-clients";

import { appendSavedStatementSnapshot, formatSavedStatementPolicyLabel } from "./saved-statement-snapshots";

function snapshot(id: string): SavedStatementSnapshot {
  return {
    id,
    name: `Statement ${id}`,
    documentType: "Statement of Suitability",
    selectedTemplateId: "statement-default",
    createdAt: `2026-10-02T10:${id}:00.000Z`,
    updatedAt: `2026-10-02T10:${id}:00.000Z`,
    policyPickerLabel: "Irish Life | Income Protection | €81.92",
    statementFields: {},
    documentDraft: {
      selectedTemplateId: "statement-default",
      generationStatus: "idle",
      backendDocumentId: null,
      lastGeneratedHtml: "",
      lastGeneratedSections: [],
      integrationRequests: [],
      editedHtml: "",
    },
  };
}

describe("saved statement snapshots", () => {
  it("keeps the five newest explicit SOS saves", () => {
    const saved = Array.from({ length: 6 }, (_, index) => snapshot(String(index + 1))).reduce(
      (current, next) => appendSavedStatementSnapshot(current, next),
      [] as SavedStatementSnapshot[],
    );

    expect(saved.map((entry) => entry.id)).toEqual(["6", "5", "4", "3", "2"]);
  });

  it("returns the saved policy picker information for the SOS entry", () => {
    expect(formatSavedStatementPolicyLabel(snapshot("1"))).toBe("Irish Life | Income Protection | €81.92");
  });

  it("derives policy picker information for an older snapshot without the saved label", () => {
    const legacySnapshot = snapshot("legacy");
    legacySnapshot.policyPickerLabel = "";
    legacySnapshot.statementFields = { statementSelectedQuoteKey: "0::0::Irish Life::Income Protection::" };
    legacySnapshot.documentDraft.integrationRequests = [
      {
        provider: "Irish Life",
        requestType: "quote",
        status: "sent",
        requestedAt: "2026-10-02T10:00:00.000Z",
        requestFields: [],
        quoteResults: [{ providerName: "Irish Life", policyType: "Income Protection", levelPremium: "" }],
        errors: [],
      },
    ];

    expect(formatSavedStatementPolicyLabel(legacySnapshot)).toBe("Irish Life | Income Protection | No premium");
  });
});
