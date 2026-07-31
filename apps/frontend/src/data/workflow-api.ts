/**
 * Phase 3: Backend workflow persistence API.
 *
 * Replaces localStorage as the source of truth for Income Protection workflow state.
 */

import type { SeededClientProfile } from "./seeded-clients";

type SaveWorkflowOptions = {
  keepalive?: boolean;
};

export async function fetchWorkflow(clientReference: string): Promise<Partial<SeededClientProfile>> {
  const response = await fetch(`/clients/${encodeURIComponent(clientReference)}/workflow`);

  if (!response.ok) {
    if (response.status === 404) {
      return {};
    }
    throw new Error(`Failed to fetch workflow: ${response.status}`);
  }

  const payload = (await response.json()) as { item: Record<string, string> };
  return payload.item as Partial<SeededClientProfile>;
}

export async function saveWorkflow(
  clientReference: string,
  data: Partial<SeededClientProfile>,
  options?: SaveWorkflowOptions,
): Promise<void> {
  const response = await fetch(`/clients/${encodeURIComponent(clientReference)}/workflow`, {
    method: "PUT",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(data),
    keepalive: options?.keepalive ?? false,
  });

  if (!response.ok) {
    throw new Error(`Failed to save workflow: ${response.status}`);
  }
}
