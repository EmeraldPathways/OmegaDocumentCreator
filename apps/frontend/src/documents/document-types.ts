export type SupportedDocumentType = "Fact Find" | "Fact Find Update" | "Terms of Business" | "Statement of Suitability";

export type DocumentTemplateDefinition = {
  id: string;
  documentType: SupportedDocumentType;
  title: string;
  description: string;
  sectionTitles: string[];
};

export type GeneratedDocumentSection = {
  id: string;
  title: string;
  bodyHtml: string;
  summary?: string;
};

export type IntegrationRequestField = {
  label: string;
  value: string;
};

export type IntegrationQuoteResult = {
  providerName: string;
  policyType?: string;
  levelPremium?: string;
  escalation3Premium?: string;
  escalation5Premium?: string;
};

export type IntegrationRequestArtifact = {
  provider: string;
  requestType: string;
  status: "sent" | "failed";
  requestedAt: string;
  requestFields: IntegrationRequestField[];
  quoteResults: IntegrationQuoteResult[];
  errors: string[];
};

export type GeneratedDocumentDraftStatus = "idle" | "generating" | "completed" | "failed";

export type GeneratedDocumentDraft = {
  selectedTemplateId: string;
  generationStatus: GeneratedDocumentDraftStatus;
  lastGeneratedHtml: string;
  lastGeneratedSections: GeneratedDocumentSection[];
  integrationRequests: IntegrationRequestArtifact[];
  editedHtml: string;
};

export type ComposedBlock =
  | { kind: "banner"; eyebrow: string; title: string; subtitle: string }
  | { kind: "grid"; title: string; className?: string; items: Array<{ label: string; value: string }> }
  | { kind: "section"; title: string; bodyHtml: string; className?: string }
  | { kind: "callout"; tone: "warning" | "info"; title: string; bodyHtml: string }
  | {
      kind: "footer";
      title: string;
      advisorName: string;
      clientSignature: string;
      clientSignatureDate: string;
      advisorSignature: string;
      complianceCopy: string[];
    };

export type ComposedDocument = {
  documentType: SupportedDocumentType;
  title: string;
  blocks: ComposedBlock[];
};
