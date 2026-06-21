import type { SeededClientProfile } from "../data/seeded-clients";
import type {
  ComposedBlock,
  ComposedDocument,
  GeneratedDocumentSection,
  IntegrationRequestArtifact,
  SupportedDocumentType,
} from "./document-types";

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
  return `<p>${escapeHtml(valueOrFallback(value, fallback))}</p>`;
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
    { label: "Provider", value: profile.provider },
    { label: "Recommended cover", value: profile.recommendedCover },
    { label: "Deferred period", value: profile.deferredPeriod },
    { label: "Cover to age", value: profile.coverAge },
    { label: "Premium", value: profile.premium },
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

function requestFieldsHtml(requestFields: IntegrationRequestArtifact["requestFields"]) {
  if (requestFields.length === 0) {
    return "<p>No PHI request fields were captured.</p>";
  }

  return `<ul>${requestFields
    .map((field) => `<li><strong>${escapeHtml(field.label)}:</strong> ${escapeHtml(valueOrFallback(field.value))}</li>`)
    .join("")}</ul>`;
}

function quoteResultsHtml(quoteResults: IntegrationRequestArtifact["quoteResults"]) {
  if (quoteResults.length === 0) {
    return "<p>No PHI quote results were returned.</p>";
  }

  return `<ul>${quoteResults
    .map((quote) => {
      const premiumParts = [
        quote.levelPremium ? `Level: ${quote.levelPremium}` : "",
        quote.escalation3Premium ? `Esc 3%: ${quote.escalation3Premium}` : "",
        quote.escalation5Premium ? `Esc 5%: ${quote.escalation5Premium}` : "",
      ]
        .filter(Boolean)
        .join(", ");

      return `<li><strong>${escapeHtml(valueOrFallback(quote.providerName))}</strong>${quote.policyType ? ` (${escapeHtml(quote.policyType)})` : ""}${
        premiumParts ? ` - ${escapeHtml(premiumParts)}` : ""
      }</li>`;
    })
    .join("")}</ul>`;
}

function buildPhiBlocks(profile: SeededClientProfile): ComposedBlock[] {
  const requests = profile.documentDrafts["Statement of Suitability"]?.integrationRequests ?? [];
  if (requests.length === 0) {
    return [];
  }

  return requests.flatMap((request) => {
    const blocks: ComposedBlock[] = [
      detailGrid("PHI Request Details", [
        { label: "Provider", value: request.provider },
        { label: "Request type", value: request.requestType },
        { label: "Status", value: request.status },
        { label: "Requested at", value: request.requestedAt },
      ]),
      {
        kind: "section",
        title: "PHI Request Fields",
        bodyHtml: requestFieldsHtml(request.requestFields),
      },
      {
        kind: "section",
        title: "PHI Quote Results",
        bodyHtml: quoteResultsHtml(request.quoteResults),
      },
    ];

    if (request.status === "failed" || request.errors.length > 0) {
      blocks.push({
        kind: "callout",
        tone: "warning",
        title: "PHI Integration Warning",
        bodyHtml: listHtml(request.errors, "PHI integration did not return a specific error."),
      });
    }

    return blocks;
  });
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

  const lines = [
    `${valueOrFallback(profile.provider)} ${valueOrFallback(profile.productType, "Income Protection recommendation")}`.trim(),
    `Recommended cover: ${valueOrFallback(profile.recommendedCover)}`,
    `Deferred period: ${valueOrFallback(profile.deferredPeriod)}`,
    `Premium: ${valueOrFallback(profile.premium)}`,
  ];

  return `<p>${escapeHtml(lines.join(". "))}.</p>`;
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

  return [
    paragraphHtml(profile.personalCircumstances || "No personal circumstances recorded."),
    paragraphHtml(profile.financialSituation || "No financial situation recorded."),
    paragraphHtml(profile.needsObjectives || "No needs and objectives recorded."),
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

function buildFactFindUpdateBlocks(profile: SeededClientProfile): ComposedBlock[] {
  return [
    detailGrid(
      "Client Summary",
      summaryGridItems(profile, "Fact Find Update"),
      "client-summary-grid",
    ),
    {
      kind: "section",
      title: "Additional Relevant Information",
      bodyHtml: [
        paragraphHtml(profile.factFindUpdatePersonalCircumstances, "No personal circumstances recorded."),
        paragraphHtml(profile.factFindUpdateFinancialSituation, "No financial situation recorded."),
        paragraphHtml(profile.factFindUpdateNeedsAndObjectives, "No needs and objectives recorded."),
      ].join(""),
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

function buildFactFindBlocks(profile: SeededClientProfile, recommendationHtml: string, needsHtml: string, warningHtml: string): ComposedBlock[] {
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
    detailGrid("Income Protection Arrangements", [
      { label: "No deferred provider", value: profile.incomeProtectionNoDeferredProvider },
      { label: "Deferred provider", value: profile.incomeProtectionDeferredProvider || profile.provider },
      { label: "Current weekly cover", value: profile.incomeProtectionDeferredCurrentWeeklyCover || profile.recommendedCover },
      { label: "Deferred period", value: profile.deferredPeriod },
      { label: "Cover to age", value: profile.coverAge },
      { label: "Monthly premium", value: profile.premium },
    ]),
    detailGrid("Assets & Liabilities", [
      { label: "Home (Self)", value: profile.assetHomeSelf },
      { label: "Home (Partner)", value: profile.assetHomePartner },
      { label: "Mortgage balance outstanding", value: profile.liabilityMortgageBalanceOutstanding },
      { label: "Mortgage monthly repayment", value: profile.liabilityMortgageMonthlyRepayment },
      { label: "Total liabilities per month - Self", value: profile.totalLiabilitiesPerMonthSelf },
      { label: "Total liabilities per month - Joint", value: profile.totalLiabilitiesPerMonthJoint },
    ]),
    detailGrid("Pension Arrangements", [
      { label: "Self retirement age", value: profile.selfRetirementAge },
      { label: "Self pension scheme", value: profile.selfEmployeeDirectorSchemeType },
      { label: "Self personal pension company", value: profile.selfPersonalPensionCompany },
      { label: "Partner retirement age", value: profile.partnerRetirementAge },
      { label: "Partner pension scheme", value: profile.partnerEmployeeDirectorSchemeType },
      { label: "Partner personal pension company", value: profile.partnerPersonalPensionCompany },
    ]),
    detailGrid("Life Insurance & Serious Illness", [
      { label: "Mortgage protection", value: profile.mortgageProtection || yesNoValue(profile.mortgageProtectionYes) },
      { label: "Life Insurance (Self)", value: profile.selfLifeInsuranceAmount },
      { label: "Life Insurance (Partner)", value: profile.partnerLifeInsuranceAmount },
      { label: "Serious Illness (Self)", value: profile.selfSeriousIllnessAmount },
      { label: "Serious Illness (Partner)", value: profile.partnerSeriousIllnessAmount },
      { label: "Personal insurance record", value: profile.personalInsurance },
    ]),
    {
      kind: "section",
      title: "Savings & Investments",
      bodyHtml: [listHtml(savingsRows, "No savings or investments recorded."), paragraphHtml(profile.savingsInvestmentComments, "No comments recorded.")].join(""),
    },
    {
      kind: "section",
      title: "Recommendation Section",
      bodyHtml: recommendationHtml,
    },
    {
      kind: "section",
      title: "Needs and Objectives",
      bodyHtml: needsHtml,
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

function buildStatementBlocks(profile: SeededClientProfile, recommendationHtml: string, needsHtml: string, warningHtml: string): ComposedBlock[] {
  return [
    detailGrid(
      "Client Summary",
      summaryGridItems(profile, "Statement of Suitability"),
      "client-summary-grid",
    ),
    detailGrid("Recommendation Details", [
      { label: "Statement type", value: profile.statementType },
      { label: "Product type", value: profile.productType },
      { label: "Recommended cover", value: profile.recommendedCover },
      { label: "Deferred period", value: profile.deferredPeriod },
      { label: "Cover to age", value: profile.coverAge },
      { label: "Gross monthly premium", value: profile.premium },
      { label: "Net monthly cost", value: profile.netMonthlyCost },
      { label: "Letter date", value: profile.letterDate },
    ]),
    {
      kind: "section",
      title: "Recommendation Section",
      bodyHtml: recommendationHtml,
    },
    {
      kind: "section",
      title: "Needs and Objectives",
      bodyHtml: needsHtml,
    },
    ...buildPhiBlocks(profile),
    detailGrid("Declarations", [
      { label: "PEP confirmation", value: profile.pepConfirmation },
      { label: "Related PEP confirmation", value: profile.pepRelatedConfirmation },
      { label: "Execution only", value: profile.executionOnlyConfirmation },
    ]),
    {
      kind: "callout",
      tone: "warning",
      title: "Warnings and Disclaimers",
      bodyHtml: warningHtml,
    },
  ];
}

export function composeWorkflowDocument(profile: SeededClientProfile, documentType: SupportedDocumentType): ComposedDocument {
  const title =
    documentType === "Fact Find" ? "Income Protection Fact Find" : documentType === "Terms of Business" ? "Terms of Business" : documentType;
  const draftSections = getDraftSections(profile, documentType);
  const recommendationSection = findDraftSection(draftSections, "recommendation", "summary", "issue");
  const needsSection = findDraftSection(draftSections, "needs", "objective", "circumstance");
  const warningSection = findDraftSection(draftSections, "warning", "disclaimer", "risk");
  const recommendationHtml = recommendationSection?.bodyHtml ?? buildRecommendationHtml(profile, documentType);
  const needsHtml = needsSection?.bodyHtml ?? buildNeedsNarrativeHtml(profile, documentType);
  const warningHtml = warningSection?.bodyHtml ?? buildWarningHtml(profile, documentType);

  const bodyBlocks =
    documentType === "Fact Find"
      ? buildFactFindBlocks(profile, recommendationHtml, needsHtml, warningHtml)
      : documentType === "Fact Find Update"
        ? buildFactFindUpdateBlocks(profile)
        : documentType === "Terms of Business"
          ? buildTermsBlocks(profile, recommendationHtml, needsHtml, warningHtml)
          : buildStatementBlocks(profile, recommendationHtml, needsHtml, warningHtml);

  return {
    documentType,
    title: documentType,
    blocks: [
      {
        kind: "banner",
        eyebrow: documentType,
        title,
        subtitle: `${profile.fullName} (${profile.clientReference})`,
      },
      ...bodyBlocks,
      buildFooterBlock(profile, documentType),
    ],
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
      return `<section class="${escapeHtml(block.className ?? "document-section")}"><h2>${escapeHtml(block.title)}</h2>${block.bodyHtml}</section>`;
    case "callout":
      return `<aside class="document-callout document-callout-${escapeHtml(block.tone)}"><h2>${escapeHtml(block.title)}</h2>${block.bodyHtml}</aside>`;
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
      return `<div class="${escapeHtml(block.className ?? "document-section")}"><h2>${escapeHtml(block.title)}</h2>${block.bodyHtml}</div>`;
    case "callout":
      return `<div class="document-callout document-callout-${escapeHtml(block.tone)}"><h2>${escapeHtml(block.title)}</h2>${block.bodyHtml}</div>`;
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
