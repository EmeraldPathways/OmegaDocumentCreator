import type {
  GeneratedDocumentSection,
  IntegrationRequestArtifact,
  SupportedDocumentType,
} from "./document-types";

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
  integrationRequests: IntegrationRequestArtifact[];
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
    integration_requests?: Array<{
      provider?: string;
      request_type?: string;
      status?: "sent" | "failed";
      requested_at?: string;
      request_fields?: Array<{ label?: string; value?: string }>;
      quote_results?: Array<{
        provider_name?: string;
        policy_type?: string;
        level_premium?: string;
        escalation_3_premium?: string;
        escalation_5_premium?: string;
      }>;
      errors?: string[];
    }>;
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
    "aside",
    "blockquote",
    "br",
    "div",
    "em",
    "footer",
    "header",
    "h1",
    "h2",
    "h3",
    "h4",
    "h5",
    "h6",
    "img",
    "li",
    "ol",
    "p",
    "section",
    "span",
    "strong",
    "ul",
  ]);
  const blockedTags = new Set(["iframe", "object", "script", "style", "svg", "template"]);
  const allowedAttributes = new Set(["alt", "class", "height", "src", "style", "title", "width"]);
  const allowedImageProtocols = ["data:", "blob:", "http:", "https:"];

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

    if (tagName === "img") {
      const sourceValue = sourceElement.getAttribute("src")?.trim() ?? "";
      if (!allowedImageProtocols.some((protocol) => sourceValue.startsWith(protocol))) {
        return;
      }
    }

    const sanitizedElement = sanitizedDocument.createElement(tagName);
    Array.from(sourceElement.attributes).forEach((attribute) => {
      const attributeName = attribute.name.toLowerCase();
      if (!allowedAttributes.has(attributeName)) {
        return;
      }

      if (attributeName === "src") {
        const value = attribute.value.trim();
        if (!allowedImageProtocols.some((protocol) => value.startsWith(protocol))) {
          return;
        }
      }

      sanitizedElement.setAttribute(attributeName, attribute.value);
    });
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

function normalizeIntegrationRequests(
  rawRequests:
    | Array<{
        provider?: string;
        request_type?: string;
        status?: "sent" | "failed";
        requested_at?: string;
        request_fields?: Array<{ label?: string; value?: string }>;
        quote_results?: Array<{
          provider_name?: string;
          policy_type?: string;
          level_premium?: string;
          escalation_3_premium?: string;
          escalation_5_premium?: string;
        }>;
        errors?: string[];
      }>
    | undefined,
): IntegrationRequestArtifact[] {
  return (rawRequests ?? []).map((request) => ({
    provider: request.provider ?? "BestAdvice",
    requestType: request.request_type ?? "Phi",
    status: request.status ?? "failed",
    requestedAt: request.requested_at ?? "",
    requestFields: (request.request_fields ?? []).map((field) => ({
      label: field.label ?? "",
      value: field.value ?? "",
    })),
    quoteResults: (request.quote_results ?? []).map((quote) => ({
      providerName: quote.provider_name ?? "",
      policyType: quote.policy_type ?? "",
      levelPremium: quote.level_premium ?? "",
      escalation3Premium: quote.escalation_3_premium ?? "",
      escalation5Premium: quote.escalation_5_premium ?? "",
    })),
    errors: request.errors ?? [],
  }));
}

export async function generateDocument({
  clientReference,
  documentType,
  templateId,
  workflowSnapshot,
}: GenerateDocumentRequest): Promise<GenerateDocumentResponseItem> {
  const requestInit: RequestInit = {
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
  };

  const response = await fetch("/documents/generate", requestInit);

  if (!response.ok) {
    if (response.status === 401) {
      throw new Error("Session expired. Please log in again.");
    }
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
    integrationRequests: normalizeIntegrationRequests(payload.item.integration_requests),
  };
}