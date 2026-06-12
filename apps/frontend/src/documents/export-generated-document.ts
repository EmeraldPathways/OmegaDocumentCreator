import type { SeededClientProfile } from "../data/seeded-clients";
import { exportHtmlToPdf } from "./pdf-export";
import { exportHtmlToWord } from "./word-export";
import { buildWorkflowDocument, type WorkflowDocumentType } from "./workflow-document-builders";

export async function exportGeneratedDocument(
  profile: SeededClientProfile,
  documentType: WorkflowDocumentType,
  extension: "docx" | "pdf",
  filename: string,
) {
  const document = buildWorkflowDocument(profile, documentType);

  if (extension === "pdf") {
    await exportHtmlToPdf(document.html, filename);
    return;
  }

  await exportHtmlToWord(document.html, filename, {
    title: document.title,
    author: "Omega Financial Management",
    subject: document.title,
  });
}
