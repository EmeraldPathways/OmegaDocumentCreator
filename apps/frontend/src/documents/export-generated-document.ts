import type { SeededClientProfile } from "../data/seeded-clients";
import { sanitizeGeneratedHtml } from "./document-api";
import { exportHtmlToPdf } from "./pdf-export";
import { exportHtmlToWord } from "./word-export";
import { buildWorkflowDocument, type WorkflowDocumentType } from "./workflow-document-builders";

type ExportDocumentOverride = {
  html: string;
  title: string;
};

export type ExportDocumentArtifact = ExportDocumentOverride;

function normalizeHeadingText(value: string | null | undefined) {
  return (value ?? "").replace(/\s+/g, " ").trim().toLowerCase();
}

function isHeadingElement(element: Element) {
  return /^H[1-3]$/.test(element.tagName);
}

function getDirectHeadingElement(element: Element) {
  return Array.from(element.children).find(isHeadingElement) ?? null;
}

function getBlockBodyHtml(element: Element) {
  const heading = getDirectHeadingElement(element);

  if (!heading) {
    return element.innerHTML;
  }

  const clone = element.cloneNode(true) as Element;
  const cloneHeading = getDirectHeadingElement(clone);
  if (cloneHeading) {
    clone.removeChild(cloneHeading);
  }
  return clone.innerHTML;
}

function mergePreviewSectionsIntoComposedHtml(composedHtml: string, previewHtml: string) {
  if (typeof DOMParser === "undefined") {
    return previewHtml;
  }

  const parser = new DOMParser();
  const composedDocument = parser.parseFromString(composedHtml, "text/html");
  const previewDocument = parser.parseFromString(previewHtml, "text/html");
  const article = composedDocument.body.querySelector("article.workflow-document");

  if (!article) {
    return previewHtml;
  }

  const footer = article.querySelector("footer.signatures-footer");
  const previewBlocks = Array.from(previewDocument.body.children);

  previewBlocks.forEach((previewBlock) => {
    const previewHeading = normalizeHeadingText(getDirectHeadingElement(previewBlock)?.textContent);
    const targetBlock = previewHeading
      ? Array.from(article.querySelectorAll("section.document-section, aside.document-callout, footer.signatures-footer")).find(
          (candidate) => normalizeHeadingText(getDirectHeadingElement(candidate)?.textContent) === previewHeading,
        ) ?? null
      : null;

    if (targetBlock) {
      const targetHeading = getDirectHeadingElement(targetBlock)?.outerHTML ?? "";
      targetBlock.innerHTML = `${targetHeading}${getBlockBodyHtml(previewBlock)}`;
      return;
    }

    const importedBlock = composedDocument.importNode(previewBlock, true);
    if (footer) {
      article.insertBefore(importedBlock, footer);
      return;
    }
    article.appendChild(importedBlock);
  });

  return article.outerHTML;
}

function hasStructuredPreviewSections(previewHtml: string) {
  if (typeof DOMParser === "undefined") {
    return false;
  }

  const parser = new DOMParser();
  const previewDocument = parser.parseFromString(previewHtml, "text/html");

  return Array.from(previewDocument.body.children).some((element) => getDirectHeadingElement(element) !== null);
}

function resolveExportDocument(
  profile: SeededClientProfile,
  documentType: WorkflowDocumentType,
  override?: ExportDocumentArtifact,
) {
  const sanitizedProfile = {
    ...profile,
    documentDrafts: {
      ...profile.documentDrafts,
      [documentType]: {
        ...profile.documentDrafts[documentType],
        lastGeneratedHtml: sanitizeGeneratedHtml(profile.documentDrafts[documentType]?.lastGeneratedHtml ?? ""),
        lastGeneratedSections: (profile.documentDrafts[documentType]?.lastGeneratedSections ?? []).map((section) => ({
          ...section,
          bodyHtml: sanitizeGeneratedHtml(section.bodyHtml),
        })),
      },
    },
  } satisfies SeededClientProfile;
  const composedDocument = buildWorkflowDocument(sanitizedProfile, documentType);

  if (!override) {
    return composedDocument;
  }

  const sanitizedOverrideHtml = sanitizeGeneratedHtml(override.html);
  if (!sanitizedOverrideHtml) {
    return composedDocument;
  }

  const hasComposedShell =
    sanitizedOverrideHtml.includes("workflow-document") ||
    sanitizedOverrideHtml.includes("document-banner") ||
    sanitizedOverrideHtml.includes("signatures-footer");

  return {
    title: override.title,
    html:
      hasComposedShell || !hasStructuredPreviewSections(sanitizedOverrideHtml)
        ? sanitizedOverrideHtml
        : mergePreviewSectionsIntoComposedHtml(composedDocument.html, sanitizedOverrideHtml),
  };
}

export function buildExportDocumentArtifact(
  profile: SeededClientProfile,
  documentType: WorkflowDocumentType,
  override?: ExportDocumentArtifact,
): ExportDocumentArtifact {
  const document = resolveExportDocument(profile, documentType, override);

  return {
    title: document.title,
    html: document.html,
  };
}

export async function exportGeneratedDocument(
  profile: SeededClientProfile,
  documentType: WorkflowDocumentType,
  extension: "docx" | "pdf",
  filename: string,
  override?: ExportDocumentArtifact,
) {
  const document = resolveExportDocument(profile, documentType, override);

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
