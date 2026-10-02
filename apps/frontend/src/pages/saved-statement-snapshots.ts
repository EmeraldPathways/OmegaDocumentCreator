import type { SavedStatementSnapshot } from "../data/seeded-clients";
import { buildStatementQuoteOptions } from "../documents/statement-quote-selection";

export const MAX_SAVED_STATEMENT_SNAPSHOTS = 5;

export function formatSavedStatementPolicyLabel(snapshot: SavedStatementSnapshot) {
  const savedLabel = snapshot.policyPickerLabel.trim();
  if (savedLabel) {
    return savedLabel;
  }

  const selectedKey = snapshot.statementFields.statementSelectedQuoteKey;
  const derivedLabel = buildStatementQuoteOptions(snapshot.documentDraft.integrationRequests).find(
    (option) => option.key === selectedKey,
  )?.label;
  return derivedLabel || "Policy not selected";
}

export function appendSavedStatementSnapshot(
  existingSnapshots: SavedStatementSnapshot[],
  nextSnapshot: SavedStatementSnapshot,
) {
  return [nextSnapshot, ...existingSnapshots.filter((snapshot) => snapshot.id !== nextSnapshot.id)].slice(
    0,
    MAX_SAVED_STATEMENT_SNAPSHOTS,
  );
}
