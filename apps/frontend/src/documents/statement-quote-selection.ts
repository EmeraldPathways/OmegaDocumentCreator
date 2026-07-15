import type { IntegrationQuoteResult, IntegrationRequestArtifact } from "./document-types";

export type StatementQuoteOption = {
  key: string;
  label: string;
  providerName: string;
  policyType: string;
  levelPremium: string;
  requestIndex: number;
  quoteIndex: number;
};

function formatEuroLabel(value: string | undefined) {
  const normalized = value?.trim() ?? "";
  if (!normalized) {
    return "No premium";
  }

  const parsed = Number(normalized);
  if (!Number.isFinite(parsed)) {
    return normalized;
  }

  return `€${parsed.toFixed(2)}`;
}

export function buildStatementQuoteKey(
  requestIndex: number,
  quoteIndex: number,
  quote: IntegrationQuoteResult,
) {
  return [
    requestIndex,
    quoteIndex,
    quote.providerName?.trim() ?? "",
    quote.policyType?.trim() ?? "",
    quote.levelPremium?.trim() ?? "",
  ].join("::");
}

export function buildStatementQuoteOptions(requests: IntegrationRequestArtifact[]): StatementQuoteOption[] {
  return requests.flatMap((request, requestIndex) =>
    request.quoteResults.map((quote, quoteIndex) => ({
      key: buildStatementQuoteKey(requestIndex, quoteIndex, quote),
      label: [
        quote.providerName?.trim() || "Unknown provider",
        quote.policyType?.trim() || "Unspecified policy",
        formatEuroLabel(quote.levelPremium),
      ].join(" | "),
      providerName: quote.providerName?.trim() ?? "",
      policyType: quote.policyType?.trim() ?? "",
      levelPremium: quote.levelPremium?.trim() ?? "",
      requestIndex,
      quoteIndex,
    })),
  );
}

export function findStatementQuoteOption(
  requests: IntegrationRequestArtifact[],
  selectedKey: string | undefined,
) {
  if (!selectedKey) {
    return null;
  }

  return buildStatementQuoteOptions(requests).find((option) => option.key === selectedKey) ?? null;
}
