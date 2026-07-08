import type { SeededClientProfile } from "../data/seeded-clients";
import type { GeneratedDocumentDraft, SupportedDocumentType } from "./document-types";
import { buildWorkflowEditorDocument } from "./workflow-document-builders";

const STATEMENT_DOCUMENT_TYPE = "Statement of Suitability" satisfies SupportedDocumentType;

export function isLegacyStatementDraft(draft: GeneratedDocumentDraft) {
  const editedHtml = draft.editedHtml.trim();
  const hasComposedStatementHtml =
    editedHtml.includes("workflow-document-statement-of-suitability") && editedHtml.includes("statement-document-body");

  if (hasComposedStatementHtml) {
    return false;
  }

  const recommendationSection = draft.lastGeneratedSections[0];
  const hasLegacyPlaceholderSection =
    draft.lastGeneratedSections.length === 1 &&
    !!recommendationSection &&
    recommendationSection.title.toLowerCase().includes("recommendation") &&
    /statement of suitability prepared for/i.test(recommendationSection.bodyHtml);

  const hasNonComposedEditedHtml = editedHtml.length > 0 && !hasComposedStatementHtml;

  return (
    hasLegacyPlaceholderSection ||
    /statement of suitability prepared for/i.test(draft.lastGeneratedHtml) ||
    hasNonComposedEditedHtml
  );
}

export function resolveStatementDraft(profile: SeededClientProfile): GeneratedDocumentDraft {
  const statementDraft = profile.documentDrafts[STATEMENT_DOCUMENT_TYPE];

  if (!isLegacyStatementDraft(statementDraft)) {
    return statementDraft;
  }

  const statementProfile = {
    ...profile,
    documentDrafts: {
      ...profile.documentDrafts,
      [STATEMENT_DOCUMENT_TYPE]: {
        ...statementDraft,
        editedHtml: "",
      },
    },
  } satisfies SeededClientProfile;

  return {
    ...statementDraft,
    editedHtml: buildWorkflowEditorDocument(statementProfile, STATEMENT_DOCUMENT_TYPE).html,
  };
}

export function resolveWorkspaceDocumentDraft(
  profile: SeededClientProfile,
  documentType: SupportedDocumentType,
): GeneratedDocumentDraft {
  if (documentType !== STATEMENT_DOCUMENT_TYPE) {
    return profile.documentDrafts[documentType];
  }

  return resolveStatementDraft(profile);
}
