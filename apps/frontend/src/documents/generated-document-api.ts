/**
 * Phase 5: Backend document history and download API.
 */

export type BackendGeneratedDocument = {
  id: string;
  client_id: string;
  document_type: string;
  document_name: string;
  docx_file_path: string | null;
  pdf_file_path: string | null;
  generated_by: string | null;
  generated_at: string | null;
  version: string | null;
  status: string;
  preview_title: string | null;
  preview_html: string | null;
};

export type CreateDocumentPayload = {
  document_id?: string;
  document_type: string;
  document_name?: string;
  version?: string;
  status?: string;
  preview_title?: string;
  preview_html?: string;
  workflow?: string;
};

export type CreateDocumentArtifact = {
  blob: Blob;
  filename: string;
  contentType: string;
};

export function parseDownloadFilename(
  disposition: string | null,
  fallback: string,
): string {
  const rawDisposition = disposition ?? "";
  const utf8Match = rawDisposition.match(/filename\*\s*=\s*UTF-8''([^;\n]+)/i);
  if (utf8Match?.[1]) {
    try {
      return decodeURIComponent(utf8Match[1]);
    } catch {
      return utf8Match[1];
    }
  }

  const plainMatch = rawDisposition.match(/filename\s*=\s*"?([^";\n]+)"?/i);
  if (plainMatch?.[1]) {
    return plainMatch[1];
  }

  return fallback;
}

export async function listDocuments(clientReference: string): Promise<BackendGeneratedDocument[]> {
  const response = await fetch(
    `/clients/${encodeURIComponent(clientReference)}/documents`,
    { credentials: "same-origin" },
  );

  if (!response.ok) {
    throw new Error(`List documents failed: ${response.status}`);
  }

  const payload = (await response.json()) as { items: BackendGeneratedDocument[] };
  return payload.items ?? [];
}

export async function createDocument(
  clientReference: string,
  payload: CreateDocumentPayload,
  artifact?: CreateDocumentArtifact,
): Promise<BackendGeneratedDocument> {
  let body: FormData | string;
  let headers: Record<string, string> | undefined;

  if (artifact) {
    const form = new FormData();
    if (payload.document_id) form.append("document_id", payload.document_id);
    form.append("document_type", payload.document_type);
    if (payload.document_name) form.append("document_name", payload.document_name);
    if (payload.version) form.append("version", payload.version);
    if (payload.status) form.append("status", payload.status);
    if (payload.preview_title) form.append("preview_title", payload.preview_title);
    if (payload.preview_html) form.append("preview_html", payload.preview_html);
    if (payload.workflow) form.append("workflow", payload.workflow);
    form.append("artifact", new File([artifact.blob], artifact.filename, { type: artifact.contentType }));
    body = form;
    headers = undefined;
  } else {
    body = JSON.stringify(payload);
    headers = { "Content-Type": "application/json" };
  }

  const response = await fetch(
    `/clients/${encodeURIComponent(clientReference)}/documents`,
    {
      method: "POST",
      headers,
      credentials: "same-origin",
      body,
    },
  );

  if (!response.ok) {
    throw new Error(`Create document failed: ${response.status}`);
  }

  const result = (await response.json()) as { item: BackendGeneratedDocument };
  return result.item;
}

export async function downloadDocument(
  clientReference: string,
  documentId: string,
  filename: string,
): Promise<void> {
  const response = await fetch(
    `/clients/${encodeURIComponent(clientReference)}/documents/${encodeURIComponent(documentId)}/download`,
    { credentials: "same-origin" },
  );

  if (!response.ok) {
    throw new Error(`Download failed: ${response.status}`);
  }

  const blob = await response.blob();
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement("a");
  anchor.href = url;
  anchor.download = filename;
  document.body.appendChild(anchor);
      anchor.click();
  document.body.removeChild(anchor);
  URL.revokeObjectURL(url);
}

export async function deleteDocument(
  clientReference: string,
  documentId: string,
): Promise<void> {
  const response = await fetch(
    `/clients/${encodeURIComponent(clientReference)}/documents/${encodeURIComponent(documentId)}`,
    { method: "DELETE", credentials: "same-origin" },
  );

  if (!response.ok) {
    throw new Error(`Delete document failed: ${response.status}`);
  }
}

export async function downloadDocumentPack(
  clientReference: string,
  documentIds?: string[],
): Promise<void> {
  const query = new URLSearchParams();
  (documentIds ?? []).forEach((documentId) => {
    if (documentId) {
      query.append("document_id", documentId);
    }
  });
  const suffix = query.toString() ? `?${query.toString()}` : "";
  const response = await fetch(
    `/clients/${encodeURIComponent(clientReference)}/documents/pack${suffix}`,
    { credentials: "same-origin" },
  );

  if (!response.ok) {
    if (response.status === 404) {
      throw new Error("No packable document artifacts found");
    }
    throw new Error(`Download pack failed: ${response.status}`);
  }

  const blob = await response.blob();
  const filename = parseDownloadFilename(
    response.headers.get("Content-Disposition"),
    `${clientReference}_documents.zip`,
  );

  const url = URL.createObjectURL(blob);
  const anchor = document.createElement("a");
  anchor.href = url;
  anchor.download = filename;
  document.body.appendChild(anchor);
  anchor.click();
  document.body.removeChild(anchor);
  URL.revokeObjectURL(url);
}
