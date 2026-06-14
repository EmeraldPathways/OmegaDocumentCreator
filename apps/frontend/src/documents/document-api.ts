import type { GeneratedDocumentSection, SupportedDocumentType } from "./document-types";

type GenerateDocumentRequest = {
  clientReference: string;
  documentType: SupportedDocumentType;
  templateId: string;
  workflowSnapshot: Record<string, unknown>;
};

type GenerateDocumentResponseItem = {
  title: string;
  summary: string;
  sections: GeneratedDocumentSection[];
  warnings: string[];
  generatedHtml: string;
};

type RawGeneratedSection = {
  id?: string;
  title?: string;
  summary?: string;
  bodyHtml?: string;
  body_html?: string;
};

type RawGenerateDocumentResponse = {
  item?: {
    title?: string;
    summary?: string;
    sections?: RawGeneratedSection[];
    warnings?: string[];
    generated_html?: string;
  };
};

export function sanitizeGeneratedHtml(html: string) {
  if (!html) {
    return "";
  }

  const parser = new DOMParser();
  const sourceDocument = parser.parseFromString(html, "text/html");
  const sanitizedDocument = document.implementation.createHTMLDocument("");
  const allowedTags = new Set([
    "article",
    "blockquote",
    "br",
    "div",
    "em",
    "h1",
    "h2",
    "h3",
    "h4",
    "h5",
    "h6",
    "li",
    "ol",
    "p",
    "section",
    "strong",
    "ul",
  ]);
  const blockedTags = new Set(["iframe", "object", "script", "style", "svg", "template"]);

  function appendSanitizedNode(sourceNode: ChildNode, targetNode: Node) {
    if (sourceNode.nodeType === Node.TEXT_NODE) {
      targetNode.appendChild(sanitizedDocument.createTextNode(sourceNode.textContent ?? ""));
      return;
    }

    if (sourceNode.nodeType !== Node.ELEMENT_NODE) {
      return;
    }

    const sourceElement = sourceNode as HTMLElement;
    const tagName = sourceElement.tagName.toLowerCase();

    if (blockedTags.has(tagName)) {
      return;
    }

    if (!allowedTags.has(tagName)) {
      sourceElement.childNodes.forEach((child) => appendSanitizedNode(child, targetNode));
      return;
    }

    const sanitizedElement = sanitizedDocument.createElement(tagName);
    sourceElement.childNodes.forEach((child) => appendSanitizedNode(child, sanitizedElement));
    targetNode.appendChild(sanitizedElement);
  }

  sourceDocument.body.childNodes.forEach((child) => appendSanitizedNode(child, sanitizedDocument.body));

  return sanitizedDocument.body.innerHTML;
}

function normalizeSections(sections: RawGeneratedSection[] | undefined): GeneratedDocumentSection[] {
  return (sections ?? []).map((section, index) => ({
    id: section.id ?? `section-${index + 1}`,
    title: section.title ?? `Section ${index + 1}`,
    bodyHtml: sanitizeGeneratedHtml(section.bodyHtml ?? section.body_html ?? ""),
    summary: section.summary,
  }));
}

export async function generateDocument({
  clientReference,
  documentType,
  templateId,
  workflowSnapshot,
}: GenerateDocumentRequest): Promise<GenerateDocumentResponseItem> {
  const response = await fetch("/documents/generate", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      client_reference: clientReference,
      document_type: documentType,
      template_id: templateId,
      workflow_snapshot: workflowSnapshot,
    }),
  });

  if (!response.ok) {
    throw new Error(`Document generation failed with status ${response.status}`);
  }

  const payload = (await response.json()) as RawGenerateDocumentResponse;
  if (!payload.item) {
    throw new Error("Document generation response did not include an item");
  }

  return {
    title: payload.item.title ?? documentType,
    summary: payload.item.summary ?? "",
    sections: normalizeSections(payload.item.sections),
    warnings: payload.item.warnings ?? [],
    generatedHtml: sanitizeGeneratedHtml(payload.item.generated_html ?? ""),
  };
}
