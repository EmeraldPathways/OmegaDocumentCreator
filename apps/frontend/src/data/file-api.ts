/**
 * Phase 4: Backend file upload / listing / download API.
 */

export type BackendFile = {
  id: string;
  client_id: string;
  original_filename: string;
  stored_filename: string;
  file_type: string | null;
  category: string;
  uploaded_by: string | null;
  uploaded_at: string | null;
  status: string;
  notes: string | null;
};

export async function uploadFile(
  clientReference: string,
  file: File,
  category?: string,
  workflow?: string,
): Promise<BackendFile> {
  const form = new FormData();
  form.append("file", file);
  if (category) {
    form.append("category", category);
  }
  if (workflow) {
    form.append("workflow", workflow);
  }

  const response = await fetch(
    `/clients/${encodeURIComponent(clientReference)}/files`,
    { method: "POST", body: form, credentials: "same-origin" },
  );

  if (!response.ok) {
    throw new Error(`Upload failed: ${response.status}`);
  }

  const payload = (await response.json()) as { item: BackendFile };
  return payload.item;
}

export async function listFiles(clientReference: string): Promise<BackendFile[]> {
  const response = await fetch(
    `/clients/${encodeURIComponent(clientReference)}/files`,
    { credentials: "same-origin" },
  );

  if (!response.ok) {
    throw new Error(`List files failed: ${response.status}`);
  }

  const payload = (await response.json()) as { items: BackendFile[] };
  return payload.items ?? [];
}

export async function downloadFile(
  clientReference: string,
  fileId: string,
  filename: string,
): Promise<void> {
  const response = await fetch(
    `/clients/${encodeURIComponent(clientReference)}/files/${encodeURIComponent(fileId)}/download`,
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

export async function deleteFile(
  clientReference: string,
  fileId: string,
): Promise<void> {
  const response = await fetch(
    `/clients/${encodeURIComponent(clientReference)}/files/${encodeURIComponent(fileId)}`,
    { method: "DELETE", credentials: "same-origin" },
  );

  if (!response.ok) {
    throw new Error(`Delete failed: ${response.status}`);
  }
}
