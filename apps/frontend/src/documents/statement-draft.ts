import type { SeededClientProfile } from "../data/seeded-clients";
import type { GeneratedDocumentDraft, SupportedDocumentType } from "./document-types";
import { buildWorkflowEditorDocument } from "./workflow-document-builders";

const FACT_FIND_DOCUMENT_TYPE = "Fact Find" satisfies SupportedDocumentType;
const FACT_FIND_UPDATE_DOCUMENT_TYPE = "Fact Find Update" satisfies SupportedDocumentType;
const statementDocumentTypes = ["Statement of Suitability", "Pensions Statement"] as const satisfies SupportedDocumentType[];
type StatementDocumentType = (typeof statementDocumentTypes)[number];

function hasComposedStatementHtml(editedHtml: string) {
  return (
    editedHtml.includes("statement-document-body") &&
    statementDocumentTypes.some((documentType) =>
      editedHtml.includes(`workflow-document-${documentType.toLowerCase().replace(/\s+/g, "-")}`),
    )
  );
}

function hasLegacyFactFindHeaderHtml(editedHtml: string) {
  return (
    editedHtml.includes("workflow-document-fact-find")
    && editedHtml.includes("document-top-logo")
    && !editedHtml.includes("statement-letter-header")
  );
}

function hasComposedFactFindHtml(editedHtml: string) {
  return (
    editedHtml.includes("workflow-document-fact-find")
    && editedHtml.includes("statement-letter-header")
  );
}

function hasMatchingFactFindVariant(editedHtml: string, factFindType: string | undefined) {
  const normalizedType = factFindType === "small" ? "small" : "all";
  return editedHtml.includes(`workflow-document-fact-find-${normalizedType}`);
}

function hasCurrentStatementSignatureLayout(editedHtml: string) {
  return (
    editedHtml.includes("statement-signature-label") &&
    !editedHtml.includes("Amanda McLaughlin") &&
    editedHtml.indexOf("Declaration to be completed by Client:") > editedHtml.lastIndexOf("IMPORTANT INFORMATION:")
  );
}

function hasCurrentFactFindSigningLayout(editedHtml: string) {
  if (!editedHtml.includes("fact-find-signing-block")) {
    return false;
  }

  const signatureValues = Array.from(
    editedHtml.matchAll(/<p class="fact-find-signature-value">([\s\S]*?)<\/p>/g),
    (match) => match[1].trim(),
  );

  return signatureValues.length > 0 && signatureValues.every((value) => value === "&nbsp;");
}

function hasCurrentFactFindRequestLayout(editedHtml: string) {
  const requestRows = Array.from(
    editedHtml.matchAll(/<div class="fact-find-request-row">([\s\S]*?)<\/div>/g),
    (match) => match[1],
  );

  if (requestRows.length < 2) {
    return false;
  }

  const signingRow = requestRows[0];
  const companyPoliciesRow = requestRows[1];

  const signingValues = Array.from(
    signingRow.matchAll(/<p class="fact-find-request-value">([\s\S]*?)<\/p>/g),
    (match) => match[1].trim(),
  );

  const hasBlankSigningRow =
    signingValues.length === 2 &&
    signingValues.every((value) => value === "&nbsp;");

  const hasCompanyPoliciesTwoColumnRow =
    companyPoliciesRow.includes("Company:") &&
    companyPoliciesRow.includes("Policies:") &&
    Array.from(companyPoliciesRow.matchAll(/<div class="fact-find-request-field/g)).length === 2;

  return hasBlankSigningRow && hasCompanyPoliciesTwoColumnRow;
}

function hasCurrentFactFindServicesLayout(editedHtml: string) {
  const servicesHeading = editedHtml.indexOf("<h2>Services Requested</h2>");
  const clientSummaryHeading = editedHtml.indexOf("<h2>Client Summary</h2>");

  return (
    servicesHeading >= 0 &&
    clientSummaryHeading >= 0 &&
    servicesHeading < clientSummaryHeading &&
    editedHtml.includes('class="client-summary-grid"><h2>Services Requested</h2>') &&
    editedHtml.includes('<span class="grid-label">Requested service</span>')
  );
}

function hasCurrentFactFindLifeInsuranceLayout(editedHtml: string) {
  return editedHtml.includes("fact-find-life-insurance-card");
}

function hasCurrentFactFindPensionSelfLayout(editedHtml: string) {
  return editedHtml.includes("fact-find-pension-self-section");
}

function hasCurrentFactFindSavingsCommentsLayout(profile: SeededClientProfile, editedHtml: string) {
  const hasComments = hasNonDefaultFactFindValue(profile.savingsInvestmentComments, ["Not recorded"]);
  const hasCommentsTable = editedHtml.includes("fact-find-comments-table");
  return hasComments ? hasCommentsTable : !hasCommentsTable;
}

function hasNonDefaultFactFindValue(value: string | undefined, ignoredValues: string[] = []) {
  const normalized = value?.trim() ?? "";
  if (!normalized) {
    return false;
  }

  return !ignoredValues.some((ignored) => ignored.toLowerCase() === normalized.toLowerCase());
}

function hasFactFindSelfPensionContentForRebuild(profile: SeededClientProfile) {
  return [
    profile.selfRetirementAge,
    profile.selfRetirementIncomeTargetPercent,
    profile.selfEmployeeDirectorPensionYes,
    profile.selfEmployeeDirectorPensionNo,
    profile.selfEmployeeDirectorSchemeType,
    profile.selfEmployeeDirectorRetirementAge,
    profile.selfEmployeeDirectorEmployerContribution,
    profile.selfEmployeeDirectorPersonalContribution,
    profile.selfEmployeeDirectorYearsInForce,
    profile.selfPersonalPensionYes,
    profile.selfPersonalPensionNo,
    profile.selfPersonalPensionCompany,
    profile.selfPersonalPensionPolicyType,
    profile.selfPersonalPensionContribution,
    profile.selfPersonalPensionCurrentValue,
    profile.selfPersonalPensionYearsInForce,
  ].some((value) => hasNonDefaultFactFindValue(value));
}

function hasFactFindLifeInsuranceContentForRebuild(profile: SeededClientProfile) {
  return [
    profile.mortgageProtectionYes,
    profile.mortgageProtection,
    profile.personalInsurance,
    profile.keymanInsurance,
    profile.partnershipInsurance,
    profile.selfLifeInsuranceAmount,
    profile.partnerLifeInsuranceAmount,
    profile.selfSeriousIllnessAmount,
    profile.partnerSeriousIllnessAmount,
  ].some((value) => hasNonDefaultFactFindValue(value, ["No"]));
}

function hasUnexpectedFactFindRecommendationSection(draft: GeneratedDocumentDraft) {
  const editedHtml = draft.editedHtml.trim();
  if (!editedHtml.includes("<h2>Recommendation Section</h2>")) {
    return false;
  }

  return !draft.lastGeneratedSections.some((section) => {
    const haystack = `${section.id} ${section.title}`.toLowerCase();
    return haystack.includes("recommendation") || haystack.includes("issue");
  });
}

function hasComposedFactFindUpdateHtml(editedHtml: string) {
  return (
    editedHtml.includes("workflow-document-fact-find-update") &&
    editedHtml.includes("statement-letter-header")
  );
}

function isLegacyFactFindDraft(draft: GeneratedDocumentDraft) {
  const editedHtml = draft.editedHtml.trim();
  return editedHtml.length > 0 && !hasComposedFactFindHtml(editedHtml);
}

function isLegacyFactFindUpdateDraft(draft: GeneratedDocumentDraft) {
  const editedHtml = draft.editedHtml.trim();
  return editedHtml.length > 0 && !hasComposedFactFindUpdateHtml(editedHtml);
}

export function isLegacyStatementDraft(draft: GeneratedDocumentDraft) {
  const editedHtml = draft.editedHtml.trim();
  const hasComposedHtml = hasComposedStatementHtml(editedHtml);

  if (hasComposedHtml) {
    return false;
  }

  const recommendationSection = draft.lastGeneratedSections[0];
  const hasLegacyPlaceholderSection =
    draft.lastGeneratedSections.length === 1 &&
    !!recommendationSection &&
    recommendationSection.title.toLowerCase().includes("recommendation") &&
    /statement of suitability prepared for/i.test(recommendationSection.bodyHtml);

  const hasNonComposedEditedHtml = editedHtml.length > 0 && !hasComposedHtml;

  return (
    hasLegacyPlaceholderSection ||
    /statement of suitability prepared for/i.test(draft.lastGeneratedHtml) ||
    hasNonComposedEditedHtml
  );
}

export function resolveStatementDraft(
  profile: SeededClientProfile,
  documentType: StatementDocumentType = "Statement of Suitability",
): GeneratedDocumentDraft {
  const statementDraft = profile.documentDrafts[documentType];
  const editedHtml = statementDraft.editedHtml.trim();
  const shouldRebuildComposedHtml =
    hasComposedStatementHtml(editedHtml) &&
    !hasCurrentStatementSignatureLayout(editedHtml);

  if (!isLegacyStatementDraft(statementDraft) && !shouldRebuildComposedHtml) {
    return statementDraft;
  }

  const statementProfile = {
    ...profile,
    documentDrafts: {
      ...profile.documentDrafts,
      [documentType]: {
        ...statementDraft,
        editedHtml: "",
      },
    },
  } satisfies SeededClientProfile;

  return {
    ...statementDraft,
    editedHtml: buildWorkflowEditorDocument(statementProfile, documentType).html,
  };
}

export function resolveFactFindDraft(profile: SeededClientProfile): GeneratedDocumentDraft {
  const factFindDraft = profile.documentDrafts[FACT_FIND_DOCUMENT_TYPE];
  const editedHtml = factFindDraft.editedHtml.trim();
  const hasComposedHtml = hasComposedFactFindHtml(editedHtml);
  const shouldRebuildComposedHtml =
    hasComposedHtml && (
      !hasMatchingFactFindVariant(editedHtml, profile.factFindType) ||
      !hasCurrentFactFindSigningLayout(editedHtml) ||
      !hasCurrentFactFindRequestLayout(editedHtml) ||
      !hasCurrentFactFindServicesLayout(editedHtml) ||
      !hasCurrentFactFindSavingsCommentsLayout(profile, editedHtml) ||
      (hasFactFindLifeInsuranceContentForRebuild(profile) && !hasCurrentFactFindLifeInsuranceLayout(editedHtml)) ||
      (hasFactFindSelfPensionContentForRebuild(profile) && !hasCurrentFactFindPensionSelfLayout(editedHtml)) ||
      hasUnexpectedFactFindRecommendationSection(factFindDraft)
    );

  if (!hasLegacyFactFindHeaderHtml(editedHtml) && !isLegacyFactFindDraft(factFindDraft) && !shouldRebuildComposedHtml && !hasComposedHtml) {
    return factFindDraft;
  }

  const factFindProfile = {
    ...profile,
    documentDrafts: {
      ...profile.documentDrafts,
      [FACT_FIND_DOCUMENT_TYPE]: {
        ...factFindDraft,
        editedHtml: "",
      },
    },
  } satisfies SeededClientProfile;

  return {
    ...factFindDraft,
    editedHtml: buildWorkflowEditorDocument(factFindProfile, FACT_FIND_DOCUMENT_TYPE).html,
  };
}

export function resolveFactFindUpdateDraft(profile: SeededClientProfile): GeneratedDocumentDraft {
  const factFindUpdateDraft = profile.documentDrafts[FACT_FIND_UPDATE_DOCUMENT_TYPE];
  const editedHtml = factFindUpdateDraft.editedHtml.trim();
  const shouldRebuildComposedHtml =
    hasComposedFactFindUpdateHtml(editedHtml) &&
    !hasCurrentFactFindSigningLayout(editedHtml);

  if (!isLegacyFactFindUpdateDraft(factFindUpdateDraft) && !shouldRebuildComposedHtml) {
    return factFindUpdateDraft;
  }

  const factFindUpdateProfile = {
    ...profile,
    documentDrafts: {
      ...profile.documentDrafts,
      [FACT_FIND_UPDATE_DOCUMENT_TYPE]: {
        ...factFindUpdateDraft,
        editedHtml: "",
      },
    },
  } satisfies SeededClientProfile;

  return {
    ...factFindUpdateDraft,
    editedHtml: buildWorkflowEditorDocument(factFindUpdateProfile, FACT_FIND_UPDATE_DOCUMENT_TYPE).html,
  };
}

export function resolveWorkspaceDocumentDraft(
  profile: SeededClientProfile,
  documentType: SupportedDocumentType,
): GeneratedDocumentDraft {
  if (statementDocumentTypes.includes(documentType as StatementDocumentType)) {
    return resolveStatementDraft(profile, documentType as StatementDocumentType);
  }

  if (documentType === FACT_FIND_DOCUMENT_TYPE) {
    return resolveFactFindDraft(profile);
  }

  if (documentType === FACT_FIND_UPDATE_DOCUMENT_TYPE) {
    return resolveFactFindUpdateDraft(profile);
  }

  return profile.documentDrafts[documentType];
}
