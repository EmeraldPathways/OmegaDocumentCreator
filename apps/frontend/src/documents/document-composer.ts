import type { SeededClientProfile } from "../data/seeded-clients";
import type {
  ComposedBlock,
  ComposedDocument,
  GeneratedDocumentSection,
  IntegrationRequestArtifact,
  SupportedDocumentType,
} from "./document-types";
import { OMEGA_LOGO_DATA_URI } from "./omega-logo";

type StatementRecommendationProfile = SeededClientProfile &
  Partial<{
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

function summaryGridItems(profile: SeededClientProfile, documentType: SupportedDocumentType) {
  const commonItems = [
    { label: "Client", value: profile.fullName },
    { label: "Reference", value: profile.clientReference },
    { label: "Date of birth", value: profile.dateOfBirth },
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

function getQuoteRequests(profile: SeededClientProfile) {
  const quoteRequests = profile.documentDrafts["Quote"]?.integrationRequests ?? [];
  const statementRequests = profile.documentDrafts["Statement of Suitability"]?.integrationRequests ?? [];

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

  if (documentType === "Statement of Suitability") {
    return buildStatementRecommendationHtml(profile);
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

function indefiniteArticle(value: string) {
  return /^[aeiou]/i.test(value.trim()) ? "an" : "a";
}

function findSelectedQuote(profile: SeededClientProfile, requests: IntegrationRequestArtifact[]) {
  const quotes = requests.flatMap((request) => request.quoteResults);
  if (quotes.length === 0) {
    return null;
  }
  return quotes[0];
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

function resolveStatementGrossPremium(profile: SeededClientProfile, selectedQuote: ReturnType<typeof findSelectedQuote>) {
  return parseNumber(selectedQuote?.levelPremium) ?? parseNumber(profile.premium);
}

function resolveStatementNetMonthlyCost(
  profile: StatementRecommendationProfile,
  grossPremium: number | null,
  taxReliefPercentage: number | null,
) {
  const configuredValue = parseNumber(profile.netMonthlyCost);
  if (grossPremium === null || taxReliefPercentage === null) {
    return configuredValue;
  }

  return grossPremium * (1 - taxReliefPercentage / 100);
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
    normalized.includes("seeded fallback content");

  return looksGeneric ? computedHtml : `${computedHtml}${trimmed}`;
}

function buildStatementRecommendationHtml(profile: SeededClientProfile) {
  const statementProfile = profile as StatementRecommendationProfile;
  const requests = getQuoteRequests(profile);
  const selectedQuote = findSelectedQuote(profile, requests);
  const provider = valueOrFallback(selectedQuote?.providerName || profile.provider, "Recommended provider");
  const deferredPeriod = resolveStatementDeferredPeriod(profile, requests);
  const coverAmountNumber = parseNumber(profile.recommendedCover);
  const coverAmount = coverAmountNumber === null ? valueOrFallback(profile.recommendedCover) : `€${formatEuroAmount(coverAmountNumber, 0)}`;
  const coverAge = valueOrFallback(profile.coverAge, "selected retirement age");
  const incomeNumber = parseNumber(profile.income);
  const coverShare =
    incomeNumber !== null && incomeNumber > 0 && coverAmountNumber !== null ? Math.round((coverAmountNumber / incomeNumber) * 100) : null;
  const grossPremiumNumber = resolveStatementGrossPremium(profile, selectedQuote);
  const configuredNetMonthlyCostNumber = parseNumber(profile.netMonthlyCost);
  const taxReliefPercentage = resolveTaxReliefPercentage(statementProfile, grossPremiumNumber, configuredNetMonthlyCostNumber);
  const netMonthlyCostNumber = resolveStatementNetMonthlyCost(statementProfile, grossPremiumNumber, taxReliefPercentage);
  const discountApplied = parseNumber(statementProfile.discountApplied);
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
    costLine,
    affordabilityLine,
    `<p>We recommend this ${escapeHtml(provider)} Income Protection policy for the following reasons:</p>`,
    listHtml(reasonItems),
  ]
    .filter(Boolean)
    .join("");
}

export function buildQuoteComparisonHtml(profile: SeededClientProfile) {
  const requests = getQuoteRequests(profile);
  const quoteResults = requests.flatMap((request) => request.quoteResults);

  if (quoteResults.length === 0) {
    return "";
  }

  const phiDob = requestFieldValue(requests, "DOB", "Date of birth");

  const summaryItems = [
    `Cover amount: ${valueOrFallback(profile.recommendedCover)}`,
    `Date of birth: ${valueOrFallback(phiDob || profile.dateOfBirth)}`,
    `Deferred period: ${valueOrFallback(profile.deferredPeriod)}`,
    `Cover to age: ${valueOrFallback(profile.coverAge)}`,
    `Smoker status: ${valueOrFallback(profile.smokerStatus)}`,
    `Occupation class: ${valueOrFallback(profile.phiOccupationalClass)}`,
  ];

  const headers = ["Provider", "Policy Type", "Level", "Esc 3%", "Esc 5%"];
  const rows = quoteResults
    .map((quote) =>
      [
        valueOrFallback(quote.providerName),
        valueOrFallback(quote.policyType),
        valueOrFallback(quote.levelPremium),
        valueOrFallback(quote.escalation3Premium),
        valueOrFallback(quote.escalation5Premium),
      ]
        .map((value) => `<div class="statement-quote-cell"><p>${escapeHtml(value)}</p></div>`)
        .join(""),
    )
    .map((cells) => `<div class="statement-quote-row">${cells}</div>`)
    .join("");

  return [
    '<div class="statement-section statement-quote-block">',
    "<h2>Income Protection Quote Comparison</h2>",
    `<div class="statement-quote-summary">${summaryItems.map((item) => `<p>${escapeHtml(item)}</p>`).join("")}</div>`,
    '<div class="statement-quote-table">',
    `<div class="statement-quote-row statement-quote-row-header">${headers
      .map((header) => `<div class="statement-quote-cell"><p>${escapeHtml(header)}</p></div>`)
      .join("")}</div>`,
    rows,
    "</div>",
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
    detailGrid(
      "Client Summary",
      summaryGridItems(profile, "Fact Find"),
      "client-summary-grid",
    ),
    {
      kind: "section",
      title: "Services Requested",
      bodyHtml: listHtml(servicesRequested, "No services requested recorded."),
    },
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
      { label: "PEP confirmation", value: profile.pepConfirmation },
      { label: "Recommendation Acknowledgement", value: profile.recommendationAcknowledged },
    ]),
    detailGrid("Request for Information", [
      { label: "Client Name(s)", value: profile.requestClientNames },
      { label: "Address", value: addressSummary(profile.requestInfoAddressLine1, profile.requestInfoAddressLine2, profile.requestInfoAddressLine3, profile.requestInfoAddressLine4) },
      { label: "Date of Birth", value: profile.requestDateOfBirth },
      { label: "Company", value: profile.requestCompanyName },
      { label: "Policies", value: profile.requestPolicies },
      { label: "Date", value: profile.requestLetterDate },
    ]),
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
    `<p><strong>${escapeHtml(valueOrFallback(profile.advisorName, "Omega Advisor"))}</strong></p>`,
    '<p class="statement-signature-line">______________________________</p>',
    "<p>Financial Advisor</p>",
    "</div>",
    "</div>",
  ].join("");
}

function buildStatementDeclarationHtml() {
  return [
    '<div class="statement-section statement-declaration">',
    "<h2>Declaration to be completed by Client:</h2>",
    "<p>I am happy to proceed on the basis of the recommendation given to me and wish to affect the policy recommended.</p>",
    '<div class="statement-signature-area">',
    "<p>_______________________    ______________</p>",
    "<p>Amanda McLaughlin    Date</p>",
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
    buildStatementDeclarationHtml(),
    buildStatementImportantInfoHtml1(),
    buildStatementImportantInfoHtml2(),
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

function buildQuoteBlocks(profile: SeededClientProfile): ComposedBlock[] {
  const quoteHtml = buildQuoteComparisonHtml(profile);

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
      : documentType === "Terms of Business" ? "Terms of Business"
      : documentType;
  const draftSections = getDraftSections(profile, documentType);
  const recommendationSection = findDraftSection(draftSections, "recommendation", "summary", "issue");
  const personalCircumstancesSection = findDraftSection(draftSections, "personal circumstance");
  const financialSituationSection = findDraftSection(draftSections, "financial situation");
  const needsSection =
    documentType === "Statement of Suitability"
      ? findDraftSection(draftSections, "needs", "objective", "circumstance")
      : findDraftSection(draftSections, "needs", "objective");
  const warningSection = findDraftSection(draftSections, "warning", "disclaimer", "risk");
  const computedRecommendationHtml = buildRecommendationHtml(profile, documentType);
  const recommendationHtml =
    documentType === "Statement of Suitability"
      ? computedRecommendationHtml
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
            personalCircumstancesSection?.bodyHtml ?? buildFactFindPersonalCircumstancesHtml(profile, documentType),
            financialSituationSection?.bodyHtml ?? buildFactFindFinancialSituationHtml(profile, documentType),
            needsHtml,
          )
        : documentType === "Terms of Business"
          ? buildTermsBlocks(profile, recommendationHtml, needsHtml, warningHtml)
          : documentType === "Quote"
            ? buildQuoteBlocks(profile)
            : buildStatementBlocks(profile, recommendationHtml, needsHtml, warningHtml);

  const isFactFind = documentType === "Fact Find" || documentType === "Fact Find Update";
  const isStatement = documentType === "Statement of Suitability";
  const usesStatementHeader = isStatement || documentType === "Quote" || isFactFind;

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
    ...(isStatement ? [] : [buildFooterBlock(profile, documentType)]),
  ];

  return {
    documentType,
    title: documentType,
    blocks: isStatement ? bodyBlocks : sharedBlocks,
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
  return `<article class="workflow-document workflow-document-${escapeHtml(document.documentType.toLowerCase().replace(/\s+/g, "-"))}">${document.blocks
    .map((block) => renderBlock(block))
    .join("")}</article>`;
}

export function renderComposedDocumentEditorHtml(document: ComposedDocument) {
  return `<article class="workflow-document workflow-document-${escapeHtml(document.documentType.toLowerCase().replace(/\s+/g, "-"))}">${document.blocks
    .map((block) => renderEditorBlock(block))
    .join("")}</article>`;
}
