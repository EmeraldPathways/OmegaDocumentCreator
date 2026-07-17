import { useEffect, useMemo, useRef, useState, type ChangeEvent, type ReactNode } from "react";
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
  File,
  FileType2,
  Edit,
  Trash2,
} from "lucide-react";

import { fetchWorkflow, saveWorkflow } from "../data/workflow-api";
import { deleteFile, downloadFile, listFiles, uploadFile, type BackendFile } from "../data/file-api";
import { createDocument, deleteDocument, downloadDocument, downloadDocumentPack, listDocuments, type BackendGeneratedDocument } from "../documents/generated-document-api";
import { useAuth } from "../auth/auth-context";
import { useClientData } from "../data/client-data-context";
import type {
  SeededClientFile,
  SeededClientProfile,
  SeededGeneratedDocument,
  SeededSavingsInvestmentRow,
} from "../data/seeded-clients";
import { fetchStatementQuoteRequests, generateDocument } from "../documents/document-api";
import { buildExportDocumentArtifact, exportGeneratedDocument } from "../documents/export-generated-document";
import { GeneratedOutputWorkspace } from "../documents/generated-output-workspace";
import { buildStatementQuoteOptions } from "../documents/statement-quote-selection";
import { resolveWorkspaceDocumentDraft } from "../documents/statement-draft";
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

import {
  buildExportFilename,
  buildFullName,
  coverAgeOptions,
  deferredPeriodOptions,
  employmentStatusOptions,
  formatCurrency,
  formatDisplayDate,
  genderOptions,
  getDocumentStatusVariant,
  getDraftStatusDotClass,
  getFileCategoryClass,
  getGeneratedDraftStatusLabel,
  getGenerationHeaderStatus,
  getSectionProgress,
  hasValue,
  isAffirmative,
  isPresent,
  moduleTabs,
  PENSION_SECTION_CONFIGS,
  phiIndexationOptions,
  phiOccupationalClassOptions,
  replaceSpaces,
  resolveActorLabel,
  SELECTED_CLIENT_STORAGE_KEY,
  SeededClientStringKey,
  smokerStatusOptions,
  statementTypeOptions,
  toLower,
  useAccordionState,
  workflowSectionByTabId,
  type WorkflowSectionId,
} from "./income-protection-helpers";
import { IncomeProtectionFilesTab } from "./income-protection-files-tab";
import { IncomeProtectionGeneratedDocumentsTab } from "./income-protection-generated-documents-tab";
import { WorkflowDocumentSections } from "./workflow-document-sections";
import { WorkflowPageLayout } from "./workflow-page-layout";

type IncomeProtectionPageProps = {
  pageTitle?: string;
  quoteDocumentType?: "Quote" | "Pensions Quote";
  statementDocumentType?: "Statement of Suitability" | "Pensions Statement";
  visibleTabIds?: Array<(typeof moduleTabs)[number]["id"]>;
  workflowKind?: "fact-find" | "income-protection" | "pensions" | "files-docs";
};

function hasGeneratedDraftArtifacts(draft?: Partial<GeneratedDocumentDraft>) {
  if (!draft) {
    return false;
  }

  return Boolean(
    draft.lastGeneratedHtml ||
    draft.editedHtml ||
    (draft.lastGeneratedSections?.length ?? 0) > 0 ||
    (draft.integrationRequests?.length ?? 0) > 0,
  );
}

function hasStatementQuoteResults(requests?: GeneratedDocumentDraft["integrationRequests"]) {
  return (requests ?? []).some((request) => request.quoteResults.length > 0);
}

function resolveStatementIntegrationRequests(
  currentRequests: GeneratedDocumentDraft["integrationRequests"],
  nextRequests?: GeneratedDocumentDraft["integrationRequests"],
) {
  if (!nextRequests) {
    return currentRequests;
  }

  if (hasStatementQuoteResults(nextRequests) || !hasStatementQuoteResults(currentRequests)) {
    return nextRequests;
  }

  return currentRequests;
}

function getStatementQuoteRequests(
  profile: SeededClientProfile,
  quoteDocumentType: "Quote" | "Pensions Quote",
  statementDocumentType: "Statement of Suitability" | "Pensions Statement",
) {
  const quoteRequests = profile.documentDrafts[quoteDocumentType]?.integrationRequests ?? [];
  const statementRequests = profile.documentDrafts[statementDocumentType]?.integrationRequests ?? [];

  return quoteRequests.length > 0 ? quoteRequests : statementRequests;
}

function stripNumericFormatting(value: string | undefined) {
  return (value ?? "").replace(/[^\d.]/g, "").trim();
}

function mergeDocumentDrafts(
  currentDrafts: SeededClientProfile["documentDrafts"],
  incomingDrafts?: Partial<Record<SupportedDocumentType, Partial<GeneratedDocumentDraft>>>,
) {
  if (!incomingDrafts) {
    return currentDrafts;
  }

  return {
    "Fact Find": {
      ...currentDrafts["Fact Find"],
      ...incomingDrafts["Fact Find"],
      lastGeneratedHtml:
        incomingDrafts["Fact Find"]?.lastGeneratedHtml || currentDrafts["Fact Find"].lastGeneratedHtml,
      lastGeneratedSections:
        (incomingDrafts["Fact Find"]?.lastGeneratedSections?.length ?? 0) > 0
          ? (incomingDrafts["Fact Find"]?.lastGeneratedSections ?? currentDrafts["Fact Find"].lastGeneratedSections)
          : currentDrafts["Fact Find"].lastGeneratedSections,
      integrationRequests:
        (incomingDrafts["Fact Find"]?.integrationRequests?.length ?? 0) > 0
          ? (incomingDrafts["Fact Find"]?.integrationRequests ?? currentDrafts["Fact Find"].integrationRequests)
          : currentDrafts["Fact Find"].integrationRequests,
      editedHtml: incomingDrafts["Fact Find"]?.editedHtml || currentDrafts["Fact Find"].editedHtml,
      generationStatus: hasGeneratedDraftArtifacts(incomingDrafts["Fact Find"])
        ? incomingDrafts["Fact Find"]?.generationStatus ?? currentDrafts["Fact Find"].generationStatus
        : currentDrafts["Fact Find"].generationStatus,
    },
    "Fact Find Update": {
      ...currentDrafts["Fact Find Update"],
      ...incomingDrafts["Fact Find Update"],
      lastGeneratedHtml:
        incomingDrafts["Fact Find Update"]?.lastGeneratedHtml || currentDrafts["Fact Find Update"].lastGeneratedHtml,
      lastGeneratedSections:
        (incomingDrafts["Fact Find Update"]?.lastGeneratedSections?.length ?? 0) > 0
          ? (incomingDrafts["Fact Find Update"]?.lastGeneratedSections ?? currentDrafts["Fact Find Update"].lastGeneratedSections)
          : currentDrafts["Fact Find Update"].lastGeneratedSections,
      integrationRequests:
        (incomingDrafts["Fact Find Update"]?.integrationRequests?.length ?? 0) > 0
          ? (incomingDrafts["Fact Find Update"]?.integrationRequests ?? currentDrafts["Fact Find Update"].integrationRequests)
          : currentDrafts["Fact Find Update"].integrationRequests,
      editedHtml: incomingDrafts["Fact Find Update"]?.editedHtml || currentDrafts["Fact Find Update"].editedHtml,
      generationStatus: hasGeneratedDraftArtifacts(incomingDrafts["Fact Find Update"])
        ? incomingDrafts["Fact Find Update"]?.generationStatus ?? currentDrafts["Fact Find Update"].generationStatus
        : currentDrafts["Fact Find Update"].generationStatus,
    },
    "Terms of Business": {
      ...currentDrafts["Terms of Business"],
      ...incomingDrafts["Terms of Business"],
      lastGeneratedHtml:
        incomingDrafts["Terms of Business"]?.lastGeneratedHtml || currentDrafts["Terms of Business"].lastGeneratedHtml,
      lastGeneratedSections:
        (incomingDrafts["Terms of Business"]?.lastGeneratedSections?.length ?? 0) > 0
          ? (incomingDrafts["Terms of Business"]?.lastGeneratedSections ?? currentDrafts["Terms of Business"].lastGeneratedSections)
          : currentDrafts["Terms of Business"].lastGeneratedSections,
      integrationRequests:
        (incomingDrafts["Terms of Business"]?.integrationRequests?.length ?? 0) > 0
          ? (incomingDrafts["Terms of Business"]?.integrationRequests ?? currentDrafts["Terms of Business"].integrationRequests)
          : currentDrafts["Terms of Business"].integrationRequests,
      editedHtml: incomingDrafts["Terms of Business"]?.editedHtml || currentDrafts["Terms of Business"].editedHtml,
      generationStatus: hasGeneratedDraftArtifacts(incomingDrafts["Terms of Business"])
        ? incomingDrafts["Terms of Business"]?.generationStatus ?? currentDrafts["Terms of Business"].generationStatus
        : currentDrafts["Terms of Business"].generationStatus,
    },
    "Statement of Suitability": {
      ...currentDrafts["Statement of Suitability"],
      ...incomingDrafts["Statement of Suitability"],
      lastGeneratedHtml:
        incomingDrafts["Statement of Suitability"]?.lastGeneratedHtml ||
        currentDrafts["Statement of Suitability"].lastGeneratedHtml,
      lastGeneratedSections:
        (incomingDrafts["Statement of Suitability"]?.lastGeneratedSections?.length ?? 0) > 0
          ? (incomingDrafts["Statement of Suitability"]?.lastGeneratedSections ?? currentDrafts["Statement of Suitability"].lastGeneratedSections)
          : currentDrafts["Statement of Suitability"].lastGeneratedSections,
      integrationRequests:
        (incomingDrafts["Statement of Suitability"]?.integrationRequests?.length ?? 0) > 0
          ? (incomingDrafts["Statement of Suitability"]?.integrationRequests ?? currentDrafts["Statement of Suitability"].integrationRequests)
          : currentDrafts["Statement of Suitability"].integrationRequests,
      editedHtml:
        incomingDrafts["Statement of Suitability"]?.editedHtml ||
        currentDrafts["Statement of Suitability"].editedHtml,
      generationStatus: hasGeneratedDraftArtifacts(incomingDrafts["Statement of Suitability"])
        ? incomingDrafts["Statement of Suitability"]?.generationStatus ??
          currentDrafts["Statement of Suitability"].generationStatus
        : currentDrafts["Statement of Suitability"].generationStatus,
    },
    "Quote": {
      ...currentDrafts["Quote"],
      ...incomingDrafts["Quote"],
      lastGeneratedHtml:
        incomingDrafts["Quote"]?.lastGeneratedHtml || currentDrafts["Quote"].lastGeneratedHtml,
      lastGeneratedSections:
        (incomingDrafts["Quote"]?.lastGeneratedSections?.length ?? 0) > 0
          ? (incomingDrafts["Quote"]?.lastGeneratedSections ?? currentDrafts["Quote"].lastGeneratedSections)
          : currentDrafts["Quote"].lastGeneratedSections,
      integrationRequests:
        (incomingDrafts["Quote"]?.integrationRequests?.length ?? 0) > 0
          ? (incomingDrafts["Quote"]?.integrationRequests ?? currentDrafts["Quote"].integrationRequests)
          : currentDrafts["Quote"].integrationRequests,
      editedHtml: incomingDrafts["Quote"]?.editedHtml || currentDrafts["Quote"].editedHtml,
      generationStatus: hasGeneratedDraftArtifacts(incomingDrafts["Quote"])
        ? incomingDrafts["Quote"]?.generationStatus ?? currentDrafts["Quote"].generationStatus
        : currentDrafts["Quote"].generationStatus,
    },
    "Pensions Statement": {
      ...currentDrafts["Pensions Statement"],
      ...incomingDrafts["Pensions Statement"],
      lastGeneratedHtml:
        incomingDrafts["Pensions Statement"]?.lastGeneratedHtml ||
        currentDrafts["Pensions Statement"].lastGeneratedHtml,
      lastGeneratedSections:
        (incomingDrafts["Pensions Statement"]?.lastGeneratedSections?.length ?? 0) > 0
          ? (incomingDrafts["Pensions Statement"]?.lastGeneratedSections ?? currentDrafts["Pensions Statement"].lastGeneratedSections)
          : currentDrafts["Pensions Statement"].lastGeneratedSections,
      integrationRequests:
        (incomingDrafts["Pensions Statement"]?.integrationRequests?.length ?? 0) > 0
          ? (incomingDrafts["Pensions Statement"]?.integrationRequests ?? currentDrafts["Pensions Statement"].integrationRequests)
          : currentDrafts["Pensions Statement"].integrationRequests,
      editedHtml:
        incomingDrafts["Pensions Statement"]?.editedHtml ||
        currentDrafts["Pensions Statement"].editedHtml,
      generationStatus: hasGeneratedDraftArtifacts(incomingDrafts["Pensions Statement"])
        ? incomingDrafts["Pensions Statement"]?.generationStatus ??
          currentDrafts["Pensions Statement"].generationStatus
        : currentDrafts["Pensions Statement"].generationStatus,
    },
    "Pensions Quote": {
      ...currentDrafts["Pensions Quote"],
      ...incomingDrafts["Pensions Quote"],
      lastGeneratedHtml:
        incomingDrafts["Pensions Quote"]?.lastGeneratedHtml || currentDrafts["Pensions Quote"].lastGeneratedHtml,
      lastGeneratedSections:
        (incomingDrafts["Pensions Quote"]?.lastGeneratedSections?.length ?? 0) > 0
          ? (incomingDrafts["Pensions Quote"]?.lastGeneratedSections ?? currentDrafts["Pensions Quote"].lastGeneratedSections)
          : currentDrafts["Pensions Quote"].lastGeneratedSections,
      integrationRequests:
        (incomingDrafts["Pensions Quote"]?.integrationRequests?.length ?? 0) > 0
          ? (incomingDrafts["Pensions Quote"]?.integrationRequests ?? currentDrafts["Pensions Quote"].integrationRequests)
          : currentDrafts["Pensions Quote"].integrationRequests,
      editedHtml: incomingDrafts["Pensions Quote"]?.editedHtml || currentDrafts["Pensions Quote"].editedHtml,
      generationStatus: hasGeneratedDraftArtifacts(incomingDrafts["Pensions Quote"])
        ? incomingDrafts["Pensions Quote"]?.generationStatus ?? currentDrafts["Pensions Quote"].generationStatus
        : currentDrafts["Pensions Quote"].generationStatus,
    },
  };
}

function mergeWorkflowFieldsIntoDraft(
  currentDraft: SeededClientProfile,
  fields: Partial<SeededClientProfile>,
): SeededClientProfile {
  const {
    documentDrafts: incomingDocumentDrafts,
    files: _incomingFiles,
    generatedDocuments: _incomingGeneratedDocuments,
    ...workflowFields
  } = fields;

  return {
    ...currentDraft,
    ...workflowFields,
    documentDrafts: mergeDocumentDrafts(currentDraft.documentDrafts, incomingDocumentDrafts),
    files: currentDraft.files,
    generatedDocuments: currentDraft.generatedDocuments,
  };
}

function buildWorkflowPersistencePayload(draft: SeededClientProfile): Partial<SeededClientProfile> {
  const { documentDrafts: _documentDrafts, files: _files, generatedDocuments: _generatedDocuments, ...workflowFields } = draft;
  return workflowFields;
}

export function IncomeProtectionPage({
  pageTitle = "Income Protection",
  quoteDocumentType = "Quote",
  statementDocumentType = "Statement of Suitability",
  visibleTabIds,
  workflowKind = "income-protection",
}: IncomeProtectionPageProps = {}) {
  const { user } = useAuth();
  const canUseBackend = Boolean(user);
  const actorLabel = resolveActorLabel(user?.role);
  const { addToast } = useToast();
  const { getClient, listClients, saveClient, saveGeneratedDraft, updateSelectedTemplate, upsertGeneratedDocument, upsertFile } =
    useClientData();
  const clients = listClients();
  const pendingGeneratedDocumentVersionsRef = useRef<Record<string, Set<number>>>({});
  const [selectedClientReference, setSelectedClientReference] = useState(() => {
    if (typeof window !== "undefined") {
      const storedReference = window.localStorage.getItem(SELECTED_CLIENT_STORAGE_KEY);
      if (storedReference && clients.some((entry) => entry.clientReference === storedReference)) {
        return storedReference;
      }
    }
    return clients[0]?.clientReference ?? "";
  });
  const client = getClient(selectedClientReference);
  const [activeTabId, setActiveTabId] = useState<(typeof moduleTabs)[number]["id"]>(
    visibleTabIds?.[0] ?? moduleTabs[0].id,
  );
  const [draft, setDraft] = useState<SeededClientProfile | null>(client ?? null);
  const [factFindDraftSavedLabel, setFactFindDraftSavedLabel] = useState("Not saved yet");
  const [factFindGenerationStatus, setFactFindGenerationStatus] = useState("Generation: Draft");
  const [showFactFindValidation, setShowFactFindValidation] = useState(false);
  const [factFindUpdateSavedLabel, setFactFindUpdateSavedLabel] = useState("Not saved yet");
  const [factFindUpdateGenerationStatus, setFactFindUpdateGenerationStatus] = useState("Generation: Draft");
  const [statementSaveStatus, setStatementSaveStatus] = useState("Not saved yet");
  const [statementDocumentStatus, setStatementDocumentStatus] = useState("Document: Draft");
  const [showStatementValidation, setShowStatementValidation] = useState(false);
  const [quoteDocumentStatus, setQuoteDocumentStatus] = useState("Document: Draft");
  const [showQuoteValidation, setShowQuoteValidation] = useState(false);
  const [lastSubmittedQuoteRequestKey, setLastSubmittedQuoteRequestKey] = useState<string | null>(null);
  const [quoteAnnualCoverAmount, setQuoteAnnualCoverAmount] = useState("");
  const [quoteCoverToAge, setQuoteCoverToAge] = useState("");
  const [quoteOccupationClass, setQuoteOccupationClass] = useState("");
  const [quoteDeferredPeriod, setQuoteDeferredPeriod] = useState("");
  const [quoteSmoker, setQuoteSmoker] = useState("");
  const [quotePhiIndexation, setQuotePhiIndexation] = useState("");
  const [quotePensionGender, setQuotePensionGender] = useState("");
  const [quotePensionRetirementAge, setQuotePensionRetirementAge] = useState("");
  const [quotePensionSpousesPension, setQuotePensionSpousesPension] = useState("No");
  const [quotePensionEscalation, setQuotePensionEscalation] = useState("0");
  const [quotePensionNetGrowth, setQuotePensionNetGrowth] = useState("6");
  const [quotePensionPremiumEscalation, setQuotePensionPremiumEscalation] = useState("5");
  const [quotePensionInflation, setQuotePensionInflation] = useState("3");
  const [quotePensionExistingFund, setQuotePensionExistingFund] = useState("");
  const [quotePensionRequired, setQuotePensionRequired] = useState("");
  const [quotePensionMonthlyContribution, setQuotePensionMonthlyContribution] = useState("");
  const [showPartnerFields, setShowPartnerFields] = useState(false);
  const [showNoDeferredFields, setShowNoDeferredFields] = useState(false);
  const [fileUploadStatus, setFileUploadStatus] = useState("Upload: Ready");
  const [uploadProgress, setUploadProgress] = useState(0);
  const [documentPackStatus, setDocumentPackStatus] = useState("Pack: Waiting for request");
  const [documentDownloadStatus, setDocumentDownloadStatus] = useState("Download: No document downloaded yet");
  const [fileFilter, setFileFilter] = useState("");
  const [previewDocument, setPreviewDocument] = useState<SeededGeneratedDocument | null>(null);
  const [backendFiles, setBackendFiles] = useState<BackendFile[]>([]);
  const [backendGeneratedDocuments, setBackendGeneratedDocuments] = useState<BackendGeneratedDocument[]>([]);
  const [hasLoadedBackendGeneratedDocuments, setHasLoadedBackendGeneratedDocuments] = useState(false);
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const quoteGenerateRef = useRef<(() => Promise<void>) | null>(null);
  const factFindWorkspaceAccordion = useAccordionState(["fact-find-form"]);
  const factFindAccordion = useAccordionState(["personal-details"]);
  const factFindUpdateWorkspaceAccordion = useAccordionState(["fact-find-update-form"]);
  const statementWorkspaceAccordion = useAccordionState(["statement-form"]);
  const quoteWorkspaceAccordion = useAccordionState(["quote-output", "generated-output"]);
  const visibleTabs = useMemo(() => {
    if (!visibleTabIds || visibleTabIds.length === 0) {
      return moduleTabs;
    }

    const allowedTabIds = new Set(visibleTabIds);
    return moduleTabs.filter((tab) => allowedTabIds.has(tab.id));
  }, [visibleTabIds]);

  useEffect(() => {
    if (!canUseBackend || !selectedClientReference) return;
    let cancelled = false;
    fetchWorkflow(selectedClientReference).then((fields) => {
      if (cancelled) return;
      setDraft((current) => current ? mergeWorkflowFieldsIntoDraft(current, fields) : current);
    }).catch(() => {});
    return () => { cancelled = true; };
  }, [canUseBackend, selectedClientReference]);

  useEffect(() => {
    setDraft((currentDraft) => {
      if (!client) {
        return null;
      }

      if (!currentDraft || currentDraft.clientReference !== client.clientReference) {
        return client;
      }

      return currentDraft;
    });
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
      getGenerationHeaderStatus("Document", client.documentDrafts[statementDocumentType].generationStatus),
    );
    setQuoteDocumentStatus(getGenerationHeaderStatus("Document", client.documentDrafts[quoteDocumentType].generationStatus));
    setLastSubmittedQuoteRequestKey(null);
    setShowFactFindValidation(false);
    setShowStatementValidation(false);
    setShowQuoteValidation(false);
    setShowPartnerFields(false);
    setShowNoDeferredFields(false);
  }, [client, quoteDocumentType, selectedClientReference, statementDocumentType]);

  useEffect(() => {
    if (!client || (workflowKind !== "pensions" && quoteDocumentType !== "Pensions Quote")) {
      return;
    }

    setQuotePensionGender(client.gender || "");
    setQuotePensionRetirementAge(client.selfRetirementAge || "");
    setQuotePensionSpousesPension(client.partnerName ? "Yes" : "No");
    setQuotePensionEscalation("0");
    setQuotePensionNetGrowth("6");
    setQuotePensionPremiumEscalation("5");
    setQuotePensionInflation("3");
    setQuotePensionExistingFund(stripNumericFormatting(client.selfPersonalPensionCurrentValue));
    setQuotePensionRequired("");
    setQuotePensionMonthlyContribution(
      stripNumericFormatting(
        client.selfPersonalPensionContribution || client.selfEmployeeDirectorPersonalContribution,
      ),
    );
  }, [client, quoteDocumentType, workflowKind]);

  useEffect(() => {
    if (!selectedClientReference && clients[0]?.clientReference) {
      setSelectedClientReference(clients[0].clientReference);
    }
  }, [clients, selectedClientReference]);

  useEffect(() => {
    if (typeof window === "undefined" || !selectedClientReference) {
      return;
    }

    window.localStorage.setItem(SELECTED_CLIENT_STORAGE_KEY, selectedClientReference);
  }, [selectedClientReference]);

  useEffect(() => {
    if (!draft) {
      return;
    }

    const documentType = statementDocumentType satisfies SupportedDocumentType;
    const currentStatementDraft = draft.documentDrafts[documentType];
    const resolvedStatementDraft = resolveWorkspaceDocumentDraft(draft, documentType);

    const needsRepair =
      currentStatementDraft.editedHtml !== resolvedStatementDraft.editedHtml ||
      currentStatementDraft.lastGeneratedHtml !== resolvedStatementDraft.lastGeneratedHtml ||
      JSON.stringify(currentStatementDraft.lastGeneratedSections) !== JSON.stringify(resolvedStatementDraft.lastGeneratedSections) ||
      JSON.stringify(currentStatementDraft.integrationRequests) !== JSON.stringify(resolvedStatementDraft.integrationRequests);

    if (!needsRepair) {
      return;
    }

    saveGeneratedDraft(draft.clientReference, documentType, {
      generationStatus: resolvedStatementDraft.generationStatus,
      lastGeneratedHtml: resolvedStatementDraft.lastGeneratedHtml,
      lastGeneratedSections: resolvedStatementDraft.lastGeneratedSections,
      integrationRequests: resolvedStatementDraft.integrationRequests,
      editedHtml: resolvedStatementDraft.editedHtml,
    });

    setDraft((currentDraft) => {
      if (!currentDraft) {
        return currentDraft;
      }

      return {
        ...currentDraft,
        documentDrafts: {
          ...currentDraft.documentDrafts,
          [documentType]: resolvedStatementDraft,
        },
      };
    });
  }, [draft, saveGeneratedDraft, statementDocumentType]);

  useEffect(() => {
    if (!draft) {
      return;
    }

    const documentType = "Fact Find" satisfies SupportedDocumentType;
    const currentFactFindDraft = draft.documentDrafts[documentType];
    const resolvedFactFindDraft = resolveWorkspaceDocumentDraft(draft, documentType);

    const needsRepair =
      currentFactFindDraft.editedHtml !== resolvedFactFindDraft.editedHtml ||
      currentFactFindDraft.lastGeneratedHtml !== resolvedFactFindDraft.lastGeneratedHtml ||
      JSON.stringify(currentFactFindDraft.lastGeneratedSections) !== JSON.stringify(resolvedFactFindDraft.lastGeneratedSections) ||
      JSON.stringify(currentFactFindDraft.integrationRequests) !== JSON.stringify(resolvedFactFindDraft.integrationRequests);

    if (!needsRepair) {
      return;
    }

    saveGeneratedDraft(draft.clientReference, documentType, {
      generationStatus: resolvedFactFindDraft.generationStatus,
      lastGeneratedHtml: resolvedFactFindDraft.lastGeneratedHtml,
      lastGeneratedSections: resolvedFactFindDraft.lastGeneratedSections,
      integrationRequests: resolvedFactFindDraft.integrationRequests,
      editedHtml: resolvedFactFindDraft.editedHtml,
    });

    setDraft((currentDraft) => {
      if (!currentDraft) {
        return currentDraft;
      }

      return {
        ...currentDraft,
        documentDrafts: {
          ...currentDraft.documentDrafts,
          [documentType]: resolvedFactFindDraft,
        },
      };
    });
  }, [draft, saveGeneratedDraft]);

  if (!client || !draft) {
    return (
      <section className="card">
        <h1>Client Not Found</h1>
        <p className="text-muted">Select a client to continue with income protection workflow.</p>
      </section>
    );
  }

  const resolvedDraft = draft;
  const factFindType = resolvedDraft.factFindType ?? "all";
  const isIncomeProtectionDocumentFlow =
    quoteDocumentType === "Quote" && statementDocumentType === "Statement of Suitability";
  const isPensionsQuoteWorkflow = workflowKind === "pensions" || quoteDocumentType === "Pensions Quote";
  const statementQuoteRequests = isIncomeProtectionDocumentFlow
    ? getStatementQuoteRequests(resolvedDraft, quoteDocumentType, statementDocumentType)
    : [];
  const statementQuoteOptions = isIncomeProtectionDocumentFlow ? buildStatementQuoteOptions(statementQuoteRequests) : [];

  function syncLocalGeneratedDraft(
    documentType: SupportedDocumentType,
    nextDraft: Partial<Omit<GeneratedDocumentDraft, "selectedTemplateId">>,
  ) {
    saveGeneratedDraft(resolvedDraft.clientReference, documentType, nextDraft);
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
            ...nextDraft,
          },
        },
      };
    });
  }

  useEffect(() => {
    if (!isIncomeProtectionDocumentFlow || !draft || activeTabId !== "statement-of-suitability") {
      return;
    }

    if (statementQuoteOptions.length === 0) {
      return;
    }

    if (
      draft.statementSelectedQuoteKey &&
      statementQuoteOptions.some((option) => option.key === draft.statementSelectedQuoteKey)
    ) {
      return;
    }

    setDraft((currentDraft) => {
      if (!currentDraft || currentDraft.statementSelectedQuoteKey === statementQuoteOptions[0].key) {
        return currentDraft;
      }

      return {
        ...currentDraft,
        statementSelectedQuoteKey: statementQuoteOptions[0].key,
      };
    });
  }, [activeTabId, draft, isIncomeProtectionDocumentFlow, statementQuoteOptions]);

  useEffect(() => {
    if (!visibleTabs.some((tab) => tab.id === activeTabId)) {
      setActiveTabId(visibleTabs[0]?.id ?? moduleTabs[0].id);
    }
  }, [activeTabId, visibleTabs]);

  const activeTab = visibleTabs.find((tab) => tab.id === activeTabId) ?? visibleTabs[0] ?? moduleTabs[0];
  const activeSectionId = workflowSectionByTabId[activeTab.id];
  const statementHasSelectedQuote =
    !isIncomeProtectionDocumentFlow ||
    (statementQuoteOptions.length > 0 &&
      statementQuoteOptions.some((option) => option.key === resolvedDraft.statementSelectedQuoteKey));

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
    !hasValue(resolvedDraft.dateOfBirth) ? "Date of birth" : null,
    isIncomeProtectionDocumentFlow
      ? !statementHasSelectedQuote ? "Policy picker" : null
      : !hasValue(resolvedDraft.statementType) ? "Statement type" : null,
    isIncomeProtectionDocumentFlow ? null : !hasValue(resolvedDraft.productType) ? "Product recommended" : null,
    isIncomeProtectionDocumentFlow ? null : !hasValue(resolvedDraft.recommendedCover) ? "Recommended cover" : null,
    isIncomeProtectionDocumentFlow ? null : !hasValue(resolvedDraft.deferredPeriod) ? "Deferred period" : null,
    isIncomeProtectionDocumentFlow ? null : !hasValue(resolvedDraft.coverAge) ? "Cover to age" : null,
    !hasValue(resolvedDraft.gender) ? "Gender" : null,
    !hasValue(resolvedDraft.smokerStatus) ? "Smoker status" : null,
    !hasValue(resolvedDraft.phiOccupationalClass) ? "PHI occupational class" : null,
    !hasValue(resolvedDraft.phiIndexation) ? "PHI indexation" : null,
    !hasValue(resolvedDraft.advisorName) ? "Advisor name" : null,
    !hasValue(resolvedDraft.letterDate) ? "Letter date" : null,
  ].filter(isPresent);

  const factFindGenerationRequirements = [
    { label: "Client name", complete: hasValue(resolvedDraft.fullName), location: "Fact Find" },
    { label: "Address (town/county)", complete: hasValue(`${resolvedDraft.townCity ?? ""} ${resolvedDraft.county ?? ""}`.trim()), location: "Client details" },
    { label: "Date of birth", complete: hasValue(resolvedDraft.dateOfBirth), location: "Fact Find" },
    { label: "Occupation", complete: hasValue(resolvedDraft.occupation), location: "Fact Find" },
    { label: "Income / salary", complete: hasValue(resolvedDraft.income), location: "Fact Find" },
    { label: "Email or phone", complete: hasValue(resolvedDraft.email) || hasValue(resolvedDraft.mobileNumber), location: "Fact Find" },
    { label: "Advisor name", complete: hasValue(resolvedDraft.advisorName), location: "Fact Find" },
  ];

  const statementGenerationRequirements = [
    { label: "Client name", complete: hasValue(resolvedDraft.fullName), location: "Fact Find" },
    { label: "Address (town/county)", complete: hasValue(`${resolvedDraft.townCity ?? ""} ${resolvedDraft.county ?? ""}`.trim()), location: "Client details" },
    { label: "Date of birth", complete: hasValue(resolvedDraft.dateOfBirth), location: "Fact Find" },
    {
      label: isIncomeProtectionDocumentFlow ? "Policy picker" : "Statement type",
      complete: isIncomeProtectionDocumentFlow ? statementHasSelectedQuote : hasValue(resolvedDraft.statementType),
      location: "Statement",
    },
    ...(isIncomeProtectionDocumentFlow
      ? []
      : [
          { label: "Product recommended", complete: hasValue(resolvedDraft.productType), location: "Statement" },
          { label: "Recommended cover", complete: hasValue(resolvedDraft.recommendedCover), location: "Statement or Fact Find" },
          { label: "Deferred period", complete: hasValue(resolvedDraft.deferredPeriod), location: "Statement or Fact Find" },
          { label: "Cover to age", complete: hasValue(resolvedDraft.coverAge), location: "Statement or Fact Find" },
        ]),
    { label: "Gender", complete: hasValue(resolvedDraft.gender), location: "Fact Find" },
    { label: "Smoker status", complete: hasValue(resolvedDraft.smokerStatus), location: "Fact Find" },
    { label: "PHI occupational class", complete: hasValue(resolvedDraft.phiOccupationalClass), location: "Fact Find" },
    { label: "PHI indexation", complete: hasValue(resolvedDraft.phiIndexation), location: "Fact Find" },
    { label: "Advisor name", complete: hasValue(resolvedDraft.advisorName), location: "Statement or Fact Find" },
    { label: "Letter date", complete: hasValue(resolvedDraft.letterDate), location: "Statement" },
  ];

  const quoteYourAge = useMemo(() => {
    if (!resolvedDraft.dateOfBirth) return "";
    const dob = new Date(resolvedDraft.dateOfBirth);
    if (Number.isNaN(dob.getTime())) return "";
    const today = new Date();
    let age = today.getFullYear() - dob.getFullYear();
    const monthDiff = today.getMonth() - dob.getMonth();
    if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < dob.getDate())) {
      age--;
    }
    return String(age);
  }, [resolvedDraft.dateOfBirth]);

  const quoteMissingFields = (isPensionsQuoteWorkflow
    ? [
        !hasValue(resolvedDraft.fullName) ? "Client name" : null,
        !hasValue(resolvedDraft.dateOfBirth) ? "Date of birth" : null,
        !hasValue(quotePensionGender) ? "Gender" : null,
        !hasValue(quotePensionRetirementAge) ? "Retirement age" : null,
        !hasValue(quotePensionRequired) ? "Required pension income" : null,
        !hasValue(quotePensionMonthlyContribution) ? "Monthly contribution" : null,
      ]
    : [
        !hasValue(resolvedDraft.fullName) ? "Client name" : null,
        !hasValue(resolvedDraft.dateOfBirth) ? "Date of birth" : null,
        !hasValue(quoteAnnualCoverAmount) ? "Annual cover amount" : null,
        !hasValue(quoteCoverToAge) ? "Cover to age" : null,
        !hasValue(quoteOccupationClass) ? "Occupation class" : null,
        !hasValue(quoteDeferredPeriod) ? "Deferred period" : null,
        !hasValue(quoteSmoker) ? "Smoker" : null,
      ]).filter(isPresent);

  const quoteGenerationRequirements = isPensionsQuoteWorkflow
    ? [
        { label: "Client name", complete: hasValue(resolvedDraft.fullName), location: "Quote form" },
        { label: "Date of birth", complete: hasValue(resolvedDraft.dateOfBirth), location: "Quote form" },
        { label: "Gender", complete: hasValue(quotePensionGender), location: "Quote form" },
        { label: "Retirement age", complete: hasValue(quotePensionRetirementAge), location: "Quote form" },
        { label: "Spouse's pension", complete: true, location: "Quote form (optional)" },
        { label: "Pension escalation", complete: true, location: "Quote form (optional)" },
        { label: "Net growth", complete: true, location: "Quote form (optional)" },
        { label: "Premium escalation", complete: true, location: "Quote form (optional)" },
        { label: "Inflation", complete: true, location: "Quote form (optional)" },
        { label: "Existing fund", complete: true, location: "Quote form (optional)" },
        { label: "Required pension income", complete: hasValue(quotePensionRequired), location: "Quote form" },
        { label: "Monthly contribution", complete: hasValue(quotePensionMonthlyContribution), location: "Quote form" },
      ]
    : [
        { label: "Client name", complete: hasValue(resolvedDraft.fullName), location: "Quote form" },
        { label: "Date of birth", complete: hasValue(resolvedDraft.dateOfBirth), location: "Quote form" },
        { label: "Annual cover amount", complete: hasValue(quoteAnnualCoverAmount), location: "Quote form" },
        { label: "Cover to age", complete: hasValue(quoteCoverToAge), location: "Quote form" },
        { label: "Occupation class", complete: hasValue(quoteOccupationClass), location: "Quote form" },
        { label: "Deferred period", complete: hasValue(quoteDeferredPeriod), location: "Quote form" },
        { label: "Smoker", complete: hasValue(quoteSmoker), location: "Quote form" },
        { label: "PHI indexation", complete: true, location: "Quote form (optional)" },
        { label: "Zurich 17.5% discount", complete: true, location: "Quote form (optional)" },
      ];

  const quoteWorkflowSnapshot = useMemo(
    () =>
      isPensionsQuoteWorkflow
        ? {
            ...resolvedDraft,
            workflowKind: "pensions",
            quoteDocumentType,
            statementDocumentType,
            pensionAge: quoteYourAge,
            gender: quotePensionGender,
            pensionRetirementAge: quotePensionRetirementAge,
            spousesPension: quotePensionSpousesPension,
            pensionEscalation: quotePensionEscalation,
            pensionNetGrowth: quotePensionNetGrowth,
            pensionPremiumEscalation: quotePensionPremiumEscalation,
            pensionInflation: quotePensionInflation,
            pensionExistingFund: quotePensionExistingFund,
            pensionRequired: quotePensionRequired,
            monthlyContribution: quotePensionMonthlyContribution,
          }
        : {
            ...resolvedDraft,
            recommendedCover: quoteAnnualCoverAmount,
            coverAge: quoteCoverToAge,
            phiOccupationalClass: quoteOccupationClass,
            deferredPeriod: quoteDeferredPeriod,
            smokerStatus: quoteSmoker,
            phiIndexation: quotePhiIndexation,
            zurichDiscountActive: resolvedDraft.zurichDiscountActive,
          },
    [
      isPensionsQuoteWorkflow,
      quoteDocumentType,
      statementDocumentType,
      quotePensionEscalation,
      quotePensionExistingFund,
      quotePensionGender,
      quotePensionInflation,
      quotePensionMonthlyContribution,
      quotePensionNetGrowth,
      quotePensionPremiumEscalation,
      quotePensionRequired,
      quotePensionRetirementAge,
      quotePensionSpousesPension,
      quoteYourAge,
      resolvedDraft,
      quoteAnnualCoverAmount,
      quoteCoverToAge,
      quoteDeferredPeriod,
      quoteOccupationClass,
      quotePhiIndexation,
      quoteSmoker,
    ],
  );

  const quoteRequestKey = useMemo(
    () =>
      JSON.stringify(
        isPensionsQuoteWorkflow
          ? {
              fullName: resolvedDraft.fullName,
              dateOfBirth: resolvedDraft.dateOfBirth,
              gender: quotePensionGender,
              pensionRetirementAge: quotePensionRetirementAge,
              spousesPension: quotePensionSpousesPension,
              pensionEscalation: quotePensionEscalation,
              pensionNetGrowth: quotePensionNetGrowth,
              pensionPremiumEscalation: quotePensionPremiumEscalation,
              pensionInflation: quotePensionInflation,
              pensionExistingFund: quotePensionExistingFund,
              pensionRequired: quotePensionRequired,
              monthlyContribution: quotePensionMonthlyContribution,
            }
          : {
              fullName: resolvedDraft.fullName,
              dateOfBirth: resolvedDraft.dateOfBirth,
              recommendedCover: quoteAnnualCoverAmount,
              coverAge: quoteCoverToAge,
              phiOccupationalClass: quoteOccupationClass,
              deferredPeriod: quoteDeferredPeriod,
              smokerStatus: quoteSmoker,
              phiIndexation: quotePhiIndexation,
              zurichDiscountActive: resolvedDraft.zurichDiscountActive,
            },
      ),
    [
      isPensionsQuoteWorkflow,
      resolvedDraft.dateOfBirth,
      resolvedDraft.zurichDiscountActive,
      resolvedDraft.fullName,
      quoteAnnualCoverAmount,
      quoteCoverToAge,
      quoteDeferredPeriod,
      quoteOccupationClass,
      quotePensionEscalation,
      quotePensionExistingFund,
      quotePensionGender,
      quotePensionInflation,
      quotePensionMonthlyContribution,
      quotePensionNetGrowth,
      quotePensionPremiumEscalation,
      quotePensionRequired,
      quotePensionRetirementAge,
      quotePensionSpousesPension,
      quotePhiIndexation,
      quoteSmoker,
    ],
  );

  const factFindUpdateGenerationRequirements = [
    { label: "Client name", complete: hasValue(resolvedDraft.fullName), location: "Fact Find" },
    { label: "Address (town/county)", complete: hasValue(`${resolvedDraft.townCity ?? ""} ${resolvedDraft.county ?? ""}`.trim()), location: "Client details" },
    { label: "Date of birth", complete: hasValue(resolvedDraft.dateOfBirth), location: "Fact Find" },
    { label: "Occupation", complete: hasValue(resolvedDraft.occupation), location: "Fact Find" },
    { label: "Income / salary", complete: hasValue(resolvedDraft.income), location: "Fact Find" },
    { label: "Advisor name", complete: hasValue(resolvedDraft.advisorName), location: "Fact Find" },
    { label: "Gender", complete: hasValue(resolvedDraft.gender), location: "Fact Find" },
    { label: "Smoker status", complete: hasValue(resolvedDraft.smokerStatus), location: "Fact Find" },
    { label: "PHI occupational class", complete: hasValue(resolvedDraft.phiOccupationalClass), location: "Fact Find" },
  ];

  function getDocumentDraft(documentType: SupportedDocumentType) {
    return resolvedDraft.documentDrafts[documentType];
  }

  function getWorkspaceDocumentDraft(documentType: SupportedDocumentType) {
    return resolveWorkspaceDocumentDraft(documentType === quoteDocumentType ? quoteWorkflowSnapshot : resolvedDraft, documentType);
  }

  useEffect(() => {
    if (quoteMissingFields.length > 0) {
      return;
    }

    if (!lastSubmittedQuoteRequestKey || lastSubmittedQuoteRequestKey === quoteRequestKey) {
      return;
    }

    if (getDocumentDraft(quoteDocumentType).generationStatus === "generating") {
      return;
    }

    const timeoutId = window.setTimeout(() => {
      void quoteGenerateRef.current?.();
    }, 500);

    return () => window.clearTimeout(timeoutId);
  }, [lastSubmittedQuoteRequestKey, quoteDocumentType, quoteMissingFields.length, quoteRequestKey, resolvedDraft]);

  async function persistDraft(nextDraft: SeededClientProfile, options?: { showToast?: boolean }) {
    const normalizedDraft = {
      ...nextDraft,
      fullName: buildFullName(nextDraft.firstName, nextDraft.surname),
      updatedBy: actorLabel,
    };
    setDraft(normalizedDraft);
    saveClient(normalizedDraft);

    if (!canUseBackend) {
      if (options?.showToast) {
        addToast("Changes saved", "success");
      }
      return { draft: normalizedDraft, savedRemotely: true };
    }

    try {
      await saveWorkflow(normalizedDraft.clientReference, buildWorkflowPersistencePayload(normalizedDraft));
      if (options?.showToast) {
        addToast("Changes saved", "success");
      }
      return { draft: normalizedDraft, savedRemotely: true };
    } catch {
      if (options?.showToast) {
        addToast("Save failed - server unavailable", "error");
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

  function renderTextInput(id: string, label: ReactNode, field: SeededClientStringKey, type = "text") {
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

  function renderCurrencyInput(id: string, label: ReactNode, field: SeededClientStringKey) {
    return (
      <Input
        id={id}
        label={label}
        onBlur={(event) => updateField(field, formatCurrency(event.target.value))}
        onChange={(event) => updateField(field, event.target.value)}
        prefix="EUR"
        inputMode="decimal"
        step="0.01"
        type="text"
        value={resolvedDraft[field]}
      />
    );
  }

  function renderTextarea(id: string, label: ReactNode, field: SeededClientStringKey, rows = 4, className?: string) {
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
    if (!canUseBackend) {
      void persistDraft(resolvedDraft, { showToast: true });
      setFactFindDraftSavedLabel("Saved just now");
      return;
    }
    const { savedRemotely } = await persistDraft(resolvedDraft, { showToast: true });
    setFactFindDraftSavedLabel(savedRemotely ? "Saved just now" : "Saved locally - server unavailable");
  }

  async function saveFactFindUpdateDraft() {
    if (!canUseBackend) {
      void persistDraft(resolvedDraft, { showToast: true });
      setFactFindUpdateSavedLabel("Saved just now");
      return;
    }
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
            inputMode="decimal"
            step="0.01"
            type="text"
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
    const config = PENSION_SECTION_CONFIGS[section];

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
    syncLocalGeneratedDraft(documentType, { editedHtml: nextHtml });
  }

  function buildGeneratedEditorHtml(
    documentType: SupportedDocumentType,
    generatedDocument: {
      generatedHtml: string;
      sections: Array<{ id: string; title: string; bodyHtml: string }>;
      integrationRequests?: GeneratedDocumentDraft["integrationRequests"];
    },
  ) {
    const sourceProfile = documentType === quoteDocumentType ? quoteWorkflowSnapshot : resolvedDraft;
    const nextProfile = {
      ...sourceProfile,
      documentDrafts: {
        ...sourceProfile.documentDrafts,
        [documentType]: {
          ...sourceProfile.documentDrafts[documentType],
          lastGeneratedHtml: generatedDocument.generatedHtml,
          lastGeneratedSections: generatedDocument.sections,
          integrationRequests: generatedDocument.integrationRequests ?? sourceProfile.documentDrafts[documentType].integrationRequests,
          editedHtml: "",
        },
      },
    };

    return buildWorkflowEditorDocument(nextProfile, documentType).html;
  }

  async function handleGeneratedOutputExport(documentType: SupportedDocumentType, extension: "docx" | "pdf") {
    const sourceProfile = documentType === quoteDocumentType ? quoteWorkflowSnapshot : resolvedDraft;
    const previewArtifact = buildExportDocumentArtifact(sourceProfile, documentType);
    if (!previewArtifact.html) {
      return;
    }

    const versionNumber = reserveGeneratedDocumentVersion(documentType);
    const nextDocument = buildGeneratedDocumentRecord(documentType, extension, previewArtifact, versionNumber);
    try {
      const artifactBlob = await exportGeneratedDocument(
        sourceProfile,
        documentType,
        extension,
        nextDocument.documentName,
        previewArtifact,
      );

      if (!canUseBackend) {
        upsertGeneratedDocument(resolvedDraft.clientReference, nextDocument);
        upsertFile(resolvedDraft.clientReference, buildGeneratedFileRecord(nextDocument));
        addToast(`${documentType} exported`, "success");
        return;
      }

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
        integrationRequests: generatedDocument.integrationRequests ?? getDocumentDraft("Fact Find").integrationRequests,
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
    if (!canUseBackend) {
      void persistDraft(resolvedDraft, { showToast: true });
      setStatementSaveStatus("Saved just now");
      return;
    }
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
        integrationRequests: generatedDocument.integrationRequests ?? getDocumentDraft("Fact Find Update").integrationRequests,
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
    saveGeneratedDraft(resolvedDraft.clientReference, statementDocumentType, { generationStatus: "generating" });
    try {
      const generatedDocument = await generateDocument({
        clientReference: resolvedDraft.clientReference,
        documentType: statementDocumentType,
        templateId: getDocumentDraft(statementDocumentType).selectedTemplateId,
        workflowSnapshot: resolvedDraft as unknown as Record<string, unknown>,
      });
      const integrationRequests = resolveStatementIntegrationRequests(
        getDocumentDraft(quoteDocumentType).integrationRequests,
        generatedDocument.integrationRequests,
      );
      saveGeneratedDraft(resolvedDraft.clientReference, statementDocumentType, {
        generationStatus: "completed",
        lastGeneratedHtml: generatedDocument.generatedHtml,
        lastGeneratedSections: generatedDocument.sections,
        integrationRequests,
        editedHtml: buildGeneratedEditorHtml(statementDocumentType, {
          ...generatedDocument,
          integrationRequests,
        }),
      });
      setStatementDocumentStatus("Document: Draft generated");
      addToast(`${statementDocumentType} draft generated`, "success");
    } catch {
      saveGeneratedDraft(resolvedDraft.clientReference, statementDocumentType, { generationStatus: "failed" });
      setStatementDocumentStatus("Document: Draft generation failed");
      addToast(`Failed to generate ${statementDocumentType} draft`, "error");
    }
  }

  async function handleQuoteGenerate() {
    if (quoteMissingFields.length > 0) {
      setShowQuoteValidation(true);
      setQuoteDocumentStatus("Document: Blocked by missing required fields");
      return;
    }

    setShowQuoteValidation(false);
    setLastSubmittedQuoteRequestKey(quoteRequestKey);
    setQuoteDocumentStatus("Document: Generating");
    syncLocalGeneratedDraft(quoteDocumentType, { generationStatus: "generating" });

    try {
      const integrationRequests = await fetchStatementQuoteRequests({
        clientReference: resolvedDraft.clientReference,
        workflowSnapshot: quoteWorkflowSnapshot as unknown as Record<string, unknown>,
      });
      const generatedDocument = {
        generatedHtml: "",
        sections: [],
        integrationRequests,
      };

      syncLocalGeneratedDraft(quoteDocumentType, {
        generationStatus: "completed",
        lastGeneratedHtml: generatedDocument.generatedHtml,
        lastGeneratedSections: generatedDocument.sections,
        integrationRequests,
        editedHtml: buildGeneratedEditorHtml(quoteDocumentType, generatedDocument),
      });
      setQuoteDocumentStatus("Document: Draft generated");
      addToast(`${quoteDocumentType} draft generated`, "success");
    } catch {
      syncLocalGeneratedDraft(quoteDocumentType, { generationStatus: "failed" });
      setQuoteDocumentStatus("Document: Draft generation failed");
      addToast(`Failed to generate ${quoteDocumentType} draft`, "error");
    }
  }

  quoteGenerateRef.current = handleQuoteGenerate;

  useEffect(() => {
    if (!canUseBackend || !selectedClientReference) return;
    let cancelled = false;
    listFiles(selectedClientReference)
      .then((files) => {
        if (!cancelled) setBackendFiles(files);
      })
      .catch(() => {});
    return () => {
      cancelled = true;
    };
  }, [canUseBackend, selectedClientReference]);

  useEffect(() => {
    if (!canUseBackend || !selectedClientReference) return;
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
  }, [canUseBackend, selectedClientReference]);

  function handleFileSelect() {
    if (!canUseBackend) {
      setUploadProgress(100);
      setFileUploadStatus("Upload: File saved");
      addToast("File uploaded successfully", "success");
      return;
    }

    fileInputRef.current?.click();
  }

  async function handleRealFileUpload(event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    if (!file) return;

    setFileUploadStatus("Upload: Uploading...");
    setUploadProgress(50);

    try {
      if (!canUseBackend) {
        const uploadedAt = new Date().toISOString().slice(0, 10);
        upsertFile(selectedClientReference, {
          id: `FILE-upload-${Date.now()}`,
          category: "Client Upload",
          originalFilename: file.name,
          status: "Uploaded",
          uploadedBy: actorLabel,
          uploadedAt,
        });
        setUploadProgress(100);
        setFileUploadStatus("Upload: File saved");
        addToast("File uploaded successfully", "success");
        return;
      }

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

  async function handleBackendFileDelete(fileId: string, filename: string) {
    try {
      await deleteFile(selectedClientReference, fileId);
      setBackendFiles((current) => current.filter((f) => f.id !== fileId));
      addToast(`${filename} deleted`, "success");
    } catch {
      addToast(`Failed to delete ${filename}`, "error");
    }
  }

  async function handleBackendDocumentDelete(docId: string, docName: string) {
    try {
      await deleteDocument(selectedClientReference, docId);
      setBackendGeneratedDocuments((current) => current.filter((d) => d.id !== docId));
      addToast(`${docName} deleted`, "success");
    } catch {
      addToast(`Failed to delete ${docName}`, "error");
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
    } else if (type === quoteDocumentType) {
      void handleQuoteGenerate();
    } else if (type === statementDocumentType) {
      void handleStatementGenerate();
    }
  }

  async function handleDownloadPack() {
    setDocumentPackStatus("Pack: Preparing pack...");
    try {
      if (!canUseBackend) {
        setDocumentPackStatus("Pack: Downloaded");
        addToast("Document pack downloaded", "success");
        return;
      }
      await downloadDocumentPack(selectedClientReference);
      setDocumentPackStatus("Pack: Downloaded");
      addToast("Document pack downloaded", "success");
    } catch (error) {
      setDocumentPackStatus("Pack: Failed");
      addToast(
        error instanceof Error ? error.message : "Document pack download failed",
        "error",
      );
    }
  }

  const localFiles = resolvedDraft.files.map((file) => ({
    id: file.id,
    client_id: resolvedDraft.clientReference,
    original_filename: file.originalFilename,
    stored_filename: file.originalFilename,
    file_type: null,
    category: file.category,
    uploaded_by: file.uploadedBy,
    uploaded_at: file.uploadedAt,
    status: file.status,
    notes: null,
  }));
  const displayFiles = canUseBackend ? backendFiles : localFiles;
  const filteredDisplayFiles = displayFiles.filter((file) =>
    toLower(file.original_filename).includes(fileFilter.toLowerCase()),
  );
  const displayDocuments = canUseBackend
    ? backendGeneratedDocuments
    : resolvedDraft.generatedDocuments.map((document) => ({
        id: document.id,
        client_id: resolvedDraft.clientReference,
        document_type: document.documentType,
        document_name: document.documentName,
        docx_file_path: null,
        pdf_file_path: null,
        generated_by: actorLabel,
        generated_at: document.generatedAt,
        version: document.version,
        status: document.status,
        preview_title: document.previewTitle ?? null,
        preview_html: document.previewHtml ?? null,
      }));

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
    const generatedComplete = displayDocuments.length > 0;

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

  function renderGenerationRequirements(
    title: string,
    requirements: Array<{ label: string; complete: boolean; location: string }>,
    missingFields: string[],
    options?: { explainSharedFields?: boolean; emphasiseMissing?: boolean },
  ) {
    const incompleteCount = requirements.filter((item) => !item.complete).length;

    return (
      <div className={`validation-banner generation-requirements${options?.emphasiseMissing ? " generation-requirements-active" : ""}`}>
        <AlertTriangle size={18} />
        <div className="generation-requirements-copy">
          <strong>{title}</strong>
          <div className="generation-requirements-meta">
            <span>* Required for generation</span>
            <span>{incompleteCount === 0 ? "All required fields are complete." : `Still missing: ${missingFields.join(", ")}`}</span>
          </div>
          {options?.explainSharedFields ? (
            <span className="text-small">
              Some shared required fields live outside this section. Complete them in Fact Find or client details before generating.
            </span>
          ) : null}
          <div className="generation-requirements-list">
            {requirements.map((item) => (
              <Badge key={item.label} variant={item.complete ? "ready" : "pending"}>
                {item.label} - {item.complete ? "ready" : `fill in ${item.location}`}
              </Badge>
            ))}
          </div>
        </div>
      </div>
    );
  }

  function renderPartnerDetailsToggle() {
    return (
      <div className="form-grid-full">
        <div className="form-section">
          <p className="text-small text-muted" style={{ marginBottom: "var(--space-2)" }}>
            Most policies are for one person. Turn this on only if you need to capture partner details.
          </p>
          <Toggle
            checked={showPartnerFields}
            id="ff-showPartnerDetails"
            label="Add partner details"
            onChange={(event) => setShowPartnerFields(event.target.checked)}
          />
        </div>
      </div>
    );
  }

  function renderIncomeProtectionProviderDetailsToggle() {
    return (
      <div
        className="form-grid-full"
        style={{ marginBlock: "var(--space-4)" }}
      >
        <div className="form-section">
          <p className="text-small text-muted" style={{ marginBottom: "var(--space-2)" }}>
            Turn this on only if you need to capture the no deferred provider details.
          </p>
          <Toggle
            checked={showNoDeferredFields}
            id="ff-showNoDeferredDetails"
            label="Add no deferred provider details"
            onChange={(event) => setShowNoDeferredFields(event.target.checked)}
          />
        </div>
      </div>
    );
  }

  function renderTabPanel(tabId: (typeof moduleTabs)[number]["id"] = activeTab.id) {
    if (tabId === "fact-find") {
      const factFindDraft = getDocumentDraft("Fact Find");

      return (
        <div className="page-stack">
          <div className="page-heading page-heading-compact">
            <div className="fact-find-type-selector">
                <Select
                id="ff-type"
                label="Fact Find type"
                onChange={(event) => {
                  const value = event.target.value;
                  updateField("factFindType" as keyof SeededClientProfile, value);
                }}
                options={[
                  { value: "all", label: "Fact Find All" },
                  { value: "small", label: "Fact Find Small" },
                ]}
                value={factFindType}
              />
            </div>
          </div>

          <Accordion flush className="workflow-form-accordion">
            <AccordionItem
              indicator={tabProgress["fact-find"]}
              isOpen={factFindWorkspaceAccordion.isOpen("fact-find-form")}
              onToggle={() => factFindWorkspaceAccordion.toggle("fact-find-form")}
              title="Fact Find Form"
            >
              <Accordion flush className="workflow-section-accordion">
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
                  <div className="form-grid form-grid-desktop-3">
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
                  <div className="form-grid form-grid-desktop-3">
                    {renderTextInput("ff-fullName", requiredLabel("Name"), "fullName")}
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
                    {renderTextInput("ff-dob", requiredLabel("Date of Birth"), "dateOfBirth", "date")}
                    <Select
                      id="ff-gender"
                      label={requiredLabel("Gender")}
                      onChange={(event) => updateField("gender", event.target.value)}
                      options={genderOptions}
                      value={resolvedDraft.gender}
                    />
                    {renderTextInput("ff-email", "Email", "email", "email")}
                    {renderTextInput("ff-phone", requiredLabel("Home / Mobile"), "mobileNumber", "tel")}
                    {renderTextInput("ff-workPhone", "Work Phone", "workPhone", "tel")}
                    {renderTextInput("ff-dependantsSummary", "Dependants", "dependantsSummary")}
                    {renderPartnerDetailsToggle()}
                    {showPartnerFields ? (
                      <>
                        {renderTextInput("ff-partnerName", "Partner Name", "partnerName")}
                        {renderTextInput("ff-partnerDob", "Partner Date of Birth", "partnerDateOfBirth", "date")}
                        {renderTextInput("ff-partnerAddress1", "Partner address line 1", "partnerAddressLine1")}
                        {renderTextInput("ff-partnerAddress2", "Partner address line 2", "partnerAddressLine2")}
                        {renderTextInput("ff-partnerAddress3", "Partner address line 3", "partnerAddressLine3")}
                        {renderTextInput("ff-partnerAddress4", "Partner address line 4", "partnerAddressLine4")}
                        {renderTextInput("ff-partnerHomeMobile", "Partner Home / Mobile", "partnerHomeMobile", "tel")}
                        {renderTextInput("ff-partnerWorkPhone", "Partner Work Phone", "partnerWorkPhone", "tel")}
                        {renderTextInput("ff-partnerEmail", "Partner Email", "partnerEmail", "email")}
                      </>
                    ) : null}
                  </div>
                </AccordionItem>

            <AccordionItem
              indicator={getSectionProgress([resolvedDraft.occupation, resolvedDraft.employmentStatus, resolvedDraft.income])}
              isOpen={factFindAccordion.isOpen("employment-details")}
              onToggle={() => factFindAccordion.toggle("employment-details")}
              title="Employment Details"
            >
              <div className="form-grid form-grid-desktop-3">
                {renderTextInput("ff-occupation", requiredLabel("Occupation"), "occupation")}
                <Select
                  id="ff-employmentStatus"
                  label="Employment status"
                  onChange={(event) => updateField("employmentStatus", event.target.value)}
                  options={employmentStatusOptions}
                  value={resolvedDraft.employmentStatus}
                />
                <Input
                  id="ff-income"
                  label={requiredLabel("Income / salary")}
                  onBlur={(event) => updateField("income", formatCurrency(event.target.value))}
                  onChange={(event) => updateField("income", event.target.value)}
                  prefix="€"
                  inputMode="decimal"
                  step="0.01"
                  type="text"
                  value={resolvedDraft.income}
                />
                {renderToggleField("ff-employed", "Employed", "employed")}
                {renderToggleField("ff-selfEmployed", "Self Employed", "selfEmployed")}
              </div>
            </AccordionItem>

            <AccordionItem
              indicator={getSectionProgress([
                resolvedDraft.recommendedCover,
                resolvedDraft.deferredPeriod,
                resolvedDraft.coverAge,
                resolvedDraft.smokerStatus,
                resolvedDraft.phiOccupationalClass,
              ])}
              isOpen={factFindAccordion.isOpen("income-protection")}
              onToggle={() => factFindAccordion.toggle("income-protection")}
              title="Income Protection"
            >
              <div className="form-grid form-grid-desktop-3">
                <Input
                  id="ff-provider"
                  label="Provider"
                  onChange={(event) => updateField("provider", event.target.value)}
                  type="text"
                  value={resolvedDraft.provider}
                />
                <Input
                  id="ff-recommendedCover"
                  label="Annual Cover Amount (€)"
                  onChange={(event) => updateField("recommendedCover", event.target.value)}
                  type="text"
                  value={resolvedDraft.recommendedCover}
                />
                <Input
                  id="ff-premium"
                  label="Monthly premium"
                  onBlur={(event) => updateField("premium", formatCurrency(event.target.value))}
                  onChange={(event) => updateField("premium", event.target.value)}
                  prefix="€"
                  inputMode="decimal"
                  step="0.01"
                  type="text"
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
              {renderIncomeProtectionProviderDetailsToggle()}
              <div className="form-section">
                <p className="text-small text-muted" style={{ marginBottom: "var(--space-2)" }}>
                  Income Protection with No Deferred Period
                </p>
                <div className="provider-detail-grid">
                  {showNoDeferredFields ? (
                    <>
                      <div className="provider-detail-column">
                        <p className="provider-detail-column-title">Policy details</p>
                        {renderTextInput("ff-noDeferredProvider", "No deferred provider", "incomeProtectionNoDeferredProvider")}
                        {renderCurrencyInput("ff-noDeferredMonthlyPremium", "No deferred monthly premium", "incomeProtectionNoDeferredMonthlyPremium")}
                      </div>
                      <div className="provider-detail-column">
                        <p className="provider-detail-column-title">Cover details</p>
                        {renderCurrencyInput("ff-noDeferredWeeklyCover", "No deferred current weekly cover", "incomeProtectionNoDeferredCurrentWeeklyCover")}
                        {renderToggleField("ff-noDeferredAge60", "Cover to Age 60", "incomeProtectionNoDeferredCoverToAge60")}
                        {renderToggleField("ff-noDeferredAge65", "Cover to Age 65", "incomeProtectionNoDeferredCoverToAge65")}
                      </div>
                      <div className="provider-detail-column">
                        <p className="provider-detail-column-title">Provider options</p>
                        {renderToggleField("ff-noDeferredDentistProvident", "Dentist Provident", "incomeProtectionNoDeferredDentistProvident")}
                        {renderToggleField("ff-noDeferredDentistGeneral", "Dentist & General", "incomeProtectionNoDeferredDentistGeneral")}
                        {renderToggleField("ff-noDeferredOther", "Other", "incomeProtectionNoDeferredOther")}
                      </div>
                    </>
                  ) : null}
                </div>
              </div>
              <div className="form-section">
                <p className="text-small text-muted" style={{ marginBottom: "var(--space-2)" }}>
                  Income Protection with Deferred Period
                </p>
                <div className="provider-detail-grid">
                  {showNoDeferredFields ? (
                    <>
                      <div className="provider-detail-column">
                        <p className="provider-detail-column-title">Policy details</p>
                        {renderTextInput("ff-deferredProviderDetailed", "Deferred period provider", "incomeProtectionDeferredProvider")}
                        {renderCurrencyInput("ff-deferredMonthlyPremium", "Deferred monthly premium", "incomeProtectionDeferredMonthlyPremium")}
                      </div>
                      <div className="provider-detail-column">
                        <p className="provider-detail-column-title">Deferred options</p>
                        {renderCurrencyInput("ff-deferredWeeklyCover", "Deferred current weekly cover", "incomeProtectionDeferredCurrentWeeklyCover")}
                        {renderToggleField("ff-deferred13Weeks", "13 Weeks", "incomeProtectionDeferred13Weeks")}
                        {renderToggleField("ff-deferred26Weeks", "26 Weeks", "incomeProtectionDeferred26Weeks")}
                        {renderToggleField("ff-deferred52Weeks", "52 Weeks", "incomeProtectionDeferred52Weeks")}
                        {renderToggleField("ff-deferredAge60", "Deferred Cover to Age 60", "incomeProtectionDeferredCoverToAge60")}
                        {renderToggleField("ff-deferredAge65", "Deferred Cover to Age 65", "incomeProtectionDeferredCoverToAge65")}
                      </div>
                      <div className="provider-detail-column">
                        <p className="provider-detail-column-title">Provider options</p>
                        {renderToggleField("ff-deferredFriendsFirst", "Friends First", "incomeProtectionDeferredFriendsFirst")}
                        {renderToggleField("ff-deferredIrishLife", "Irish Life", "incomeProtectionDeferredIrishLife")}
                        {renderToggleField("ff-deferredOther", "Other", "incomeProtectionDeferredOther")}
                      </div>
                    </>
                  ) : null}
                </div>
              </div>
            </AccordionItem>

                {factFindType !== "small" && (
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
                )}

                {factFindType !== "small" && (
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
                )}

                {factFindType !== "small" && showPartnerFields && (
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
                )}

                {factFindType !== "small" && (
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
                )}

                {factFindType !== "small" && (
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
                )}

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
                resolvedDraft.pepDeclarationConfirmed,
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
                ...(showPartnerFields ? [resolvedDraft.clientSignature2, resolvedDraft.clientSignature2Date] : []),
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
                  {showPartnerFields ? (
                    <>
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
                    </>
                  ) : null}
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
              {renderGenerationRequirements("Fact Find generation requirements", factFindGenerationRequirements, factFindMissingFields, {
                explainSharedFields: true,
                emphasiseMissing: showFactFindValidation,
              })}
              <div className="form-action-row">
                <span className="form-action-row-status">{factFindDraftSavedLabel}</span>
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

    if (tabId === "fact-find-update") {
      const factFindUpdateDraft = getDocumentDraft("Fact Find Update");

      return (
        <div className="page-stack">

          <Accordion flush className="workflow-form-accordion">
            <AccordionItem
              indicator={tabProgress["fact-find-update"]}
              isOpen={factFindUpdateWorkspaceAccordion.isOpen("fact-find-update-form")}
              onToggle={() => factFindUpdateWorkspaceAccordion.toggle("fact-find-update-form")}
              title="Fact Find Update Form"
            >
              <Accordion flush className="workflow-section-accordion">
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
                  <div className="form-grid form-grid-desktop-3">
                    {renderTextarea(
                      "ffu-personalCircumstances",
                      "Personal Circumstances",
                      "factFindUpdatePersonalCircumstances",
                      8,
                    )}
                    {renderTextarea(
                      "ffu-financialSituation",
                      "Financial Situation",
                      "factFindUpdateFinancialSituation",
                      8,
                    )}
                    {renderTextarea(
                      "ffu-needsAndObjectives",
                      "Needs & Objectives",
                      "factFindUpdateNeedsAndObjectives",
                      8,
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
              {renderGenerationRequirements(
                "Fact Find Update generation requirements",
                factFindUpdateGenerationRequirements,
                factFindUpdateGenerationRequirements.filter((item) => !item.complete).map((item) => item.label),
                { explainSharedFields: true },
              )}
              <div className="form-action-row">
                <span className="form-action-row-status">{factFindUpdateSavedLabel}</span>
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

    if (tabId === "statement-of-suitability") {
      const statementDraft = getWorkspaceDocumentDraft(statementDocumentType);
      const selectedPolicyPickerValue = statementQuoteOptions.some(
        (option) => option.key === resolvedDraft.statementSelectedQuoteKey,
      )
        ? resolvedDraft.statementSelectedQuoteKey
        : (statementQuoteOptions[0]?.key ?? "");

      return (
        <div className="page-stack">

          <Accordion flush className="workflow-form-accordion">
            <AccordionItem
              indicator={tabProgress["statement-of-suitability"]}
              isOpen={statementWorkspaceAccordion.isOpen("statement-form")}
              onToggle={() => statementWorkspaceAccordion.toggle("statement-form")}
              title="Statement Form"
            >
              {isIncomeProtectionDocumentFlow ? (
                <section className="form-section">
                  <h3 className="form-section-title">Statement basics</h3>
                  <div className="form-grid form-grid-desktop-3">
                    <Input
                      id="sos-letterDate"
                      label={requiredLabel("Statement date")}
                      onChange={(event) => updateField("letterDate", event.target.value)}
                      type="date"
                      value={resolvedDraft.letterDate}
                    />
                    <Select
                      id="sos-statementSelectedQuoteKey"
                      label={requiredLabel("Policy picker")}
                      onChange={(event) => updateField("statementSelectedQuoteKey", event.target.value)}
                      options={
                        statementQuoteOptions.length > 0
                          ? statementQuoteOptions.map((option) => ({ label: option.label, value: option.key }))
                          : [{ label: "Generate a quote first", value: "" }]
                      }
                      value={selectedPolicyPickerValue}
                    />
                  </div>
                </section>
              ) : (
                <>
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
                        label={requiredLabel("Annual Cover Amount (€)")}
                        onBlur={(event) => updateField("recommendedCover", formatCurrency(event.target.value))}
                        onChange={(event) => updateField("recommendedCover", event.target.value)}
                        prefix="EUR"
                        inputMode="decimal"
                        step="0.01"
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
                      {false ? <Input
                        id="sos-premium"
                        label={requiredLabel("Gross monthly premium")}
                        onBlur={(event) => updateField("premium", formatCurrency(event.target.value))}
                        onChange={(event) => updateField("premium", event.target.value)}
                        prefix="€"
                        inputMode="decimal"
                        step="0.01"
                        type="text"
                        value={resolvedDraft.premium}
                      /> : null}
                      <Input
                        hint="Gross premium minus tax relief at your marginal rate"
                        id="sos-netMonthlyCost"
                        label={requiredLabel("Net monthly cost")}
                        onBlur={(event) => updateField("netMonthlyCost", formatCurrency(event.target.value))}
                        onChange={(event) => updateField("netMonthlyCost", event.target.value)}
                        prefix="€"
                        inputMode="decimal"
                        step="0.01"
                        type="text"
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
                </>
              )}
              {renderGenerationRequirements(`${statementDocumentType} generation requirements`, statementGenerationRequirements, statementMissingFields, {
                explainSharedFields: true,
                emphasiseMissing: showStatementValidation,
              })}
              <div className="form-action-row">
                <span className="form-action-row-status">{statementSaveStatus}</span>
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
                onContentChange={(html) => updateGeneratedOutput(statementDocumentType, html)}
                onExportDocx={() => void handleGeneratedOutputExport(statementDocumentType, "docx")}
                onExportPdf={() => void handleGeneratedOutputExport(statementDocumentType, "pdf")}
                onGenerate={() => void handleStatementGenerate()}
                statusLabel={statementDocumentStatus.replace("Document: ", "")}
                templatePicker={
                  <TemplatePicker
                    documentType={statementDocumentType}
                    onChange={(templateId) =>
                      updateSelectedTemplate(resolvedDraft.clientReference, statementDocumentType, templateId)
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

    if (tabId === "quote") {
      const quoteDraft = getWorkspaceDocumentDraft(quoteDocumentType);

      return (
        <div className="page-stack">

          <Accordion flush className="workflow-form-accordion">
            <AccordionItem
              indicator={getSectionProgress(
                isPensionsQuoteWorkflow
                  ? [quotePensionGender, quotePensionRetirementAge, quotePensionRequired, quotePensionMonthlyContribution]
                  : [quoteAnnualCoverAmount, quoteCoverToAge, quoteOccupationClass, quoteDeferredPeriod, quoteSmoker],
              )}
              isOpen={quoteWorkspaceAccordion.isOpen("quote-output")}
              onToggle={() => quoteWorkspaceAccordion.toggle("quote-output")}
              title="Quote Form"
            >
              <div className="form-grid form-grid-desktop-3">
                <Input
                  id="quote-name"
                  label="Name"
                  type="text"
                  value={resolvedDraft.fullName}
                  disabled
                />
                <Input
                  id="quote-dob"
                  label="Date of Birth"
                  type="date"
                  value={resolvedDraft.dateOfBirth}
                  disabled
                />
                <Input
                  id="quote-age"
                  label="Your Age"
                  type="text"
                  value={quoteYourAge}
                  disabled
                />
                {isPensionsQuoteWorkflow ? (
                  <>
                    <Select
                      id="quote-pensionGender"
                      label={requiredLabel("Gender")}
                      onChange={(event) => setQuotePensionGender(event.target.value)}
                      options={genderOptions}
                      value={quotePensionGender}
                    />
                    <Input
                      id="quote-pensionRetirementAge"
                      label={requiredLabel("Retirement Age")}
                      onChange={(event) => setQuotePensionRetirementAge(event.target.value)}
                      type="text"
                      value={quotePensionRetirementAge}
                    />
                    <Select
                      id="quote-pensionSpousesPension"
                      label="Spouse's Pension"
                      onChange={(event) => setQuotePensionSpousesPension(event.target.value)}
                      options={[
                        { label: "No", value: "No" },
                        { label: "Yes", value: "Yes" },
                      ]}
                      value={quotePensionSpousesPension}
                    />
                    <Input
                      id="quote-pensionEscalation"
                      label="Pension Escalation"
                      onChange={(event) => setQuotePensionEscalation(event.target.value)}
                      type="text"
                      value={quotePensionEscalation}
                    />
                    <Input
                      id="quote-pensionNetGrowth"
                      label="Net Growth"
                      onChange={(event) => setQuotePensionNetGrowth(event.target.value)}
                      type="text"
                      value={quotePensionNetGrowth}
                    />
                    <Input
                      id="quote-pensionPremiumEscalation"
                      label="Premium Escalation"
                      onChange={(event) => setQuotePensionPremiumEscalation(event.target.value)}
                      type="text"
                      value={quotePensionPremiumEscalation}
                    />
                    <Input
                      id="quote-pensionInflation"
                      label="Inflation"
                      onChange={(event) => setQuotePensionInflation(event.target.value)}
                      type="text"
                      value={quotePensionInflation}
                    />
                    <Input
                      id="quote-pensionExistingFund"
                      label="Existing Fund"
                      onChange={(event) => setQuotePensionExistingFund(event.target.value)}
                      type="text"
                      value={quotePensionExistingFund}
                    />
                    <Input
                      id="quote-pensionRequired"
                      label={requiredLabel("Required Pension Income")}
                      onChange={(event) => setQuotePensionRequired(event.target.value)}
                      type="text"
                      value={quotePensionRequired}
                    />
                    <Input
                      id="quote-pensionMonthlyContribution"
                      label={requiredLabel("Monthly Contribution")}
                      onChange={(event) => setQuotePensionMonthlyContribution(event.target.value)}
                      type="text"
                      value={quotePensionMonthlyContribution}
                    />
                  </>
                ) : (
                  <>
                    <Input
                      id="quote-annualCoverAmount"
                      label={requiredLabel("Annual Cover Amount")}
                      onChange={(event) => setQuoteAnnualCoverAmount(event.target.value)}
                      type="text"
                      value={quoteAnnualCoverAmount}
                    />
                    <Select
                      id="quote-coverToAge"
                      label={requiredLabel("Cover to Age")}
                      onChange={(event) => setQuoteCoverToAge(event.target.value)}
                      options={coverAgeOptions}
                      value={quoteCoverToAge}
                    />
                    <Select
                      id="quote-occupationClass"
                      label={requiredLabel("Occupation Class")}
                      onChange={(event) => setQuoteOccupationClass(event.target.value)}
                      options={phiOccupationalClassOptions}
                      value={quoteOccupationClass}
                    />
                    <Select
                      id="quote-deferredPeriod"
                      label={requiredLabel("Deferred Period")}
                      onChange={(event) => setQuoteDeferredPeriod(event.target.value)}
                      options={deferredPeriodOptions}
                      value={quoteDeferredPeriod}
                    />
                    <Select
                      id="quote-smoker"
                      label={requiredLabel("Smoker")}
                      onChange={(event) => setQuoteSmoker(event.target.value)}
                      options={smokerStatusOptions}
                      value={quoteSmoker}
                    />
                    <Select
                      id="quote-phiIndexation"
                      label="PHI Indexation"
                      onChange={(event) => setQuotePhiIndexation(event.target.value)}
                      options={phiIndexationOptions}
                      value={quotePhiIndexation}
                    />
                    <Toggle
                      checked={isAffirmative(resolvedDraft.zurichDiscountActive)}
                      id="quote-zurichDiscount"
                      label="Apply Zurich 17.5% discount"
                      onChange={(event) => updateField("zurichDiscountActive", event.target.checked ? "Yes" : "")}
                    />
                  </>
                )}
              </div>
              <div style={{ marginTop: "var(--space-4)" }}>
                {renderGenerationRequirements("Quote generation requirements", quoteGenerationRequirements, quoteMissingFields, {
                  explainSharedFields: false,
                  emphasiseMissing: showQuoteValidation,
                })}
              </div>
            </AccordionItem>
            <AccordionItem
              indicator={getGeneratedDraftStatusLabel(quoteDraft.generationStatus)}
              isOpen={quoteWorkspaceAccordion.isOpen("generated-output")}
              onToggle={() => quoteWorkspaceAccordion.toggle("generated-output")}
              title="Generated Output"
            >
              <GeneratedOutputWorkspace
                draft={quoteDraft}
                emptyMessage="Generate the quote comparison to open the quote workspace."
                generateDisabled={quoteMissingFields.length > 0}
                onContentChange={(html) => updateGeneratedOutput(quoteDocumentType, html)}
                onExportDocx={() => void handleGeneratedOutputExport(quoteDocumentType, "docx")}
                onExportPdf={() => void handleGeneratedOutputExport(quoteDocumentType, "pdf")}
                onGenerate={() => void handleQuoteGenerate()}
                statusLabel={quoteDocumentStatus.replace("Document: ", "")}
                templatePicker={
                  <TemplatePicker
                    documentType={quoteDocumentType}
                    onChange={(templateId) => updateSelectedTemplate(resolvedDraft.clientReference, quoteDocumentType, templateId)}
                    selectedTemplateId={quoteDraft.selectedTemplateId}
                  />
                }
              />
            </AccordionItem>
          </Accordion>
        </div>
      );
    }

    if (tabId === "files") {
      return (
        <IncomeProtectionFilesTab
          fileFilter={fileFilter}
          fileInputRef={fileInputRef}
          fileUploadStatus={fileUploadStatus}
          filteredFiles={filteredDisplayFiles}
          onFileDelete={(fileId, filename) => { void handleBackendFileDelete(fileId, filename); }}
          onFileDownload={(fileId, filename) => { void handleBackendFileDownload(fileId, filename); }}
          onFileFilterChange={(value) => setFileFilter(value)}
          onFileSelect={handleFileSelect}
          onFileUpload={(event) => { void handleRealFileUpload(event); }}
          uploadProgress={uploadProgress}
        />
      );
    }

    return (
      <IncomeProtectionGeneratedDocumentsTab
        addToast={addToast}
        canUseBackend={canUseBackend}
        displayDocuments={displayDocuments}
        documentDownloadStatus={documentDownloadStatus}
        documentPackStatus={documentPackStatus}
        downloadDocument={downloadDocument}
        hasLoadedBackendGeneratedDocuments={hasLoadedBackendGeneratedDocuments}
        onBackendDelete={(docId, docName) => { void handleBackendDocumentDelete(docId, docName); }}
        onBackendDownload={(docId, docName) => {
          void downloadDocument(selectedClientReference, docId, docName).then(
            () => addToast(`${docName} downloaded`, "success"),
            () => addToast("Download failed", "error"),
          );
        }}
        onDownloadPack={handleDownloadPack}
        onFallbackDownload={(doc) => handleDownloadDocument(doc)}
        onNavigateToGenerate={() => setActiveTabId("fact-find")}
        onPreviewDocument={(doc) => setPreviewDocument(doc)}
        onRegenerate={(doc) => handleRegenerateDocument(doc)}
        previewDocument={previewDocument}
        selectedClientReference={selectedClientReference}
      />
    );
  }

  function renderDocumentSection(sectionId: WorkflowSectionId) {
    switch (sectionId) {
      case "fact-find":
        return renderTabPanel("fact-find");
      case "fact-find-update":
        return renderTabPanel("fact-find-update");
      case "income-protection-statement":
        return renderTabPanel("statement-of-suitability");
      case "income-protection-quote":
        return renderTabPanel("quote");
      case "files":
        return renderTabPanel("files");
      case "generated-documents":
        return renderTabPanel("generated-documents");
      default:
        return null;
    }
  }

  return (
    <WorkflowPageLayout
      className="income-protection-page"
      clientReference={selectedClientReference}
      workflowKind={workflowKind}
    >
      <section className="workflow-header" aria-label="Selected client summary">
        <div className="workflow-header-top">
          <div className="workflow-header-title">
            <div className="flex items-center gap-3">
              <h1>{pageTitle}</h1>
              <Badge variant={getDocumentStatusVariant(resolvedDraft.status)}>{resolvedDraft.status ?? "Draft"}</Badge>
            </div>
          </div>
        </div>

        <div className="income-protection-header-controls">
          <div className="workflow-client-field income-protection-client-field">
            <label className="field-label" htmlFor="client-select">
              Select workflow client
            </label>
            <div className="field-select-wrap">
              <select
                className="field-select"
                id="client-select"
                onChange={(event) => {
                  if (event.target.value) {
                    setSelectedClientReference(event.target.value);
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
          </div>

          <div className="workflow-header-actions income-protection-header-actions">
            <Link className="btn btn-primary" to="/clients/new">
              <Plus size={18} />
              Create Client
            </Link>
            <Link className="btn btn-secondary" to={`/clients/${resolvedDraft.clientReference}`}>
              <Edit size={18} />
              Edit Client
            </Link>
          </div>
        </div>
      </section>

      <div aria-label={`${pageTitle} sections`} className="tab-list" role="tablist">
          {visibleTabs.map((tab) => {
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
        <WorkflowDocumentSections
          clientReference={selectedClientReference}
          renderSection={renderDocumentSection}
          sectionIds={[activeSectionId]}
          workflowKind={workflowKind}
        />
      </section>
    </WorkflowPageLayout>
  );
}
