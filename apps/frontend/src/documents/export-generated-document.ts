import type { SeededClientProfile } from "../data/seeded-clients";
import { sanitizeGeneratedHtml } from "./document-api";
import { buildPdfBlobFromHtml, exportHtmlToPdf } from "./pdf-export";
import { buildWordBlobFromHtml, exportHtmlToWord } from "./word-export";
import { buildWorkflowDocument, type WorkflowDocumentType } from "./workflow-document-builders";
import { resolveDraftPreviewHtml } from "./document-preview";

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

function buildHeadingPreviewBlocks(previewDocument: Document) {
  const blocks: HTMLElement[] = [];
  let currentBlock: HTMLElement | null = null;

  Array.from(previewDocument.body.children).forEach((element) => {
    if (isHeadingElement(element) && /H[23]/.test(element.tagName)) {
      if (currentBlock && currentBlock.children.length > 0) {
        blocks.push(currentBlock);
      }

      currentBlock = previewDocument.createElement("section");
      currentBlock.appendChild(element.cloneNode(true));
      return;
    }

    if (!currentBlock) {
      return;
    }

    currentBlock.appendChild(element.cloneNode(true));
  });

  if (currentBlock !== null) {
    blocks.push(currentBlock);
  }

  return blocks;
}

function getPreviewBlocks(previewDocument: Document) {
  const structuredBlocks = Array.from(previewDocument.body.children).filter((element) => getDirectHeadingElement(element) !== null);

  if (structuredBlocks.length > 0) {
    return structuredBlocks;
  }

  return buildHeadingPreviewBlocks(previewDocument);
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
  const previewBlocks = getPreviewBlocks(previewDocument);

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

  return getPreviewBlocks(previewDocument).length > 0;
}

function resolveExportDocument(
  profile: SeededClientProfile,
  documentType: WorkflowDocumentType,
  override?: ExportDocumentArtifact,
) {
  const sanitizedDraft = {
    ...profile.documentDrafts[documentType],
    lastGeneratedHtml: sanitizeGeneratedHtml(profile.documentDrafts[documentType]?.lastGeneratedHtml ?? ""),
    lastGeneratedSections: (profile.documentDrafts[documentType]?.lastGeneratedSections ?? []).map((section) => ({
      ...section,
      bodyHtml: sanitizeGeneratedHtml(section.bodyHtml),
    })),
    editedHtml: sanitizeGeneratedHtml(profile.documentDrafts[documentType]?.editedHtml ?? ""),
  };
  const sanitizedProfile = {
    ...profile,
    documentDrafts: {
      ...profile.documentDrafts,
      [documentType]: sanitizedDraft,
    },
  } satisfies SeededClientProfile;
  const composedDocument = buildWorkflowDocument(sanitizedProfile, documentType);

  if (!override) {
    const draftPreviewHtml = resolveDraftPreviewHtml(sanitizedDraft);
    if (!draftPreviewHtml) {
      return composedDocument;
    }

    return {
      title: documentType,
      html:
        draftPreviewHtml.includes("workflow-document") || !hasStructuredPreviewSections(draftPreviewHtml)
          ? draftPreviewHtml
          : mergePreviewSectionsIntoComposedHtml(composedDocument.html, draftPreviewHtml),
    };
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
    return exportHtmlToPdf(document.html, filename);
  }

  return exportHtmlToWord(document.html, filename, {
    title: document.title,
    author: "Omega Financial Management",
    subject: document.title,
  });
}

export async function buildGeneratedDocumentBlob(
  profile: SeededClientProfile,
  documentType: WorkflowDocumentType,
  extension: "docx" | "pdf",
  filename: string,
  override?: ExportDocumentArtifact,
) {
  const document = resolveExportDocument(profile, documentType, override);

  if (extension === "pdf") {
    return buildPdfBlobFromHtml(document.html);
  }

  return buildWordBlobFromHtml(document.html, filename, {
    title: document.title,
    author: "Omega Financial Management",
    subject: document.title,
  });
}
