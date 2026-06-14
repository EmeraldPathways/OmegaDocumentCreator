import type { SeededClientProfile } from "../data/seeded-clients";
import type { SupportedDocumentType } from "./document-types";
import { composeWorkflowDocument, renderComposedDocumentHtml } from "./document-composer";

export type WorkflowDocumentType = SupportedDocumentType;

type BuiltDocument = {
  title: string;
  html: string;
};

export function buildWorkflowDocument(profile: SeededClientProfile, documentType: WorkflowDocumentType): BuiltDocument {
  const document = composeWorkflowDocument(profile, documentType);

  return {
    title: document.title,
    html: renderComposedDocumentHtml(document),
  };
}
