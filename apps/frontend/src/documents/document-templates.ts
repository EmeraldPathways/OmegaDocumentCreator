import type { DocumentTemplateDefinition, GeneratedDocumentDraft, SupportedDocumentType } from "./document-types";

export const builtInDocumentTemplates: DocumentTemplateDefinition[] = [
  {
    id: "fact-find",
    documentType: "Fact Find",
    title: "Fact Find",
    description: "Core client fact-find template for income protection discovery.",
    sectionTitles: ["Personal Details", "Employment Details", "Protection Overview", "Request for Information"],
  },
  {
    id: "terms-of-business",
    documentType: "Terms of Business",
    title: "Terms of Business",
    description: "Standard Terms of Business issue template.",
    sectionTitles: ["Issue Details", "Delivery Method", "Client Confirmation", "Notes"],
  },
  {
    id: "statement-of-suitability",
    documentType: "Statement of Suitability",
    title: "Statement of Suitability",
    description: "Recommendation summary template for suitability output.",
    sectionTitles: ["Recommendation Basics", "Cover Summary", "Needs and Objectives", "Adviser Declaration"],
  },
];

export const defaultTemplateIdByDocumentType = builtInDocumentTemplates.reduce<Record<SupportedDocumentType, string>>(
  (templateMap, template) => {
    templateMap[template.documentType] = template.id;
    return templateMap;
  },
  {
    "Fact Find": "",
    "Terms of Business": "",
    "Statement of Suitability": "",
  },
);

export function createDefaultDocumentDrafts(): Record<SupportedDocumentType, GeneratedDocumentDraft> {
  return {
    "Fact Find": {
      selectedTemplateId: defaultTemplateIdByDocumentType["Fact Find"],
      generationStatus: "idle",
      lastGeneratedHtml: "",
      lastGeneratedSections: [],
    },
    "Terms of Business": {
      selectedTemplateId: defaultTemplateIdByDocumentType["Terms of Business"],
      generationStatus: "idle",
      lastGeneratedHtml: "",
      lastGeneratedSections: [],
    },
    "Statement of Suitability": {
      selectedTemplateId: defaultTemplateIdByDocumentType["Statement of Suitability"],
      generationStatus: "idle",
      lastGeneratedHtml: "",
      lastGeneratedSections: [],
    },
  };
}
