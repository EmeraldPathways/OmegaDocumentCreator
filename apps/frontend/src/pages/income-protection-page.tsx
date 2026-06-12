import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import {
  User,
  ClipboardList,
  FileText,
  CheckCircle,
  FolderOpen,
  Download,
  Save,
  FileDown,
  Upload,
  AlertTriangle,
} from "lucide-react";

import { useAuth } from "../auth/auth-context";
import { useClientData } from "../data/client-data-context";
import type { SeededClientFile, SeededClientProfile, SeededGeneratedDocument } from "../data/seeded-clients";
import { exportGeneratedDocument } from "../documents/export-generated-document";
import type { WorkflowDocumentType } from "../documents/workflow-document-builders";

const moduleTabs = [
  { id: "client-details", label: "Client Details", icon: User },
  { id: "fact-find", label: "Fact Find", icon: ClipboardList },
  { id: "terms-of-business", label: "Terms of Business", icon: FileText },
  { id: "statement-of-suitability", label: "Statement of Suitability", icon: CheckCircle },
  { id: "files", label: "Files", icon: FolderOpen },
  { id: "generated-documents", label: "Generated Documents", icon: Download },
] as const;
const SELECTED_CLIENT_STORAGE_KEY = "omega-selected-income-protection-client";

function hasValue(value: string) {
  return value.trim().length > 0;
}

function isPresent(value: string | null): value is string {
  return value !== null;
}

function resolveActorLabel(role: string | null | undefined) {
  return role === "admin" ? "Omega Admin" : "Office Staff";
}

function buildFullName(firstName: string, surname: string) {
  return `${firstName} ${surname}`.trim();
}

function replaceSpaces(value: string, replacement: string) {
  return value.replace(/ /g, replacement);
}

export function IncomeProtectionPage() {
  const { user } = useAuth();
  const actorLabel = resolveActorLabel(user?.role);
  const { getClient, listClients, saveClient } = useClientData();
  const clients = listClients();
  const [selectedClientReference, setSelectedClientReference] = useState(() => {
    if (typeof window === "undefined") {
      return clients[0]?.clientReference ?? "";
    }

    return window.localStorage.getItem(SELECTED_CLIENT_STORAGE_KEY) ?? clients[0]?.clientReference ?? "";
  });
  const client = getClient(selectedClientReference);
  const [activeTabId, setActiveTabId] = useState<(typeof moduleTabs)[number]["id"]>(moduleTabs[0].id);
  const [draft, setDraft] = useState<SeededClientProfile | null>(client ?? null);
  const [clientSearch, setClientSearch] = useState("");
  const [clientDetailsStatus, setClientDetailsStatus] = useState("Not saved yet");
  const [factFindDraftSavedLabel, setFactFindDraftSavedLabel] = useState("Not saved yet");
  const [factFindGenerationStatus, setFactFindGenerationStatus] = useState("Generation: Draft");
  const [showFactFindValidation, setShowFactFindValidation] = useState(false);
  const [termsSaveStatus, setTermsSaveStatus] = useState("Not saved yet");
  const [termsIssueStatus, setTermsIssueStatus] = useState("Issue: Draft");
  const [statementSaveStatus, setStatementSaveStatus] = useState("Not saved yet");
  const [statementDocumentStatus, setStatementDocumentStatus] = useState("Document: Draft");
  const [showStatementValidation, setShowStatementValidation] = useState(false);
  const [fileUploadStatus, setFileUploadStatus] = useState("Upload: Waiting for upload");
  const [documentPackStatus, setDocumentPackStatus] = useState("Pack: Waiting for request");
  const [documentDownloadStatus, setDocumentDownloadStatus] = useState("Download: No document downloaded yet");

  useEffect(() => {
    setDraft(client ?? null);
  }, [client]);

  useEffect(() => {
    if (!selectedClientReference && clients[0]?.clientReference) {
      setSelectedClientReference(clients[0].clientReference);
      window.localStorage.setItem(SELECTED_CLIENT_STORAGE_KEY, clients[0].clientReference);
    }
  }, [clients, selectedClientReference]);

  if (!client || !draft) {
    return (
      <section className="panel">
        <h1>Client Not Found</h1>
      </section>
    );
  }

  const resolvedDraft = draft;

  const filteredClients = clients.filter((entry) => {
    const query = clientSearch.trim().toLowerCase();
    if (query.length === 0) {
      return true;
    }

    return entry.fullName.toLowerCase().includes(query) || entry.clientReference.toLowerCase().includes(query);
  });

  const activeTab = moduleTabs.find((tab) => tab.id === activeTabId) ?? moduleTabs[0];
  const factFindMissingFields = [
    !hasValue(resolvedDraft.fullName) ? "Client name" : null,
    !hasValue(`${resolvedDraft.townCity} ${resolvedDraft.county}`.trim()) ? "Address" : null,
    !hasValue(resolvedDraft.dateOfBirth) ? "Date of birth" : null,
    !hasValue(resolvedDraft.occupation) ? "Occupation" : null,
    !hasValue(resolvedDraft.income) ? "Income / salary" : null,
    !hasValue(resolvedDraft.email) && !hasValue(resolvedDraft.mobileNumber) ? "Email or phone" : null,
    !hasValue(resolvedDraft.advisorName) ? "Advisor name" : null,
  ].filter(isPresent);
  const statementMissingFields = [
    !hasValue(resolvedDraft.fullName) ? "Client name" : null,
    !hasValue(`${resolvedDraft.townCity} ${resolvedDraft.county}`.trim()) ? "Address" : null,
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

  function persistDraft(nextDraft: SeededClientProfile) {
    const normalizedDraft = {
      ...nextDraft,
      fullName: buildFullName(nextDraft.firstName, nextDraft.surname),
      updatedBy: actorLabel,
    };
    setDraft(normalizedDraft);
    saveClient(normalizedDraft);
    return normalizedDraft;
  }

  function updateField(field: keyof SeededClientProfile, value: string) {
    setDraft((currentDraft) => {
      if (!currentDraft) {
        return currentDraft;
      }

      const nextDraft = {
        ...currentDraft,
        [field]: value,
      };

      if (field === "firstName" || field === "surname") {
        nextDraft.fullName = buildFullName(
          field === "firstName" ? value : currentDraft.firstName,
          field === "surname" ? value : currentDraft.surname,
        );
      }

      return nextDraft;
    });
  }

  function buildGeneratedDocument(documentType: string, extension: "docx" | "pdf") {
    const generatedAt = resolvedDraft.letterDate || new Date().toISOString().slice(0, 10);
    const baseName = `${resolvedDraft.firstName}_${resolvedDraft.surname}` || resolvedDraft.clientReference;
    const normalizedType = replaceSpaces(documentType, "_");

    return {
      id: `DOC-${Date.now()}-${normalizedType}-${extension}`,
      documentType,
      documentName: `${baseName}_${normalizedType}_${generatedAt}.${extension}`,
      version: `Version ${resolvedDraft.generatedDocuments.length + 1}`,
      status: extension === "pdf" ? "PDF ready" : "DOCX ready",
      generatedAt,
    } satisfies SeededGeneratedDocument;
  }

  function buildGeneratedFile(document: SeededGeneratedDocument) {
    return {
      id: `FILE-${Date.now()}-${replaceSpaces(document.documentType, "-")}`,
      category: "Generated Documents",
      originalFilename: document.documentName,
      status: "Approved",
      uploadedBy: actorLabel,
      uploadedAt: document.generatedAt,
    } satisfies SeededClientFile;
  }

  function appendGeneratedDocument(documentType: WorkflowDocumentType, extension: "docx" | "pdf") {
    const nextDocument = buildGeneratedDocument(documentType, extension);
    const nextFile = buildGeneratedFile(nextDocument);
    persistDraft({
      ...resolvedDraft,
      generatedDocuments: [nextDocument, ...resolvedDraft.generatedDocuments],
      files: [nextFile, ...resolvedDraft.files.filter((file) => file.originalFilename !== nextFile.originalFilename)],
    });
    return nextDocument;
  }

  function saveClientDetails() {
    persistDraft(resolvedDraft);
    setClientDetailsStatus("Saved just now");
  }

  function saveFactFindDraft() {
    persistDraft(resolvedDraft);
    setFactFindDraftSavedLabel("Saved just now");
  }

  async function handleFactFindGenerate(format: "DOCX" | "PDF") {
    if (factFindMissingFields.length > 0) {
      setShowFactFindValidation(true);
      setFactFindGenerationStatus("Generation: Blocked by missing required fields");
      return;
    }

    setShowFactFindValidation(false);
    saveFactFindDraft();
    setFactFindGenerationStatus(`Generation: ${format} generated`);
    try {
      const nextDocument = appendGeneratedDocument("Fact Find", format.toLowerCase() as "docx" | "pdf");
      await exportGeneratedDocument(resolvedDraft, "Fact Find", format.toLowerCase() as "docx" | "pdf", nextDocument.documentName);
    } catch {
      setFactFindGenerationStatus(`Generation: ${format} failed`);
    }
  }

  function saveTermsDraft() {
    persistDraft(resolvedDraft);
    setTermsSaveStatus("Saved just now");
  }

  async function handleTermsGenerate() {
    saveTermsDraft();
    setTermsIssueStatus("Issue: PDF generated");
    try {
      const nextDocument = appendGeneratedDocument("Terms of Business", "pdf");
      await exportGeneratedDocument(resolvedDraft, "Terms of Business", "pdf", nextDocument.documentName);
    } catch {
      setTermsIssueStatus("Issue: PDF failed");
    }
  }

  function markTermsIssued() {
    persistDraft({
      ...resolvedDraft,
      termsIssuedBy: actorLabel,
      termsClientReceived: resolvedDraft.termsClientReceived || "Received",
    });
    setTermsIssueStatus("Issue: Issued today");
  }

  function saveStatementDraft() {
    persistDraft(resolvedDraft);
    setStatementSaveStatus("Saved just now");
  }

  async function handleStatementGenerate(format: "DOCX" | "PDF") {
    if (statementMissingFields.length > 0) {
      setShowStatementValidation(true);
      setStatementDocumentStatus("Document: Blocked by missing required fields");
      return;
    }

    setShowStatementValidation(false);
    saveStatementDraft();
    setStatementDocumentStatus(`Document: ${format} generated`);
    try {
      const nextDocument = appendGeneratedDocument("Statement of Suitability", format.toLowerCase() as "docx" | "pdf");
      await exportGeneratedDocument(
        resolvedDraft,
        "Statement of Suitability",
        format.toLowerCase() as "docx" | "pdf",
        nextDocument.documentName,
      );
    } catch {
      setStatementDocumentStatus(`Document: ${format} failed`);
    }
  }

  function handleUploadFile() {
    const nextFile = {
      id: `FILE-${Date.now()}`,
      category: "Other",
      originalFilename: `${resolvedDraft.surname || "Client"}_${resolvedDraft.firstName || "Record"}_uploaded_note.txt`,
      status: "Pending review",
      uploadedBy: actorLabel,
      uploadedAt: new Date().toISOString().slice(0, 10),
    } satisfies SeededClientFile;

    persistDraft({
      ...resolvedDraft,
      files: [nextFile, ...resolvedDraft.files],
    });
    setFileUploadStatus("Upload: File saved");
  }

  async function handleDownloadDocument(document: SeededGeneratedDocument) {
    const extension = document.documentName.toLowerCase().endsWith(".pdf") ? "pdf" : "docx";

    setDocumentDownloadStatus(`Download: Downloaded ${document.documentName}`);
    try {
      await exportGeneratedDocument(resolvedDraft, document.documentType as WorkflowDocumentType, extension, document.documentName);
    } catch {
      setDocumentDownloadStatus(`Download: Failed ${document.documentName}`);
    }
  }

  function renderTabPanel() {
    if (activeTab.id === "client-details") {
      return (
        <div className="fact-find-stack">
          <div className="fact-find-header">
            <h2>Client Details</h2>
            <div className="action-toolbar">
              <button className="primary-action icon-btn" onClick={saveClientDetails} type="button">
                <Save size={18} />
                Save
              </button>
              <span className="compact-badge">
                <span className={`status-dot ${clientDetailsStatus === "Saved just now" ? "status-dot-green" : "status-dot-grey"}`} />
                <span>{clientDetailsStatus}</span>
              </span>
            </div>
          </div>

          <section className="fact-find-section">
            <div className="fact-find-section-header">
              <h3>Reusable client information</h3>
            </div>
            <form className="client-form-grid">
              <label>
                First name
                <input onChange={(event) => updateField("firstName", event.target.value)} type="text" value={resolvedDraft.firstName} />
              </label>
              <label>
                Surname
                <input onChange={(event) => updateField("surname", event.target.value)} type="text" value={resolvedDraft.surname} />
              </label>
              <label>
                Email
                <input onChange={(event) => updateField("email", event.target.value)} type="email" value={resolvedDraft.email} />
              </label>
              <label>
                Phone
                <input onChange={(event) => updateField("mobileNumber", event.target.value)} type="text" value={resolvedDraft.mobileNumber} />
              </label>
              <label>
                Date of birth
                <input onChange={(event) => updateField("dateOfBirth", event.target.value)} type="text" value={resolvedDraft.dateOfBirth} />
              </label>
              <label>
                Town / City
                <input onChange={(event) => updateField("townCity", event.target.value)} type="text" value={resolvedDraft.townCity} />
              </label>
              <label>
                County
                <input onChange={(event) => updateField("county", event.target.value)} type="text" value={resolvedDraft.county} />
              </label>
              <label>
                Occupation
                <input onChange={(event) => updateField("occupation", event.target.value)} type="text" value={resolvedDraft.occupation} />
              </label>
              <label>
                Employment status
                <input onChange={(event) => updateField("employmentStatus", event.target.value)} type="text" value={resolvedDraft.employmentStatus} />
              </label>
              <label>
                Income
                <input onChange={(event) => updateField("income", event.target.value)} type="text" value={resolvedDraft.income} />
              </label>
              <label>
                Provider
                <input onChange={(event) => updateField("provider", event.target.value)} type="text" value={resolvedDraft.provider} />
              </label>
              <label>
                Advisor name
                <input onChange={(event) => updateField("advisorName", event.target.value)} type="text" value={resolvedDraft.advisorName} />
              </label>
            </form>
          </section>
        </div>
      );
    }

    if (activeTab.id === "fact-find") {
      return (
        <div className="fact-find-stack">
          <div className="fact-find-header">
            <h2>Fact Find Draft</h2>
            <div className="action-toolbar">
              <button className="primary-action icon-btn" onClick={saveFactFindDraft} type="button">
                <Save size={18} />
                Save
              </button>
              <button className="primary-action secondary-action icon-btn" onClick={() => handleFactFindGenerate("DOCX")} type="button">
                <FileDown size={18} />
                DOCX
              </button>
              <button className="primary-action icon-btn" onClick={() => handleFactFindGenerate("PDF")} type="button">
                <FileDown size={18} />
                PDF
              </button>
              <span className="compact-badge">
                <span className={`status-dot ${factFindDraftSavedLabel === "Saved just now" ? "status-dot-green" : "status-dot-grey"}`} />
                <span>{factFindDraftSavedLabel}</span>
              </span>
              <span className="compact-badge">
                <span className={`status-dot ${factFindGenerationStatus.includes("Generation: ") && factFindGenerationStatus !== "Generation: Draft" && !factFindGenerationStatus.includes("Blocked") ? "status-dot-green" : "status-dot-grey"}`} />
                <span>{factFindGenerationStatus}</span>
              </span>
            </div>
          </div>

          {showFactFindValidation ? (
            <div className="validation-banner">
              <AlertTriangle size={18} />
              <span>Missing required fields: {factFindMissingFields.join(", ")}</span>
            </div>
          ) : null}

          <section className="fact-find-section">
            <div className="fact-find-section-header">
              <h3>Personal Details</h3>
            </div>
            <form className="client-form-grid">
              <label>
                Client name
                <input onChange={(event) => updateField("fullName", event.target.value)} type="text" value={resolvedDraft.fullName} />
              </label>
              <label>
                Marital status
                <input onChange={(event) => updateField("maritalStatus", event.target.value)} type="text" value={resolvedDraft.maritalStatus} />
              </label>
              <label>
                Date of birth
                <input onChange={(event) => updateField("dateOfBirth", event.target.value)} type="text" value={resolvedDraft.dateOfBirth} />
              </label>
              <label>
                Email
                <input onChange={(event) => updateField("email", event.target.value)} type="email" value={resolvedDraft.email} />
              </label>
              <label>
                Home / mobile
                <input onChange={(event) => updateField("mobileNumber", event.target.value)} type="text" value={resolvedDraft.mobileNumber} />
              </label>
              <label>
                Partner name
                <input onChange={(event) => updateField("partnerName", event.target.value)} type="text" value={resolvedDraft.partnerName} />
              </label>
            </form>
          </section>

          <section className="fact-find-section">
            <div className="fact-find-section-header">
              <h3>Employment Details</h3>
            </div>
            <form className="client-form-grid">
              <label>
                Occupation
                <input onChange={(event) => updateField("occupation", event.target.value)} type="text" value={resolvedDraft.occupation} />
              </label>
              <label>
                Employment status
                <input onChange={(event) => updateField("employmentStatus", event.target.value)} type="text" value={resolvedDraft.employmentStatus} />
              </label>
              <label>
                Income / salary
                <input onChange={(event) => updateField("income", event.target.value)} type="text" value={resolvedDraft.income} />
              </label>
              <label>
                Advisor name
                <input onChange={(event) => updateField("advisorName", event.target.value)} type="text" value={resolvedDraft.advisorName} />
              </label>
            </form>
          </section>

          <section className="fact-find-section">
            <div className="fact-find-section-header">
              <h3>Income Protection</h3>
            </div>
            <form className="client-form-grid">
              <label>
                Provider
                <input onChange={(event) => updateField("provider", event.target.value)} type="text" value={resolvedDraft.provider} />
              </label>
              <label>
                Recommended cover
                <input onChange={(event) => updateField("recommendedCover", event.target.value)} type="text" value={resolvedDraft.recommendedCover} />
              </label>
              <label>
                Monthly premium
                <input onChange={(event) => updateField("premium", event.target.value)} type="text" value={resolvedDraft.premium} />
              </label>
              <label>
                Deferred period
                <input onChange={(event) => updateField("deferredPeriod", event.target.value)} type="text" value={resolvedDraft.deferredPeriod} />
              </label>
              <label>
                Cover to age
                <input onChange={(event) => updateField("coverAge", event.target.value)} type="text" value={resolvedDraft.coverAge} />
              </label>
            </form>
          </section>

          <section className="fact-find-section">
            <div className="fact-find-section-header">
              <h3>Life Insurance & Serious Illness</h3>
            </div>
            <form className="client-form-grid">
              <label>
                Mortgage protection
                <input onChange={(event) => updateField("mortgageProtection", event.target.value)} type="text" value={resolvedDraft.mortgageProtection} />
              </label>
              <label>
                Personal insurance
                <input onChange={(event) => updateField("personalInsurance", event.target.value)} type="text" value={resolvedDraft.personalInsurance} />
              </label>
              <label>
                Keyman insurance
                <input onChange={(event) => updateField("keymanInsurance", event.target.value)} type="text" value={resolvedDraft.keymanInsurance} />
              </label>
              <label>
                Partnership insurance
                <input onChange={(event) => updateField("partnershipInsurance", event.target.value)} type="text" value={resolvedDraft.partnershipInsurance} />
              </label>
              <label>
                Self life insurance amount
                <input onChange={(event) => updateField("selfLifeInsuranceAmount", event.target.value)} type="text" value={resolvedDraft.selfLifeInsuranceAmount} />
              </label>
              <label>
                Partner serious illness amount
                <input onChange={(event) => updateField("partnerSeriousIllnessAmount", event.target.value)} type="text" value={resolvedDraft.partnerSeriousIllnessAmount} />
              </label>
            </form>
          </section>

          <section className="fact-find-section">
            <div className="fact-find-section-header">
              <h3>Additional Relevant Information</h3>
            </div>
            <form className="client-form-grid">
              <label>
                Personal circumstances
                <textarea onChange={(event) => updateField("personalCircumstances", event.target.value)} rows={4} value={resolvedDraft.personalCircumstances} />
              </label>
              <label>
                Financial situation
                <textarea onChange={(event) => updateField("financialSituation", event.target.value)} rows={4} value={resolvedDraft.financialSituation} />
              </label>
              <label>
                Needs and objectives
                <textarea onChange={(event) => updateField("needsObjectives", event.target.value)} rows={4} value={resolvedDraft.needsObjectives} />
              </label>
            </form>
          </section>

          <section className="fact-find-section">
            <div className="fact-find-section-header">
              <h3>Client Declarations</h3>
            </div>
            <form className="client-form-grid">
              <label>
                Execution-only confirmation
                <input onChange={(event) => updateField("executionOnlyConfirmation", event.target.value)} type="text" value={resolvedDraft.executionOnlyConfirmation} />
              </label>
              <label>
                Terms of Business reviewed and copy received
                <input onChange={(event) => updateField("termsReviewedReceived", event.target.value)} type="text" value={resolvedDraft.termsReviewedReceived} />
              </label>
            </form>
          </section>

          <section className="fact-find-section">
            <div className="fact-find-section-header">
              <h3>Data Protection & Marketing Preferences</h3>
            </div>
            <form className="client-form-grid">
              <label>
                Contact by phone
                <input onChange={(event) => updateField("contactByPhone", event.target.value)} type="text" value={resolvedDraft.contactByPhone} />
              </label>
              <label>
                Contact by SMS
                <input onChange={(event) => updateField("contactBySms", event.target.value)} type="text" value={resolvedDraft.contactBySms} />
              </label>
              <label>
                Contact by email
                <input onChange={(event) => updateField("contactByEmail", event.target.value)} type="text" value={resolvedDraft.contactByEmail} />
              </label>
              <label>
                Contact by post
                <input onChange={(event) => updateField("contactByPost", event.target.value)} type="text" value={resolvedDraft.contactByPost} />
              </label>
            </form>
          </section>

          <section className="fact-find-section">
            <div className="fact-find-section-header">
              <h3>PEP Confirmation</h3>
            </div>
            <form className="client-form-grid">
              <label>
                Politically Exposed Person confirmation
                <input onChange={(event) => updateField("pepConfirmation", event.target.value)} type="text" value={resolvedDraft.pepConfirmation} />
              </label>
              <label>
                Related to a PEP
                <input onChange={(event) => updateField("pepRelatedConfirmation", event.target.value)} type="text" value={resolvedDraft.pepRelatedConfirmation} />
              </label>
            </form>
          </section>

          <section className="fact-find-section">
            <div className="fact-find-section-header">
              <h3>Business Source</h3>
            </div>
            <form className="client-form-grid">
              <label>
                How did you hear about Omega?
                <input onChange={(event) => updateField("businessSource", event.target.value)} type="text" value={resolvedDraft.businessSource} />
              </label>
            </form>
          </section>

          <section className="fact-find-section">
            <div className="fact-find-section-header">
              <h3>Signatures</h3>
            </div>
            <form className="client-form-grid">
              <label>
                Client signature 1
                <input onChange={(event) => updateField("clientSignature1", event.target.value)} type="text" value={resolvedDraft.clientSignature1} />
              </label>
              <label>
                Client signature 1 date
                <input onChange={(event) => updateField("clientSignature1Date", event.target.value)} type="text" value={resolvedDraft.clientSignature1Date} />
              </label>
              <label>
                Client signature 2
                <input onChange={(event) => updateField("clientSignature2", event.target.value)} type="text" value={resolvedDraft.clientSignature2} />
              </label>
              <label>
                Financial advisor signature
                <input onChange={(event) => updateField("financialAdvisorSignature", event.target.value)} type="text" value={resolvedDraft.financialAdvisorSignature} />
              </label>
            </form>
          </section>

          <section className="fact-find-section">
            <div className="fact-find-section-header">
              <h3>Request for Information</h3>
            </div>
            <form className="client-form-grid">
              <label>
                Client name(s)
                <input onChange={(event) => updateField("fullName", event.target.value)} type="text" value={resolvedDraft.fullName} />
              </label>
              <label>
                Address
                <input onChange={(event) => updateField("townCity", event.target.value)} type="text" value={`${resolvedDraft.townCity}, ${resolvedDraft.county}`.replace(/^,\s*/, "")} />
              </label>
              <label>
                Date of birth
                <input onChange={(event) => updateField("dateOfBirth", event.target.value)} type="text" value={resolvedDraft.dateOfBirth} />
              </label>
              <label>
                Company/provider name
                <input onChange={(event) => updateField("requestCompanyName", event.target.value)} type="text" value={resolvedDraft.requestCompanyName} />
              </label>
              <label>
                Policies
                <input onChange={(event) => updateField("requestPolicies", event.target.value)} type="text" value={resolvedDraft.requestPolicies} />
              </label>
              <label>
                Request letter date
                <input onChange={(event) => updateField("requestLetterDate", event.target.value)} type="text" value={resolvedDraft.requestLetterDate} />
              </label>
            </form>
          </section>
        </div>
      );
    }

    if (activeTab.id === "terms-of-business") {
      return (
        <div className="fact-find-stack">
          <div className="fact-find-header">
            <h2>Terms of Business Draft</h2>
            <div className="action-toolbar">
              <button className="primary-action icon-btn" onClick={saveTermsDraft} type="button">
                <Save size={18} />
                Save
              </button>
              <button className="primary-action secondary-action icon-btn" onClick={handleTermsGenerate} type="button">
                <FileDown size={18} />
                PDF
              </button>
              <button className="primary-action secondary-action icon-btn" onClick={markTermsIssued} type="button">
                <CheckCircle size={18} />
                Mark Issued
              </button>
              <span className="compact-badge">
                <span className={`status-dot ${termsSaveStatus === "Saved just now" ? "status-dot-green" : "status-dot-grey"}`} />
                <span>{termsSaveStatus}</span>
              </span>
              <span className="compact-badge">
                <span className={`status-dot ${termsIssueStatus !== "Issue: Draft" ? "status-dot-green" : "status-dot-grey"}`} />
                <span>{termsIssueStatus}</span>
              </span>
            </div>
          </div>

          <section className="fact-find-section">
            <div className="fact-find-section-header">
              <h3>Terms of Business</h3>
            </div>
            <form className="client-form-grid">
              <label>
                Terms version
                <input onChange={(event) => updateField("termsVersion", event.target.value)} type="text" value={resolvedDraft.termsVersion} />
              </label>
              <label>
                Issued by
                <input onChange={(event) => updateField("termsIssuedBy", event.target.value)} type="text" value={resolvedDraft.termsIssuedBy} />
              </label>
              <label>
                Delivery method
                <input onChange={(event) => updateField("termsDeliveryMethod", event.target.value)} type="text" value={resolvedDraft.termsDeliveryMethod} />
              </label>
              <label>
                Client received terms
                <input onChange={(event) => updateField("termsClientReceived", event.target.value)} type="text" value={resolvedDraft.termsClientReceived} />
              </label>
              <label>
                Client reviewed terms
                <input onChange={(event) => updateField("termsClientReviewed", event.target.value)} type="text" value={resolvedDraft.termsClientReviewed} />
              </label>
              <label>
                Notes
                <input onChange={(event) => updateField("termsNotes", event.target.value)} type="text" value={resolvedDraft.termsNotes} />
              </label>
            </form>
          </section>
        </div>
      );
    }

    if (activeTab.id === "statement-of-suitability") {
      return (
        <div className="fact-find-stack">
          <div className="fact-find-header">
            <h2>Statement of Suitability Draft</h2>
            <div className="action-toolbar">
              <button className="primary-action icon-btn" onClick={saveStatementDraft} type="button">
                <Save size={18} />
                Save
              </button>
              <button className="primary-action secondary-action icon-btn" onClick={() => handleStatementGenerate("DOCX")} type="button">
                <FileDown size={18} />
                DOCX
              </button>
              <button className="primary-action icon-btn" onClick={() => handleStatementGenerate("PDF")} type="button">
                <FileDown size={18} />
                PDF
              </button>
              <span className="compact-badge">
                <span className={`status-dot ${statementSaveStatus === "Saved just now" ? "status-dot-green" : "status-dot-grey"}`} />
                <span>{statementSaveStatus}</span>
              </span>
              <span className="compact-badge">
                <span className={`status-dot ${statementDocumentStatus.includes("Document: ") && statementDocumentStatus !== "Document: Draft" && !statementDocumentStatus.includes("Blocked") ? "status-dot-green" : "status-dot-grey"}`} />
                <span>{statementDocumentStatus}</span>
              </span>
            </div>
          </div>

          {showStatementValidation ? (
            <div className="validation-banner">
              <AlertTriangle size={18} />
              <span>Missing required fields: {statementMissingFields.join(", ")}</span>
            </div>
          ) : null}

          <section className="fact-find-section">
            <div className="fact-find-section-header">
              <h3>Recommendation basics</h3>
            </div>
            <form className="client-form-grid">
              <label>
                Letter date
                <input onChange={(event) => updateField("letterDate", event.target.value)} type="text" value={resolvedDraft.letterDate} />
              </label>
              <label>
                Statement type
                <input onChange={(event) => updateField("statementType", event.target.value)} type="text" value={resolvedDraft.statementType} />
              </label>
              <label>
                Provider name
                <input onChange={(event) => updateField("provider", event.target.value)} type="text" value={resolvedDraft.provider} />
              </label>
              <label>
                Product type
                <input onChange={(event) => updateField("productType", event.target.value)} type="text" value={resolvedDraft.productType} />
              </label>
              <label>
                Advisor name
                <input onChange={(event) => updateField("advisorName", event.target.value)} type="text" value={resolvedDraft.advisorName} />
              </label>
            </form>
          </section>

          <section className="fact-find-section">
            <div className="fact-find-section-header">
              <h3>Cover summary</h3>
            </div>
            <form className="client-form-grid">
              <label>
                Recommended cover
                <input onChange={(event) => updateField("recommendedCover", event.target.value)} type="text" value={resolvedDraft.recommendedCover} />
              </label>
              <label>
                Deferred period
                <input onChange={(event) => updateField("deferredPeriod", event.target.value)} type="text" value={resolvedDraft.deferredPeriod} />
              </label>
              <label>
                Cover to age
                <input onChange={(event) => updateField("coverAge", event.target.value)} type="text" value={resolvedDraft.coverAge} />
              </label>
              <label>
                Gross monthly premium
                <input onChange={(event) => updateField("premium", event.target.value)} type="text" value={resolvedDraft.premium} />
              </label>
              <label>
                Net monthly cost
                <input onChange={(event) => updateField("netMonthlyCost", event.target.value)} type="text" value={resolvedDraft.netMonthlyCost} />
              </label>
            </form>
          </section>
        </div>
      );
    }

    if (activeTab.id === "files") {
      const folderName = `client-${resolvedDraft.clientReference.toLowerCase()}-${replaceSpaces(resolvedDraft.fullName.toLowerCase(), "-")}`;
      const folderLayout = [
        "fact-find/",
        "terms-of-business/",
        "statement-of-suitability/",
        "request-for-information/",
        "uploads/",
        "generated-documents/",
        "signed-documents/",
      ];

      return (
        <div className="fact-find-stack">
          <div className="fact-find-header">
            <h2>Client Files</h2>
            <div className="action-toolbar">
              <button className="primary-action icon-btn" onClick={handleUploadFile} type="button">
                <Upload size={18} />
                Upload File
              </button>
              <span className="compact-badge">
                <span className={`status-dot ${fileUploadStatus === "Upload: File saved" ? "status-dot-green" : "status-dot-grey"}`} />
                <span>{fileUploadStatus}</span>
              </span>
            </div>
          </div>

          <section className="fact-find-section">
            <div className="fact-find-section-header">
              <h3>{folderName}</h3>
            </div>
            <ul className="folder-grid">
              {folderLayout.map((folder) => (
                <li className="folder-item" key={folder}>
                  <FolderOpen size={18} color="var(--omega-gold)" />
                  {folder}
                </li>
              ))}
            </ul>
          </section>

          <section className="fact-find-section">
            <div className="fact-find-section-header">
              <h3>Tracked client files</h3>
            </div>
            <div className="table-wrap">
              <table className="data-table">
                <thead>
                  <tr>
                    <th>Category</th>
                    <th>Filename</th>
                    <th>Status</th>
                    <th>Uploaded by</th>
                    <th>Uploaded at</th>
                  </tr>
                </thead>
                <tbody>
                  {resolvedDraft.files.map((file) => (
                    <tr key={file.id}>
                      <td>{file.category}</td>
                      <td>{file.originalFilename}</td>
                      <td>{file.status}</td>
                      <td>{file.uploadedBy}</td>
                      <td>{file.uploadedAt}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </section>
        </div>
      );
    }

    return (
      <div className="fact-find-stack">
        <div className="fact-find-header">
          <h2>Generated Documents</h2>
          <div className="action-toolbar">
            <button className="primary-action icon-btn" onClick={() => setDocumentPackStatus("Pack: Document pack queued")} type="button">
              <Download size={18} />
              Download Pack
            </button>
            <span className="compact-badge">
              <span className={`status-dot ${documentPackStatus !== "Pack: Waiting for request" ? "status-dot-green" : "status-dot-grey"}`} />
              <span>{documentPackStatus}</span>
            </span>
            <span className="compact-badge">
              <span className={`status-dot ${documentDownloadStatus.startsWith("Download:") ? "status-dot-green" : "status-dot-grey"}`} />
              <span>{documentDownloadStatus}</span>
            </span>
          </div>
        </div>

        <section className="fact-find-section">
          <div className="fact-find-section-header">
            <h3>Tracked outputs</h3>
          </div>
          <div className="table-wrap">
            <table className="data-table">
              <thead>
                <tr>
                  <th>Document type</th>
                  <th>Document name</th>
                  <th>Version</th>
                  <th>Status</th>
                  <th>Generated at</th>
                  <th>Action</th>
                </tr>
              </thead>
              <tbody>
                {resolvedDraft.generatedDocuments.map((document) => (
                  <tr key={document.id}>
                    <td>{document.documentType}</td>
                    <td>{document.documentName}</td>
                    <td>{document.version}</td>
                    <td>{document.status}</td>
                    <td>{document.generatedAt}</td>
                    <td>
                      <button className="table-action-button icon-btn" onClick={() => handleDownloadDocument(document)} type="button">
                        <Download size={16} />
                        Download
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>
      </div>
    );
  }

  return (
    <div className="page-stack">
      <section className="panel">
        <div className="page-heading page-heading-compact">
          <div>
            <h1>Income Protection</h1>
          </div>
          <div className="module-actions">
            <span className="module-status-badge">{resolvedDraft.status}</span>
            <div className="client-selector-compact client-selector-compact-inline">
              <label className="client-switcher-field">
                Search clients
                <input
                  aria-label="Search workflow clients"
                  onChange={(event) => setClientSearch(event.target.value)}
                  placeholder="Search by name or reference"
                  type="search"
                  value={clientSearch}
                />
              </label>
              <label className="client-switcher-field">
                Select client
                <select
                  aria-label="Select workflow client"
                  onChange={(event) => {
                    if (event.target.value) {
                      setSelectedClientReference(event.target.value);
                      window.localStorage.setItem(SELECTED_CLIENT_STORAGE_KEY, event.target.value);
                    }
                  }}
                  value={resolvedDraft.clientReference}
                >
                  {filteredClients.map((entry) => (
                    <option key={entry.clientReference} value={entry.clientReference}>
                      {entry.fullName} ({entry.clientReference})
                    </option>
                  ))}
                </select>
              </label>
              <Link className="primary-action action-link secondary-action icon-btn" to="/clients/new">
                Add Client
              </Link>
            </div>
          </div>
        </div>

        <div aria-label="Income Protection sections" className="module-tab-list module-tab-list-framed" role="tablist">
          {moduleTabs.map((tab) => {
            const Icon = tab.icon;
            return (
              <button
                key={tab.id}
                aria-controls={`panel-${tab.id}`}
                aria-selected={tab.id === activeTab.id}
                className={`module-tab${tab.id === activeTab.id ? " is-active" : ""}`}
                id={`tab-${tab.id}`}
                onClick={() => setActiveTabId(tab.id)}
                role="tab"
                type="button"
              >
                <Icon size={18} />
                {tab.label}
              </button>
            );
          })}
        </div>

        <section aria-labelledby={`tab-${activeTab.id}`} className="module-tab-panel" id={`panel-${activeTab.id}`} role="tabpanel">
          {renderTabPanel()}
        </section>
      </section>
    </div>
  );
}
