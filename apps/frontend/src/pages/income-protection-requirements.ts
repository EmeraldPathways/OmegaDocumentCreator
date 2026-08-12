import type { SeededClientProfile } from "../data/seeded-clients";

import { hasValue } from "./income-protection-helpers";

export type RequirementTarget = {
  tabId: string;
  sectionId?: string;
  fieldId: string;
};

export type WorkflowRequirement = {
  key: string;
  label: string;
  complete: boolean;
  location: string;
  target: RequirementTarget;
  helperText?: string;
};

export type SectionProgressItem = {
  id: string;
  title: string;
  completeCount: number;
  requiredCount: number;
  complete: boolean;
};

type FactFindRequirementsArgs = {
  draft: SeededClientProfile;
};

type StatementRequirementsArgs = {
  draft: SeededClientProfile;
  factFindGenerationRequirements: WorkflowRequirement[];
  effectiveIncomeProtectionDraft: SeededClientProfile;
  isIncomeProtectionDocumentFlow: boolean;
  statementHasSelectedQuote: boolean;
};

type QuoteRequirementsArgs = {
  draft: SeededClientProfile;
  effectiveIncomeProtectionDraft: SeededClientProfile;
  isPensionsQuoteWorkflow: boolean;
  quotePensionGender: string;
  quotePensionMonthlyContribution: string;
  quotePensionRequired: string;
  quotePensionRetirementAge: string;
};

type FactFindUpdateRequirementsArgs = {
  draft: SeededClientProfile;
  factFindGenerationRequirements: WorkflowRequirement[];
};

type ValidationMessageArgs = {
  draft: SeededClientProfile;
  effectiveIncomeProtectionDraft: SeededClientProfile;
  quotePensionGender: string;
  quotePensionMonthlyContribution: string;
  quotePensionRequired: string;
  quotePensionRetirementAge: string;
  statementHasSelectedQuote: boolean;
};

export function buildFactFindGenerationRequirements({
  draft,
}: FactFindRequirementsArgs): WorkflowRequirement[] {
  return [
    {
      key: "fullName",
      label: "Client name",
      complete: hasValue(draft.fullName),
      location: "Identity",
      target: { tabId: "fact-find", sectionId: "client-profile", fieldId: "ff-fullName" },
    },
    {
      key: "address",
      label: "Address (town/county)",
      complete: hasValue(`${draft.townCity ?? ""} ${draft.county ?? ""}`.trim()),
      location: "Home address",
      target: { tabId: "fact-find", sectionId: "client-profile", fieldId: "ff-townCity" },
      helperText: "Required for document",
    },
    {
      key: "dateOfBirth",
      label: "Date of birth",
      complete: hasValue(draft.dateOfBirth),
      location: "Identity",
      target: { tabId: "fact-find", sectionId: "client-profile", fieldId: "ff-dob" },
    },
    {
      key: "occupation",
      label: "Occupation",
      complete: hasValue(draft.occupation),
      location: "Employment details",
      target: { tabId: "fact-find", sectionId: "client-profile", fieldId: "ff-occupation" },
    },
    {
      key: "income",
      label: "Income / salary",
      complete: hasValue(draft.income),
      location: "Employment details",
      target: { tabId: "fact-find", sectionId: "client-profile", fieldId: "ff-income" },
    },
    {
      key: "email-or-phone",
      label: "Email or phone",
      complete: hasValue(draft.email) || hasValue(draft.mobileNumber),
      location: "Contact",
      target: {
        tabId: "fact-find",
        sectionId: "client-profile",
        fieldId: hasValue(draft.email) ? "ff-phone" : "ff-email",
      },
      helperText: "Provide either email or phone",
    },
    {
      key: "advisorName",
      label: "Advisor name",
      complete: hasValue(draft.advisorName),
      location: "Employment details",
      target: { tabId: "fact-find", sectionId: "client-profile", fieldId: "ff-advisorName" },
    },
  ];
}

export function buildStatementGenerationRequirements({
  draft,
  factFindGenerationRequirements,
  effectiveIncomeProtectionDraft,
  isIncomeProtectionDocumentFlow,
  statementHasSelectedQuote,
}: StatementRequirementsArgs): WorkflowRequirement[] {
  return [
    ...factFindGenerationRequirements.map((item) => ({
      ...item,
      target: item.key === "advisorName"
        ? { tabId: "statement-of-suitability", sectionId: "statement-form", fieldId: "sos-advisorName" }
        : item.target,
    })),
    {
      key: isIncomeProtectionDocumentFlow ? "policy-picker" : "statementType",
      label: isIncomeProtectionDocumentFlow ? "Policy picker" : "Statement type",
      complete: isIncomeProtectionDocumentFlow ? statementHasSelectedQuote : hasValue(draft.statementType),
      location: "Statement basics",
      target: {
        tabId: "statement-of-suitability",
        sectionId: "statement-form",
        fieldId: isIncomeProtectionDocumentFlow ? "sos-statementSelectedQuoteKey" : "sos-statementType",
      },
    },
    ...(isIncomeProtectionDocumentFlow
      ? []
      : [
          {
            key: "productType",
            label: "Product recommended",
            complete: hasValue(draft.productType),
            location: "Recommendation basics",
            target: { tabId: "statement-of-suitability", sectionId: "statement-form", fieldId: "sos-productType" },
          },
          {
            key: "recommendedCover",
            label: "Recommended cover",
            complete: hasValue(draft.recommendedCover),
            location: "Quote form",
            target: { tabId: "quote", sectionId: "quote-output", fieldId: "quote-annualCoverAmount" },
          },
          {
            key: "deferredPeriod",
            label: "Deferred period",
            complete: hasValue(draft.deferredPeriod),
            location: "Quote form",
            target: { tabId: "quote", sectionId: "quote-output", fieldId: "quote-deferredPeriod" },
          },
          {
            key: "coverAge",
            label: "Cover to age",
            complete: hasValue(draft.coverAge),
            location: "Quote form",
            target: { tabId: "quote", sectionId: "quote-output", fieldId: "quote-coverToAge" },
          },
        ]),
    {
      key: "smokerStatus",
      label: "Smoker status",
      complete: hasValue(effectiveIncomeProtectionDraft.smokerStatus),
      location: "Quote form",
      target: { tabId: "quote", sectionId: "quote-output", fieldId: "quote-smoker" },
    },
    {
      key: "phiOccupationalClass",
      label: "PHI occupational class",
      complete: hasValue(effectiveIncomeProtectionDraft.phiOccupationalClass),
      location: "Quote form",
      target: { tabId: "quote", sectionId: "quote-output", fieldId: "quote-occupationClass" },
    },
    {
      key: "phiIndexation",
      label: "PHI indexation",
      complete: hasValue(effectiveIncomeProtectionDraft.phiIndexation),
      location: "Quote form",
      target: { tabId: "quote", sectionId: "quote-output", fieldId: "quote-phiIndexation" },
    },
    {
      key: "letterDate",
      label: "Letter date",
      complete: hasValue(draft.letterDate),
      location: "Statement basics",
      target: { tabId: "statement-of-suitability", sectionId: "statement-form", fieldId: "sos-letterDate" },
    },
  ];
}

export function buildQuoteMissingFields({
  draft,
  effectiveIncomeProtectionDraft,
  isPensionsQuoteWorkflow,
  quotePensionGender,
  quotePensionMonthlyContribution,
  quotePensionRequired,
  quotePensionRetirementAge,
}: QuoteRequirementsArgs): string[] {
  return (isPensionsQuoteWorkflow
    ? [
        !hasValue(draft.fullName) ? "Client name" : null,
        !hasValue(draft.dateOfBirth) ? "Date of birth" : null,
        !hasValue(quotePensionGender) ? "Gender" : null,
        !hasValue(quotePensionRetirementAge) ? "Retirement age" : null,
        !hasValue(quotePensionRequired) ? "Required pension income" : null,
        !hasValue(quotePensionMonthlyContribution) ? "Monthly contribution" : null,
      ]
    : [
        !hasValue(draft.fullName) ? "Client name" : null,
        !hasValue(draft.dateOfBirth) ? "Date of birth" : null,
        !hasValue(draft.gender) ? "Gender" : null,
        !hasValue(effectiveIncomeProtectionDraft.recommendedCover) ? "Annual cover amount" : null,
        !hasValue(effectiveIncomeProtectionDraft.coverAge) ? "Cover to age" : null,
        !hasValue(effectiveIncomeProtectionDraft.phiOccupationalClass) ? "Occupation class" : null,
        !hasValue(effectiveIncomeProtectionDraft.deferredPeriod) ? "Deferred period" : null,
        !hasValue(effectiveIncomeProtectionDraft.smokerStatus) ? "Smoker" : null,
        !hasValue(effectiveIncomeProtectionDraft.phiIndexation) ? "PHI indexation" : null,
      ]).filter((value): value is string => value !== null);
}

export function buildQuoteGenerationRequirements({
  draft,
  effectiveIncomeProtectionDraft,
  isPensionsQuoteWorkflow,
  quotePensionGender,
  quotePensionMonthlyContribution,
  quotePensionRequired,
  quotePensionRetirementAge,
}: QuoteRequirementsArgs): WorkflowRequirement[] {
  return isPensionsQuoteWorkflow
    ? [
        { key: "fullName", label: "Client name", complete: hasValue(draft.fullName), location: "Quote form", target: { tabId: "quote", sectionId: "quote-output", fieldId: "quote-name" } },
        { key: "dateOfBirth", label: "Date of birth", complete: hasValue(draft.dateOfBirth), location: "Quote form", target: { tabId: "quote", sectionId: "quote-output", fieldId: "quote-dob" } },
        { key: "quote-pensionGender", label: "Gender", complete: hasValue(quotePensionGender), location: "Quote form", target: { tabId: "quote", sectionId: "quote-output", fieldId: "quote-pensionGender" } },
        { key: "quote-pensionRetirementAge", label: "Retirement age", complete: hasValue(quotePensionRetirementAge), location: "Quote form", target: { tabId: "quote", sectionId: "quote-output", fieldId: "quote-pensionRetirementAge" } },
        { key: "quote-pensionRequired", label: "Required pension income", complete: hasValue(quotePensionRequired), location: "Quote form", target: { tabId: "quote", sectionId: "quote-output", fieldId: "quote-pensionRequired" } },
        { key: "quote-pensionMonthlyContribution", label: "Monthly contribution", complete: hasValue(quotePensionMonthlyContribution), location: "Quote form", target: { tabId: "quote", sectionId: "quote-output", fieldId: "quote-pensionMonthlyContribution" } },
      ]
    : [
        { key: "fullName", label: "Client name", complete: hasValue(draft.fullName), location: "Quote form", target: { tabId: "quote", sectionId: "quote-output", fieldId: "quote-name" } },
        { key: "dateOfBirth", label: "Date of birth", complete: hasValue(draft.dateOfBirth), location: "Quote form", target: { tabId: "quote", sectionId: "quote-output", fieldId: "quote-dob" } },
        { key: "quote-gender", label: "Gender", complete: hasValue(draft.gender), location: "Fact Find", target: { tabId: "fact-find", sectionId: "client-profile", fieldId: "ff-gender" } },
        { key: "quote-annualCoverAmount", label: "Annual cover amount", complete: hasValue(effectiveIncomeProtectionDraft.recommendedCover), location: "Quote form", target: { tabId: "quote", sectionId: "quote-output", fieldId: "quote-annualCoverAmount" } },
        { key: "quote-coverToAge", label: "Cover to age", complete: hasValue(effectiveIncomeProtectionDraft.coverAge), location: "Quote form", target: { tabId: "quote", sectionId: "quote-output", fieldId: "quote-coverToAge" } },
        { key: "quote-occupationClass", label: "Occupation class", complete: hasValue(effectiveIncomeProtectionDraft.phiOccupationalClass), location: "Quote form", target: { tabId: "quote", sectionId: "quote-output", fieldId: "quote-occupationClass" } },
        { key: "quote-deferredPeriod", label: "Deferred period", complete: hasValue(effectiveIncomeProtectionDraft.deferredPeriod), location: "Quote form", target: { tabId: "quote", sectionId: "quote-output", fieldId: "quote-deferredPeriod" } },
        { key: "quote-smoker", label: "Smoker", complete: hasValue(effectiveIncomeProtectionDraft.smokerStatus), location: "Quote form", target: { tabId: "quote", sectionId: "quote-output", fieldId: "quote-smoker" } },
        { key: "quote-phiIndexation", label: "PHI indexation", complete: hasValue(effectiveIncomeProtectionDraft.phiIndexation), location: "Quote form", target: { tabId: "quote", sectionId: "quote-output", fieldId: "quote-phiIndexation" } },
      ];
}

export function buildFactFindUpdateGenerationRequirements({
  draft,
  factFindGenerationRequirements,
}: FactFindUpdateRequirementsArgs): WorkflowRequirement[] {
  return [
    ...factFindGenerationRequirements,
    {
      key: "factFindUpdatePersonalCircumstances",
      label: "Updated personal circumstances",
      complete: hasValue(draft.factFindUpdatePersonalCircumstances),
      location: "Additional relevant information",
      target: { tabId: "fact-find-update", sectionId: "additional-relevant-information", fieldId: "ffu-personalCircumstances" },
    },
  ];
}

export function buildValidationMessages({
  draft,
  effectiveIncomeProtectionDraft,
  quotePensionGender,
  quotePensionMonthlyContribution,
  quotePensionRequired,
  quotePensionRetirementAge,
  statementHasSelectedQuote,
}: ValidationMessageArgs): Record<string, string> {
  return {
    "ff-advisorName": hasValue(draft.advisorName) ? "" : "Advisor name is required for document generation.",
    "ff-county": hasValue(`${draft.townCity ?? ""} ${draft.county ?? ""}`.trim()) ? "" : "Town/county is required for document generation.",
    "ff-dob": hasValue(draft.dateOfBirth) ? "" : "Date of birth is required for document generation.",
    "ff-email": hasValue(draft.email) || hasValue(draft.mobileNumber) ? "" : "Provide either an email or a phone number.",
    "ff-fullName": hasValue(draft.fullName) ? "" : "Client name is required for document generation.",
    "ff-gender": hasValue(draft.gender) ? "" : "Gender is required for the downstream documents.",
    "ff-income": hasValue(draft.income) ? "" : "Income / salary is required for document generation.",
    "ff-occupation": hasValue(draft.occupation) ? "" : "Occupation is required for document generation.",
    "ff-phone": hasValue(draft.email) || hasValue(draft.mobileNumber) ? "" : "Provide either a phone number or an email address.",
    "ff-townCity": hasValue(`${draft.townCity ?? ""} ${draft.county ?? ""}`.trim()) ? "" : "Town/county is required for document generation.",
    "ffu-personalCircumstances": hasValue(draft.factFindUpdatePersonalCircumstances) ? "" : "Add updated personal circumstances before generating the update.",
    "quote-annualCoverAmount": hasValue(effectiveIncomeProtectionDraft.recommendedCover) ? "" : "Annual cover amount is required.",
    "quote-coverToAge": hasValue(effectiveIncomeProtectionDraft.coverAge) ? "" : "Cover to age is required.",
    "quote-deferredPeriod": hasValue(effectiveIncomeProtectionDraft.deferredPeriod) ? "" : "Deferred period is required.",
    "quote-occupationClass": hasValue(effectiveIncomeProtectionDraft.phiOccupationalClass) ? "" : "Occupation class is required.",
    "quote-phiIndexation": hasValue(effectiveIncomeProtectionDraft.phiIndexation) ? "" : "PHI indexation is required.",
    "quote-pensionGender": hasValue(quotePensionGender) ? "" : "Gender is required.",
    "quote-pensionMonthlyContribution": hasValue(quotePensionMonthlyContribution) ? "" : "Monthly contribution is required.",
    "quote-pensionRequired": hasValue(quotePensionRequired) ? "" : "Required pension income is required.",
    "quote-pensionRetirementAge": hasValue(quotePensionRetirementAge) ? "" : "Retirement age is required.",
    "quote-smoker": hasValue(effectiveIncomeProtectionDraft.smokerStatus) ? "" : "Smoker status is required.",
    "sos-advisorName": hasValue(draft.advisorName) ? "" : "Advisor name is required for document generation.",
    "sos-letterDate": hasValue(draft.letterDate) ? "" : "Letter date is required for the statement.",
    "sos-productType": hasValue(draft.productType) ? "" : "Product type is required.",
    "sos-statementSelectedQuoteKey": statementHasSelectedQuote ? "" : "Choose a policy before generating the statement.",
    "sos-statementType": hasValue(draft.statementType) ? "" : "Statement type is required.",
  };
}

export function buildFactFindSectionProgressItems(
  draft: SeededClientProfile,
  effectiveIncomeProtectionDraft: SeededClientProfile,
  factFindGenerationRequirements: WorkflowRequirement[],
): SectionProgressItem[] {
  return [
    {
      id: "client-profile",
      title: "Client profile",
      completeCount: [
        hasValue(draft.fullName),
        hasValue(draft.dateOfBirth),
        hasValue(draft.gender),
        hasValue(`${draft.townCity ?? ""} ${draft.county ?? ""}`.trim()),
        hasValue(draft.email) || hasValue(draft.mobileNumber),
        hasValue(draft.occupation),
        hasValue(draft.income),
        hasValue(draft.advisorName),
      ].filter(Boolean).length,
      requiredCount: 8,
      complete: factFindGenerationRequirements.every((item) => item.complete),
    },
    {
      id: "income-protection",
      title: "Income protection",
      completeCount: [
        hasValue(draft.incomeProtectionNoDeferredProvider),
        hasValue(draft.incomeProtectionNoDeferredMonthlyPremium),
        hasValue(draft.incomeProtectionDeferredProvider),
        hasValue(draft.incomeProtectionDeferredMonthlyPremium),
      ].filter(Boolean).length,
      requiredCount: 4,
      complete:
        hasValue(draft.incomeProtectionNoDeferredProvider) &&
        hasValue(draft.incomeProtectionNoDeferredMonthlyPremium) &&
        hasValue(draft.incomeProtectionDeferredProvider) &&
        hasValue(draft.incomeProtectionDeferredMonthlyPremium),
    },
  ];
}

export function buildFactFindUpdateSectionProgressItems(draft: SeededClientProfile): SectionProgressItem[] {
  return [
    {
      id: "additional-relevant-information",
      title: "Additional relevant information",
      completeCount: [hasValue(draft.factFindUpdatePersonalCircumstances)].filter(Boolean).length,
      requiredCount: 1,
      complete: hasValue(draft.factFindUpdatePersonalCircumstances),
    },
    {
      id: "client-declarations",
      title: "Client declarations, data protection & PEP confirmation",
      completeCount: [
        hasValue(draft.factFindUpdateExecutionOnlyBasis),
        hasValue(draft.factFindUpdateTermsReviewedReceived),
        hasValue(draft.doNotContact),
        hasValue(draft.agreeToMarketing),
        hasValue(draft.contactByPhone),
        hasValue(draft.contactBySms),
        hasValue(draft.contactByEmail),
        hasValue(draft.contactByPost),
        hasValue(draft.pepDeclarationConfirmed),
      ].filter(Boolean).length,
      requiredCount: 9,
      complete: [
        draft.factFindUpdateExecutionOnlyBasis,
        draft.factFindUpdateTermsReviewedReceived,
        draft.doNotContact,
        draft.agreeToMarketing,
        draft.contactByPhone,
        draft.contactBySms,
        draft.contactByEmail,
        draft.contactByPost,
        draft.pepDeclarationConfirmed,
      ].every(hasValue),
    },
  ];
}
