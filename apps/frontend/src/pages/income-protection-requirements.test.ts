import { describe, expect, it } from "vitest";

import { createSeededClientProfiles } from "../data/seeded-clients";

import {
  buildFactFindGenerationRequirements,
  buildFactFindUpdateGenerationRequirements,
  buildQuoteGenerationRequirements,
  buildQuoteMissingFields,
  buildStatementGenerationRequirements,
} from "./income-protection-requirements";

function buildDraft() {
  return createSeededClientProfiles()["CLI-2026-0002"];
}

describe("income protection requirement mappings", () => {
  it("maps statement smoker and PHI fields back to the quote section", () => {
    const draft = buildDraft();
    draft.smokerStatus = "Non-Smoker";
    draft.phiOccupationalClass = "2";
    draft.phiIndexation = "Y";
    draft.statementSelectedQuoteKey = "policy-1";

    const factFindRequirements = buildFactFindGenerationRequirements({ draft });
    const requirements = buildStatementGenerationRequirements({
      draft,
      factFindGenerationRequirements: factFindRequirements,
      effectiveIncomeProtectionDraft: draft,
      isIncomeProtectionDocumentFlow: true,
      statementHasSelectedQuote: true,
    });

    expect(requirements.find((item) => item.key === "smokerStatus")?.target).toEqual({
      tabId: "quote",
      sectionId: "quote-output",
      fieldId: "quote-smoker",
    });
    expect(requirements.find((item) => item.key === "phiOccupationalClass")?.target).toEqual({
      tabId: "quote",
      sectionId: "quote-output",
      fieldId: "quote-occupationClass",
    });
    expect(requirements.find((item) => item.key === "phiIndexation")?.target).toEqual({
      tabId: "quote",
      sectionId: "quote-output",
      fieldId: "quote-phiIndexation",
    });
  });

  it("uses fact find update fields instead of the main fact find narrative fields", () => {
    const draft = buildDraft();
    draft.personalCircumstances = "main fact find";
    draft.factFindUpdatePersonalCircumstances = "";

    const requirements = buildFactFindUpdateGenerationRequirements({
      draft,
      factFindGenerationRequirements: buildFactFindGenerationRequirements({ draft }),
    });

    const updateRequirement = requirements.find((item) => item.key === "factFindUpdatePersonalCircumstances");
    expect(updateRequirement?.complete).toBe(false);
    expect(updateRequirement?.target).toEqual({
      tabId: "fact-find-update",
      sectionId: "additional-relevant-information",
      fieldId: "ffu-personalCircumstances",
    });
  });

  it("does not require gender for income protection quotes", () => {
    const draft = buildDraft();
    draft.gender = "";

    const requirements = buildQuoteGenerationRequirements({
      draft,
      effectiveIncomeProtectionDraft: draft,
      isPensionsQuoteWorkflow: false,
      quotePensionGender: "",
      quotePensionMonthlyContribution: "",
      quotePensionRequired: "",
      quotePensionRetirementAge: "",
    });

    expect(requirements.find((item) => item.key === "gender")).toBeUndefined();
  });

  it("keeps pensions quote requirements on the quote form only", () => {
    const draft = buildDraft();

    const requirements = buildQuoteGenerationRequirements({
      draft,
      effectiveIncomeProtectionDraft: draft,
      isPensionsQuoteWorkflow: true,
      quotePensionGender: "",
      quotePensionMonthlyContribution: "",
      quotePensionRequired: "",
      quotePensionRetirementAge: "",
    });

    expect(requirements.map((item) => item.target.tabId)).toEqual(["quote", "quote", "quote", "quote", "quote", "quote"]);
    expect(requirements.find((item) => item.key === "quote-pensionRetirementAge")?.target.fieldId).toBe(
      "quote-pensionRetirementAge",
    );
  });

  it("reports the expected missing fields for a pensions quote", () => {
    const draft = buildDraft();
    draft.fullName = "";
    draft.dateOfBirth = "";

    const missing = buildQuoteMissingFields({
      draft,
      effectiveIncomeProtectionDraft: draft,
      isPensionsQuoteWorkflow: true,
      quotePensionGender: "",
      quotePensionMonthlyContribution: "",
      quotePensionRequired: "",
      quotePensionRetirementAge: "",
    });

    expect(missing).toEqual([
      "Client name",
      "Date of birth",
      "Gender",
      "Retirement age",
      "Required pension income",
      "Monthly contribution",
    ]);
  });
});
