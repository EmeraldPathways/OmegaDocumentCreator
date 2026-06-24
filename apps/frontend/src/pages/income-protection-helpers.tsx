import { useState } from "react";
import {
  ClipboardList,
  FileText,
  Shield,
  FolderOpen,
  Download,
  Check,
  File,
  FileText as FileTextIcon,
  FileType2,
} from "lucide-react";
import { Badge } from "../components/ui";
import type {
  SeededClientProfile,
} from "../data/seeded-clients";
import type { GeneratedDocumentDraft, SupportedDocumentType } from "../documents/document-types";

export const moduleTabs = [
  { id: "fact-find", label: "Fact Find", icon: ClipboardList },
  { id: "fact-find-update", label: "Fact Find Update", icon: FileTextIcon },
  { id: "statement-of-suitability", label: "Statement of Suitability", icon: Shield },
  { id: "files", label: "Files", icon: FolderOpen },
  { id: "generated-documents", label: "Generated Documents", icon: Download },
] as const;

export const employmentStatusOptions = [
  { value: "", label: "Select employment status" },
  { value: "Employed", label: "Employed" },
  { value: "Self-employed", label: "Self-employed" },
  { value: "Unemployed", label: "Unemployed" },
  { value: "Retired", label: "Retired" },
  { value: "Student", label: "Student" },
  { value: "Homemaker", label: "Homemaker" },
  { value: "Other", label: "Other" },
];

export const statementTypeOptions = [
  { value: "", label: "Select statement type" },
  { value: "Full Advice", label: "Full Advice" },
  { value: "Limited Advice", label: "Limited Advice" },
  { value: "Execution-only", label: "Execution-only" },
];

export const deferredPeriodOptions = [
  { value: "", label: "Select deferred period" },
  { value: "13 weeks", label: "13 weeks" },
  { value: "26 weeks", label: "26 weeks" },
  { value: "52 weeks", label: "52 weeks" },
];

export const coverAgeOptions = [
  { value: "", label: "Select cover age" },
  { value: "55", label: "55" },
  { value: "60", label: "60" },
  { value: "65", label: "65" },
];

export const genderOptions = [
  { value: "", label: "Select gender" },
  { value: "Male", label: "Male" },
  { value: "Female", label: "Female" },
];

export const smokerStatusOptions = [
  { value: "", label: "Select smoker status" },
  { value: "Non-Smoker", label: "Non-Smoker" },
  { value: "Smoker", label: "Smoker" },
];

export const phiOccupationalClassOptions = [
  { value: "", label: "Select occupational class" },
  { value: "1", label: "1" },
  { value: "2", label: "2" },
  { value: "3", label: "3" },
  { value: "4", label: "4" },
];

export const phiIndexationOptions = [
  { value: "", label: "Select indexation" },
  { value: "Y", label: "Y" },
  { value: "N", label: "N" },
];

export const SELECTED_CLIENT_STORAGE_KEY = "omega-selected-income-protection-client";

export type SeededClientStringKey = {
  [Key in keyof SeededClientProfile]: SeededClientProfile[Key] extends string ? Key : never;
}[keyof SeededClientProfile];

export function hasValue(value: unknown) {
  if (value == null) return false;
  return String(value).trim().length > 0;
}

export function toLower(value: unknown) {
  return String(value ?? "").toLowerCase();
}

export function isPresent(value: string | null): value is string {
  return value !== null;
}

export function resolveActorLabel(role: string | null | undefined) {
  return role === "admin" ? "Omega Admin" : "Office Staff";
}

export function buildFullName(firstName: unknown, surname: unknown) {
  return `${firstName ?? ""} ${surname ?? ""}`.trim();
}

export function replaceSpaces(value: string, replacement: string) {
  return value.replace(/ /g, replacement);
}

export function formatCurrency(value: string) {
  const numeric = value.replace(/[^0-9.]/g, "");
  const parsed = Number.parseFloat(numeric);
  if (Number.isNaN(parsed)) {
    return "";
  }
  return parsed.toLocaleString("en-GB", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

export function isAffirmative(value: string | undefined) {
  return toLower(value).startsWith("y");
}

export function formatDisplayDate(value: string) {
  if (!value) {
    return "Not recorded";
  }

  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) {
    return value;
  }

  return parsed.toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" });
}

export function getDocumentStatusVariant(status: string | undefined): Parameters<typeof Badge>[0]["variant"] {
  const lower = (status ?? "").toLowerCase();
  if (lower.includes("draft")) {
    return "draft";
  }
  if (lower.includes("ready")) {
    return "ready";
  }
  if (lower.includes("sent")) {
    return "sent";
  }
  if (lower.includes("signed")) {
    return "signed";
  }
  return "default";
}

export function getDraftStatusDotClass(status: GeneratedDocumentDraft["generationStatus"]) {
  switch (status) {
    case "generating":
      return "status-dot-amber";
    case "completed":
      return "status-dot-green";
    case "failed":
      return "status-dot-grey";
    default:
      return "status-dot-grey";
  }
}

export function getFileIcon(filename: string) {
  const lower = toLower(filename);
  if (lower.endsWith(".pdf")) {
    return <FileType2 size={20} />;
  }
  if (lower.endsWith(".docx") || lower.endsWith(".doc")) {
    return <FileText size={20} />;
  }
  return <File size={20} />;
}

export function getFileCategoryClass(category: string) {
  const lower = toLower(category);
  if (lower.includes("fact")) {
    return "category-fact-find";
  }
  if (lower.includes("generated")) {
    return "category-generated";
  }
  if (lower.includes("proof")) {
    return "category-proof";
  }
  return "category-other";
}

export function buildExportFilename(
  profile: SeededClientProfile,
  documentType: SupportedDocumentType,
  extension: "docx" | "pdf",
  versionNumber?: number,
) {
  const exportDate = profile.letterDate || new Date().toISOString().slice(0, 10);
  const versionSuffix = versionNumber && versionNumber > 1 ? `_v${versionNumber}` : "";
  return `${profile.firstName}_${profile.surname}_${replaceSpaces(documentType, "_")}_${exportDate}${versionSuffix}.${extension}`;
}

export function getGeneratedDraftStatusLabel(status: GeneratedDocumentDraft["generationStatus"]) {
  switch (status) {
    case "generating":
      return "Generating";
    case "completed":
      return "Ready to review";
    case "failed":
      return "Generation failed";
    default:
      return "Draft not generated";
  }
}

export function getGenerationHeaderStatus(prefix: string, status: GeneratedDocumentDraft["generationStatus"]) {
  switch (status) {
    case "generating":
      return `${prefix}: Generating draft`;
    case "completed":
      return `${prefix}: Draft generated`;
    case "failed":
      return `${prefix}: Draft generation failed`;
    default:
      return `${prefix}: Draft`;
  }
}

export function useAccordionState(defaultOpen: string[] = []) {
  const [openSections, setOpenSections] = useState<Set<string>>(new Set(defaultOpen));

  function toggle(sectionId: string) {
    setOpenSections((current) => {
      const next = new Set(current);
      if (next.has(sectionId)) {
        next.delete(sectionId);
      } else {
        next.add(sectionId);
      }
      return next;
    });
  }

  function isOpen(sectionId: string) {
    return openSections.has(sectionId);
  }

  return { isOpen, toggle };
}

export const PENSION_SECTION_CONFIGS = {
  self: {
    title: "Self",
    retiredYes: "selfAlreadyRetired",
    retiredNo: "selfNotRetired",
    retirementAge: "selfRetirementAge",
    target: "selfRetirementIncomeTargetPercent",
    employeeYes: "selfEmployeeDirectorPensionYes",
    employeeNo: "selfEmployeeDirectorPensionNo",
    schemeType: "selfEmployeeDirectorSchemeType",
    schemeRetirementAge: "selfEmployeeDirectorRetirementAge",
    employerContribution: "selfEmployeeDirectorEmployerContribution",
    personalContribution: "selfEmployeeDirectorPersonalContribution",
    employeeYears: "selfEmployeeDirectorYearsInForce",
    personalYes: "selfPersonalPensionYes",
    personalNo: "selfPersonalPensionNo",
    personalCompany: "selfPersonalPensionCompany",
    personalPolicyType: "selfPersonalPensionPolicyType",
    personalContributionField: "selfPersonalPensionContribution",
    personalCurrentValue: "selfPersonalPensionCurrentValue",
    personalYears: "selfPersonalPensionYearsInForce",
  },
  partner: {
    title: "Partner",
    retiredYes: "partnerAlreadyRetired",
    retiredNo: "partnerNotRetired",
    retirementAge: "partnerRetirementAge",
    target: "partnerRetirementIncomeTargetPercent",
    employeeYes: "partnerEmployeeDirectorPensionYes",
    employeeNo: "partnerEmployeeDirectorPensionNo",
    schemeType: "partnerEmployeeDirectorSchemeType",
    schemeRetirementAge: "partnerEmployeeDirectorRetirementAge",
    employerContribution: "partnerEmployeeDirectorEmployerContribution",
    personalContribution: "partnerEmployeeDirectorPersonalContribution",
    employeeYears: "partnerEmployeeDirectorYearsInForce",
    personalYes: "partnerPersonalPensionYes",
    personalNo: "partnerPersonalPensionNo",
    personalCompany: "partnerPersonalPensionCompany",
    personalPolicyType: "partnerPersonalPensionPolicyType",
    personalContributionField: "partnerPersonalPensionContribution",
    personalCurrentValue: "partnerPersonalPensionCurrentValue",
    personalYears: "partnerPersonalPensionYearsInForce",
  },
} as const;

export function getSectionProgress(fields: string[]) {
  const completed = fields.filter((field) => hasValue(String(field ?? "").replace(/,/g, "").trim())).length;
  const total = fields.length;
  if (completed === total) {
    return <Check size={16} className="text-success" />;
  }
  return <span className="text-muted text-small">{`${completed}/${total}`}</span>;
}

export function formatFileSize(bytes: number) {
  if (bytes < 1024) {
    return `${bytes} B`;
  }
  if (bytes < 1024 * 1024) {
    return `${(bytes / 1024).toFixed(1)} KB`;
  }
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}