import { useEffect, useMemo, useRef, useState } from "react";
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
  Trash2,
  File,
  FileType2,
} from "lucide-react";

import { useAuth } from "../auth/auth-context";
import { useClientData } from "../data/client-data-context";
import type { SeededClientFile, SeededClientProfile, SeededGeneratedDocument } from "../data/seeded-clients";
import { generateDocument } from "../documents/document-api";
import { buildExportDocumentArtifact, exportGeneratedDocument } from "../documents/export-generated-document";
import { GeneratedOutputWorkspace } from "../documents/generated-output-workspace";
import { builtInDocumentTemplates } from "../documents/document-templates";
import { TemplatePicker } from "../documents/template-picker";
import type { GeneratedDocumentDraft, SupportedDocumentType } from "../documents/document-types";
import { buildWorkflowDocument, type WorkflowDocumentType } from "../documents/workflow-document-builders";
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
  { value: "1 month", label: "1 month" },
  { value: "3 months", label: "3 months" },
  { value: "6 months", label: "6 months" },
  { value: "12 months", label: "12 months" },
  { value: "24 months", label: "24 months" },
];

const coverAgeOptions = [
  { value: "", label: "Select cover age" },
  { value: "55", label: "55" },
  { value: "60", label: "60" },
  { value: "65", label: "65" },
  { value: "70", label: "70" },
];

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
  const [statementSaveStatus, setStatementSaveStatus] = useState("Not saved yet");
  const [statementDocumentStatus, setStatementDocumentStatus] = useState("Document: Draft");
  const [showStatementValidation, setShowStatementValidation] = useState(false);
  const [fileUploadStatus, setFileUploadStatus] = useState("Upload: Waiting for upload");
  const [uploadProgress, setUploadProgress] = useState(0);
  const [documentPackStatus, setDocumentPackStatus] = useState("Pack: Waiting for request");
  const [documentDownloadStatus, setDocumentDownloadStatus] = useState("Download: No document downloaded yet");
  const [fileFilter, setFileFilter] = useState("");
  const [previewDocument, setPreviewDocument] = useState<SeededGeneratedDocument | null>(null);
  const factFindWorkspaceAccordion = useAccordionState(["fact-find-form"]);
  const factFindAccordion = useAccordionState(["personal-details"]);
  const statementWorkspaceAccordion = useAccordionState(["statement-form"]);

  useEffect(() => {
    setDraft(client ?? null);
  }, [client]);

  useEffect(() => {
    if (!client) {
      return;
    }
    setFactFindGenerationStatus(getGenerationHeaderStatus("Generation", client.documentDrafts["Fact Find"].generationStatus));
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
    !hasValue(resolvedDraft.premium) ? "Gross monthly premium" : null,
    !hasValue(resolvedDraft.advisorName) ? "Advisor name" : null,
    !hasValue(resolvedDraft.letterDate) ? "Letter date" : null,
  ].filter(isPresent);

  function getDocumentDraft(documentType: SupportedDocumentType) {
    return resolvedDraft.documentDrafts[documentType];
  }

  function persistDraft(nextDraft: SeededClientProfile, options?: { showToast?: boolean }) {
    const normalizedDraft = {
      ...nextDraft,
      fullName: buildFullName(nextDraft.firstName, nextDraft.surname),
      updatedBy: actorLabel,
    };
    setDraft(normalizedDraft);
    saveClient(normalizedDraft);
    if (options?.showToast) {
      addToast("Changes saved", "success");
    }
    return normalizedDraft;
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

  function updateRequestInformationAddress(value: string) {
    setDraft((currentDraft) => {
      if (!currentDraft) {
        return currentDraft;
      }
      const [nextTownCity, ...countyParts] = value.split(",");
      const nextCounty = countyParts.join(",").trim();
      return { ...currentDraft, townCity: nextTownCity.trim(), county: countyParts.length > 0 ? nextCounty : "" };
    });
  }

  function saveFactFindDraft() {
    persistDraft(resolvedDraft);
    setFactFindDraftSavedLabel("Saved just now");
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
    generatedDocument: { generatedHtml: string; sections: Array<{ id: string; title: string; bodyHtml: string }> },
  ) {
    const nextProfile = {
      ...resolvedDraft,
      documentDrafts: {
        ...resolvedDraft.documentDrafts,
        [documentType]: {
          ...resolvedDraft.documentDrafts[documentType],
          lastGeneratedHtml: generatedDocument.generatedHtml,
          lastGeneratedSections: generatedDocument.sections,
          editedHtml: "",
        },
      },
    };

    return buildWorkflowDocument(nextProfile, documentType).html;
  }

  async function handleGeneratedOutputExport(documentType: SupportedDocumentType, extension: "docx" | "pdf") {
    const previewArtifact = buildExportDocumentArtifact(resolvedDraft, documentType);
    if (!previewArtifact.html) {
      return;
    }

    const versionNumber = reserveGeneratedDocumentVersion(documentType);
    const nextDocument = buildGeneratedDocumentRecord(documentType, extension, previewArtifact, versionNumber);
    try {
      await exportGeneratedDocument(resolvedDraft, documentType, extension, nextDocument.documentName, previewArtifact);
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
    saveFactFindDraft();
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

  function saveStatementDraft() {
    persistDraft(resolvedDraft);
    setStatementSaveStatus("Saved just now");
  }

  async function handleStatementGenerate() {
    if (statementMissingFields.length > 0) {
      setShowStatementValidation(true);
      setStatementDocumentStatus("Document: Blocked by missing required fields");
      return;
    }
    setShowStatementValidation(false);
    saveStatementDraft();
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

  async function handleUploadFile() {
    setUploadProgress(0);
    setFileUploadStatus("Upload: Uploading...");
    const interval = setInterval(() => {
      setUploadProgress((current) => {
        if (current >= 90) {
          clearInterval(interval);
          return current;
        }
        return current + 10;
      });
    }, 150);

    await new Promise((resolve) => setTimeout(resolve, 1500));
    clearInterval(interval);
    setUploadProgress(100);

    const nextFile = {
      id: `FILE-${Date.now()}`,
      category: "Uploads",
      originalFilename: `${resolvedDraft.surname || "Client"}_${resolvedDraft.firstName || "Record"}_uploaded_note.txt`,
      status: "Pending review",
      uploadedBy: actorLabel,
      uploadedAt: new Date().toISOString().slice(0, 10),
    } satisfies SeededClientFile;

    persistDraft({ ...resolvedDraft, files: [nextFile, ...resolvedDraft.files] });
    setFileUploadStatus("Upload: File saved");
    addToast("File uploaded successfully", "success");
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

  function handleDeleteFile(fileId: string) {
    persistDraft({ ...resolvedDraft, files: resolvedDraft.files.filter((file) => file.id !== fileId) });
    addToast("File deleted", "success");
  }

  const filteredFiles = resolvedDraft.files.filter((file) =>
    toLower(file.originalFilename).includes(fileFilter.toLowerCase()),
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

    const statementComplete = statementMissingFields.length === 0;
    const filesComplete = resolvedDraft.files.length > 0;
    const generatedComplete = resolvedDraft.generatedDocuments.length > 0;

    return {
      "fact-find": factFindComplete ? "complete" : (factFindFields.some(hasValue) ? "partial" : "incomplete"),
      "statement-of-suitability": statementComplete ? "complete" : (statementMissingFields.length < 11 ? "partial" : "incomplete"),
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

          <Accordion>
            <AccordionItem
              indicator={tabProgress["fact-find"]}
              isOpen={factFindWorkspaceAccordion.isOpen("fact-find-form")}
              onToggle={() => factFindWorkspaceAccordion.toggle("fact-find-form")}
              title="Fact Find Form"
            >
              <div className="generated-output-section-heading">
                <Button onClick={saveFactFindDraft} variant="secondary">
                  <Save size={16} />
                  Save
                </Button>
                <span className="text-muted text-small">{factFindDraftSavedLabel}</span>
              </div>
              <Accordion>
            <AccordionItem
              indicator={getSectionProgress([resolvedDraft.fullName, resolvedDraft.dateOfBirth, resolvedDraft.email, resolvedDraft.mobileNumber, resolvedDraft.maritalStatus])}
              isOpen={factFindAccordion.isOpen("personal-details")}
              onToggle={() => factFindAccordion.toggle("personal-details")}
              title="Personal Details"
            >
              <div className="form-grid">
                <Input
                  id="ff-fullName"
                  label="Client name"
                  onChange={(event) => updateField("fullName", event.target.value)}
                  type="text"
                  value={resolvedDraft.fullName}
                />
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
                <Input
                  id="ff-dob"
                  label="Date of birth"
                  onChange={(event) => updateField("dateOfBirth", event.target.value)}
                  type="date"
                  value={resolvedDraft.dateOfBirth}
                />
                <Input
                  id="ff-email"
                  label="Email"
                  onChange={(event) => updateField("email", event.target.value)}
                  type="email"
                  value={resolvedDraft.email}
                />
                <Input
                  id="ff-phone"
                  label="Home / mobile"
                  onChange={(event) => updateField("mobileNumber", event.target.value)}
                  type="tel"
                  value={resolvedDraft.mobileNumber}
                />
                <Input
                  id="ff-partnerName"
                  label="Partner name"
                  onChange={(event) => updateField("partnerName", event.target.value)}
                  type="text"
                  value={resolvedDraft.partnerName}
                />
              </div>
            </AccordionItem>

            <AccordionItem
              indicator={getSectionProgress([resolvedDraft.occupation, resolvedDraft.employmentStatus, resolvedDraft.income, resolvedDraft.advisorName])}
              isOpen={factFindAccordion.isOpen("employment-details")}
              onToggle={() => factFindAccordion.toggle("employment-details")}
              title="Employment Details"
            >
              <div className="form-grid">
                <Input
                  id="ff-occupation"
                  label="Occupation"
                  onChange={(event) => updateField("occupation", event.target.value)}
                  type="text"
                  value={resolvedDraft.occupation}
                />
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
              </div>
            </AccordionItem>

            <AccordionItem
              indicator={getSectionProgress([resolvedDraft.provider, resolvedDraft.recommendedCover, resolvedDraft.premium, resolvedDraft.deferredPeriod, resolvedDraft.coverAge])}
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
              </div>
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
                <Input
                  id="ff-executionOnlyConfirmation"
                  label="Execution-only confirmation"
                  onChange={(event) => updateField("executionOnlyConfirmation", event.target.value)}
                  type="text"
                  value={resolvedDraft.executionOnlyConfirmation}
                />
                <Input
                  id="ff-termsReviewedReceived"
                  label="Terms of Business reviewed and copy received"
                  onChange={(event) => updateField("termsReviewedReceived", event.target.value)}
                  type="text"
                  value={resolvedDraft.termsReviewedReceived}
                />
              </div>
            </AccordionItem>

            <AccordionItem
              indicator={getSectionProgress([
                resolvedDraft.contactByPhone,
                resolvedDraft.contactBySms,
                resolvedDraft.contactByEmail,
                resolvedDraft.contactByPost,
              ])}
              isOpen={factFindAccordion.isOpen("marketing-preferences")}
              onToggle={() => factFindAccordion.toggle("marketing-preferences")}
              title="Data Protection & Marketing Preferences"
            >
              <div className="form-grid">
                <Toggle
                  checked={toLower(resolvedDraft.contactByPhone).startsWith("y")}
                  id="ff-contactByPhone"
                  label="Contact by phone"
                  onChange={(event) => updateField("contactByPhone", event.target.checked ? "Yes" : "No")}
                />
                <Toggle
                  checked={toLower(resolvedDraft.contactBySms).startsWith("y")}
                  id="ff-contactBySms"
                  label="Contact by SMS"
                  onChange={(event) => updateField("contactBySms", event.target.checked ? "Yes" : "No")}
                />
                <Toggle
                  checked={toLower(resolvedDraft.contactByEmail).startsWith("y")}
                  id="ff-contactByEmail"
                  label="Contact by email"
                  onChange={(event) => updateField("contactByEmail", event.target.checked ? "Yes" : "No")}
                />
                <Toggle
                  checked={toLower(resolvedDraft.contactByPost).startsWith("y")}
                  id="ff-contactByPost"
                  label="Contact by post"
                  onChange={(event) => updateField("contactByPost", event.target.checked ? "Yes" : "No")}
                />
              </div>
            </AccordionItem>

            <AccordionItem
              indicator={getSectionProgress([resolvedDraft.pepConfirmation, resolvedDraft.pepRelatedConfirmation])}
              isOpen={factFindAccordion.isOpen("pep")}
              onToggle={() => factFindAccordion.toggle("pep")}
              title="PEP Confirmation"
            >
              <div className="form-grid">
                <Input
                  id="ff-pepConfirmation"
                  label="Politically Exposed Person confirmation"
                  onChange={(event) => updateField("pepConfirmation", event.target.value)}
                  type="text"
                  value={resolvedDraft.pepConfirmation}
                />
                <Input
                  id="ff-pepRelatedConfirmation"
                  label="Related to a PEP"
                  onChange={(event) => updateField("pepRelatedConfirmation", event.target.value)}
                  type="text"
                  value={resolvedDraft.pepRelatedConfirmation}
                />
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
              indicator={getSectionProgress([
                resolvedDraft.clientSignature1,
                resolvedDraft.clientSignature1Date,
                resolvedDraft.clientSignature2,
                resolvedDraft.financialAdvisorSignature,
              ])}
              isOpen={factFindAccordion.isOpen("signatures")}
              onToggle={() => factFindAccordion.toggle("signatures")}
              title="Signatures"
            >
              <div className="card mb-4">
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
                    id="ff-financialAdvisorSignature"
                    label="Financial advisor signature"
                    onChange={(event) => updateField("financialAdvisorSignature", event.target.value)}
                    type="text"
                    value={resolvedDraft.financialAdvisorSignature}
                  />
                </div>
              </div>
            </AccordionItem>

            <AccordionItem
              indicator={getSectionProgress([
                resolvedDraft.fullName,
                `${resolvedDraft.townCity}, ${resolvedDraft.county}`,
                resolvedDraft.dateOfBirth,
                resolvedDraft.requestCompanyName,
                resolvedDraft.requestPolicies,
                resolvedDraft.requestLetterDate,
              ])}
              isOpen={factFindAccordion.isOpen("request-for-information")}
              onToggle={() => factFindAccordion.toggle("request-for-information")}
              title="Request for Information"
            >
              <div className="form-grid">
                <Input
                  id="ff-rfi-fullName"
                  label="Client name(s)"
                  onChange={(event) => updateField("fullName", event.target.value)}
                  type="text"
                  value={resolvedDraft.fullName}
                />
                <Input
                  id="ff-rfi-address"
                  label="Address"
                  onChange={(event) => updateRequestInformationAddress(event.target.value)}
                  type="text"
                  value={`${resolvedDraft.townCity}, ${resolvedDraft.county}`.replace(/^,\s*/, "")}
                />
                <Input
                  id="ff-rfi-dob"
                  label="Date of birth"
                  onChange={(event) => updateField("dateOfBirth", event.target.value)}
                  type="date"
                  value={resolvedDraft.dateOfBirth}
                />
                <Input
                  id="ff-requestCompanyName"
                  label="Company/provider name"
                  onChange={(event) => updateField("requestCompanyName", event.target.value)}
                  type="text"
                  value={resolvedDraft.requestCompanyName}
                />
                <Input
                  id="ff-requestPolicies"
                  label="Policies"
                  onChange={(event) => updateField("requestPolicies", event.target.value)}
                  type="text"
                  value={resolvedDraft.requestPolicies}
                />
                <Input
                  id="ff-requestLetterDate"
                  label="Request letter date"
                  onChange={(event) => updateField("requestLetterDate", event.target.value)}
                  type="date"
                  value={resolvedDraft.requestLetterDate}
                />
              </div>
            </AccordionItem>
              </Accordion>
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

          <Accordion>
            <AccordionItem
              indicator={tabProgress["statement-of-suitability"]}
              isOpen={statementWorkspaceAccordion.isOpen("statement-form")}
              onToggle={() => statementWorkspaceAccordion.toggle("statement-form")}
              title="Statement Form"
            >
              <div className="generated-output-section-heading">
                <Button onClick={saveStatementDraft} variant="secondary">
                  <Save size={16} />
                  Save
                </Button>
                <span className="text-muted text-small">{statementSaveStatus}</span>
              </div>
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
                onChange={(event) => updateField("recommendedCover", event.target.value)}
                type="text"
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
              <Button onClick={handleUploadFile} variant="primary">
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

          <div
            className="upload-zone"
            onClick={handleUploadFile}
            onDragOver={(event) => event.preventDefault()}
            onDrop={(event) => {
              event.preventDefault();
              void handleUploadFile();
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

          <section className="card">
            <div className="card-header">
              <h3 className="card-title">Tracked client files</h3>
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

            {filteredFiles.length === 0 ? (
              <div className="empty-state">
                <div className="empty-state-icon">
                  <FolderOpen size={28} />
                </div>
                <div className="empty-state-title">No files yet</div>
                <p className="empty-state-description">
                  {fileFilter ? "No files match your filter." : "Upload supporting documents for this client."}
                </p>
                <Button onClick={handleUploadFile} variant="primary">
                  <Upload size={18} />
                  Upload File
                </Button>
              </div>
            ) : (
              <div className="file-list">
                {filteredFiles.map((file) => (
                  <div className="file-item" key={file.id}>
                    <div className="file-icon">{getFileIcon(file.originalFilename)}</div>
                    <div className="file-info">
                      <div className="file-name">{file.originalFilename}</div>
                      <div className="file-meta">
                        {file.category} · {formatFileSize(file.originalFilename.length * 1024)} · {file.uploadedBy}
                      </div>
                    </div>
                    <Badge variant={toLower(file.status).includes("approved") ? "approved" : "draft"}>
                      {file.status ?? "Uploaded"}
                    </Badge>
                    <div className="file-actions">
                      <Button className="btn-sm" onClick={() => handleDownloadDocument(file as unknown as SeededGeneratedDocument)} variant="secondary">
                        <Download size={14} />
                      </Button>
                      <Button className="btn-sm" onClick={handleUploadFile} variant="secondary">
                        <RefreshCw size={14} />
                      </Button>
                      <Button className="btn-sm" onClick={() => handleDeleteFile(file.id)} variant="danger">
                        <Trash2 size={14} />
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

    // Generated Documents tab
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

        {resolvedDraft.generatedDocuments.length === 0 ? (
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
          <div className="table-wrap">
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
                {resolvedDraft.generatedDocuments.map((document) => (
                  <tr key={document.id}>
                    <td>{document.documentType}</td>
                    <td className="font-medium">{document.documentName}</td>
                    <td>{document.version}</td>
                    <td>
                      <Badge variant={getDocumentStatusVariant(document.status)}>{document.status ?? "Draft"}</Badge>
                    </td>
                    <td>{document.generatedAt}</td>
                    <td>
                      <div className="generated-doc-actions">
                        <Button className="btn-sm" onClick={() => setPreviewDocument(document)} variant="secondary">
                          <Eye size={14} />
                          Preview
                        </Button>
                        <Button className="btn-sm" onClick={() => handleDownloadDocument(document)} variant="secondary">
                          <Download size={14} />
                          Download
                        </Button>
                        {document.documentType !== "Terms of Business" ? (
                          <Button className="btn-sm" onClick={() => handleRegenerateDocument(document)} variant="text">
                            <RefreshCw size={14} />
                            Regenerate
                          </Button>
                        ) : null}
                        <Button className="btn-sm" onClick={() => handleSendDocument(document)} variant="text">
                          <Send size={14} />
                          Send
                        </Button>
                      </div>
                    </td>
                  </tr>
                ))}
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
    <div className="page-stack">
      <section className="card">
        <section className="workflow-header" aria-label="Selected client summary">
          <div className="workflow-header-top">
            <div className="workflow-header-title">
              <div className="flex items-center gap-3">
                <h1>Income Protection</h1>
                <Badge variant={getDocumentStatusVariant(resolvedDraft.status)}>{resolvedDraft.status ?? "Draft"}</Badge>
              </div>
            </div>
          </div>

          <div className="workflow-header-grid">
            <div className="workflow-header-actions">
              <div className="workflow-client-field">
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
              <Link className="btn btn-secondary" to="/clients/new">
                <Plus size={18} />
                Add Client
              </Link>
              <Link className="btn btn-secondary" to={`/clients/${resolvedDraft.clientReference}`}>
                Edit Client
              </Link>
            </div>

            <div className="workflow-summary-bar">
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
