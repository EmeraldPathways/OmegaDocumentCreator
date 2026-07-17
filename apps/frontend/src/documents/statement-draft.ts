import type { SeededClientProfile } from "../data/seeded-clients";
import type { GeneratedDocumentDraft, SupportedDocumentType } from "./document-types";
import { buildWorkflowEditorDocument } from "./workflow-document-builders";

const FACT_FIND_DOCUMENT_TYPE = "Fact Find" satisfies SupportedDocumentType;
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
  const shouldRebuildComposedHtml = hasComposedStatementHtml(editedHtml);

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

  if (!hasLegacyFactFindHeaderHtml(editedHtml)) {
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

  return profile.documentDrafts[documentType];
}
