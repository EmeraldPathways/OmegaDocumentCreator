import { describe, expect, it } from "vitest";

import { createSeededClientProfiles } from "../data/seeded-clients";
import { mergeIncomeProtectionQuoteFields } from "./income-protection-helpers";

describe("mergeIncomeProtectionQuoteFields", () => {
  it("overrides linked income protection fields with quote values", () => {
    const draft = createSeededClientProfiles()["CLI-2026-0002"];

    const merged = mergeIncomeProtectionQuoteFields(draft, {
      recommendedCover: "41000",
      coverAge: "60",
      phiOccupationalClass: "3",
      deferredPeriod: "26 weeks",
      smokerStatus: "Smoker",
      phiIndexation: "N",
    });

    expect(merged.recommendedCover).toBe("41000");
    expect(merged.coverAge).toBe("60");
    expect(merged.phiOccupationalClass).toBe("3");
    expect(merged.deferredPeriod).toBe("26 weeks");
    expect(merged.smokerStatus).toBe("Smoker");
    expect(merged.phiIndexation).toBe("N");
  });

  it("falls back to persisted draft values when quote fields are blank", () => {
    const draft = createSeededClientProfiles()["CLI-2026-0002"];

    const merged = mergeIncomeProtectionQuoteFields(draft, {
      recommendedCover: "",
      coverAge: "",
      phiOccupationalClass: "",
      deferredPeriod: "",
      smokerStatus: "",
      phiIndexation: "",
    });

    expect(merged.recommendedCover).toBe(draft.recommendedCover);
    expect(merged.coverAge).toBe(draft.coverAge);
    expect(merged.phiOccupationalClass).toBe(draft.phiOccupationalClass);
    expect(merged.deferredPeriod).toBe(draft.deferredPeriod);
    expect(merged.smokerStatus).toBe(draft.smokerStatus);
    expect(merged.phiIndexation).toBe(draft.phiIndexation);
  });
});
