import type { SeededClientProfile } from "../data/seeded-clients";
import type { ComposedBlock, ComposedDocument, GeneratedDocumentSection, SupportedDocumentType } from "./document-types";

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

function buildFactFindBlocks(profile: SeededClientProfile, recommendationHtml: string, needsHtml: string, warningHtml: string): ComposedBlock[] {
  return [
    detailGrid(
      "Client Summary",
      summaryGridItems(profile, "Fact Find"),
      "client-summary-grid",
    ),
    detailGrid("Contact Details", [
      { label: "Email", value: profile.email },
      { label: "Phone", value: profile.mobileNumber },
      { label: "Date of birth", value: profile.dateOfBirth },
      { label: "Address", value: [profile.townCity, profile.county].filter(Boolean).join(", ") },
      { label: "Marital status", value: profile.maritalStatus },
    ]),
    detailGrid("Employment Details", [
      { label: "Occupation", value: profile.occupation },
      { label: "Employment status", value: profile.employmentStatus },
      { label: "Income", value: profile.income },
      { label: "Advisor", value: profile.advisorName },
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

export function renderComposedDocumentHtml(document: ComposedDocument) {
  return `<article class="workflow-document workflow-document-${escapeHtml(document.documentType.toLowerCase().replace(/\s+/g, "-"))}">${document.blocks
    .map((block) => renderBlock(block))
    .join("")}</article>`;
}
