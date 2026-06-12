import type { SeededClientProfile } from "../data/seeded-clients";

export type WorkflowDocumentType = "Fact Find" | "Terms of Business" | "Statement of Suitability";

type BuiltDocument = {
  title: string;
  html: string;
};

function escapeHtml(value: string) {
  return value
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#39;");
}

function paragraph(label: string, value: string) {
  return `<p><strong>${escapeHtml(label)}:</strong> ${escapeHtml(value || "Not recorded")}</p>`;
}

function list(items: string[]) {
  const nonEmptyItems = items.filter((item) => item.trim().length > 0);
  if (nonEmptyItems.length === 0) {
    return `<p>No items recorded.</p>`;
  }

  return `<ul>${nonEmptyItems.map((item) => `<li>${escapeHtml(item)}</li>`).join("")}</ul>`;
}

function buildFactFind(profile: SeededClientProfile): BuiltDocument {
  return {
    title: "Fact Find",
    html: `
      <h1>Income Protection Fact Find</h1>
      <p>${escapeHtml(profile.fullName)} (${escapeHtml(profile.clientReference)})</p>
      <h2>Client Details</h2>
      ${paragraph("Full name", profile.fullName)}
      ${paragraph("Email", profile.email)}
      ${paragraph("Phone", profile.mobileNumber)}
      ${paragraph("Date of birth", profile.dateOfBirth)}
      ${paragraph("Address", [profile.townCity, profile.county].filter(Boolean).join(", "))}
      ${paragraph("Marital status", profile.maritalStatus)}
      <h2>Employment Details</h2>
      ${paragraph("Occupation", profile.occupation)}
      ${paragraph("Employment status", profile.employmentStatus)}
      ${paragraph("Income", profile.income)}
      ${paragraph("Advisor", profile.advisorName)}
      <h2>Income Protection</h2>
      ${paragraph("Provider", profile.provider)}
      ${paragraph("Recommended cover", profile.recommendedCover)}
      ${paragraph("Deferred period", profile.deferredPeriod)}
      ${paragraph("Cover to age", profile.coverAge)}
      ${paragraph("Premium", profile.premium)}
      <h2>Dependants</h2>
      ${list(profile.dependants.map((dependant) => `${dependant.name} (${dependant.dateOfBirth}) ${dependant.notes}`.trim()))}
    `,
  };
}

function buildTerms(profile: SeededClientProfile): BuiltDocument {
  return {
    title: "Terms of Business",
    html: `
      <h1>Terms of Business</h1>
      <p>${escapeHtml(profile.fullName)} (${escapeHtml(profile.clientReference)})</p>
      <h2>Issue Details</h2>
      ${paragraph("Terms version", profile.termsVersion)}
      ${paragraph("Delivery method", profile.termsDeliveryMethod)}
      ${paragraph("Issued by", profile.termsIssuedBy)}
      ${paragraph("Client received", profile.termsClientReceived)}
      ${paragraph("Client reviewed", profile.termsClientReviewed)}
      <h2>Notes</h2>
      <p>${escapeHtml(profile.termsNotes || "No notes recorded.")}</p>
      <h2>Contact Preferences</h2>
      ${paragraph("Phone", profile.contactByPhone)}
      ${paragraph("SMS", profile.contactBySms)}
      ${paragraph("Email", profile.contactByEmail)}
      ${paragraph("Post", profile.contactByPost)}
    `,
  };
}

function buildStatement(profile: SeededClientProfile): BuiltDocument {
  return {
    title: "Statement of Suitability",
    html: `
      <h1>Statement of Suitability</h1>
      <p>${escapeHtml(profile.fullName)} (${escapeHtml(profile.clientReference)})</p>
      <h2>Recommendation Summary</h2>
      ${paragraph("Statement type", profile.statementType)}
      ${paragraph("Provider", profile.provider)}
      ${paragraph("Product type", profile.productType)}
      ${paragraph("Recommended cover", profile.recommendedCover)}
      ${paragraph("Deferred period", profile.deferredPeriod)}
      ${paragraph("Cover to age", profile.coverAge)}
      ${paragraph("Gross monthly premium", profile.premium)}
      ${paragraph("Net monthly cost", profile.netMonthlyCost)}
      ${paragraph("Letter date", profile.letterDate)}
      <h2>Client Circumstances</h2>
      <p>${escapeHtml(profile.personalCircumstances || "Not recorded.")}</p>
      <h2>Financial Situation</h2>
      <p>${escapeHtml(profile.financialSituation || "Not recorded.")}</p>
      <h2>Needs and Objectives</h2>
      <p>${escapeHtml(profile.needsObjectives || "Not recorded.")}</p>
      <h2>Declarations</h2>
      ${paragraph("PEP confirmation", profile.pepConfirmation)}
      ${paragraph("Related PEP confirmation", profile.pepRelatedConfirmation)}
      ${paragraph("Execution only", profile.executionOnlyConfirmation)}
      <h2>Signatures</h2>
      ${paragraph("Client signature", profile.clientSignature1)}
      ${paragraph("Client signature date", profile.clientSignature1Date)}
      ${paragraph("Advisor signature", profile.financialAdvisorSignature)}
    `,
  };
}

export function buildWorkflowDocument(profile: SeededClientProfile, documentType: WorkflowDocumentType): BuiltDocument {
  switch (documentType) {
    case "Fact Find":
      return buildFactFind(profile);
    case "Terms of Business":
      return buildTerms(profile);
    case "Statement of Suitability":
      return buildStatement(profile);
    default:
      return {
        title: documentType,
        html: `<h1>${escapeHtml(documentType)}</h1><p>${escapeHtml(profile.fullName)} (${escapeHtml(profile.clientReference)})</p>`,
      };
  }
}
