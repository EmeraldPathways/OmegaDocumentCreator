import type { IntegrationQuoteResult, IntegrationRequestArtifact } from "./document-types";

export type QuotePickerOption = {
  key: string;
  label: string;
  providerName: string;
  policyType: string;
};

function normalize(value: string | undefined) {
  return value?.trim().toLowerCase() ?? "";
}

export function buildQuotePickerKey(quote: Pick<IntegrationQuoteResult, "providerName" | "policyType">) {
  return `${normalize(quote.providerName)}::${normalize(quote.policyType)}`;
}

export function buildQuotePickerOptions(requests: IntegrationRequestArtifact[]): QuotePickerOption[] {
  const options: QuotePickerOption[] = [];
  const seenKeys = new Set<string>();

  requests.forEach((request) => {
    request.quoteResults.forEach((quote) => {
      const key = buildQuotePickerKey(quote);
      if (seenKeys.has(key)) {
        return;
      }

      seenKeys.add(key);
      options.push({
        key,
        label: [quote.providerName?.trim() || "Unknown provider", quote.policyType?.trim() || "Unspecified policy"].join(" | "),
        providerName: quote.providerName?.trim() ?? "",
        policyType: quote.policyType?.trim() ?? "",
      });
    });
  });

  return options;
}

export function findQuotePickerQuote(request: IntegrationRequestArtifact, selectedKey: string | undefined) {
  if (!selectedKey) {
    return null;
  }

  return request.quoteResults.find((quote) => buildQuotePickerKey(quote) === selectedKey) ?? null;
}
