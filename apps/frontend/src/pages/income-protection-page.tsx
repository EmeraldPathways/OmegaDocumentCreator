import { useEffect, useMemo, useRef, useState, type ChangeEvent } from "react";
import { Link } from "react-router-dom";
import {
  ClipboardList,
  FileText,
  Shield,
  FolderOpen,
  Download,
  Save,
  FileDown,
  Upload,
  AlertTriangle,
  Check,
  Plus,
  Eye,
  RefreshCw,
  Search,
  Send,
  File,
  FileType2,
  Edit,
} from "lucide-react";

import { fetchWorkflow, saveWorkflow } from "../data/workflow-api";
import { downloadFile, listFiles, uploadFile, type BackendFile } from "../data/file-api";
import { createDocument, downloadDocument, listDocuments, type BackendGeneratedDocument } from "../documents/generated-document-api";
import { useAuth } from "../auth/auth-context";
import { useClientData } from "../data/client-data-context";
import type {
  SeededClientFile,
  SeededClientProfile,
  SeededGeneratedDocument,
  SeededSavingsInvestmentRow,
} from "../data/seeded-clients";
import { generateDocument } from "../documents/document-api";
import { buildExportDocumentArtifact, exportGeneratedDocument } from "../documents/export-generated-document";
import { GeneratedOutputWorkspace } from "../documents/generated-output-workspace";
import { builtInDocumentTemplates } from "../documents/document-templates";
import { TemplatePicker } from "../documents/template-picker";
import type { GeneratedDocumentDraft, SupportedDocumentType } from "../documents/document-types";
import { buildWorkflowDocument, buildWorkflowEditorDocument, type WorkflowDocumentType } from "../documents/workflow-document-builders";
import {
  Accordion,
  AccordionItem,
  Badge,
  Button,
  Input,
  Modal,
  Select,
  Textarea,
  Toggle,
  useToast,
} from "../components/ui";

const moduleTabs = [
  { id: "fact-find", label: "Fact Find", icon: ClipboardList },
  { id: "fact-find-update", label: "Fact Find Update", icon: FileText },
  { id: "statement-of-suitability", label: "Statement of Suitability", icon: Shield },
  { id: "files", label: "Files", icon: FolderOpen },
  { id: "generated-documents", label: "Generated Documents", icon: Download },
] as const;

const SELECTED_CLIENT_STORAGE_KEY = "omega-selected-income-protection-client";

const employmentStatusOptions = [
  { value: "", label: "Select employment status" },
  { value: "Employed", label: "Employed" },
  { value: "Self-employed", label: "Self-employed" },
  { value: "Unemployed", label: "Unemployed" },
  { value: "Retired", label: "Retired" },
  { value: "Student", label: "Student" },
  { value: "Homemaker", label: "Homemaker" },
  { value: "Other", label: "Other" },
];

const statementTypeOptions = [
  { value: "", label: "Select statement type" },
  { value: "Full Advice", label: "Full Advice" },
  { value: "Limited Advice", label: "Limited Advice" },
  { value: "Execution-only", label: "Execution-only" },
];

const deferredPeriodOptions = [
  { value: "", label: "Select deferred period" },
  { value: "13 weeks", label: "13 weeks" },
  { value: "26 weeks", label: "26 weeks" },
  { value: "52 weeks", label: "52 weeks" },
];

const coverAgeOptions = [
  { value: "", label: "Select cover age" },
  { value: "55", label: "55" },
  { value: "60", label: "60" },
  { value: "65", label: "65" },
];

const genderOptions = [
  { value: "", label: "Select gender" },
  { value: "Male", label: "Male" },
  { value: "Female", label: "Female" },
];

const smokerStatusOptions = [
  { value: "", label: "Select smoker status" },
  { value: "Non-Smoker", label: "Non-Smoker" },
  { value: "Smoker", label: "Smoker" },
];

const phiOccupationalClassOptions = [
  { value: "", label: "Select occupational class" },
  { value: "1", label: "1" },
  { value: "2", label: "2" },
  { value: "3", label: "3" },
  { value: "4", label: "4" },
];

const phiIndexationOptions = [
  { value: "", label: "Select indexation" },
  { value: "Y", label: "Y" },
  { value: "N", label: "N" },
];

type SeededClientStringKey = {
  [Key in keyof SeededClientProfile]: SeededClientProfile[Key] extends string ? Key : never;
}[keyof SeededClientProfile];

function hasValue(value: unknown) {
  if (value == null) return false;
  return String(value).trim().length > 0;
}

function toLower(value: unknown) {
  return String(value ?? "").toLowerCase();
}

function isPresent(value: string | null): value is string {
  return value !== null;
}

function resolveActorLabel(role: string | null | undefined) {
  return role === "admin" ? "Omega Admin" : "Office Staff";
}

function buildFullName(firstName: unknown, surname: unknown) {
  return `${firstName ?? ""} ${surname ?? ""}`.trim();
}

function replaceSpaces(value: string, replacement: string) {
  return value.replace(/ /g, replacement);
}

function formatCurrency(value: string) {
  const numeric = value.replace(/[^0-9.]/g, "");
  const parsed = Number.parseFloat(numeric);
  if (Number.isNaN(parsed)) {
    return "";
  }
  return parsed.toLocaleString("en-GB", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

function isAffirmative(value: string | undefined) {
  return toLower(value).startsWith("y");
}

function formatDisplayDate(value: string) {
  if (!value) {
    return "Not recorded";
  }

  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) {
    return value;
  }

  return parsed.toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" });
}

function getDocumentStatusVariant(status: string | undefined): Parameters<typeof Badge>[0]["variant"] {
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

function getDraftStatusDotClass(status: GeneratedDocumentDraft["generationStatus"]) {
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

function getFileIcon(filename: string) {
  const lower = toLower(filename);
  if (lower.endsWith(".pdf")) {
    return <FileType2 size={20} />;
  }
  if (lower.endsWith(".docx") || lower.endsWith(".doc")) {
    return <FileText size={20} />;
  }
  return <File size={20} />;
}

function getFileCategoryClass(category: string) {
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

function buildExportFilename(
  profile: SeededClientProfile,
  documentType: SupportedDocumentType,
  extension: "docx" | "pdf",
  versionNumber?: number,
) {
  const exportDate = profile.letterDate || new Date().toISOString().slice(0, 10);
  const versionSuffix = versionNumber && versionNumber > 1 ? `_v${versionNumber}` : "";
  return `${profile.firstName}_${profile.surname}_${replaceSpaces(documentType, "_")}_${exportDate}${versionSuffix}.${extension}`;
}

function getGeneratedDraftStatusLabel(status: GeneratedDocumentDraft["generationStatus"]) {
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

function getGenerationHeaderStatus(prefix: string, status: GeneratedDocumentDraft["generationStatus"]) {
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

function useAccordionState(defaultOpen: string[] = []) {
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

export function IncomeProtectionPage() {
  const { user } = useAuth();
  const actorLabel = resolveActorLabel(user?.role);
  const { addToast } = useToast();
  const { getClient, listClients, saveClient, saveGeneratedDraft, updateSelectedTemplate, upsertGeneratedDocument, upsertFile } =
    useClientData();
  const clients = listClients();
  const pendingGeneratedDocumentVersionsRef = useRef<Record<string, Set<number>>>({});
  const [selectedClientReference, setSelectedClientReference] = useState(() => {
    if (typeof window === "undefined") {
      return clients[0]?.clientReference ?? "";
    }
    return window.localStorage.getItem(SELECTED_CLIENT_STORAGE_KEY) ?? clients[0]?.clientReference ?? "";
  });
  const client = getClient(selectedClientReference);
  const [activeTabId, setActiveTabId] = useState<(typeof moduleTabs)[number]["id"]>(moduleTabs[0].id);
  const [draft, setDraft] = useState<SeededClientProfile | null>(client ?? null);
  const [factFindDraftSavedLabel, setFactFindDraftSavedLabel] = useState("Not saved yet");
  const [factFindGenerationStatus, setFactFindGenerationStatus] = useState("Generation: Draft");
  const [showFactFindValidation, setShowFactFindValidation] = useState(false);
  const [factFindUpdateSavedLabel, setFactFindUpdateSavedLabel] = useState("Not saved yet");
  const [factFindUpdateGenerationStatus, setFactFindUpdateGenerationStatus] = useState("Generation: Draft");
  const [statementSaveStatus, setStatementSaveStatus] = useState("Not saved yet");
  const [statementDocumentStatus, setStatementDocumentStatus] = useState("Document: Draft");
  const [showStatementValidation, setShowStatementValidation] = useState(false);
  const [fileUploadStatus, setFileUploadStatus] = useState("Upload: Waiting for upload");
  const [uploadProgress, setUploadProgress] = useState(0);
  const [documentPackStatus, setDocumentPackStatus] = useState("Pack: Waiting for request");
  const [documentDownloadStatus, setDocumentDownloadStatus] = useState("Download: No document downloaded yet");
  const [fileFilter, setFileFilter] = useState("");
  const [previewDocument, setPreviewDocument] = useState<SeededGeneratedDocument | null>(null);
  const [backendFiles, setBackendFiles] = useState<BackendFile[]>([]);
  const [backendGeneratedDocuments, setBackendGeneratedDocuments] = useState<BackendGeneratedDocument[]>([]);
  const [hasLoadedBackendGeneratedDocuments, setHasLoadedBackendGeneratedDocuments] = useState(false);
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const factFindWorkspaceAccordion = useAccordionState(["fact-find-form"]);
  const factFindAccordion = useAccordionState(["personal-details"]);
  const factFindUpdateWorkspaceAccordion = useAccordionState(["fact-find-update-form"]);
  const statementWorkspaceAccordion = useAccordionState(["statement-form"]);

  // Phase 3: load workflow from backend on client selection change
  useEffect(() => {
    if (!selectedClientReference) return;
    let cancelled = false;
    fetchWorkflow(selectedClientReference).then((fields) => {
      if (cancelled) return;
      setDraft((current) => current ? { ...current, ...fields } : current);
    }).catch(() => {});
    return () => { cancelled = true; };
  }, [selectedClientReference]);

  useEffect(() => {
    setDraft(client ?? null);
  }, [client]);

  useEffect(() => {
    if (!client) {
      return;
    }
    setFactFindGenerationStatus(getGenerationHeaderStatus("Generation", client.documentDrafts["Fact Find"].generationStatus));
    setFactFindUpdateGenerationStatus(
      getGenerationHeaderStatus("Generation", client.documentDrafts["Fact Find Update"].generationStatus),
    );
    setStatementDocumentStatus(
      getGenerationHeaderStatus("Document", client.documentDrafts["Statement of Suitability"].generationStatus),
    );
    setShowFactFindValidation(false);
    setShowStatementValidation(false);
  }, [selectedClientReference]);

  useEffect(() => {
    if (!selectedClientReference && clients[0]?.clientReference) {
      setSelectedClientReference(clients[0].clientReference);
      window.localStorage.setItem(SELECTED_CLIENT_STORAGE_KEY, clients[0].clientReference);
    }
  }, [clients, selectedClientReference]);

  if (!client || !draft) {
    return (
      <section className="card">
        <h1>Client Not Found</h1>
        <p className="text-muted">Select a client to continue with income protection workflow.</p>
      </section>
    );
  }

  const resolvedDraft = draft;

  const activeTab = moduleTabs.find((tab) => tab.id === activeTabId) ?? moduleTabs[0];

  const factFindMissingFields = [
    !hasValue(resolvedDraft.fullName) ? "Client name" : null,
    !hasValue(`${resolvedDraft.townCity ?? ""} ${resolvedDraft.county ?? ""}`.trim()) ? "Address" : null,
    !hasValue(resolvedDraft.dateOfBirth) ? "Date of birth" : null,
    !hasValue(resolvedDraft.occupation) ? "Occupation" : null,
    !hasValue(resolvedDraft.income) ? "Income / salary" : null,
    !hasValue(resolvedDraft.email) && !hasValue(resolvedDraft.mobileNumber) ? "Email or phone" : null,
    !hasValue(resolvedDraft.advisorName) ? "Advisor name" : null,
  ].filter(isPresent);

  const statementMissingFields = [
    !hasValue(resolvedDraft.fullName) ? "Client name" : null,
    !hasValue(`${resolvedDraft.townCity ?? ""} ${resolvedDraft.county ?? ""}`.trim()) ? "Address" : null,
    !hasValue(resolvedDraft.statementType) ? "Statement type" : null,
    !hasValue(resolvedDraft.provider) ? "Provider recommended" : null,
    !hasValue(resolvedDraft.productType) ? "Product recommended" : null,
    !hasValue(resolvedDraft.recommendedCover) ? "Recommended cover" : null,
    !hasValue(resolvedDraft.deferredPeriod) ? "Deferred period" : null,
    !hasValue(resolvedDraft.coverAge) ? "Cover to age" : null,
    !hasValue(resolvedDraft.gender) ? "Gender" : null,
    !hasValue(resolvedDraft.smokerStatus) ? "Smoker status" : null,
    !hasValue(resolvedDraft.phiOccupationalClass) ? "PHI occupational class" : null,
    !hasValue(resolvedDraft.phiIndexation) ? "PHI indexation" : null,
    !hasValue(resolvedDraft.premium) ? "Gross monthly premium" : null,
    !hasValue(resolvedDraft.advisorName) ? "Advisor name" : null,
    !hasValue(resolvedDraft.letterDate) ? "Letter date" : null,
  ].filter(isPresent);

  function getDocumentDraft(documentType: SupportedDocumentType) {
    return resolvedDraft.documentDrafts[documentType];
  }

  // Phase 3: persist to backend alongside localStorage
  async function persistDraft(nextDraft: SeededClientProfile, options?: { showToast?: boolean }) {
    const normalizedDraft = {
      ...nextDraft,
      fullName: buildFullName(nextDraft.firstName, nextDraft.surname),
      updatedBy: actorLabel,
    };
    setDraft(normalizedDraft);
    saveClient(normalizedDraft);

    try {
      await saveWorkflow(normalizedDraft.clientReference, normalizedDraft);
      if (options?.showToast) {
        addToast("Changes saved", "success");
      }
      return { draft: normalizedDraft, savedRemotely: true };
    } catch {
      if (options?.showToast) {
        addToast("Saved locally - server unavailable", "info");
      }
      return { draft: normalizedDraft, savedRemotely: false };
    }
  }

  function updateField(field: keyof SeededClientProfile, value: string) {
    setDraft((currentDraft) => {
      if (!currentDraft) {
        return currentDraft;
      }
      const nextDraft = { ...currentDraft, [field]: value };
      if (field === "firstName" || field === "surname") {
        nextDraft.fullName = buildFullName(
          field === "firstName" ? value : currentDraft.firstName,
          field === "surname" ? value : currentDraft.surname,
        );
      }
      return nextDraft;
    });
  }

  function updateSavingsInvestmentRow(index: number, field: keyof SeededSavingsInvestmentRow, value: string) {
    setDraft((currentDraft) => {
      if (!currentDraft) {
        return currentDraft;
      }

      const nextRows = currentDraft.savingsInvestmentRows.map((row, rowIndex) =>
        rowIndex === index ? { ...row, [field]: value } : row,
      );

      return { ...currentDraft, savingsInvestmentRows: nextRows };
    });
  }

  function renderToggleField(id: string, label: string, field: SeededClientStringKey) {
    return (
      <Toggle
        checked={isAffirmative(resolvedDraft[field])}
        id={id}
        label={label}
        onChange={(event) => updateField(field, event.target.checked ? "Yes" : "")}
      />
    );
  }

  function renderTextInput(id: string, label: string, field: SeededClientStringKey, type = "text") {
    return (
      <Input
        id={id}
        label={label}
        onChange={(event) => updateField(field, event.target.value)}
        type={type}
        value={resolvedDraft[field]}
      />
    );
  }

  function renderCurrencyInput(id: string, label: string, field: SeededClientStringKey) {
    return (
      <Input
        id={id}
        label={label}
        onBlur={(event) => updateField(field, formatCurrency(event.target.value))}
        onChange={(event) => updateField(field, event.target.value)}
        prefix="EUR"
        step="0.01"
        type="number"
        value={resolvedDraft[field]}
      />
    );
  }

  function renderTextarea(id: string, label: string, field: SeededClientStringKey, rows = 4, className?: string) {
    return (
      <Textarea
        className={className}
        id={id}
        label={label}
        onChange={(event) => updateField(field, event.target.value)}
        rows={rows}
        value={resolvedDraft[field]}
      />
    );
  }

  function renderYesNoGroup(title: string, yesField: SeededClientStringKey, noField: SeededClientStringKey, prefix: string) {
    return (
      <div className="form-section">
        <p className="text-small text-muted" style={{ marginBottom: "var(--space-2)" }}>
          {title}
        </p>
        <div className="form-grid">
          {renderToggleField(`${prefix}-yes`, "Yes", yesField)}
          {renderToggleField(`${prefix}-no`, "No", noField)}
        </div>
      </div>
    );
  }

  async function saveFactFindDraft() {
    const { savedRemotely } = await persistDraft(resolvedDraft, { showToast: true });
    setFactFindDraftSavedLabel(savedRemotely ? "Saved just now" : "Saved locally - server unavailable");
  }

  async function saveFactFindUpdateDraft() {
    const { savedRemotely } = await persistDraft(resolvedDraft, { showToast: true });
    setFactFindUpdateSavedLabel(savedRemotely ? "Saved just now" : "Saved locally - server unavailable");
  }

  function renderAssetRow(
    label: string,
    selfField: SeededClientStringKey,
    partnerField: SeededClientStringKey,
    idPrefix: string,
  ) {
    return (
      <tr>
        <td>{label}</td>
        <td>{renderCurrencyInput(`${idPrefix}-self`, `${label} self`, selfField)}</td>
        <td>{renderCurrencyInput(`${idPrefix}-partner`, `${label} partner`, partnerField)}</td>
      </tr>
    );
  }

  function renderLiabilityRow(
    label: string,
    amountField: SeededClientStringKey,
    monthlyField: SeededClientStringKey,
    providerField: SeededClientStringKey,
    balanceField: SeededClientStringKey,
    idPrefix: string,
  ) {
    return (
      <tr>
        <td>{label}</td>
        <td>{renderCurrencyInput(`${idPrefix}-amount`, `${label} amount`, amountField)}</td>
        <td>{renderCurrencyInput(`${idPrefix}-monthly`, `${label} monthly repayments`, monthlyField)}</td>
        <td>{renderTextInput(`${idPrefix}-provider`, `${label} bank / mortgage provider`, providerField)}</td>
        <td>{renderCurrencyInput(`${idPrefix}-balance`, `${label} balance outstanding`, balanceField)}</td>
      </tr>
    );
  }

  function renderSavingsInvestmentRow(index: number) {
    const row = resolvedDraft.savingsInvestmentRows[index];
    return (
      <tr key={`savings-row-${index}`}>
        <td>
          <Input
            id={`ff-savings-institution-${index + 1}`}
            label={`Savings institution ${index + 1}`}
            onChange={(event) => updateSavingsInvestmentRow(index, "financialInstitution", event.target.value)}
            type="text"
            value={row?.financialInstitution ?? ""}
          />
        </td>
        <td>
          <Input
            id={`ff-savings-value-${index + 1}`}
            label={`Savings value ${index + 1}`}
            onBlur={(event) => updateSavingsInvestmentRow(index, "value", formatCurrency(event.target.value))}
            onChange={(event) => updateSavingsInvestmentRow(index, "value", event.target.value)}
            prefix="EUR"
            step="0.01"
            type="number"
            value={row?.value ?? ""}
          />
        </td>
        <td>
          <Input
            id={`ff-savings-startDate-${index + 1}`}
            label={`Savings start date ${index + 1}`}
            onChange={(event) => updateSavingsInvestmentRow(index, "startDate", event.target.value)}
            type="date"
            value={row?.startDate ?? ""}
          />
        </td>
        <td>
          <Input
            id={`ff-savings-term-${index + 1}`}
            label={`Savings term ${index + 1}`}
            onChange={(event) => updateSavingsInvestmentRow(index, "term", event.target.value)}
            type="text"
            value={row?.term ?? ""}
          />
        </td>
      </tr>
    );
  }

  function renderPensionSection(section: "self" | "partner") {
    const config =
      section === "self"
        ? {
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
          }
        : {
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
          } as const;

    return (
      <>
        {renderYesNoGroup("Are you already retired?", config.retiredYes, config.retiredNo, `${section}-retired`)}
        <div className="form-grid">
          {renderTextInput(`ff-${section}-retirementAge`, "Planned retirement age", config.retirementAge)}
          {renderTextInput(`ff-${section}-retirementTarget`, "Retirement income target (%)", config.target)}
        </div>
        {renderYesNoGroup(
          "If an Employee or Director, have you pension provisions in place?",
          config.employeeYes,
          config.employeeNo,
          `${section}-employee-pension`,
        )}
        <div className="form-grid">
          {renderTextInput(`ff-${section}-schemeType`, "Scheme type", config.schemeType)}
          {renderTextInput(`ff-${section}-schemeRetirementAge`, "Retirement age", config.schemeRetirementAge)}
          {renderCurrencyInput(`ff-${section}-employerContribution`, "Employer contribution", config.employerContribution)}
          {renderCurrencyInput(`ff-${section}-personalContribution`, "Personal contribution", config.personalContribution)}
          {renderTextInput(`ff-${section}-employeeYears`, "Number of years in force", config.employeeYears)}
        </div>
        {renderYesNoGroup(
          "If self employed or in non-pensionable employment do you contribute to a personal pension plan?",
          config.personalYes,
          config.personalNo,
          `${section}-personal-pension`,
        )}
        <div className="form-grid">
          {renderTextInput(`ff-${section}-personalCompany`, "Name of company", config.personalCompany)}
          {renderTextInput(`ff-${section}-personalPolicyType`, "Type of policy", config.personalPolicyType)}
          {renderCurrencyInput(`ff-${section}-personalContributionValue`, "Contribution", config.personalContributionField)}
          {renderCurrencyInput(`ff-${section}-personalCurrentValue`, "Current value", config.personalCurrentValue)}
          {renderTextInput(`ff-${section}-personalYears`, "Number of years in force", config.personalYears)}
        </div>
      </>
    );
  }

  function getGeneratedDocumentReservationKey(clientReference: string, documentType: SupportedDocumentType) {
    return `${clientReference}::${documentType}`;
  }

  function getHighestGeneratedDocumentVersion(documentType: SupportedDocumentType) {
    const latestClient = getClient(resolvedDraft.clientReference) ?? resolvedDraft;
    return latestClient.generatedDocuments
      .filter((document) => document.documentType === documentType)
      .reduce((highestVersion, document) => {
        const parsedVersion = Number.parseInt(document.version.replace(/^Version\s+/i, ""), 10);
        return Number.isNaN(parsedVersion) ? highestVersion : Math.max(highestVersion, parsedVersion);
      }, 0);
  }

  function reserveGeneratedDocumentVersion(documentType: SupportedDocumentType) {
    const reservationKey = getGeneratedDocumentReservationKey(resolvedDraft.clientReference, documentType);
    const reservedVersions = pendingGeneratedDocumentVersionsRef.current[reservationKey] ?? new Set<number>();
    const highestReservedVersion = reservedVersions.size > 0 ? Math.max(...reservedVersions) : 0;
    const nextVersion = Math.max(getHighestGeneratedDocumentVersion(documentType), highestReservedVersion) + 1;
    reservedVersions.add(nextVersion);
    pendingGeneratedDocumentVersionsRef.current[reservationKey] = reservedVersions;
    return nextVersion;
  }

  function releaseGeneratedDocumentVersion(documentType: SupportedDocumentType, versionNumber: number) {
    const reservationKey = getGeneratedDocumentReservationKey(resolvedDraft.clientReference, documentType);
    const reservedVersions = pendingGeneratedDocumentVersionsRef.current[reservationKey];
    if (!reservedVersions) {
      return;
    }
    reservedVersions.delete(versionNumber);
    if (reservedVersions.size === 0) {
      delete pendingGeneratedDocumentVersionsRef.current[reservationKey];
    }
  }

  function buildGeneratedDocumentRecord(
    documentType: SupportedDocumentType,
    extension: "docx" | "pdf",
    previewArtifact: { html: string; title: string },
    versionNumber: number,
  ) {
    const latestClient = getClient(resolvedDraft.clientReference) ?? resolvedDraft;
    const generatedAt = latestClient.letterDate || new Date().toISOString().slice(0, 10);
    const documentName = buildExportFilename(latestClient, documentType, extension, versionNumber);
    return {
      id: `DOC-${toLower(replaceSpaces(documentType, "-"))}-${extension}-${versionNumber}-${Date.now()}`,
      documentType,
      documentName,
      version: `Version ${versionNumber}`,
      status: extension === "pdf" ? "PDF ready" : "DOCX ready",
      generatedAt,
      previewHtml: previewArtifact.html,
      previewTitle: previewArtifact.title,
    } satisfies SeededGeneratedDocument;
  }

  function buildGeneratedFileRecord(document: SeededGeneratedDocument) {
    return {
      id: `FILE-${document.id}`,
      category: "Generated Documents",
      originalFilename: document.documentName,
      status: "Approved",
      uploadedBy: actorLabel,
      uploadedAt: document.generatedAt,
    } satisfies SeededClientFile;
  }

  function updateGeneratedOutput(documentType: SupportedDocumentType, html: string) {
    const nextHtml = html.trim();
    saveGeneratedDraft(resolvedDraft.clientReference, documentType, { editedHtml: nextHtml });
    setDraft((currentDraft) => {
      if (!currentDraft) {
        return currentDraft;
      }

      return {
        ...currentDraft,
        documentDrafts: {
          ...currentDraft.documentDrafts,
          [documentType]: {
            ...currentDraft.documentDrafts[documentType],
            editedHtml: nextHtml,
          },
        },
      };
    });
  }

  function buildGeneratedEditorHtml(
    documentType: SupportedDocumentType,
    generatedDocument: {
      generatedHtml: string;
      sections: Array<{ id: string; title: string; bodyHtml: string }>;
      integrationRequests?: GeneratedDocumentDraft["integrationRequests"];
    },
  ) {
    const nextProfile = {
      ...resolvedDraft,
      documentDrafts: {
        ...resolvedDraft.documentDrafts,
        [documentType]: {
          ...resolvedDraft.documentDrafts[documentType],
          lastGeneratedHtml: generatedDocument.generatedHtml,
          lastGeneratedSections: generatedDocument.sections,
          integrationRequests: generatedDocument.integrationRequests ?? [],
          editedHtml: "",
        },
      },
    };

    return buildWorkflowEditorDocument(nextProfile, documentType).html;
  }

  async function handleGeneratedOutputExport(documentType: SupportedDocumentType, extension: "docx" | "pdf") {
    const previewArtifact = buildExportDocumentArtifact(resolvedDraft, documentType);
    if (!previewArtifact.html) {
      return;
    }

    const versionNumber = reserveGeneratedDocumentVersion(documentType);
    const nextDocument = buildGeneratedDocumentRecord(documentType, extension, previewArtifact, versionNumber);
    try {
      const artifactBlob = await exportGeneratedDocument(
        resolvedDraft,
        documentType,
        extension,
        nextDocument.documentName,
        previewArtifact,
      );

      const persisted = await createDocument(
        resolvedDraft.clientReference,
        {
          document_type: documentType,
          document_name: nextDocument.documentName.replace(/\.(pdf|docx)$/i, ""),
          version: nextDocument.version,
          status: nextDocument.status,
          preview_title: nextDocument.previewTitle,
          preview_html: nextDocument.previewHtml,
        },
        {
          blob: artifactBlob,
          filename: nextDocument.documentName,
          contentType:
            extension === "pdf"
              ? "application/pdf"
              : "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
        },
      );

      setBackendGeneratedDocuments((current) => [persisted, ...current.filter((doc) => doc.id !== persisted.id)]);
      setHasLoadedBackendGeneratedDocuments(true);
      upsertGeneratedDocument(resolvedDraft.clientReference, nextDocument);
      upsertFile(resolvedDraft.clientReference, buildGeneratedFileRecord(nextDocument));
      addToast(`${documentType} exported`, "success");
    } catch {
      addToast(`Failed to export ${documentType}`, "error");
    } finally {
      releaseGeneratedDocumentVersion(documentType, versionNumber);
    }
  }

  async function handleFactFindGenerate() {
    if (factFindMissingFields.length > 0) {
      setShowFactFindValidation(true);
      setFactFindGenerationStatus("Generation: Blocked by missing required fields");
      return;
    }
    setShowFactFindValidation(false);
    await saveFactFindDraft();
    setFactFindGenerationStatus("Generation: Generating");
    saveGeneratedDraft(resolvedDraft.clientReference, "Fact Find", { generationStatus: "generating" });
    try {
      const generatedDocument = await generateDocument({
        clientReference: resolvedDraft.clientReference,
        documentType: "Fact Find",
        templateId: getDocumentDraft("Fact Find").selectedTemplateId,
        workflowSnapshot: resolvedDraft as unknown as Record<string, unknown>,
      });
      saveGeneratedDraft(resolvedDraft.clientReference, "Fact Find", {
        generationStatus: "completed",
        lastGeneratedHtml: generatedDocument.generatedHtml,
        lastGeneratedSections: generatedDocument.sections,
        integrationRequests: generatedDocument.integrationRequests,
        editedHtml: buildGeneratedEditorHtml("Fact Find", generatedDocument),
      });
      setFactFindGenerationStatus("Generation: Draft generated");
      addToast("Fact Find draft generated", "success");
    } catch {
      saveGeneratedDraft(resolvedDraft.clientReference, "Fact Find", { generationStatus: "failed" });
      setFactFindGenerationStatus("Generation: Draft generation failed");
      addToast("Failed to generate Fact Find draft", "error");
    }
  }

  async function saveStatementDraft() {
    const { savedRemotely } = await persistDraft(resolvedDraft, { showToast: true });
    setStatementSaveStatus(savedRemotely ? "Saved just now" : "Saved locally - server unavailable");
  }

  async function handleFactFindUpdateGenerate() {
    await saveFactFindUpdateDraft();
    setFactFindUpdateGenerationStatus("Generation: Generating");
    saveGeneratedDraft(resolvedDraft.clientReference, "Fact Find Update", { generationStatus: "generating" });
    try {
      const generatedDocument = await generateDocument({
        clientReference: resolvedDraft.clientReference,
        documentType: "Fact Find Update",
        templateId: getDocumentDraft("Fact Find Update").selectedTemplateId,
        workflowSnapshot: resolvedDraft as unknown as Record<string, unknown>,
      });
      saveGeneratedDraft(resolvedDraft.clientReference, "Fact Find Update", {
        generationStatus: "completed",
        lastGeneratedHtml: generatedDocument.generatedHtml,
        lastGeneratedSections: generatedDocument.sections,
        integrationRequests: generatedDocument.integrationRequests,
        editedHtml: buildGeneratedEditorHtml("Fact Find Update", generatedDocument),
      });
      setFactFindUpdateGenerationStatus("Generation: Draft generated");
      addToast("Fact Find Update draft generated", "success");
    } catch {
      saveGeneratedDraft(resolvedDraft.clientReference, "Fact Find Update", { generationStatus: "failed" });
      setFactFindUpdateGenerationStatus("Generation: Draft generation failed");
      addToast("Failed to generate Fact Find Update draft", "error");
    }
  }

  async function handleStatementGenerate() {
    if (statementMissingFields.length > 0) {
      setShowStatementValidation(true);
      setStatementDocumentStatus("Document: Blocked by missing required fields");
      return;
    }
    setShowStatementValidation(false);
    await saveStatementDraft();
    setStatementDocumentStatus("Document: Generating");
    saveGeneratedDraft(resolvedDraft.clientReference, "Statement of Suitability", { generationStatus: "generating" });
    try {
      const generatedDocument = await generateDocument({
        clientReference: resolvedDraft.clientReference,
        documentType: "Statement of Suitability",
        templateId: getDocumentDraft("Statement of Suitability").selectedTemplateId,
        workflowSnapshot: resolvedDraft as unknown as Record<string, unknown>,
      });
      saveGeneratedDraft(resolvedDraft.clientReference, "Statement of Suitability", {
        generationStatus: "completed",
        lastGeneratedHtml: generatedDocument.generatedHtml,
        lastGeneratedSections: generatedDocument.sections,
        integrationRequests: generatedDocument.integrationRequests,
        editedHtml: buildGeneratedEditorHtml("Statement of Suitability", generatedDocument),
      });
      setStatementDocumentStatus("Document: Draft generated");
      addToast("Statement of Suitability draft generated", "success");
    } catch {
      saveGeneratedDraft(resolvedDraft.clientReference, "Statement of Suitability", { generationStatus: "failed" });
      setStatementDocumentStatus("Document: Draft generation failed");
      addToast("Failed to generate Statement of Suitability draft", "error");
    }
  }

  // Phase 4: load backend files when client changes
  useEffect(() => {
    if (!selectedClientReference) return;
    let cancelled = false;
    listFiles(selectedClientReference)
      .then((files) => {
        if (!cancelled) setBackendFiles(files);
      })
      .catch(() => {});
    return () => {
      cancelled = true;
    };
  }, [selectedClientReference]);

  // Phase 5: load backend generated documents when client changes
  useEffect(() => {
    if (!selectedClientReference) return;
    let cancelled = false;
    setHasLoadedBackendGeneratedDocuments(false);
    listDocuments(selectedClientReference)
      .then((docs) => {
        if (!cancelled) {
          setBackendGeneratedDocuments(docs);
          setHasLoadedBackendGeneratedDocuments(true);
        }
      })
      .catch(() => {
        if (!cancelled) {
          setBackendGeneratedDocuments([]);
        }
      });
    return () => {
      cancelled = true;
    };
  }, [selectedClientReference]);

  function handleFileSelect() {
    fileInputRef.current?.click();
  }

  async function handleRealFileUpload(event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    if (!file) return;

    setFileUploadStatus("Upload: Uploading...");
    setUploadProgress(50);

    try {
      const uploaded = await uploadFile(selectedClientReference, file);
      setUploadProgress(100);
      setFileUploadStatus("Upload: File saved");
      setBackendFiles((current) => [uploaded, ...current]);
      addToast("File uploaded successfully", "success");
    } catch {
      setUploadProgress(0);
      setFileUploadStatus("Upload: Upload failed");
      addToast("Upload failed", "error");
    } finally {
      // Reset file input so the same file can be re-selected
      if (fileInputRef.current) fileInputRef.current.value = "";
    }
  }

  async function handleBackendFileDownload(fileId: string, filename: string) {
    try {
      await downloadFile(selectedClientReference, fileId, filename);
      addToast("File downloaded", "success");
    } catch {
      addToast("Download failed", "error");
    }
  }

  function handleDownloadDocument(document: SeededGeneratedDocument) {
    const extension = toLower(document.documentName).endsWith(".pdf") ? "pdf" : "docx";
    const exportOverride = document.previewHtml
      ? { html: document.previewHtml, title: document.previewTitle ?? document.documentType }
      : undefined;
    setDocumentDownloadStatus(`Download: Downloading ${document.documentName}`);
    exportGeneratedDocument(
      resolvedDraft,
      document.documentType as WorkflowDocumentType,
      extension,
      document.documentName,
      exportOverride,
    )
      .then(() => {
        setDocumentDownloadStatus(`Download: Downloaded ${document.documentName}`);
        addToast("Document downloaded", "success");
      })
      .catch(() => {
        setDocumentDownloadStatus(`Download: Failed ${document.documentName}`);
        addToast("Download failed", "error");
      });
  }

  function handleRegenerateDocument(document: SeededGeneratedDocument) {
    const type = document.documentType as SupportedDocumentType;
    if (type === "Fact Find") {
      void handleFactFindGenerate();
    } else if (type === "Fact Find Update") {
      void handleFactFindUpdateGenerate();
    } else if (type === "Statement of Suitability") {
      void handleStatementGenerate();
    }
  }

  function handleSendDocument(document: SeededGeneratedDocument) {
    addToast(`${document.documentName} sent to client`, "success");
  }

  async function handleDownloadPack() {
    setDocumentPackStatus("Pack: Preparing pack...");
    await new Promise((resolve) => setTimeout(resolve, 1200));
    setDocumentPackStatus("Pack: Downloaded");
    addToast("Document pack downloaded", "success");
  }

  const filteredFiles = resolvedDraft.files.filter((file) =>
    toLower(file.originalFilename).includes(fileFilter.toLowerCase()),
  );
  const filteredBackendFiles = backendFiles.filter((file) =>
    toLower(file.original_filename).includes(fileFilter.toLowerCase()),
  );

  const summaryContact = resolvedDraft.email || resolvedDraft.mobileNumber || "Not recorded";

  // Progress indicators per tab
  const tabProgress = useMemo(() => {
    const factFindFields = [
      resolvedDraft.fullName,
      resolvedDraft.dateOfBirth,
      resolvedDraft.occupation,
      resolvedDraft.income,
      resolvedDraft.advisorName,
    ];
    const factFindComplete = factFindFields.every(hasValue);

    const factFindUpdateFields = [
      resolvedDraft.factFindUpdatePersonalCircumstances,
      resolvedDraft.factFindUpdateFinancialSituation,
      resolvedDraft.factFindUpdateNeedsAndObjectives,
      resolvedDraft.factFindUpdateExecutionOnlyBasis,
      resolvedDraft.factFindUpdateTermsReviewedReceived,
    ];
    const factFindUpdateComplete = factFindUpdateFields.every(hasValue);

    const statementComplete = statementMissingFields.length === 0;
    const filesComplete = resolvedDraft.files.length > 0;
    const generatedComplete = resolvedDraft.generatedDocuments.length > 0;

    return {
      "fact-find": factFindComplete ? "complete" : (factFindFields.some(hasValue) ? "partial" : "incomplete"),
      "fact-find-update": factFindUpdateComplete
        ? "complete"
        : (factFindUpdateFields.some(hasValue) ? "partial" : "incomplete"),
      "statement-of-suitability": statementComplete ? "complete" : (statementMissingFields.length < 15 ? "partial" : "incomplete"),
      "files": filesComplete ? "complete" : "incomplete",
      "generated-documents": generatedComplete ? "complete" : "incomplete",
    } as Record<(typeof moduleTabs)[number]["id"], "complete" | "partial" | "incomplete">;
  }, [resolvedDraft]);

  function requiredLabel(label: string) {
    return (
      <>
        {label} <span className="required">*</span>
      </>
    );
  }

  function renderTabPanel() {
    if (activeTab.id === "fact-find") {
      const factFindDraft = getDocumentDraft("Fact Find");

      return (
        <div className="page-stack">
          <div className="page-heading page-heading-compact">
            <div>
              <h2>Fact Find Draft</h2>
            </div>
          </div>

          {showFactFindValidation ? (
            <div className="validation-banner">
              <AlertTriangle size={18} />
              <span>Missing required fields: {factFindMissingFields.join(", ")}</span>
            </div>
          ) : null}

          <Accordion flush>
            <AccordionItem
              indicator={tabProgress["fact-find"]}
              isOpen={factFindWorkspaceAccordion.isOpen("fact-find-form")}
              onToggle={() => factFindWorkspaceAccordion.toggle("fact-find-form")}
              title="Fact Find Form"
            >
              <Accordion flush>
                <AccordionItem
                  indicator={getSectionProgress([
                    resolvedDraft.servicesRequestedLifeProtection,
                    resolvedDraft.servicesRequestedIncomeProtection,
                    resolvedDraft.servicesRequestedSavingsProtection,
                    resolvedDraft.servicesRequestedPensionPlanning,
                  ])}
                  isOpen={factFindAccordion.isOpen("services-requested")}
                  onToggle={() => factFindAccordion.toggle("services-requested")}
                  title="Services Requested"
                >
                  <p className="text-muted text-small" style={{ marginBottom: "var(--space-3)" }}>
                    The purpose of this review is to ensure that the plans in place will meet the needs of you and your dependants into the future. If you have a particular area of concern on which you wish to focus, we can limit or review that particular area.
                  </p>
                  <div className="form-grid">
                    {renderToggleField("ff-services-lifeProtection", "Life Protection", "servicesRequestedLifeProtection")}
                    {renderToggleField("ff-services-incomeProtection", "Income Protection", "servicesRequestedIncomeProtection")}
                    {renderToggleField("ff-services-savingsProtection", "Savings & Protection", "servicesRequestedSavingsProtection")}
                    {renderToggleField("ff-services-pensionPlanning", "Pension Planning", "servicesRequestedPensionPlanning")}
                  </div>
                </AccordionItem>

                <AccordionItem
                  indicator={getSectionProgress([
                    resolvedDraft.fullName,
                    resolvedDraft.dateOfBirth,
                    resolvedDraft.email,
                    resolvedDraft.mobileNumber,
                    resolvedDraft.homeAddressLine1,
                    resolvedDraft.maritalStatus,
                  ])}
                  isOpen={factFindAccordion.isOpen("personal-details")}
                  onToggle={() => factFindAccordion.toggle("personal-details")}
                  title="Personal Details"
                >
                  <div className="form-grid">
                    {renderTextInput("ff-fullName", "Name", "fullName")}
                    <Select
                      id="ff-maritalStatus"
                      label="Marital status"
                      onChange={(event) => updateField("maritalStatus", event.target.value)}
                      options={[
                        { value: "", label: "Select status" },
                        { value: "Single", label: "Single" },
                        { value: "Married", label: "Married" },
                        { value: "Civil Partnership", label: "Civil Partnership" },
                        { value: "Divorced", label: "Divorced" },
                        { value: "Widowed", label: "Widowed" },
                        { value: "Separated", label: "Separated" },
                      ]}
                      value={resolvedDraft.maritalStatus}
                    />
                    {renderTextInput("ff-homeAddress1", "Home address line 1", "homeAddressLine1")}
                    {renderTextInput("ff-homeAddress2", "Home address line 2", "homeAddressLine2")}
                    {renderTextInput("ff-homeAddress3", "Home address line 3", "clientHomeAddressLine3")}
                    {renderTextInput("ff-homeAddress4", "Home address line 4", "clientHomeAddressLine4")}
                    {renderTextInput("ff-workAddress1", "Work address line 1", "clientWorkAddressLine1")}
                    {renderTextInput("ff-workAddress2", "Work address line 2", "clientWorkAddressLine2")}
                    {renderTextInput("ff-workAddress3", "Work address line 3", "clientWorkAddressLine3")}
                    {renderTextInput("ff-workAddress4", "Work address line 4", "clientWorkAddressLine4")}
                    {renderTextInput("ff-dob", "Date of Birth", "dateOfBirth", "date")}
                    <Select
                      id="ff-gender"
                      label="Gender"
                      onChange={(event) => updateField("gender", event.target.value)}
                      options={genderOptions}
                      value={resolvedDraft.gender}
                    />
                    {renderTextInput("ff-email", "Email", "email", "email")}
                    {renderTextInput("ff-phone", "Home / Mobile", "mobileNumber", "tel")}
                    {renderTextInput("ff-workPhone", "Work Phone", "workPhone", "tel")}
                    {renderTextInput("ff-partnerName", "Partner Name", "partnerName")}
                    {renderTextInput("ff-partnerDob", "Partner Date of Birth", "partnerDateOfBirth", "date")}
                    {renderTextInput("ff-partnerAddress1", "Partner address line 1", "partnerAddressLine1")}
                    {renderTextInput("ff-partnerAddress2", "Partner address line 2", "partnerAddressLine2")}
                    {renderTextInput("ff-partnerAddress3", "Partner address line 3", "partnerAddressLine3")}
                    {renderTextInput("ff-partnerAddress4", "Partner address line 4", "partnerAddressLine4")}
                    {renderTextInput("ff-partnerHomeMobile", "Partner Home / Mobile", "partnerHomeMobile", "tel")}
                    {renderTextInput("ff-partnerWorkPhone", "Partner Work Phone", "partnerWorkPhone", "tel")}
                    {renderTextInput("ff-partnerEmail", "Partner Email", "partnerEmail", "email")}
                    {renderTextInput("ff-dependantsSummary", "Dependants", "dependantsSummary")}
                  </div>
                </AccordionItem>

            <AccordionItem
              indicator={getSectionProgress([resolvedDraft.occupation, resolvedDraft.employmentStatus, resolvedDraft.income, resolvedDraft.advisorName])}
              isOpen={factFindAccordion.isOpen("employment-details")}
              onToggle={() => factFindAccordion.toggle("employment-details")}
              title="Employment Details"
            >
              <div className="form-grid">
                {renderTextInput("ff-occupation", "Occupation", "occupation")}
                <Select
                  id="ff-employmentStatus"
                  label="Employment status"
                  onChange={(event) => updateField("employmentStatus", event.target.value)}
                  options={employmentStatusOptions}
                  value={resolvedDraft.employmentStatus}
                />
                <Input
                  id="ff-income"
                  label="Income / salary"
                  onBlur={(event) => updateField("income", formatCurrency(event.target.value))}
                  onChange={(event) => updateField("income", event.target.value)}
                  prefix="£"
                  step="0.01"
                  type="number"
                  value={resolvedDraft.income}
                />
                <Input
                  id="ff-advisorName"
                  label="Advisor name"
                  onChange={(event) => updateField("advisorName", event.target.value)}
                  type="text"
                  value={resolvedDraft.advisorName}
                />
                {renderToggleField("ff-employed", "Employed", "employed")}
                {renderToggleField("ff-selfEmployed", "Self Employed", "selfEmployed")}
              </div>
            </AccordionItem>

            <AccordionItem
              indicator={getSectionProgress([
                resolvedDraft.provider,
                resolvedDraft.recommendedCover,
                resolvedDraft.premium,
                resolvedDraft.deferredPeriod,
                resolvedDraft.coverAge,
                resolvedDraft.smokerStatus,
                resolvedDraft.phiOccupationalClass,
                resolvedDraft.phiIndexation,
              ])}
              isOpen={factFindAccordion.isOpen("income-protection")}
              onToggle={() => factFindAccordion.toggle("income-protection")}
              title="Income Protection"
            >
              <div className="form-grid">
                <Input
                  id="ff-provider"
                  label="Provider"
                  onChange={(event) => updateField("provider", event.target.value)}
                  type="text"
                  value={resolvedDraft.provider}
                />
                <Input
                  id="ff-recommendedCover"
                  label="Recommended cover"
                  onChange={(event) => updateField("recommendedCover", event.target.value)}
                  type="text"
                  value={resolvedDraft.recommendedCover}
                />
                <Input
                  id="ff-premium"
                  label="Monthly premium"
                  onBlur={(event) => updateField("premium", formatCurrency(event.target.value))}
                  onChange={(event) => updateField("premium", event.target.value)}
                  prefix="£"
                  step="0.01"
                  type="number"
                  value={resolvedDraft.premium}
                />
                <Select
                  id="ff-deferredPeriod"
                  label="Deferred period"
                  onChange={(event) => updateField("deferredPeriod", event.target.value)}
                  options={deferredPeriodOptions}
                  value={resolvedDraft.deferredPeriod}
                />
                <Select
                  id="ff-coverAge"
                  label="Cover to age"
                  onChange={(event) => updateField("coverAge", event.target.value)}
                  options={coverAgeOptions}
                  value={resolvedDraft.coverAge}
                />
                <Select
                  id="ff-smokerStatus"
                  label="Smoker status"
                  onChange={(event) => updateField("smokerStatus", event.target.value)}
                  options={smokerStatusOptions}
                  value={resolvedDraft.smokerStatus}
                />
                <Select
                  id="ff-phiOccupationalClass"
                  label="PHI occupational class"
                  onChange={(event) => updateField("phiOccupationalClass", event.target.value)}
                  options={phiOccupationalClassOptions}
                  value={resolvedDraft.phiOccupationalClass}
                />
                <Select
                  id="ff-phiIndexation"
                  label="PHI indexation"
                  onChange={(event) => updateField("phiIndexation", event.target.value)}
                  options={phiIndexationOptions}
                  value={resolvedDraft.phiIndexation}
                />
              </div>
              <div className="form-section">
                <p className="text-small text-muted" style={{ marginBottom: "var(--space-2)" }}>
                  Income Protection with No Deferred Period
                </p>
                <div className="form-grid">
                  {renderTextInput("ff-noDeferredProvider", "No deferred provider", "incomeProtectionNoDeferredProvider")}
                  {renderCurrencyInput("ff-noDeferredWeeklyCover", "No deferred current weekly cover", "incomeProtectionNoDeferredCurrentWeeklyCover")}
                  {renderCurrencyInput("ff-noDeferredMonthlyPremium", "No deferred monthly premium", "incomeProtectionNoDeferredMonthlyPremium")}
                  {renderToggleField("ff-noDeferredDentistProvident", "Dentist Provident", "incomeProtectionNoDeferredDentistProvident")}
                  {renderToggleField("ff-noDeferredDentistGeneral", "Dentist & General", "incomeProtectionNoDeferredDentistGeneral")}
                  {renderToggleField("ff-noDeferredOther", "Other", "incomeProtectionNoDeferredOther")}
                  {renderToggleField("ff-noDeferredAge60", "Cover to Age 60", "incomeProtectionNoDeferredCoverToAge60")}
                  {renderToggleField("ff-noDeferredAge65", "Cover to Age 65", "incomeProtectionNoDeferredCoverToAge65")}
                </div>
              </div>
              <div className="form-section">
                <p className="text-small text-muted" style={{ marginBottom: "var(--space-2)" }}>
                  Income Protection with Deferred Period
                </p>
                <div className="form-grid">
                  {renderTextInput("ff-deferredProviderDetailed", "Deferred period provider", "incomeProtectionDeferredProvider")}
                  {renderCurrencyInput("ff-deferredWeeklyCover", "Deferred current weekly cover", "incomeProtectionDeferredCurrentWeeklyCover")}
                  {renderCurrencyInput("ff-deferredMonthlyPremium", "Deferred monthly premium", "incomeProtectionDeferredMonthlyPremium")}
                  {renderToggleField("ff-deferredFriendsFirst", "Friends First", "incomeProtectionDeferredFriendsFirst")}
                  {renderToggleField("ff-deferredIrishLife", "Irish Life", "incomeProtectionDeferredIrishLife")}
                  {renderToggleField("ff-deferredOther", "Other", "incomeProtectionDeferredOther")}
                  {renderToggleField("ff-deferred13Weeks", "13 Weeks", "incomeProtectionDeferred13Weeks")}
                  {renderToggleField("ff-deferred26Weeks", "26 Weeks", "incomeProtectionDeferred26Weeks")}
                  {renderToggleField("ff-deferred52Weeks", "52 Weeks", "incomeProtectionDeferred52Weeks")}
                  {renderToggleField("ff-deferredAge60", "Deferred Cover to Age 60", "incomeProtectionDeferredCoverToAge60")}
                  {renderToggleField("ff-deferredAge65", "Deferred Cover to Age 65", "incomeProtectionDeferredCoverToAge65")}
                </div>
              </div>
            </AccordionItem>

                <AccordionItem
                  indicator={getSectionProgress([
                    resolvedDraft.assetHomeSelf,
                    resolvedDraft.liabilityMortgageAmount,
                    resolvedDraft.totalLiabilitiesPerMonthSelf,
                  ])}
                  isOpen={factFindAccordion.isOpen("assets-liabilities")}
                  onToggle={() => factFindAccordion.toggle("assets-liabilities")}
                  title="Assets & Liabilities"
                >
                  <div className="form-section">
                    <h3 className="form-section-title">Assets</h3>
                    <div className="table-wrap-flush">
                      <table className="data-table">
                        <thead>
                          <tr>
                            <th>Asset</th>
                            <th>Self</th>
                            <th>Partner</th>
                          </tr>
                        </thead>
                        <tbody>
                          {renderAssetRow("Home", "assetHomeSelf", "assetHomePartner", "ff-asset-home")}
                          {renderAssetRow("Land / Property", "assetLandPropertySelf", "assetLandPropertyPartner", "ff-asset-land")}
                          {renderAssetRow("Bank / Build Soc", "assetBankBuildSocSelf", "assetBankBuildSocPartner", "ff-asset-bank")}
                          {renderAssetRow("Credit Union", "assetCreditUnionSelf", "assetCreditUnionPartner", "ff-asset-credit-union")}
                        </tbody>
                      </table>
                    </div>
                  </div>
                  <div className="form-section">
                    <h3 className="form-section-title">Liabilities</h3>
                    <div className="table-wrap-flush">
                      <table className="data-table">
                        <thead>
                          <tr>
                            <th>Liability</th>
                            <th>Amount</th>
                            <th>Monthly Repayments</th>
                            <th>Bank / Mortgage Provider</th>
                            <th>Balance Outstanding</th>
                          </tr>
                        </thead>
                        <tbody>
                          {renderLiabilityRow("Mortgage", "liabilityMortgageAmount", "liabilityMortgageMonthlyRepayment", "liabilityMortgageProvider", "liabilityMortgageBalanceOutstanding", "ff-liability-mortgage")}
                          {renderLiabilityRow("Car Loan", "liabilityCarLoanAmount", "liabilityCarLoanMonthlyRepayment", "liabilityCarLoanProvider", "liabilityCarLoanBalanceOutstanding", "ff-liability-car")}
                          {renderLiabilityRow("Other Loan Payments", "liabilityOtherLoanPaymentsAmount", "liabilityOtherLoanPaymentsMonthlyRepayment", "liabilityOtherLoanPaymentsProvider", "liabilityOtherLoanPaymentsBalanceOutstanding", "ff-liability-other-loans")}
                          {renderLiabilityRow("Others", "liabilityOthersAmount", "liabilityOthersMonthlyRepayment", "liabilityOthersProvider", "liabilityOthersBalanceOutstanding", "ff-liability-others")}
                        </tbody>
                      </table>
                    </div>
                    {renderTextarea("ff-liabilityOthersDetails", "Please give details - utilities & household bills, transport & travel, living costs.", "liabilityOthersDetails")}
                  </div>
                  <div className="form-grid">
                    {renderCurrencyInput("ff-totalLiabilitySelf", "Total liabilities per month - Self", "totalLiabilitiesPerMonthSelf")}
                    {renderCurrencyInput("ff-totalLiabilityPartner", "Total liabilities per month - Partner", "totalLiabilitiesPerMonthPartner")}
                    {renderCurrencyInput("ff-totalLiabilityJoint", "Total liabilities per month - Joint", "totalLiabilitiesPerMonthJoint")}
                  </div>
                  {renderYesNoGroup("Are your liabilities covered by any other insurance?", "liabilitiesCoveredByOtherInsuranceYes", "liabilitiesCoveredByOtherInsuranceNo", "ff-liabilities-covered")}
                  {renderTextarea("ff-liabilitiesCoveredDetails", "If yes, please provide details.", "liabilitiesCoveredByOtherInsuranceDetails")}
                </AccordionItem>

                <AccordionItem
                  indicator={getSectionProgress([
                    resolvedDraft.selfRetirementAge,
                    resolvedDraft.selfEmployeeDirectorSchemeType,
                    resolvedDraft.selfPersonalPensionCompany,
                  ])}
                  isOpen={factFindAccordion.isOpen("pension-self")}
                  onToggle={() => factFindAccordion.toggle("pension-self")}
                  title="Pension Arrangements - Self"
                >
                  {renderPensionSection("self")}
                </AccordionItem>

                <AccordionItem
                  indicator={getSectionProgress([
                    resolvedDraft.partnerRetirementAge,
                    resolvedDraft.partnerEmployeeDirectorSchemeType,
                    resolvedDraft.partnerPersonalPensionCompany,
                  ])}
                  isOpen={factFindAccordion.isOpen("pension-partner")}
                  onToggle={() => factFindAccordion.toggle("pension-partner")}
                  title="Pension Arrangements - Partner"
                >
                  {renderPensionSection("partner")}
                </AccordionItem>

                <AccordionItem
                  indicator={getSectionProgress([
                    resolvedDraft.savingsInvestmentRows[0]?.financialInstitution ?? "",
                    resolvedDraft.savingsInvestmentRows[1]?.financialInstitution ?? "",
                    resolvedDraft.savingsInvestmentRows[2]?.financialInstitution ?? "",
                  ])}
                  isOpen={factFindAccordion.isOpen("savings-investments")}
                  onToggle={() => factFindAccordion.toggle("savings-investments")}
                  title="Savings & Investments"
                >
                  <div className="table-wrap-flush">
                    <table className="data-table">
                      <thead>
                        <tr>
                          <th>Financial Institution</th>
                          <th>Value</th>
                          <th>Start Date</th>
                          <th>Term</th>
                        </tr>
                      </thead>
                      <tbody>{resolvedDraft.savingsInvestmentRows.map((_, index) => renderSavingsInvestmentRow(index))}</tbody>
                    </table>
                  </div>
                  {renderTextarea("ff-savings-comments", "Comments", "savingsInvestmentComments")}
                </AccordionItem>

            <AccordionItem
              indicator={getSectionProgress([
                resolvedDraft.mortgageProtection,
                resolvedDraft.personalInsurance,
                resolvedDraft.keymanInsurance,
                resolvedDraft.partnershipInsurance,
              ])}
              isOpen={factFindAccordion.isOpen("life-insurance")}
              onToggle={() => factFindAccordion.toggle("life-insurance")}
              title="Life Insurance & Serious Illness"
            >
              {renderYesNoGroup("Mortgage Protection", "mortgageProtectionYes", "mortgageProtectionNo", "ff-mortgage-protection")}
              <div className="table-wrap-flush">
                <table className="data-table">
                  <thead>
                    <tr>
                      <th>Cover Type</th>
                      <th>Self</th>
                      <th>Partner</th>
                    </tr>
                  </thead>
                  <tbody>
                    <tr>
                      <td>Life Insurance</td>
                      <td>{renderCurrencyInput("ff-selfLifeInsuranceAmount", "Life Insurance self", "selfLifeInsuranceAmount")}</td>
                      <td>{renderCurrencyInput("ff-partnerLifeInsuranceAmount", "Life Insurance partner", "partnerLifeInsuranceAmount")}</td>
                    </tr>
                    <tr>
                      <td>Serious Illness</td>
                      <td>{renderCurrencyInput("ff-selfSeriousIllnessAmount", "Serious Illness self", "selfSeriousIllnessAmount")}</td>
                      <td>{renderCurrencyInput("ff-partnerSeriousIllnessAmountTable", "Serious Illness partner", "partnerSeriousIllnessAmount")}</td>
                    </tr>
                  </tbody>
                </table>
              </div>
              <div className="form-grid">
                <Input
                  id="ff-mortgageProtection"
                  label="Mortgage protection"
                  onChange={(event) => updateField("mortgageProtection", event.target.value)}
                  type="text"
                  value={resolvedDraft.mortgageProtection}
                />
                <Input
                  id="ff-personalInsurance"
                  label="Personal insurance"
                  onChange={(event) => updateField("personalInsurance", event.target.value)}
                  type="text"
                  value={resolvedDraft.personalInsurance}
                />
                <Input
                  id="ff-keymanInsurance"
                  label="Keyman insurance"
                  onChange={(event) => updateField("keymanInsurance", event.target.value)}
                  type="text"
                  value={resolvedDraft.keymanInsurance}
                />
                <Input
                  id="ff-partnershipInsurance"
                  label="Partnership insurance"
                  onChange={(event) => updateField("partnershipInsurance", event.target.value)}
                  type="text"
                  value={resolvedDraft.partnershipInsurance}
                />
                <Input
                  id="ff-selfLifeInsuranceAmount"
                  label="Self life insurance amount"
                  onChange={(event) => updateField("selfLifeInsuranceAmount", event.target.value)}
                  type="text"
                  value={resolvedDraft.selfLifeInsuranceAmount}
                />
                <Input
                  id="ff-partnerSeriousIllnessAmount"
                  label="Partner serious illness amount"
                  onChange={(event) => updateField("partnerSeriousIllnessAmount", event.target.value)}
                  type="text"
                  value={resolvedDraft.partnerSeriousIllnessAmount}
                />
              </div>
            </AccordionItem>

            <AccordionItem
              indicator={getSectionProgress([resolvedDraft.personalCircumstances, resolvedDraft.financialSituation, resolvedDraft.needsObjectives])}
              isOpen={factFindAccordion.isOpen("additional-info")}
              onToggle={() => factFindAccordion.toggle("additional-info")}
              title="Additional Relevant Information"
            >
              <div className="form-grid">
                <Textarea
                  id="ff-personalCircumstances"
                  label="Personal circumstances"
                  onChange={(event) => updateField("personalCircumstances", event.target.value)}
                  rows={4}
                  value={resolvedDraft.personalCircumstances}
                />
                <Textarea
                  id="ff-financialSituation"
                  label="Financial situation"
                  onChange={(event) => updateField("financialSituation", event.target.value)}
                  rows={4}
                  value={resolvedDraft.financialSituation}
                />
                <Textarea
                  id="ff-needsObjectives"
                  label="Needs and objectives"
                  onChange={(event) => updateField("needsObjectives", event.target.value)}
                  rows={4}
                  value={resolvedDraft.needsObjectives}
                />
              </div>
            </AccordionItem>

            <AccordionItem
              indicator={getSectionProgress([resolvedDraft.executionOnlyConfirmation, resolvedDraft.termsReviewedReceived])}
              isOpen={factFindAccordion.isOpen("client-declarations")}
              onToggle={() => factFindAccordion.toggle("client-declarations")}
              title="Client Declarations"
            >
              <div className="form-grid">
                {renderToggleField(
                  "ff-executionOnlyConfirmation",
                  "I confirm that I wish to proceed with this financial agreement on an execution only basis",
                  "executionOnlyConfirmation",
                )}
                {renderToggleField(
                  "ff-termsReviewedReceived",
                  "I confirm that I have reviewed the Terms of Business and received a copy",
                  "termsReviewedReceived",
                )}
              </div>
            </AccordionItem>

            <AccordionItem
              indicator={getSectionProgress([
                resolvedDraft.doNotContact,
                resolvedDraft.agreeToMarketing,
                resolvedDraft.contactByPhone,
                resolvedDraft.contactBySms,
                resolvedDraft.contactByEmail,
                resolvedDraft.contactByPost,
              ])}
              isOpen={factFindAccordion.isOpen("marketing-preferences")}
              onToggle={() => factFindAccordion.toggle("marketing-preferences")}
              title="Data Protection & Marketing Preferences"
            >
              <p className="text-muted text-small" style={{ marginBottom: "var(--space-3)" }}>
                Let us know whether you wish to receive product and service information and which contact methods you consent to for marketing communications.
              </p>
              <div className="form-grid">
                {renderToggleField(
                  "ff-doNotContact",
                  "I/We do not wish to be contacted and/or receive information on products and services",
                  "doNotContact",
                )}
                {renderToggleField(
                  "ff-agreeToMarketing",
                  "I/We agree to be contacted for the provision of marketing information on the products and services offered by Omega Financial Management",
                  "agreeToMarketing",
                )}
                {renderToggleField("ff-contactByPhone", "Phone", "contactByPhone")}
                {renderToggleField("ff-contactBySms", "SMS", "contactBySms")}
                {renderToggleField("ff-contactByEmail", "Email", "contactByEmail")}
                {renderToggleField("ff-contactByPost", "Post", "contactByPost")}
              </div>
            </AccordionItem>

            <AccordionItem
              indicator={getSectionProgress([
                resolvedDraft.pepConfirmation,
                resolvedDraft.pepRelatedConfirmation,
                resolvedDraft.pepDeclarationConfirmed,
                resolvedDraft.pepDirectlyRelatedConfirmed,
              ])}
              isOpen={factFindAccordion.isOpen("pep")}
              onToggle={() => factFindAccordion.toggle("pep")}
              title="PEP Confirmation"
            >
              <p className="text-muted text-small" style={{ marginBottom: "var(--space-3)" }}>
                A politically exposed person (PEP) is an individual who is or has been entrusted with a prominent public function. Many PEPs hold positions of influence and as a result carry a greater risk if their influence is abused for the purpose of money laundering, corruption or bribery.
              </p>
              <div className="form-grid">
                {renderToggleField(
                  "ff-pepDeclarationConfirmed",
                  "I/We confirm that I/We are not PEP's nor are we directly related to a PEP as defined by the Criminal Justice Act 2010",
                  "pepDeclarationConfirmed",
                )}
                {renderToggleField("ff-pepConfirmation", "Politically exposed person confirmation", "pepConfirmation")}
                {renderToggleField("ff-pepRelatedConfirmation", "Related to a PEP confirmation", "pepRelatedConfirmation")}
                {renderToggleField("ff-pepDirectlyRelatedConfirmed", "Directly related to a PEP", "pepDirectlyRelatedConfirmed")}
              </div>
            </AccordionItem>

            <AccordionItem
              indicator={getSectionProgress([resolvedDraft.businessSource])}
              isOpen={factFindAccordion.isOpen("business-source")}
              onToggle={() => factFindAccordion.toggle("business-source")}
              title="Business Source"
            >
              <div className="form-grid">
                <Input
                  id="ff-businessSource"
                  label="How did you hear about Omega?"
                  onChange={(event) => updateField("businessSource", event.target.value)}
                  type="text"
                  value={resolvedDraft.businessSource}
                />
              </div>
            </AccordionItem>

                <AccordionItem
                  indicator={getSectionProgress([resolvedDraft.recommendationAcknowledged])}
                  isOpen={factFindAccordion.isOpen("recommendation-acknowledgement")}
                  onToggle={() => factFindAccordion.toggle("recommendation-acknowledgement")}
                  title="Recommendation Acknowledgement"
                >
                  <p className="text-muted text-small" style={{ marginBottom: "var(--space-3)" }}>
                    I/We understood the recommendation is based on the information disclosed and that the actions agreed are to my / our satisfaction.
                  </p>
                  <div className="form-grid">
                    {renderToggleField("ff-recommendationAcknowledged", "Confirmed / agreed", "recommendationAcknowledged")}
                  </div>
                </AccordionItem>

            <AccordionItem
              indicator={getSectionProgress([
                resolvedDraft.clientSignature1,
                resolvedDraft.clientSignature1Date,
                resolvedDraft.clientSignature2,
                resolvedDraft.clientSignature2Date,
                resolvedDraft.financialAdvisorSignature,
                resolvedDraft.financialAdvisorSignatureDate,
              ])}
              isOpen={factFindAccordion.isOpen("signatures")}
              onToggle={() => factFindAccordion.toggle("signatures")}
              title="Signatures"
            >
              <div className="form-section" style={{ marginBottom: "var(--space-4)" }}>
                <div className="form-grid">
                  <Input
                    id="ff-clientSignature1"
                    label="Client signature 1"
                    onChange={(event) => updateField("clientSignature1", event.target.value)}
                    type="text"
                    value={resolvedDraft.clientSignature1}
                  />
                  <Input
                    id="ff-clientSignature1Date"
                    label="Date"
                    onChange={(event) => updateField("clientSignature1Date", event.target.value)}
                    type="date"
                    value={resolvedDraft.clientSignature1Date}
                  />
                  <Input
                    id="ff-clientSignature2"
                    label="Client signature 2"
                    onChange={(event) => updateField("clientSignature2", event.target.value)}
                    type="text"
                    value={resolvedDraft.clientSignature2}
                  />
                  <Input
                    id="ff-clientSignature2Date"
                    label="Client signature 2 date"
                    onChange={(event) => updateField("clientSignature2Date", event.target.value)}
                    type="date"
                    value={resolvedDraft.clientSignature2Date}
                  />
                  <Input
                    id="ff-financialAdvisorSignature"
                    label="Financial Advisor's Signature"
                    onChange={(event) => updateField("financialAdvisorSignature", event.target.value)}
                    type="text"
                    value={resolvedDraft.financialAdvisorSignature}
                  />
                  <Input
                    id="ff-financialAdvisorSignatureDate"
                    label="Financial Advisor Signature Date"
                    onChange={(event) => updateField("financialAdvisorSignatureDate", event.target.value)}
                    type="date"
                    value={resolvedDraft.financialAdvisorSignatureDate}
                  />
                </div>
              </div>
            </AccordionItem>

            <AccordionItem
              indicator={getSectionProgress([
                resolvedDraft.requestClientNames,
                resolvedDraft.requestInfoAddressLine1,
                resolvedDraft.requestDateOfBirth,
                resolvedDraft.requestCompanyName,
                resolvedDraft.requestPolicies,
                resolvedDraft.requestLetterDate,
              ])}
              isOpen={factFindAccordion.isOpen("request-for-information")}
              onToggle={() => factFindAccordion.toggle("request-for-information")}
              title="Request for Information"
            >
              <p className="text-muted text-small" style={{ marginBottom: "var(--space-3)" }}>
                I/We request that you furnish Omega Financial Management, Suite 31 The Mall, Beacon Court, Sandyford, Dublin 18 with all of the information they require to prepare a full analysis of all of my Pension, Life Assurance, Income Protection and Investment Policies.
              </p>
              <div className="form-grid">
                {renderTextInput("ff-requestClientNames", "Client Name(s)", "requestClientNames")}
                {renderTextInput("ff-requestInfoAddressLine1", "Request information address line 1", "requestInfoAddressLine1")}
                {renderTextInput("ff-requestInfoAddressLine2", "Request information address line 2", "requestInfoAddressLine2")}
                {renderTextInput("ff-requestInfoAddressLine3", "Request information address line 3", "requestInfoAddressLine3")}
                {renderTextInput("ff-requestInfoAddressLine4", "Request information address line 4", "requestInfoAddressLine4")}
                {renderTextInput("ff-requestDateOfBirth", "Date of Birth", "requestDateOfBirth", "date")}
                {renderTextInput("ff-requestClientSignature", "Client(s) signature", "requestClientSignature")}
                {renderTextInput("ff-requestLetterDate", "Date", "requestLetterDate", "date")}
                {renderTextInput("ff-requestCompanyName", "Request information company", "requestCompanyName")}
                {renderTextInput("ff-requestPolicies", "Policies", "requestPolicies")}
              </div>
              <p className="text-muted text-small">OFM Financial Ltd T/A Omega Financial Management, regulated by the Central Bank of Ireland.</p>
            </AccordionItem>
              </Accordion>
              <div className="sticky-action-bar">
                <span className="sticky-action-bar-status">{factFindDraftSavedLabel}</span>
                <Button onClick={() => void saveFactFindDraft()} variant="primary">
                  <Save size={18} />
                  Save Fact Find
                </Button>
              </div>
            </AccordionItem>
            <AccordionItem
              indicator={getGeneratedDraftStatusLabel(factFindDraft.generationStatus)}
              isOpen={factFindWorkspaceAccordion.isOpen("fact-find-output")}
              onToggle={() => factFindWorkspaceAccordion.toggle("fact-find-output")}
              title="Generated Output"
            >
              <GeneratedOutputWorkspace
                draft={factFindDraft}
                generateDisabled={factFindMissingFields.length > 0}
                onContentChange={(html) => updateGeneratedOutput("Fact Find", html)}
                onExportDocx={() => void handleGeneratedOutputExport("Fact Find", "docx")}
                onExportPdf={() => void handleGeneratedOutputExport("Fact Find", "pdf")}
                onGenerate={() => void handleFactFindGenerate()}
                statusDotClass={getDraftStatusDotClass(factFindDraft.generationStatus)}
                statusDotTestId="fact-find-generation-status-dot"
                statusLabel={factFindGenerationStatus.replace("Generation: ", "")}
                templatePicker={
                  <TemplatePicker
                    documentType="Fact Find"
                    onChange={(templateId) => updateSelectedTemplate(resolvedDraft.clientReference, "Fact Find", templateId)}
                    selectedTemplateId={factFindDraft.selectedTemplateId}
                  />
                }
              />
            </AccordionItem>
          </Accordion>
        </div>
      );
    }

    if (activeTab.id === "fact-find-update") {
      const factFindUpdateDraft = getDocumentDraft("Fact Find Update");

      return (
        <div className="page-stack">
          <div className="page-heading page-heading-compact">
            <div>
              <h2>Fact Find Update Draft</h2>
            </div>
          </div>

          <Accordion flush>
            <AccordionItem
              indicator={tabProgress["fact-find-update"]}
              isOpen={factFindUpdateWorkspaceAccordion.isOpen("fact-find-update-form")}
              onToggle={() => factFindUpdateWorkspaceAccordion.toggle("fact-find-update-form")}
              title="Fact Find Update Form"
            >
              <Accordion flush>
                <AccordionItem
                  indicator={getSectionProgress([
                    resolvedDraft.factFindUpdatePersonalCircumstances,
                    resolvedDraft.factFindUpdateFinancialSituation,
                    resolvedDraft.factFindUpdateNeedsAndObjectives,
                  ])}
                  isOpen={factFindUpdateWorkspaceAccordion.isOpen("additional-relevant-information")}
                  onToggle={() => factFindUpdateWorkspaceAccordion.toggle("additional-relevant-information")}
                  title="Additional Relevant Information"
                >
                  <p className="text-muted text-small" style={{ marginBottom: "var(--space-3)" }}>
                    Please use an additional page if required
                  </p>
                  <div className="form-grid">
                    {renderTextarea(
                      "ffu-personalCircumstances",
                      "Personal Circumstances",
                      "factFindUpdatePersonalCircumstances",
                      6,
                      "form-grid-full",
                    )}
                    {renderTextarea(
                      "ffu-financialSituation",
                      "Financial Situation",
                      "factFindUpdateFinancialSituation",
                      6,
                      "form-grid-full",
                    )}
                    {renderTextarea(
                      "ffu-needsAndObjectives",
                      "Needs & Objectives",
                      "factFindUpdateNeedsAndObjectives",
                      6,
                      "form-grid-full",
                    )}
                  </div>
                </AccordionItem>

                <AccordionItem
                  indicator={getSectionProgress([
                    resolvedDraft.factFindUpdateExecutionOnlyBasis,
                    resolvedDraft.factFindUpdateTermsReviewedReceived,
                  ])}
                  isOpen={factFindUpdateWorkspaceAccordion.isOpen("client-declarations")}
                  onToggle={() => factFindUpdateWorkspaceAccordion.toggle("client-declarations")}
                  title="Client Declarations"
                >
                  <div className="form-grid">
                    {renderToggleField(
                      "ffu-executionOnlyBasis",
                      "I confirm that I wish to proceed with this financial agreement on an execution only basis",
                      "factFindUpdateExecutionOnlyBasis",
                    )}
                    {renderToggleField(
                      "ffu-termsReviewedReceived",
                      "I confirm that I have reviewed the Terms of Business and received a copy",
                      "factFindUpdateTermsReviewedReceived",
                    )}
                  </div>
                </AccordionItem>

                <AccordionItem
                  indicator={<Check size={16} className="text-success" />}
                  isOpen={factFindUpdateWorkspaceAccordion.isOpen("data-protection-marketing-preferences")}
                  onToggle={() => factFindUpdateWorkspaceAccordion.toggle("data-protection-marketing-preferences")}
                  title="Data Protection & Marketing Preferences"
                >
                  <p>
                    We collect your personal details in order to provide the highest standard of service to you. We
                    take great care with the information provided; taking steps to keep it secure and to ensure it is
                    used only for legitimate purposes. The information you have provided will be treated as confidential
                    and will be retained by Omega Financial Management in electronic format for the purposes of
                    providing financial services. We will use your contact details when we need to contact you in respect
                    of the policy(ies) that you have with us. Under the General Data Protection Regulation 2018 you have
                    various rights relating to your Personal Data.
                  </p>
                </AccordionItem>
              </Accordion>
              <div className="sticky-action-bar">
                <span className="sticky-action-bar-status">{factFindUpdateSavedLabel}</span>
                <Button onClick={() => void saveFactFindUpdateDraft()} variant="primary">
                  <Save size={18} />
                  Save Fact Find Update
                </Button>
              </div>
            </AccordionItem>
            <AccordionItem
              indicator={getGeneratedDraftStatusLabel(factFindUpdateDraft.generationStatus)}
              isOpen={factFindUpdateWorkspaceAccordion.isOpen("fact-find-update-output")}
              onToggle={() => factFindUpdateWorkspaceAccordion.toggle("fact-find-update-output")}
              title="Generated Output"
            >
              <GeneratedOutputWorkspace
                draft={factFindUpdateDraft}
                generateDisabled={false}
                onContentChange={(html) => updateGeneratedOutput("Fact Find Update", html)}
                onExportDocx={() => void handleGeneratedOutputExport("Fact Find Update", "docx")}
                onExportPdf={() => void handleGeneratedOutputExport("Fact Find Update", "pdf")}
                onGenerate={() => void handleFactFindUpdateGenerate()}
                statusDotClass={getDraftStatusDotClass(factFindUpdateDraft.generationStatus)}
                statusLabel={factFindUpdateGenerationStatus.replace("Generation: ", "")}
                templatePicker={
                  <TemplatePicker
                    documentType="Fact Find Update"
                    onChange={(templateId) =>
                      updateSelectedTemplate(resolvedDraft.clientReference, "Fact Find Update", templateId)
                    }
                    selectedTemplateId={factFindUpdateDraft.selectedTemplateId}
                  />
                }
              />
            </AccordionItem>
          </Accordion>
        </div>
      );
    }

    if (activeTab.id === "statement-of-suitability") {
      const statementDraft = getDocumentDraft("Statement of Suitability");

      return (
        <div className="page-stack">
          <div className="page-heading page-heading-compact">
            <div>
              <h2>Statement of Suitability Draft</h2>
            </div>
          </div>

          {showStatementValidation ? (
            <div className="validation-banner">
              <AlertTriangle size={18} />
              <span>Missing required fields: {statementMissingFields.join(", ")}</span>
            </div>
          ) : null}

          <Accordion flush>
            <AccordionItem
              indicator={tabProgress["statement-of-suitability"]}
              isOpen={statementWorkspaceAccordion.isOpen("statement-form")}
              onToggle={() => statementWorkspaceAccordion.toggle("statement-form")}
              title="Statement Form"
            >
              <section className="form-section">
                <h3 className="form-section-title">Recommendation basics</h3>
                <div className="form-grid">
              <Input
                id="sos-letterDate"
                label={requiredLabel("Letter date")}
                onChange={(event) => updateField("letterDate", event.target.value)}
                type="date"
                value={resolvedDraft.letterDate}
              />
              <Select
                id="sos-statementType"
                label={requiredLabel("Statement type")}
                onChange={(event) => updateField("statementType", event.target.value)}
                options={statementTypeOptions}
                value={resolvedDraft.statementType}
              />
              <Input
                id="sos-provider"
                label={requiredLabel("Provider name")}
                onChange={(event) => updateField("provider", event.target.value)}
                type="text"
                value={resolvedDraft.provider}
              />
              <Input
                id="sos-productType"
                label={requiredLabel("Product type")}
                onChange={(event) => updateField("productType", event.target.value)}
                type="text"
                value={resolvedDraft.productType}
              />
              <Input
                id="sos-advisorName"
                label={requiredLabel("Advisor name")}
                onChange={(event) => updateField("advisorName", event.target.value)}
                type="text"
                value={resolvedDraft.advisorName}
              />
            </div>
          </section>

          <section className="form-section">
            <h3 className="form-section-title">Cover summary</h3>
            <div className="form-grid">
              <Input
                id="sos-recommendedCover"
                label={requiredLabel("Recommended cover")}
                onBlur={(event) => updateField("recommendedCover", formatCurrency(event.target.value))}
                onChange={(event) => updateField("recommendedCover", event.target.value)}
                prefix="EUR"
                step="0.01"
                type="number"
                value={resolvedDraft.recommendedCover}
              />
              <Select
                id="sos-deferredPeriod"
                label={requiredLabel("Deferred period")}
                onChange={(event) => updateField("deferredPeriod", event.target.value)}
                options={deferredPeriodOptions}
                value={resolvedDraft.deferredPeriod}
              />
              <Select
                id="sos-coverAge"
                label={requiredLabel("Cover to age")}
                onChange={(event) => updateField("coverAge", event.target.value)}
                options={coverAgeOptions}
                value={resolvedDraft.coverAge}
              />
              <Input
                id="sos-premium"
                label={requiredLabel("Gross monthly premium")}
                onBlur={(event) => updateField("premium", formatCurrency(event.target.value))}
                onChange={(event) => updateField("premium", event.target.value)}
                prefix="£"
                step="0.01"
                type="number"
                value={resolvedDraft.premium}
              />
              <Input
                hint="Gross premium minus tax relief at your marginal rate"
                id="sos-netMonthlyCost"
                label={requiredLabel("Net monthly cost")}
                onBlur={(event) => updateField("netMonthlyCost", formatCurrency(event.target.value))}
                onChange={(event) => updateField("netMonthlyCost", event.target.value)}
                prefix="£"
                step="0.01"
                type="number"
                value={resolvedDraft.netMonthlyCost}
              />
              <Textarea
                className="form-grid-full"
                hint="Summarise the recommended cover and rationale"
                id="sos-coverSummary"
                label="Cover summary"
                onChange={(event) => updateField("coverSummary", event.target.value)}
                placeholder="Brief overview of the recommended cover and why it suits the client..."
                rows={4}
                value={resolvedDraft.coverSummary}
              />
            </div>
          </section>
              <div className="sticky-action-bar">
                <span className="sticky-action-bar-status">{statementSaveStatus}</span>
                <Button onClick={() => void saveStatementDraft()} variant="primary">
                  <Save size={18} />
                  Save Statement
                </Button>
              </div>
            </AccordionItem>
            <AccordionItem
              indicator={getGeneratedDraftStatusLabel(statementDraft.generationStatus)}
              isOpen={statementWorkspaceAccordion.isOpen("statement-output")}
              onToggle={() => statementWorkspaceAccordion.toggle("statement-output")}
              title="Generated Output"
            >
              <GeneratedOutputWorkspace
                draft={statementDraft}
                generateDisabled={statementMissingFields.length > 0}
                onContentChange={(html) => updateGeneratedOutput("Statement of Suitability", html)}
                onExportDocx={() => void handleGeneratedOutputExport("Statement of Suitability", "docx")}
                onExportPdf={() => void handleGeneratedOutputExport("Statement of Suitability", "pdf")}
                onGenerate={() => void handleStatementGenerate()}
                statusLabel={statementDocumentStatus.replace("Document: ", "")}
                templatePicker={
                  <TemplatePicker
                    documentType="Statement of Suitability"
                    onChange={(templateId) =>
                      updateSelectedTemplate(resolvedDraft.clientReference, "Statement of Suitability", templateId)
                    }
                    selectedTemplateId={statementDraft.selectedTemplateId}
                  />
                }
              />
            </AccordionItem>
          </Accordion>
        </div>
      );
    }

    if (activeTab.id === "files") {
      return (
        <div className="page-stack">
          <div className="page-heading page-heading-compact">
            <div>
              <h2>Client Files</h2>
            </div>
            <div className="page-actions">
              <Button onClick={handleFileSelect} variant="primary">
                <Upload size={18} />
                Upload File
              </Button>
              <Badge variant={uploadProgress === 100 ? "saved" : uploadProgress > 0 ? "draft" : "default"}>
                {fileUploadStatus.replace("Upload: ", "")}
              </Badge>
            </div>
          </div>

          {uploadProgress > 0 && uploadProgress < 100 ? (
            <div className="upload-progress">
              <div className="upload-progress-bar" style={{ width: `${uploadProgress}%` }} />
            </div>
          ) : null}

          <input
            accept="*/*"
            aria-label="Select file to upload"
            onChange={(event) => { void handleRealFileUpload(event); }}
            ref={fileInputRef}
            style={{ display: "none" }}
            type="file"
          />

          <div
            className="upload-zone"
            onClick={handleFileSelect}
            onDragOver={(event) => event.preventDefault()}
            onDrop={(event) => {
              event.preventDefault();
              const dt = event.dataTransfer;
              if (dt?.files?.[0]) {
                const fakeEvent = { target: { files: dt.files } } as unknown as React.ChangeEvent<HTMLInputElement>;
                void handleRealFileUpload(fakeEvent);
              }
            }}
            role="button"
            tabIndex={0}
          >
            <div className="upload-zone-icon">
              <Upload size={32} />
            </div>
            <div className="upload-zone-title">Drop files here</div>
            <div className="upload-zone-hint">or click to browse</div>
          </div>

          <section className="section-divided">
            <div className="section-header">
              <h3 className="section-title">Tracked client files</h3>
              <div style={{ maxWidth: "260px", width: "100%" }}>
                <div className="field-input-wrap">
                  <Search size={16} style={{ marginLeft: "12px", color: "var(--color-text-muted)" }} />
                  <input
                    aria-label="Filter files"
                    className="field-input"
                    onChange={(event) => setFileFilter(event.target.value)}
                    placeholder="Filter files by name"
                    type="search"
                    value={fileFilter}
                  />
                </div>
              </div>
            </div>

            {filteredBackendFiles.length === 0 ? (
              <div className="empty-state">
                <div className="empty-state-icon">
                  <FolderOpen size={28} />
                </div>
                <div className="empty-state-title">No files yet</div>
                <p className="empty-state-description">
                  {fileFilter ? "No files match your filter." : "Upload supporting documents for this client."}
                </p>
                <Button onClick={handleFileSelect} variant="primary">
                  <Upload size={18} />
                  Upload File
                </Button>
              </div>
            ) : (
              <div className="file-list" style={{ marginTop: "var(--space-4)" }}>
                {filteredBackendFiles.map((file) => (
                  <div className="file-item" key={file.id}>
                    <div className="file-icon">{getFileIcon(file.original_filename)}</div>
                    <div className="file-info">
                      <div className="file-name">{file.original_filename}</div>
                      <div className="file-meta">
                        {file.category} · {file.file_type ?? ""} · {file.uploaded_at ? formatDisplayDate(file.uploaded_at) : ""}
                      </div>
                    </div>
                    <Badge variant={toLower(file.status).includes("approved") ? "approved" : "draft"}>
                      {file.status ?? "Uploaded"}
                    </Badge>
                    <div className="file-actions">
                      <Button className="btn-sm" onClick={() => { void handleBackendFileDownload(file.id, file.original_filename); }} variant="secondary">
                        <Download size={14} />
                      </Button>
                      <Button className="btn-sm" onClick={handleFileSelect} variant="secondary">
                        <RefreshCw size={14} />
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </section>
        </div>
      );
    }

    // Generated Documents tab (Phase 5: backend-backed)
    const displayDocuments = hasLoadedBackendGeneratedDocuments
      ? backendGeneratedDocuments
      : resolvedDraft.generatedDocuments.map((d) => ({
          id: d.id,
          client_id: "",
          document_type: d.documentType,
          document_name: d.documentName,
          docx_file_path: null,
          pdf_file_path: null,
          generated_by: null,
          generated_at: d.generatedAt,
          version: d.version,
          status: d.status,
          preview_title: d.previewTitle ?? null,
          preview_html: d.previewHtml ?? null,
        }));

    const resolvedPreviewDocument = previewDocument
      ? {
          ...previewDocument,
          generated_at: previewDocument.generatedAt,
        }
      : null;

    return (
      <div className="page-stack">
        <div className="page-heading page-heading-compact">
          <div>
            <h2>Generated Documents</h2>
          </div>
          <div className="page-actions">
            <Button
              isLoading={documentPackStatus === "Pack: Preparing pack..."}
              onClick={handleDownloadPack}
              variant="primary"
            >
              <Download size={18} />
              Download Pack
            </Button>
            <Badge variant={documentPackStatus.includes("Downloaded") ? "saved" : "default"}>
              {documentPackStatus.replace("Pack: ", "")}
            </Badge>
            <span
              className={`status-dot ${documentDownloadStatus !== "Download: No document downloaded yet" ? "status-dot-green" : "status-dot-grey"}`}
              data-testid="generated-documents-download-status-dot"
            />
          </div>
        </div>

        {displayDocuments.length === 0 ? (
          <div className="empty-state">
            <div className="empty-state-icon">
              <Download size={28} />
            </div>
            <div className="empty-state-title">No documents generated yet</div>
            <p className="empty-state-description">Generate your first draft from the Fact Find or Statement of Suitability tabs.</p>
            <Button onClick={() => setActiveTabId("fact-find")} variant="primary">
              <FileDown size={18} />
              Generate your first draft
            </Button>
          </div>
        ) : (
          <div className="table-wrap-flush">
            <table className="data-table">
              <thead>
                <tr>
                  <th scope="col">Document Type</th>
                  <th scope="col">Document Name</th>
                  <th scope="col">Version</th>
                  <th scope="col">Status</th>
                  <th scope="col">Generated At</th>
                  <th scope="col">Actions</th>
                </tr>
              </thead>
              <tbody>
                {displayDocuments.map((doc) => {
                  const hasBackendArtifact = hasLoadedBackendGeneratedDocuments && Boolean(doc.id && (doc.docx_file_path || doc.pdf_file_path));
                  return (
                  <tr key={doc.id}>
                    <td>{doc.document_type}</td>
                    <td className="font-medium">{doc.document_name}</td>
                    <td>{doc.version ?? "—"}</td>
                    <td>
                      <Badge variant={getDocumentStatusVariant(doc.status)}>{doc.status ?? "Draft"}</Badge>
                    </td>
                    <td>{doc.generated_at ? formatDisplayDate(doc.generated_at) : "—"}</td>
                    <td>
                      <div className="generated-doc-actions">
                        <Button
                          className="btn-sm"
                          onClick={() => {
                            const previewPayload: SeededGeneratedDocument = {
                              id: doc.id,
                              documentType: doc.document_type,
                              documentName: doc.document_name,
                              version: doc.version ?? "Version 1",
                              status: doc.status,
                              generatedAt: doc.generated_at ?? "",
                              previewHtml: doc.preview_html ?? undefined,
                              previewTitle: doc.preview_title ?? undefined,
                            };
                            setPreviewDocument(previewPayload);
                          }}
                          variant="secondary"
                        >
                          <Eye size={14} />
                          Preview
                        </Button>
                        {hasBackendArtifact ? (
                          <Button
                            className="btn-sm"
                            onClick={() => {
                              const filename = doc.document_name;
                              void downloadDocument(selectedClientReference, doc.id, filename).then(
                                () => addToast(`${doc.document_name} downloaded`, "success"),
                                () => addToast("Download failed", "error"),
                              );
                            }}
                            variant="secondary"
                          >
                            <Download size={14} />
                            Download
                          </Button>
                        ) : (
                          <Button
                            className="btn-sm"
                            onClick={() => handleDownloadDocument({
                              id: doc.id,
                              documentType: doc.document_type,
                              documentName: doc.document_name,
                              version: doc.version ?? "Version 1",
                              status: doc.status,
                              generatedAt: doc.generated_at ?? "",
                              previewHtml: doc.preview_html ?? undefined,
                              previewTitle: doc.preview_title ?? undefined,
                            })}
                            variant="secondary"
                          >
                            <Download size={14} />
                            Download
                          </Button>
                        )}
                        {doc.document_type !== "Terms of Business" ? (
                          <Button
                            className="btn-sm"
                            onClick={() => handleRegenerateDocument({
                              id: doc.id,
                              documentType: doc.document_type,
                              documentName: doc.document_name,
                              version: doc.version ?? "Version 1",
                              status: doc.status,
                              generatedAt: doc.generated_at ?? "",
                              previewHtml: doc.preview_html ?? undefined,
                              previewTitle: doc.preview_title ?? undefined,
                            })}
                            variant="text"
                          >
                            <RefreshCw size={14} />
                            Regenerate
                          </Button>
                        ) : null}
                        <Button
                          className="btn-sm"
                          onClick={() => {
                            addToast(`${doc.document_name} sent to client`, "success");
                          }}
                          variant="text"
                        >
                          <Send size={14} />
                          Send
                        </Button>
                      </div>
                    </td>
                  </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}

        <Modal
          isOpen={Boolean(previewDocument)}
          onClose={() => setPreviewDocument(null)}
          size="large"
          title={previewDocument?.documentName ?? "Document Preview"}
        >
          {previewDocument?.previewHtml ? (
            <iframe
              className="document-preview-iframe"
              srcDoc={previewDocument.previewHtml}
              title={previewDocument.documentName}
            />
          ) : (
            <p className="text-muted">No preview available for this document.</p>
          )}
        </Modal>
      </div>
    );
  }

  return (
    <div className="page-stack income-protection-page">
      <section className="workflow-header" aria-label="Selected client summary">
        <div className="workflow-header-top">
          <div className="workflow-header-title">
            <div className="flex items-center gap-3">
              <h1>Income Protection</h1>
              <Badge variant={getDocumentStatusVariant(resolvedDraft.status)}>{resolvedDraft.status ?? "Draft"}</Badge>
            </div>
          </div>
        </div>

        <div className="income-protection-header-controls">
          <div className="workflow-client-field income-protection-client-field">
            <label className="field-label" htmlFor="client-select">
              Select workflow client
            </label>
            <select
              className="field-input field-select"
              id="client-select"
              onChange={(event) => {
                if (event.target.value) {
                  setSelectedClientReference(event.target.value);
                  window.localStorage.setItem(SELECTED_CLIENT_STORAGE_KEY, event.target.value);
                }
              }}
              value={resolvedDraft.clientReference}
            >
              {clients.map((entry) => (
                <option key={entry.clientReference} value={entry.clientReference}>
                  {entry.fullName} ({entry.clientReference})
                </option>
              ))}
            </select>
          </div>

          <div className="workflow-header-actions income-protection-header-actions">
            <Link className="btn btn-primary" to="/clients/new">
              <Plus size={18} />
              Add Client
            </Link>
            <Link className="btn btn-secondary" to={`/clients/${resolvedDraft.clientReference}`}>
              <Edit size={18} />
              Edit Client
            </Link>
          </div>
        </div>

        <div className="workflow-summary-bar income-protection-summary-bar">
          <div className="workflow-summary-item">
            <span className="workflow-summary-label">Client</span>
            <strong>{resolvedDraft.fullName}</strong>
          </div>
          <div className="workflow-summary-item">
            <span className="workflow-summary-label">Reference</span>
            <strong>{resolvedDraft.clientReference}</strong>
          </div>
          <div className="workflow-summary-item">
            <span className="workflow-summary-label">DOB</span>
            <strong>{formatDisplayDate(resolvedDraft.dateOfBirth)}</strong>
          </div>
          <div className="workflow-summary-item">
            <span className="workflow-summary-label">Contact</span>
            <strong>{summaryContact}</strong>
          </div>
          <div className="workflow-summary-item">
            <span className="workflow-summary-label">Occupation</span>
            <strong>{resolvedDraft.occupation || "Not recorded"}</strong>
          </div>
        </div>
      </section>

      <div aria-label="Income Protection sections" className="tab-list" role="tablist">
          {moduleTabs.map((tab) => {
            const Icon = tab.icon;
            const progress = tabProgress[tab.id];
            return (
              <button
                key={tab.id}
                aria-controls={`panel-${tab.id}`}
                aria-selected={tab.id === activeTab.id}
                className={`tab${tab.id === activeTab.id ? " is-active" : ""}`}
                id={`tab-${tab.id}`}
                onClick={() => setActiveTabId(tab.id)}
                role="tab"
                type="button"
              >
                <Icon size={18} />
                {tab.label}
                <span
                  aria-hidden="true"
                  className={`tab-progress ${progress}`}
                />
              </button>
            );
          })}
        </div>

      <section aria-labelledby={`tab-${activeTab.id}`} className="tab-panel" id={`panel-${activeTab.id}`} role="tabpanel">
        {renderTabPanel()}
      </section>
    </div>
  );
}

function getSectionProgress(fields: string[]) {
  const completed = fields.filter((field) => hasValue(String(field ?? "").replace(/,/g, "").trim())).length;
  const total = fields.length;
  if (completed === total) {
    return <Check size={16} className="text-success" />;
  }
  return <span className="text-muted text-small">{`${completed}/${total}`}</span>;
}

function formatFileSize(bytes: number) {
  if (bytes < 1024) {
    return `${bytes} B`;
  }
  if (bytes < 1024 * 1024) {
    return `${(bytes / 1024).toFixed(1)} KB`;
  }
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}
