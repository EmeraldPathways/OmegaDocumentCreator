import type { SeededClientProfile } from "../data/seeded-clients";
import type {
  ComposedBlock,
  ComposedDocument,
  GeneratedDocumentSection,
  IntegrationRequestArtifact,
  IntegrationQuoteResult,
  SupportedDocumentType,
} from "./document-types";
import { OMEGA_LOGO_DATA_URI } from "./omega-logo";
import { findStatementQuoteOption } from "./statement-quote-selection";

type StatementRecommendationProfile = SeededClientProfile &
  Partial<{
    zurichDiscountActive: string;
    discountApplied: string;
    taxReliefPercentage: string;
    affordabilityDiscussed: string;
    clientHappyToProceed: string;
  }>;

function escapeHtml(value: string) {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

function valueOrFallback(value: string | undefined, fallback = "Not recorded") {
  const trimmedValue = value?.trim() ?? "";
  return trimmedValue.length > 0 ? trimmedValue : fallback;
}

function paragraphHtml(value: string | undefined, fallback = "Not recorded.") {
  return `<p>${escapeHtml(valueOrFallback(value, fallback)).replace(/\r?\n/g, "<br />")}</p>`;
}

function listHtml(items: string[], emptyText = "No items recorded.") {
  const values = items.map((item) => item.trim()).filter((item) => item.length > 0);

  if (values.length === 0) {
    return `<p>${escapeHtml(emptyText)}</p>`;
  }

  return `<ul>${values.map((item) => `<li>${escapeHtml(item)}</li>`).join("")}</ul>`;
}

function yesNoValue(value: string | undefined) {
  return value?.trim() === "Yes" ? "Yes" : "No";
}

function checkedItemLabels(items: Array<{ label: string; value: string | undefined }>) {
  return items.filter((item) => item.value?.trim() === "Yes").map((item) => item.label);
}

function addressSummary(...lines: Array<string | undefined>) {
  return lines.map((line) => line?.trim() ?? "").filter(Boolean).join(", ");
}

function formatDocumentDate(value: string | undefined) {
  const trimmedValue = value?.trim() ?? "";
  if (!trimmedValue) {
    return "";
  }

  const match = trimmedValue.match(/^(\d{4})-(\d{2})-(\d{2})$/);
  if (match) {
    const [, year, month, day] = match;
    return `${day}/${month}/${year}`;
  }

  return trimmedValue;
}

function summaryGridItems(profile: SeededClientProfile, documentType: SupportedDocumentType) {
  const commonItems = [
    { label: "Client", value: profile.fullName },
    { label: "Reference", value: profile.clientReference },
    { label: "Date of birth", value: formatDocumentDate(profile.dateOfBirth) },
    { label: "Occupation", value: profile.occupation },
    { label: "Advisor", value: profile.advisorName },
  ];

  if (documentType === "Terms of Business") {
    return [
      ...commonItems,
      { label: "Terms version", value: profile.termsVersion },
      { label: "Delivery method", value: profile.termsDeliveryMethod },
      { label: "Issued by", value: profile.termsIssuedBy },
    ];
  }

  return [
    ...commonItems,
    { label: "Recommended cover", value: profile.recommendedCover },
    { label: "Deferred period", value: profile.deferredPeriod },
    { label: "Cover to age", value: profile.coverAge },
    { label: "Smoker status", value: profile.smokerStatus },
    { label: "Occupation class", value: profile.phiOccupationalClass },
  ];
}

function detailGrid(title: string, items: Array<{ label: string; value: string }>, className?: string): ComposedBlock {
  return {
    kind: "grid",
    title,
    className,
    items,
  };
}

function lineValueHtml(value: string | undefined) {
  const trimmedValue = value?.trim() ?? "";
  return trimmedValue.length > 0 ? escapeHtml(trimmedValue) : "&nbsp;";
}

function isStatementDocumentType(documentType: SupportedDocumentType) {
  return documentType === "Statement of Suitability" || documentType === "Pensions Statement";
}

function isQuoteDocumentType(documentType: SupportedDocumentType) {
  return documentType === "Quote" || documentType === "Pensions Quote";
}

function resolveQuoteDocumentType(documentType: SupportedDocumentType) {
  return documentType === "Pensions Quote" || documentType === "Pensions Statement" ? "Pensions Quote" : "Quote";
}

function resolveStatementDocumentType(documentType: SupportedDocumentType) {
  return documentType === "Pensions Quote" || documentType === "Pensions Statement"
    ? "Pensions Statement"
    : "Statement of Suitability";
}

function getQuoteRequests(profile: SeededClientProfile, documentType: SupportedDocumentType) {
  const quoteDocumentType = resolveQuoteDocumentType(documentType);
  const statementDocumentType = resolveStatementDocumentType(documentType);
  const quoteRequests = profile.documentDrafts[quoteDocumentType]?.integrationRequests ?? [];
  const statementRequests = profile.documentDrafts[statementDocumentType]?.integrationRequests ?? [];

  return quoteRequests.length > 0 ? quoteRequests : statementRequests;
}

function getDraftSections(profile: SeededClientProfile, documentType: SupportedDocumentType) {
  return profile.documentDrafts[documentType]?.lastGeneratedSections ?? [];
}

function findDraftSection(sections: GeneratedDocumentSection[], ...keywords: string[]) {
  const normalizedKeywords = keywords.map((keyword) => keyword.toLowerCase());

  return sections.find((section) => {
    const haystack = `${section.id} ${section.title}`.toLowerCase();
    return normalizedKeywords.some((keyword) => haystack.includes(keyword));
  });
}

function buildRecommendationHtml(profile: SeededClientProfile, documentType: SupportedDocumentType) {
  if (documentType === "Terms of Business") {
    return paragraphHtml(profile.termsNotes || "Terms of Business issued for client review and record keeping.");
  }

  if (isStatementDocumentType(documentType)) {
    return buildStatementRecommendationHtml(profile, documentType);
  }

  const lines = [
    valueOrFallback(profile.productType, "Income Protection recommendation"),
    `Recommended cover: ${valueOrFallback(profile.recommendedCover)}`,
    `Deferred period: ${valueOrFallback(profile.deferredPeriod)}`,
  ];

  return `<p>${escapeHtml(lines.join(". "))}.</p>`;
}

function buildFactFindPersonalCircumstancesHtml(profile: SeededClientProfile, documentType: SupportedDocumentType) {
  if (documentType === "Fact Find Update") {
    return paragraphHtml(profile.factFindUpdatePersonalCircumstances, "No personal circumstances recorded.");
  }

  return paragraphHtml(profile.personalCircumstances, "No personal circumstances recorded.");
}

function buildFactFindFinancialSituationHtml(profile: SeededClientProfile, documentType: SupportedDocumentType) {
  if (documentType === "Fact Find Update") {
    return paragraphHtml(profile.factFindUpdateFinancialSituation, "No financial situation recorded.");
  }

  return paragraphHtml(profile.financialSituation, "No financial situation recorded.");
}

function buildFactFindSignatureRowHtml(
  signatureLabel: string,
  signatureValue: string | undefined,
  dateValue: string | undefined,
) {
  return [
    '<div class="fact-find-signature-row">',
    `<p class="fact-find-signature-label">${escapeHtml(signatureLabel)}</p>`,
    '<div class="fact-find-signature-field">',
    `<p class="fact-find-signature-value">${lineValueHtml(signatureValue)}</p>`,
    "</div>",
    '<p class="fact-find-signature-label fact-find-signature-label-date">Date</p>',
    '<div class="fact-find-signature-field fact-find-signature-field-date">',
    `<p class="fact-find-signature-value">${lineValueHtml(formatDocumentDate(dateValue))}</p>`,
    "</div>",
    "</div>",
  ].join("");
}

function buildFactFindSignaturesHtml(profile: SeededClientProfile) {
  return [
    '<div class="fact-find-signing-block">',
    "<p class=\"fact-find-signing-intro\">I/We understood the recommendation is based on the information disclosed and that the actions agreed are to my / our satisfaction</p>",
    buildFactFindSignatureRowHtml("Signature (1)", "", ""),
    buildFactFindSignatureRowHtml("Signature (2)", "", ""),
    "<p class=\"fact-find-signing-subheading\">FINANCIAL ADVISOR'S SIGNATURE</p>",
    buildFactFindSignatureRowHtml("Signature", "", ""),
    "</div>",
  ].join("");
}

function buildFactFindRequestFieldHtml(label: string, value: string | undefined, className?: string) {
  return [
    `<div class="${escapeHtml(className ?? "fact-find-request-field")}">`,
    `<p class="fact-find-request-value">${lineValueHtml(value)}</p>`,
    `<p class="fact-find-request-label">${escapeHtml(label)}</p>`,
    "</div>",
  ].join("");
}

function buildFactFindRequestInfoHtml(profile: SeededClientProfile) {
  return [
    '<div class="fact-find-request-copy">',
    "<p>I/We request that you furnish Omega Financial Management, Suite 31 The Mall, Beacon Court, Sandyford, Dublin 18 with all of the information they require to prepare a full analysis of all of my Pension, Life Assurance, Income Protection and Investment Policies.</p>",
    "<p>Please given them my full co-operation.</p>",
    "<p>You may email Omega Financial Management with the relevant information.</p>",
    "<p>Yours sincerely,</p>",
    "</div>",
    '<div class="fact-find-request-row">',
    buildFactFindRequestFieldHtml("Client(s)", "", "fact-find-request-field fact-find-request-field-signature"),
    buildFactFindRequestFieldHtml("Date", "", "fact-find-request-field fact-find-request-field-date fact-find-request-field-signature"),
    "</div>",
    '<div class="fact-find-request-row">',
    buildFactFindRequestFieldHtml("Company:", profile.requestCompanyName),
    buildFactFindRequestFieldHtml("Policies:", profile.requestPolicies),
    "</div>",
    '<p class="fact-find-request-footnote">OFM Financial Ltd t/a Omega Financial Management is regulated by the Central Bank of Ireland. Registration Number 349635.</p>',
  ].join("");
}

function buildFactFindServicesRequestedHtml(servicesRequested: string[]) {
  const values = servicesRequested.map((item) => item.trim()).filter((item) => item.length > 0);

  if (values.length === 0) {
    return [
      '<div class="grid-items">',
      '<div class="grid-item"><span class="grid-label">Requested service</span><strong>Not recorded</strong></div>',
      "</div>",
    ].join("");
  }

  return [
    '<div class="grid-items">',
    ...values.map(
      (item) =>
        `<div class="grid-item"><span class="grid-label">Requested service</span><strong>${escapeHtml(item)}</strong></div>`,
    ),
    "</div>",
  ].join("");
}

function buildNeedsNarrativeHtml(profile: SeededClientProfile, documentType: SupportedDocumentType) {
  if (documentType === "Fact Find") {
    const dependantItems = profile.dependants.map((dependant) =>
      [dependant.name, dependant.dateOfBirth ? `(${dependant.dateOfBirth})` : "", dependant.notes].filter(Boolean).join(" "),
    );

    return [
      paragraphHtml(profile.needsObjectives || "Income Protection cover review requested."),
      listHtml(dependantItems),
    ].join("");
  }

  if (documentType === "Terms of Business") {
    return paragraphHtml(
      profile.termsClientReviewed || "Awaiting confirmation that the client has reviewed and understood the Terms of Business.",
    );
  }

  if (documentType === "Fact Find Update") {
    return paragraphHtml(profile.factFindUpdateNeedsAndObjectives, "No needs and objectives recorded.");
  }

  return paragraphHtml(profile.needsObjectives, "No needs and objectives recorded.");
}

function buildStatementPersonalCircumstancesHtml(profile: SeededClientProfile) {
  if (profile.personalCircumstances?.trim()) {
    return `<p>${escapeHtml(profile.personalCircumstances.trim())}</p>`;
  }

  const lines = [
    profile.occupation ? `Occupation: ${profile.occupation}.` : "",
    profile.employmentStatus ? `Employment status: ${profile.employmentStatus}.` : "",
    profile.maritalStatus ? `Marital status: ${profile.maritalStatus}.` : "",
    profile.partnerName ? `Partner: ${profile.partnerName}.` : "",
    profile.dependants.length > 0 ? `Dependants: ${profile.dependants.map((dependant) => dependant.name).filter(Boolean).join(", ")}.` : "",
    profile.smokerStatus ? `Smoker status: ${profile.smokerStatus}.` : "",
    profile.gender ? `Gender: ${profile.gender}.` : "",
  ].filter(Boolean);

  if (lines.length === 0) {
    return "<p>No personal circumstances recorded.</p>";
  }

  return lines.map((line) => `<p>${escapeHtml(line)}</p>`).join("");
}

function buildStatementFinancialSituationHtml(profile: SeededClientProfile) {
  if (profile.financialSituation?.trim()) {
    return `<p>${escapeHtml(profile.financialSituation.trim())}</p>`;
  }

  const lines = [
    profile.income ? `Annual income: ${profile.income}.` : "",
    profile.recommendedCover ? `Recommended cover: ${profile.recommendedCover}.` : "",
    profile.deferredPeriod ? `Deferred period: ${profile.deferredPeriod}.` : "",
    profile.coverAge ? `Cover to age: ${profile.coverAge}.` : "",
    profile.liabilityMortgageBalanceOutstanding ? `Mortgage balance outstanding: ${profile.liabilityMortgageBalanceOutstanding}.` : "",
    profile.totalLiabilitiesPerMonthSelf ? `Total monthly liabilities (self): ${profile.totalLiabilitiesPerMonthSelf}.` : "",
    profile.totalLiabilitiesPerMonthJoint ? `Total monthly liabilities (joint): ${profile.totalLiabilitiesPerMonthJoint}.` : "",
  ].filter(Boolean);

  if (lines.length === 0) {
    return "<p>No financial situation recorded.</p>";
  }

  return lines.map((line) => `<p>${escapeHtml(line)}</p>`).join("");
}

function requestFieldValue(requests: IntegrationRequestArtifact[], ...labels: string[]) {
  const normalizedLabels = labels.map((label) => label.trim().toLowerCase()).filter(Boolean);
  for (const request of requests) {
    const field = request.requestFields.find((entry) =>
      normalizedLabels.includes(entry.label.trim().toLowerCase()) && entry.value.trim().length > 0);
    if (field) {
      return field.value;
    }
  }
  return "";
}

function parseNumber(value: string | undefined) {
  const normalized = value?.replace(/[^\d.-]/g, "").trim() ?? "";
  if (!normalized) {
    return null;
  }
  const parsed = Number(normalized);
  return Number.isFinite(parsed) ? parsed : null;
}

function formatEuroAmount(value: number | null, fractionDigits = 2) {
  if (value === null) {
    return "";
  }
  return new Intl.NumberFormat("en-IE", {
    minimumFractionDigits: fractionDigits,
    maximumFractionDigits: fractionDigits,
  }).format(value);
}

function formatEuroValue(value: number | null) {
  return value === null ? "Not available" : `€${formatEuroAmount(value)}`;
}

function formatDiscountPercentage(value: number) {
  return Number.isInteger(value) ? String(value) : value.toFixed(1);
}

function indefiniteArticle(value: string) {
  return /^[aeiou]/i.test(value.trim()) ? "an" : "a";
}

function findSelectedQuote(profile: SeededClientProfile, requests: IntegrationRequestArtifact[]) {
  const selectedOption = findStatementQuoteOption(requests, profile.statementSelectedQuoteKey);

  if (selectedOption) {
    return requests[selectedOption.requestIndex]?.quoteResults[selectedOption.quoteIndex] ?? null;
  }

  return requests
    .flatMap((request) => request.quoteResults)
    .find((quote) => (quote.levelPremium?.trim() ?? "").length > 0) ?? null;
}

function resolveLegacyDiscountPercentage(profile: StatementRecommendationProfile) {
  return parseNumber(profile.discountApplied);
}

function normalizeText(value: string | undefined) {
  return value?.trim().toLowerCase() ?? "";
}

function isReviewablePolicyType(policyType: string | undefined) {
  return normalizeText(policyType).includes("reviewable");
}

function isGuaranteedPolicyType(policyType: string | undefined) {
  const normalized = normalizeText(policyType);
  return normalized === "" || normalized.includes("guaranteed");
}

function hasZurichDiscountToggleEnabled(profile: StatementRecommendationProfile) {
  return normalizeText(profile.zurichDiscountActive) === "yes";
}

function isZurichProvider(providerName: string | undefined) {
  return normalizeText(providerName).includes("zurich");
}

function resolvePolicyDisplayLabel(policyType: string | undefined) {
  const normalized = normalizeText(policyType);
  if (!normalized) {
    return "";
  }

  const parts: string[] = [];
  if (normalized.includes("personal")) {
    parts.push("Personal");
  }
  if (normalized.includes("executive")) {
    parts.push("Executive");
  }

  return parts.join(" - ");
}

function buildQuoteDescriptor(providerName: string | undefined, policyType: string | undefined) {
  return `${normalizeText(providerName)} ${normalizeText(policyType)}`.trim();
}

function isAvivaProvider(providerName: string | undefined) {
  return normalizeText(providerName).includes("aviva");
}

function isRoyalLondonProvider(providerName: string | undefined) {
  return normalizeText(providerName).includes("royal london");
}

function isExecutiveVariant(providerName: string | undefined, policyType: string | undefined) {
  return buildQuoteDescriptor(providerName, policyType).includes("executive");
}

function isImplicitPersonalVariant(providerName: string | undefined, policyType: string | undefined) {
  const descriptor = buildQuoteDescriptor(providerName, policyType);
  return !descriptor.includes("executive");
}

function formatQuoteProviderLabel(providerName: string | undefined, policyType: string | undefined) {
  const provider = providerName?.trim() ?? "";
  const policy = resolvePolicyDisplayLabel(policyType);
  if (provider && policy) {
    return `${provider} - ${policy}`;
  }

  return valueOrFallback(provider || policy, "Unknown provider");
}

function hasFixedFifteenDiscount(providerName: string | undefined, policyType: string | undefined) {
  if (isAvivaProvider(providerName)) {
    return isGuaranteedPolicyType(policyType);
  }

  if (isRoyalLondonProvider(providerName)) {
    return isExecutiveVariant(providerName, policyType) || isImplicitPersonalVariant(providerName, policyType);
  }

  if (isZurichProvider(providerName)) {
    return isExecutiveVariant(providerName, policyType) || isImplicitPersonalVariant(providerName, policyType);
  }

  return false;
}

function resolveFixedQuoteDiscountPercentage(quote: IntegrationQuoteResult) {
  if (hasFixedFifteenDiscount(quote.providerName, quote.policyType)) {
    return 15;
  }

  return null;
}

function resolveQuoteDiscountPercentage(profile: StatementRecommendationProfile, quote: IntegrationQuoteResult | null) {
  if (!quote) {
    return resolveLegacyDiscountPercentage(profile);
  }

  if (
    isZurichProvider(quote.providerName) &&
    (isExecutiveVariant(quote.providerName, quote.policyType) ||
      isImplicitPersonalVariant(quote.providerName, quote.policyType)) &&
    hasZurichDiscountToggleEnabled(profile)
  ) {
    return 17.5;
  }

  const fixedDiscount = resolveFixedQuoteDiscountPercentage(quote);
  if (fixedDiscount !== null) {
    return fixedDiscount;
  }

  return null;
}

function applyDiscount(grossPremium: number | null, discountPercentage: number | null) {
  if (grossPremium === null) {
    return null;
  }

  if (discountPercentage === null) {
    return grossPremium;
  }

  return grossPremium * (1 - discountPercentage / 100);
}

function resolveDiscountAmount(grossPremium: number | null, discountPercentage: number | null) {
  if (grossPremium === null || discountPercentage === null) {
    return null;
  }

  return grossPremium * (discountPercentage / 100);
}

function resolveIrishIncomeTaxReliefPercentage(profile: StatementRecommendationProfile) {
  const income = parseNumber(profile.income);
  if (income === null) {
    return null;
  }

  const maritalStatus = profile.maritalStatus.trim().toLowerCase();
  const cutoff = maritalStatus === "single" ? 44_000 : maritalStatus === "married" ? 53_000 : null;
  if (cutoff === null) {
    return null;
  }

  return income <= cutoff ? 20 : 40;
}

function resolveTaxReliefPercentage(
  profile: StatementRecommendationProfile,
  grossPremium: number | null,
  netMonthlyCost: number | null,
) {
  const configuredValue = parseNumber(profile.taxReliefPercentage);
  if (configuredValue !== null) {
    return configuredValue;
  }

  const irelandIncomeThresholdValue = resolveIrishIncomeTaxReliefPercentage(profile);
  if (irelandIncomeThresholdValue !== null) {
    return irelandIncomeThresholdValue;
  }

  if (grossPremium !== null && netMonthlyCost !== null && grossPremium > 0 && netMonthlyCost <= grossPremium) {
    return Math.round((1 - netMonthlyCost / grossPremium) * 100);
  }

  return null;
}

function resolveStatementDeferredPeriod(profile: SeededClientProfile, requests: IntegrationRequestArtifact[]) {
  return valueOrFallback(
    requestFieldValue(requests, "DeferredPeriod", "Deferred period") || profile.deferredPeriod,
    "Deferred period to be confirmed",
  );
}

function resolveStatementCoverAmount(profile: SeededClientProfile, requests: IntegrationRequestArtifact[]) {
  return requestFieldValue(requests, "AnnualAmount", "Cover amount") || profile.recommendedCover;
}

function resolveStatementCoverAge(profile: SeededClientProfile, requests: IntegrationRequestArtifact[]) {
  return valueOrFallback(
    requestFieldValue(requests, "NRA", "CoverToAge", "Cover to age") || profile.coverAge,
    "selected retirement age",
  );
}

function resolveStatementGrossPremium(profile: SeededClientProfile, selectedQuote: ReturnType<typeof findSelectedQuote>) {
  return parseNumber(selectedQuote?.levelPremium) ?? parseNumber(profile.premium);
}

function resolveStatementNetMonthlyCost(
  profile: StatementRecommendationProfile,
  grossPremium: number | null,
  discountPercentage: number | null,
  taxReliefPercentage: number | null,
) {
  const configuredValue = parseNumber(profile.netMonthlyCost);
  const discountedPremium = applyDiscount(grossPremium, discountPercentage);
  if (discountedPremium === null || taxReliefPercentage === null) {
    return configuredValue;
  }

  return discountedPremium * (1 - taxReliefPercentage / 100);
}

function mergeStatementRecommendationHtml(computedHtml: string, sectionHtml: string | undefined) {
  const trimmed = sectionHtml?.trim() ?? "";
  if (!trimmed) {
    return computedHtml;
  }

  const normalized = trimmed.toLowerCase();
  const looksGeneric =
    normalized.includes("prepared for") ||
    normalized.includes("is proposed with cover of") ||
    normalized.includes("seeded fallback content") ||
    normalized.includes("gross cost of this") ||
    normalized.includes("net cost of") ||
    normalized.includes("less tax relief");

  return looksGeneric ? computedHtml : `${computedHtml}${trimmed}`;
}

function buildStatementRecommendationHtml(profile: SeededClientProfile, documentType: SupportedDocumentType) {
  const statementProfile = profile as StatementRecommendationProfile;
  const requests = getQuoteRequests(profile, documentType);
  const selectedQuote = findSelectedQuote(profile, requests);
  const provider = valueOrFallback(selectedQuote?.providerName || profile.provider, "Recommended provider");
  const deferredPeriod = resolveStatementDeferredPeriod(profile, requests);
  const resolvedCoverAmount = resolveStatementCoverAmount(profile, requests);
  const coverAmountNumber = parseNumber(resolvedCoverAmount);
  const coverAmount = coverAmountNumber === null ? valueOrFallback(resolvedCoverAmount) : `€${formatEuroAmount(coverAmountNumber, 0)}`;
  const coverAge = resolveStatementCoverAge(profile, requests);
  const incomeNumber = parseNumber(profile.income);
  const coverShare =
    incomeNumber !== null && incomeNumber > 0 && coverAmountNumber !== null ? Math.round((coverAmountNumber / incomeNumber) * 100) : null;
  const grossPremiumNumber = resolveStatementGrossPremium(profile, selectedQuote);
  const configuredNetMonthlyCostNumber = parseNumber(profile.netMonthlyCost);
  const taxReliefPercentage = resolveTaxReliefPercentage(statementProfile, grossPremiumNumber, configuredNetMonthlyCostNumber);
  const discountApplied = resolveQuoteDiscountPercentage(statementProfile, selectedQuote);
  const netMonthlyCostNumber = resolveStatementNetMonthlyCost(
    statementProfile,
    grossPremiumNumber,
    discountApplied,
    taxReliefPercentage,
  );
  const productLabel = valueOrFallback(profile.productType, "Income Protection policy");
  const affordabilityConfirmed =
    (statementProfile.affordabilityDiscussed?.trim() ?? "").toLowerCase() === "yes" ||
    (statementProfile.clientHappyToProceed?.trim() ?? "").toLowerCase() === "yes" ||
    profile.recommendationAcknowledged.trim().toLowerCase() === "yes";

  const summaryLine = `<p><strong>Recommendation: ${escapeHtml(provider)} ${escapeHtml(deferredPeriod)} deferred plan for ${escapeHtml(coverAmount)} per annum</strong></p>`;
  const recommendationLine = `<p>We recommend ${escapeHtml(
    `${indefiniteArticle(provider)} ${provider} ${productLabel} ${deferredPeriod} deferred plan for ${coverAmount} to cover you to age ${coverAge}`,
  )}.</p>`;

  const rationaleLine =
    coverShare === null
      ? "<p>This level of cover is intended to protect your income and support your standard of living if you are unable to work due to illness or injury.</p>"
      : `<p>As this represents ${escapeHtml(String(coverShare))}% of your salary, this keeps you within Revenue limits while giving you the cover needed to maintain your standard of living.</p>`;

  const quoteDetailLine =
    selectedQuote?.policyType || grossPremiumNumber !== null
      ? `<p>${escapeHtml(
          [
            `The returned quote from ${provider}`,
            selectedQuote?.policyType ? `is on a ${selectedQuote.policyType.toLowerCase()} premium basis` : "matches the returned premium basis",
            grossPremiumNumber === null ? "" : `at €${formatEuroAmount(grossPremiumNumber)} per month before tax relief`,
          ]
            .filter(Boolean)
            .join(" "),
        )}.</p>`
      : "";

  const costParts = [
    grossPremiumNumber === null ? "" : `The gross cost of this ${deferredPeriod} deferred period plan is €${formatEuroAmount(grossPremiumNumber)}`,
    discountApplied === null ? "" : `(${formatEuroAmount(discountApplied)}% discount on premium applied)`,
    taxReliefPercentage === null ? "" : `less tax relief @${Math.round(taxReliefPercentage)}%`,
    netMonthlyCostNumber === null ? "" : `giving a net cost of €${formatEuroAmount(netMonthlyCostNumber)}pm`,
  ].filter(Boolean);
  const costLine = costParts.length === 0 ? "" : `<p>${escapeHtml(costParts.join(" "))}.</p>`;

  const affordabilityLine = affordabilityConfirmed
    ? "<p>We have discussed affordability of this plan and you are happy to proceed.</p>"
    : "<p>Affordability of this plan should be reviewed and confirmed before proceeding.</p>";

  const reasonItems = [
    `The cover amount and ${deferredPeriod} deferred period align with the protection need identified in your Fact Find.`,
    selectedQuote?.policyType
      ? `The ${selectedQuote.policyType.toLowerCase()} premium basis selected for this cover matches the policy terms returned by the quote system.`
      : `The premium basis selected for the cover should be read together with the policy conditions provided by ${provider}.`,
    `The premium offered by ${provider} for this type of cover is competitive in comparison to the market quotes returned at this time.`,
    taxReliefPercentage === null
      ? "Income Protection premiums may qualify for tax relief subject to Revenue rules."
      : `The monthly premium receives ${Math.round(taxReliefPercentage)}% tax relief on this plan.`,
    `${provider} is regulated by the Central Bank of Ireland, which means it must maintain sufficient financial reserves to meet valid claims.`,
    "Waiver of premium means your premiums are paid while an income protection benefit is being paid, subject to the policy conditions.",
  ];

  return [
    summaryLine,
    recommendationLine,
    rationaleLine,
    quoteDetailLine,
    costLine,
    affordabilityLine,
    `<p>We recommend this ${escapeHtml(provider)} Income Protection policy for the following reasons:</p>`,
    listHtml(reasonItems),
  ]
    .filter(Boolean)
    .join("");
}

export function buildQuoteComparisonHtml(profile: SeededClientProfile, documentType: SupportedDocumentType = "Quote") {
  const statementProfile = profile as StatementRecommendationProfile;
  const requests = getQuoteRequests(profile, documentType);
  const quoteResults = requests.flatMap((request) => request.quoteResults);

  if (quoteResults.length === 0) {
    return "";
  }

  const phiDob = formatDocumentDate(profile.dateOfBirth) || requestFieldValue(requests, "DOB", "Date of birth");
  const requestedCoverAmount = profile.recommendedCover || requestFieldValue(requests, "AnnualAmount", "Cover amount");

  const summaryItems = [
    `Cover amount: ${valueOrFallback(requestedCoverAmount)}`,
    `Date of birth: ${valueOrFallback(phiDob)}`,
    `Deferred period: ${valueOrFallback(profile.deferredPeriod)}`,
    `Cover to age: ${valueOrFallback(profile.coverAge)}`,
    `Smoker status: ${valueOrFallback(profile.smokerStatus)}`,
    `Occupation class: ${valueOrFallback(profile.phiOccupationalClass)}`,
  ];

  const headers = ["Provider", "Quote", "Discount", "After Tax Discount"];
  const rows = quoteResults.map((quote) => {
    const grossPremium = parseNumber(quote.levelPremium);
    const taxReliefPercentage = resolveTaxReliefPercentage(statementProfile, grossPremium, null);
    const discountApplied = resolveQuoteDiscountPercentage(statementProfile, quote);
    const discountAmount = resolveDiscountAmount(grossPremium, discountApplied);
    const actualAmountPaid = resolveStatementNetMonthlyCost(
      statementProfile,
      grossPremium,
      discountApplied,
      taxReliefPercentage,
    );

    return {
      group: isReviewablePolicyType(quote.policyType) ? "reviewable" : "guaranteed",
      html: [
        formatQuoteProviderLabel(quote.providerName, quote.policyType),
        grossPremium === null ? valueOrFallback(quote.levelPremium) : formatEuroValue(grossPremium),
        discountAmount === null ? "" : formatEuroValue(discountAmount),
        formatEuroValue(actualAmountPaid),
      ]
        .map((value) => `<div class="statement-quote-cell"><p>${escapeHtml(value)}</p></div>`)
        .join(""),
    };
  });

  const groupedSections = [
    { key: "reviewable", title: "Reviewable Rates" },
    { key: "guaranteed", title: "Guaranteed Rates" },
  ]
    .map((group) => {
      const groupRows = rows.filter((row) => row.group === group.key);
      if (groupRows.length === 0) {
        return "";
      }

      return [
        `<h3>${escapeHtml(group.title)}</h3>`,
        '<div class="statement-quote-table">',
        `<div class="statement-quote-row statement-quote-row-header">${headers
          .map((header) => `<div class="statement-quote-cell"><p>${escapeHtml(header)}</p></div>`)
          .join("")}</div>`,
        groupRows.map((row) => `<div class="statement-quote-row">${row.html}</div>`).join(""),
        "</div>",
      ].join("");
    })
    .filter(Boolean)
    .join("");

  return [
    '<div class="statement-section statement-quote-block">',
    `<h2>${escapeHtml(documentType === "Pensions Quote" ? "Pensions Quote Comparison" : "Income Protection Quote Comparison")}</h2>`,
    `<div class="statement-quote-summary">${summaryItems.map((item) => `<p>${escapeHtml(item)}</p>`).join("")}</div>`,
    groupedSections,
    "</div>",
  ].join("");
}

function buildWarningHtml(profile: SeededClientProfile, documentType: SupportedDocumentType) {
  if (documentType === "Fact Find") {
    return "<p>Please confirm that the information captured in this fact find is complete and accurate.</p>";
  }

  if (documentType === "Terms of Business") {
    return `<p>${escapeHtml(
      "These Terms of Business should be read together with any suitability letter and product-specific disclosures.",
    )}</p>`;
  }

  return `<p>${escapeHtml(
    "Benefits may be subject to underwriting, deferred periods, policy exclusions, and continued premium payment.",
  )}</p>`;
}

function buildFooterBlock(profile: SeededClientProfile, documentType: SupportedDocumentType): ComposedBlock {
  return {
    kind: "footer",
    title: "Signatures and Record",
    advisorName: valueOrFallback(profile.advisorName, profile.termsIssuedBy || "Omega Advisor"),
    clientSignature: valueOrFallback(profile.clientSignature1, "Pending"),
    clientSignatureDate: valueOrFallback(profile.clientSignature1Date),
    advisorSignature: valueOrFallback(profile.financialAdvisorSignature, profile.termsIssuedBy || "Pending"),
    complianceCopy: [
      "Omega Financial confirms this document forms part of the client record.",
      documentType === "Terms of Business"
        ? "Please retain a copy of these Terms of Business for future reference."
        : "Please review this document alongside any insurer illustrations and disclosures provided.",
    ],
  };
}

const DATA_PROTECTION_MARKETING_COPY =
  "We collect your personal details in order to provide the highest standard of service to you. We take great care with the information provided; taking steps to keep it secure and to ensure it is used only for legitimate purposes. The information you have provided will be treated as confidential and will be retained by Omega Financial Management in electronic format for the purposes of providing financial services. We will use your contact details when we need to contact you in respect of the policy(ies) that you have with us. Under the General Data Protection Regulation 2018 you have various rights relating to your Personal Data.";

function buildLogoBlock(className?: string): ComposedBlock {
  return {
    kind: "logo",
    className: className ?? "document-top-logo",
  };
}

function buildInlineLetterHeaderBlock(profile: SeededClientProfile): ComposedBlock {
  return {
    kind: "section",
    className: "document-inline-header",
    title: "",
    bodyHtml: buildStatementLetterHeaderHtml(profile),
  };
}

function buildTitleBannerBlock(documentType: SupportedDocumentType, profile: SeededClientProfile): ComposedBlock {
  return {
    kind: "banner",
    eyebrow: documentType,
    title: documentType === "Fact Find" ? "Income Protection Fact Find" : documentType,
    subtitle: `${profile.fullName} (${profile.clientReference})`,
  };
}

function buildFactFindUpdateBlocks(
  profile: SeededClientProfile,
  personalCircumstancesHtml: string,
  financialSituationHtml: string,
  needsHtml: string,
): ComposedBlock[] {
  return [
    buildInlineLetterHeaderBlock(profile),
    buildTitleBannerBlock("Fact Find Update", profile),
    detailGrid(
      "Client Summary",
      summaryGridItems(profile, "Fact Find Update"),
      "client-summary-grid",
    ),
    {
      kind: "section",
      title: "Personal Circumstances",
      bodyHtml: personalCircumstancesHtml,
    },
    {
      kind: "section",
      title: "Financial Situation",
      bodyHtml: financialSituationHtml,
    },
    {
      kind: "section",
      title: "Needs and Objectives",
      bodyHtml: needsHtml,
    },
    detailGrid("Client Declarations", [
      { label: "Execution only basis", value: profile.factFindUpdateExecutionOnlyBasis },
      { label: "Terms of Business reviewed", value: profile.factFindUpdateTermsReviewedReceived },
    ]),
    {
      kind: "section",
      title: "Data Protection & Marketing Preferences",
      bodyHtml: paragraphHtml(profile.factFindUpdateDataProtectionText || DATA_PROTECTION_MARKETING_COPY),
    },
    detailGrid("Marketing Preferences", [
      { label: "Do not contact", value: profile.doNotContact },
      { label: "Marketing agreed", value: profile.agreeToMarketing },
      { label: "Phone", value: profile.contactByPhone },
      { label: "SMS", value: profile.contactBySms },
      { label: "Email", value: profile.contactByEmail },
      { label: "Post", value: profile.contactByPost },
    ]),
    detailGrid("PEP Confirmation", [
      { label: "PEP confirmation", value: profile.pepDeclarationConfirmed },
    ]),
    {
      kind: "section",
      title: "Signatures and Record",
      bodyHtml: buildFactFindSignaturesHtml(profile),
    },
  ];
}

function buildFactFindBlocks(
  profile: SeededClientProfile,
  recommendationHtml: string,
  personalCircumstancesHtml: string,
  financialSituationHtml: string,
  needsHtml: string,
  warningHtml: string,
): ComposedBlock[] {
  const isSmall = profile.factFindType === "small";
  const servicesRequested = checkedItemLabels([
    { label: "Life Protection", value: profile.servicesRequestedLifeProtection },
    { label: "Income Protection", value: profile.servicesRequestedIncomeProtection },
    { label: "Savings & Protection", value: profile.servicesRequestedSavingsProtection },
    { label: "Pension Planning", value: profile.servicesRequestedPensionPlanning },
  ]);

  const savingsRows = profile.savingsInvestmentRows
    .map((row) =>
      [row.financialInstitution, row.value ? `Value: ${row.value}` : "", row.startDate ? `Start: ${row.startDate}` : "", row.term ? `Term: ${row.term}` : ""]
        .filter(Boolean)
        .join(", "),
    )
    .filter((row) => row.length > 0);

  return [
    buildInlineLetterHeaderBlock(profile),
    buildTitleBannerBlock("Fact Find", profile),
    {
      kind: "section",
      title: "Services Requested",
      className: "client-summary-grid",
      bodyHtml: buildFactFindServicesRequestedHtml(servicesRequested),
    },
    detailGrid(
      "Client Summary",
      summaryGridItems(profile, "Fact Find"),
      "client-summary-grid",
    ),
    detailGrid("Contact Details", [
      { label: "Email", value: profile.email },
      { label: "Phone", value: profile.mobileNumber },
      { label: "Date of birth", value: profile.dateOfBirth },
      { label: "Address", value: addressSummary(profile.homeAddressLine1, profile.homeAddressLine2, profile.clientHomeAddressLine3, profile.clientHomeAddressLine4, profile.townCity, profile.county) },
      { label: "Work phone", value: profile.workPhone },
      { label: "Marital status", value: profile.maritalStatus },
      { label: "Partner", value: profile.partnerName },
    ]),
    detailGrid("Employment Details", [
      { label: "Occupation", value: profile.occupation },
      { label: "Employment status", value: profile.employmentStatus },
      { label: "Income", value: profile.income },
      { label: "Advisor", value: profile.advisorName },
    ]),
    {
      kind: "section",
      title: "Personal Circumstances",
      bodyHtml: personalCircumstancesHtml,
    },
    {
      kind: "section",
      title: "Financial Situation",
      bodyHtml: financialSituationHtml,
    },
    {
      kind: "section",
      title: "Needs and Objectives",
      bodyHtml: needsHtml,
    },
    detailGrid("Income Protection Arrangements", [
      { label: "No deferred provider", value: profile.incomeProtectionNoDeferredProvider },
      { label: "Deferred provider", value: profile.incomeProtectionDeferredProvider || profile.provider },
      { label: "Current weekly cover", value: profile.incomeProtectionDeferredCurrentWeeklyCover || profile.recommendedCover },
      { label: "Deferred period", value: profile.deferredPeriod },
      { label: "Cover to age", value: profile.coverAge },
      { label: "Monthly premium", value: profile.premium },
    ]),
    ...(!isSmall ? [detailGrid("Assets & Liabilities", [
      { label: "Home (Self)", value: profile.assetHomeSelf },
      { label: "Home (Partner)", value: profile.assetHomePartner },
      { label: "Mortgage balance outstanding", value: profile.liabilityMortgageBalanceOutstanding },
      { label: "Mortgage monthly repayment", value: profile.liabilityMortgageMonthlyRepayment },
      { label: "Total liabilities per month - Self", value: profile.totalLiabilitiesPerMonthSelf },
      { label: "Total liabilities per month - Joint", value: profile.totalLiabilitiesPerMonthJoint },
    ])] : []),
    ...(!isSmall ? [detailGrid("Pension Arrangements", [
      { label: "Self retirement age", value: profile.selfRetirementAge },
      { label: "Self pension scheme", value: profile.selfEmployeeDirectorSchemeType },
      { label: "Self personal pension company", value: profile.selfPersonalPensionCompany },
      { label: "Partner retirement age", value: profile.partnerRetirementAge },
      { label: "Partner pension scheme", value: profile.partnerEmployeeDirectorSchemeType },
      { label: "Partner personal pension company", value: profile.partnerPersonalPensionCompany },
    ])] : []),
    ...(!isSmall ? [detailGrid("Life Insurance & Serious Illness", [
      { label: "Mortgage protection", value: profile.mortgageProtection || yesNoValue(profile.mortgageProtectionYes) },
      { label: "Life Insurance (Self)", value: profile.selfLifeInsuranceAmount },
      { label: "Life Insurance (Partner)", value: profile.partnerLifeInsuranceAmount },
      { label: "Serious Illness (Self)", value: profile.selfSeriousIllnessAmount },
      { label: "Serious Illness (Partner)", value: profile.partnerSeriousIllnessAmount },
      { label: "Personal insurance record", value: profile.personalInsurance },
    ])] : []),
    ...(!isSmall ? [{
      kind: "section" as const,
      title: "Savings & Investments",
      bodyHtml: [listHtml(savingsRows, "No savings or investments recorded."), paragraphHtml(profile.savingsInvestmentComments, "No comments recorded.")].join(""),
    }] : []),
    {
      kind: "section",
      title: "Recommendation Section",
      bodyHtml: recommendationHtml,
    },
    detailGrid("Declarations and Confirmations", [
      { label: "Execution only", value: profile.executionOnlyConfirmation },
      { label: "Terms reviewed", value: profile.termsReviewedReceived },
      { label: "Do not contact", value: profile.doNotContact },
      { label: "Marketing agreed", value: profile.agreeToMarketing },
      { label: "PEP confirmation", value: profile.pepDeclarationConfirmed },
      { label: "Recommendation Acknowledgement", value: profile.recommendationAcknowledged },
    ]),
    {
      kind: "section",
      title: "Signatures and Record",
      bodyHtml: buildFactFindSignaturesHtml(profile),
    },
    {
      kind: "section",
      title: "Request for Information",
      bodyHtml: buildFactFindRequestInfoHtml(profile),
    },
    {
      kind: "callout",
      tone: "warning",
      title: "Warnings and Disclaimers",
      bodyHtml: warningHtml,
    },
  ];
}

function buildTermsBlocks(profile: SeededClientProfile, recommendationHtml: string, needsHtml: string, warningHtml: string): ComposedBlock[] {
  return [
    detailGrid(
      "Client Summary",
      summaryGridItems(profile, "Terms of Business"),
      "client-summary-grid",
    ),
    {
      kind: "section",
      title: "Issue Summary",
      bodyHtml: recommendationHtml,
    },
    detailGrid("Issue Confirmations", [
      { label: "Client received", value: profile.termsClientReceived },
      { label: "Client reviewed", value: profile.termsClientReviewed },
    ]),
    detailGrid("Contact Preferences", [
      { label: "Phone", value: profile.contactByPhone },
      { label: "SMS", value: profile.contactBySms },
      { label: "Email", value: profile.contactByEmail },
      { label: "Post", value: profile.contactByPost },
    ]),
    {
      kind: "section",
      title: "Needs and Objectives",
      bodyHtml: needsHtml,
    },
    {
      kind: "callout",
      tone: "warning",
      title: "Warnings and Disclaimers",
      bodyHtml: warningHtml,
    },
  ];
}

function buildStatementLetterHeaderHtml(profile: SeededClientProfile) {
  const addressLines = [
    profile.homeAddressLine1,
    profile.homeAddressLine2,
    profile.clientHomeAddressLine3,
    profile.clientHomeAddressLine4,
    profile.townCity,
    profile.county,
  ]
    .map((line) => line?.trim() ?? "")
    .filter(Boolean);

  return [
    '<div class="statement-letter-header">',
    '<img class="statement-logo" src="' + escapeHtml(OMEGA_LOGO_DATA_URI) + '" alt="Omega Financial Management" />',
    '<div class="statement-client-details">',
    '<div class="statement-address-block">',
    ...addressLines.map((line) => `<p>${escapeHtml(line)}</p>`),
    "</div>",
    `<p class="statement-letter-date">${escapeHtml(profile.letterDate || "Date not recorded")}</p>`,
    "</div>",
    "</div>",
  ].join("");
}

function buildStatementNoticeHtml() {
  return [
    '<div class="statement-section statement-important-notice">',
    "<p><strong>Important Notice – Statement of Suitability</strong></p>",
    "<p><strong>This is an important document which sets out the reasons why the product(s) or service(s) offered or recommended is/are considered suitable, or the most suitable, for your particular needs, objectives and circumstances.</strong></p>",
    "</div>",
  ].join("");
}

function buildStatementClosingHtml(profile: SeededClientProfile) {
  return [
    '<div class="statement-section statement-closing">',
    "<p>Please review all of the contents of this recommendation carefully, should you have any queries please feel free to give me a call.</p>",
    "<p>Kind regards.</p>",
    "<p>Yours sincerely</p>",
    '<div class="statement-signature-area">',
    '<p class="statement-signature-line">______________________________</p>',
    `<p class="statement-signature-label"><strong>${escapeHtml(valueOrFallback(profile.advisorName, "Omega Advisor"))}</strong></p>`,
    "</div>",
    "</div>",
  ].join("");
}

function buildStatementDeclarationHtml() {
  return [
    '<div class="statement-section statement-declaration">',
    "<h2>Declaration to be completed by Client:</h2>",
    "<p>I am happy to proceed on the basis of the recommendation given to me and wish to affect the policy recommended.</p>",
    '<div class="statement-signature-area statement-signature-row">',
    '<div class="statement-signature-block">',
    '<p class="statement-signature-line">_______________________</p>',
    '<p class="statement-signature-label">&nbsp;</p>',
    "</div>",
    '<div class="statement-signature-block statement-signature-block-date">',
    '<p class="statement-signature-line">______________</p>',
    '<p class="statement-signature-label">Date</p>',
    "</div>",
    "</div>",
    "</div>",
  ].join("");
}

function buildStatementImportantInfoHtml1() {
  return [
    '<div class="statement-section statement-important-info">',
    "<h2>IMPORTANT INFORMATION:</h2>",
    "<p>It is vital to make full disclosure of relevant facts, including: (a) your medical details or history; and (b) any previous insurance claims made by you for the type of insurance sought. Failure to disclose all information may result in (I) your policy being cancelled; (ii) that claims may not be paid; (iii) you may encounter difficulty in trying to purchase insurance elsewhere.</p>",
    "</div>",
  ].join("");
}

function buildStatementImportantInfoHtml2() {
  return [
    '<div class="statement-section statement-important-info">',
    "<h2>IMPORTANT INFORMATION:</h2>",
    "<p>I wish to confirm that I have read the Customer Information Booklet, I am aware of the benefits available under the recommended policy. I am aware of the general exclusions that attach to the recommended policy. I understand the meaning of disability as defined in the recommended policy. I am are also aware of the reductions applied to the benefit where there are disability payments from other sources. I agree with the recommendation made and wish to effect the transaction recommended.</p>",
    "</div>",
  ].join("");
}

function buildStatementSectionHtml(profile: SeededClientProfile, recommendationHtml: string, needsHtml: string, warningHtml: string) {
  const bodyHtml = [
    buildStatementLetterHeaderHtml(profile),
    buildStatementNoticeHtml(),
    '<div class="statement-opening">',
    `<p>Dear ${escapeHtml(profile.fullName)}</p>`,
    "<p>This Statement of Suitability outlines the recommendation provided to you based on the personal and financial information you have shared with us. It confirms that the recommended product is suitable for your needs and objectives at the time of this assessment.</p>",
    "</div>",
    '<div class="statement-section">',
    '<h2>Personal Circumstances</h2>',
    buildStatementPersonalCircumstancesHtml(profile),
    "</div>",
    '<div class="statement-section">',
    '<h2>Financial Situation</h2>',
    buildStatementFinancialSituationHtml(profile),
    "</div>",
    '<div class="statement-section">',
    '<h2>Needs and Objectives</h2>',
    needsHtml,
    "</div>",
    '<div class="statement-section">',
    '<h2>Recommendation</h2>',
    recommendationHtml,
    "</div>",
    '<div class="statement-section">',
    '<h2>Warnings</h2>',
    warningHtml,
    "</div>",
    buildStatementClosingHtml(profile),
    buildStatementImportantInfoHtml1(),
    buildStatementImportantInfoHtml2(),
    buildStatementDeclarationHtml(),
  ].join("");

  return bodyHtml;
}

function buildStatementBlocks(profile: SeededClientProfile, recommendationHtml: string, needsHtml: string, warningHtml: string): ComposedBlock[] {
  const sectionBodyHtml = buildStatementSectionHtml(profile, recommendationHtml, needsHtml, warningHtml);

  return [
    {
      kind: "statement-body",
      bodyHtml: sectionBodyHtml,
    },
  ];
}

function buildQuoteBlocks(profile: SeededClientProfile, documentType: SupportedDocumentType): ComposedBlock[] {
  const quoteHtml = buildQuoteComparisonHtml(profile, documentType);

  if (!quoteHtml) {
    return [
      {
        kind: "callout",
        tone: "info",
        title: "No Quote Data",
        bodyHtml: "<p>Generate the Quote draft to populate quote comparison data, or no quote results were returned.</p>",
      },
    ];
  }

  return [
    {
      kind: "statement-body",
      bodyHtml: [buildStatementLetterHeaderHtml(profile), quoteHtml].join(""),
    },
  ];
}

export function composeWorkflowDocument(profile: SeededClientProfile, documentType: SupportedDocumentType): ComposedDocument {
  const title =
    documentType === "Fact Find" ? "Income Protection Fact Find"
      : documentType === "Quote" ? "Income Protection Quote Comparison"
      : documentType === "Pensions Quote" ? "Pensions Quote Comparison"
      : documentType === "Pensions Statement" ? "Pensions Statement"
      : documentType === "Terms of Business" ? "Terms of Business"
      : documentType;
  const draftSections = getDraftSections(profile, documentType);
  const recommendationSection = findDraftSection(draftSections, "recommendation", "summary", "issue");
  const personalCircumstancesSection = findDraftSection(draftSections, "personal circumstance");
  const financialSituationSection = findDraftSection(draftSections, "financial situation");
  const needsSection =
    isStatementDocumentType(documentType)
      ? findDraftSection(draftSections, "needs", "objective", "circumstance")
      : findDraftSection(draftSections, "needs", "objective");
  const warningSection = findDraftSection(draftSections, "warning", "disclaimer", "risk");
  const computedRecommendationHtml = buildRecommendationHtml(profile, documentType);
  const recommendationHtml =
    isStatementDocumentType(documentType)
      ? mergeStatementRecommendationHtml(computedRecommendationHtml, recommendationSection?.bodyHtml)
      : recommendationSection?.bodyHtml ?? computedRecommendationHtml;
  const needsHtml = needsSection?.bodyHtml ?? buildNeedsNarrativeHtml(profile, documentType);
  const warningHtml = warningSection?.bodyHtml ?? buildWarningHtml(profile, documentType);

  const bodyBlocks =
    documentType === "Fact Find"
      ? buildFactFindBlocks(
          profile,
          recommendationHtml,
          personalCircumstancesSection?.bodyHtml ?? buildFactFindPersonalCircumstancesHtml(profile, documentType),
          financialSituationSection?.bodyHtml ?? buildFactFindFinancialSituationHtml(profile, documentType),
          needsHtml,
          warningHtml,
        )
      : documentType === "Fact Find Update"
        ? buildFactFindUpdateBlocks(
            profile,
            buildFactFindPersonalCircumstancesHtml(profile, documentType),
            buildFactFindFinancialSituationHtml(profile, documentType),
            buildNeedsNarrativeHtml(profile, documentType),
          )
        : documentType === "Terms of Business"
          ? buildTermsBlocks(profile, recommendationHtml, needsHtml, warningHtml)
          : isQuoteDocumentType(documentType)
            ? buildQuoteBlocks(profile, documentType)
            : buildStatementBlocks(profile, recommendationHtml, needsHtml, warningHtml);

  const isFactFind = documentType === "Fact Find" || documentType === "Fact Find Update";
  const isStatement = isStatementDocumentType(documentType);
  const usesCustomFactFindSigning = isFactFind;
  const usesStatementHeader = isStatement || isQuoteDocumentType(documentType) || isFactFind;

  const sharedBlocks: ComposedBlock[] = [
    ...(usesStatementHeader
      ? []
      : [{
          kind: "banner" as const,
          eyebrow: documentType,
          title,
          subtitle: `${profile.fullName} (${profile.clientReference})`,
        }]),
    ...bodyBlocks,
    ...(isStatement || usesCustomFactFindSigning ? [] : [buildFooterBlock(profile, documentType)]),
  ];

  return {
    documentType,
    title: documentType,
    blocks: isStatement ? bodyBlocks : sharedBlocks,
    rootClassName:
      documentType === "Fact Find"
        ? `workflow-document-fact-find-${profile.factFindType === "small" ? "small" : "all"}`
        : undefined,
  };
}

function renderBlock(block: ComposedBlock) {
  switch (block.kind) {
    case "banner":
      return [
        '<header class="document-banner">',
        `<p class="document-eyebrow">${escapeHtml(block.eyebrow)}</p>`,
        `<h1>${escapeHtml(block.title)}</h1>`,
        `<p class="document-subtitle">${escapeHtml(block.subtitle)}</p>`,
        "</header>",
      ].join("");
    case "grid":
      return [
        `<section class="${escapeHtml(block.className ?? "document-grid")}">`,
        `<h2>${escapeHtml(block.title)}</h2>`,
        '<div class="grid-items">',
        block.items
          .map(
            (item) =>
              `<div class="grid-item"><span class="grid-label">${escapeHtml(item.label)}</span><strong>${escapeHtml(
                valueOrFallback(item.value),
              )}</strong></div>`,
          )
          .join(""),
        "</div>",
        "</section>",
      ].join("");
    case "section":
      if (!block.title) {
        return `<div class="${escapeHtml(block.className ?? "document-section")}">${block.bodyHtml}</div>`;
      }
      return `<section class="${escapeHtml(block.className ?? "document-section")}"><h2>${escapeHtml(block.title)}</h2>${block.bodyHtml}</section>`;
    case "statement-body":
      return `<div class="statement-document-body">${block.bodyHtml}</div>`;
    case "callout":
      return `<aside class="document-callout document-callout-${escapeHtml(block.tone)}"><h2>${escapeHtml(block.title)}</h2>${block.bodyHtml}</aside>`;
    case "logo":
      return [
        `<div class="${escapeHtml(block.className ?? "document-top-logo")}">`,
        `<img class="document-top-logo-image" src="${escapeHtml(OMEGA_LOGO_DATA_URI)}" alt="Omega Financial Management" />`,
        "</div>",
      ].join("");
    case "footer":
      return [
        '<footer class="signatures-footer">',
        `<h2>${escapeHtml(block.title)}</h2>`,
        `<p><strong>Advisor:</strong> ${escapeHtml(block.advisorName)}</p>`,
        `<p><strong>Client signature:</strong> ${escapeHtml(block.clientSignature)}</p>`,
        `<p><strong>Client signature date:</strong> ${escapeHtml(block.clientSignatureDate)}</p>`,
        `<p><strong>Advisor signature:</strong> ${escapeHtml(block.advisorSignature)}</p>`,
        ...block.complianceCopy.map((line) => `<p>${escapeHtml(line)}</p>`),
        "</footer>",
      ].join("");
  }
}

function renderEditorBlock(block: ComposedBlock) {
  switch (block.kind) {
    case "banner":
      return [
        '<div class="document-banner">',
        `<p class="document-eyebrow">${escapeHtml(block.eyebrow)}</p>`,
        `<h1>${escapeHtml(block.title)}</h1>`,
        `<p class="document-subtitle">${escapeHtml(block.subtitle)}</p>`,
        "</div>",
      ].join("");
    case "grid":
      return [
        `<div class="${escapeHtml(block.className ?? "document-grid")}">`,
        `<h2>${escapeHtml(block.title)}</h2>`,
        '<div class="grid-items">',
        ...block.items.map(
          (item) =>
            `<div class="grid-item"><span class="grid-label">${escapeHtml(item.label)}</span><strong>${escapeHtml(
              valueOrFallback(item.value),
            )}</strong></div>`,
        ),
        "</div>",
        "</div>",
      ].join("");
    case "section":
      if (!block.title) {
        return `<div class="${escapeHtml(block.className ?? "document-section")}">${block.bodyHtml}</div>`;
      }
      return `<div class="${escapeHtml(block.className ?? "document-section")}"><h2>${escapeHtml(block.title)}</h2>${block.bodyHtml}</div>`;
    case "statement-body":
      return `<div class="statement-document-body">${block.bodyHtml}</div>`;
    case "callout":
      return `<div class="document-callout document-callout-${escapeHtml(block.tone)}"><h2>${escapeHtml(block.title)}</h2>${block.bodyHtml}</div>`;
    case "logo":
      return [
        `<div class="${escapeHtml(block.className ?? "document-top-logo")}">`,
        `<img class="document-top-logo-image" src="${escapeHtml(OMEGA_LOGO_DATA_URI)}" alt="Omega Financial Management" />`,
        "</div>",
      ].join("");
    case "footer":
      return [
        '<div class="signatures-footer">',
        `<h2>${escapeHtml(block.title)}</h2>`,
        `<p><strong>Advisor:</strong> ${escapeHtml(block.advisorName)}</p>`,
        `<p><strong>Client signature:</strong> ${escapeHtml(block.clientSignature)}</p>`,
        `<p><strong>Client signature date:</strong> ${escapeHtml(block.clientSignatureDate)}</p>`,
        `<p><strong>Advisor signature:</strong> ${escapeHtml(block.advisorSignature)}</p>`,
        ...block.complianceCopy.map((line) => `<p>${escapeHtml(line)}</p>`),
        "</div>",
      ].join("");
  }
}

export function renderComposedDocumentHtml(document: ComposedDocument) {
  return `<article class="${escapeHtml(getWorkflowDocumentClassNames(document))}">${document.blocks
    .map((block) => renderBlock(block))
    .join("")}</article>`;
}

export function renderComposedDocumentEditorHtml(document: ComposedDocument) {
  return `<article class="${escapeHtml(getWorkflowDocumentClassNames(document))}">${document.blocks
    .map((block) => renderEditorBlock(block))
    .join("")}</article>`;
}

function getWorkflowDocumentClassNames(document: ComposedDocument) {
  const { documentType, rootClassName } = document;
  const classes = ["workflow-document", `workflow-document-${documentType.toLowerCase().replace(/\s+/g, "-")}`];

  if (documentType === "Pensions Statement") {
    classes.push("workflow-document-statement-of-suitability");
  }

  if (documentType === "Pensions Quote") {
    classes.push("workflow-document-quote");
  }

  if (rootClassName) {
    classes.push(rootClassName);
  }

  return classes.join(" ");
}
