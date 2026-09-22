import type { SeededClientProfile } from "./seeded-clients";
import type { GeneratedDocumentDraft, SupportedDocumentType } from "../documents/document-types";

export function mergeGeneratedDraftIntoProfile(
  profile: SeededClientProfile,
  documentType: SupportedDocumentType,
  nextDraft: Partial<Omit<GeneratedDocumentDraft, "selectedTemplateId">>,
) {
  return {
    ...profile,
    documentDrafts: {
      ...profile.documentDrafts,
      [documentType]: {
        ...profile.documentDrafts[documentType],
        ...nextDraft,
      },
    },
  } satisfies SeededClientProfile;
}
