import { useEffect, useMemo, useRef, useState, type ChangeEvent } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import {
  Edit,
  Shield,
  Trash2,
  Download,
  RefreshCw,
  FileText,
  FolderOpen,
  Users,
  Plus,
  Save,
  Check,
  File,
  FileType2,
  Eye,
} from "lucide-react";

import { useAuth } from "../auth/auth-context";
import { useClientData } from "../data/client-data-context";
import { archiveClient as archiveBackendClient } from "../data/client-api";
import {
  deleteFile as deleteBackendFile,
  downloadFile as downloadBackendFile,
  listFiles,
  uploadFile,
} from "../data/file-api";
import {
  downloadDocument as downloadBackendDocument,
  listDocuments,
} from "../documents/generated-document-api";
import { buildStandaloneDocumentPreviewHtml } from "../documents/pdf-export";
import type { SeededClientFile, SeededClientProfile, SeededGeneratedDocument } from "../data/seeded-clients";
import { Badge, Button, Input, Modal, Textarea, useToast } from "../components/ui";

function formatEmpty(value: string | undefined | null) {
  return value?.trim() ? value : "—";
}

function formatDate(value: string) {
  if (!value) {
    return "—";
  }

  try {
    const date = new Date(value);
    if (Number.isNaN(date.getTime())) {
      return value;
    }
    return date.toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" });
  } catch {
    return value;
  }
}

function FileIcon({ filename }: { filename: string }) {
  const lower = filename.toLowerCase();
  if (lower.endsWith(".pdf")) {
    return <FileType2 size={20} />;
  }
  if (lower.endsWith(".docx") || lower.endsWith(".doc")) {
    return <FileText size={20} />;
  }
  return <File size={20} />;
}

function getFileCategoryClass(category: string) {
  if (category.toLowerCase().includes("fact")) {
    return "category-fact-find";
  }
  if (category.toLowerCase().includes("generated")) {
    return "category-generated";
  }
  if (category.toLowerCase().includes("proof")) {
    return "category-proof";
  }
  return "category-other";
}

function getStatusVariant(status: string): Parameters<typeof Badge>[0]["variant"] {
  const lower = status.toLowerCase();
  if (lower.includes("ready") || lower.includes("approved")) {
    return "approved";
  }
  if (lower.includes("pending") || lower.includes("draft")) {
    return "draft";
  }
  return "default";
}

function mapBackendDocumentToSeeded(document: {
  id: string;
  document_type: string;
  document_name: string;
  version: string | null;
  status: string;
  generated_at: string | null;
  preview_html: string | null;
  preview_title: string | null;
}): SeededGeneratedDocument {
  return {
    id: document.id,
    documentType: document.document_type,
    documentName: document.document_name,
    version: document.version ?? "1",
    status: document.status,
    generatedAt: document.generated_at ?? "",
    previewHtml: document.preview_html ?? undefined,
    previewTitle: document.preview_title ?? undefined,
  };
}

function mapBackendFileToSeeded(file: {
  id: string;
  category: string;
  original_filename: string;
  status: string;
  uploaded_by: string | null;
  uploaded_at: string | null;
}): SeededClientFile {
  return {
    id: file.id,
    category: file.category,
    originalFilename: file.original_filename,
    status: file.status,
    uploadedBy: file.uploaded_by ?? "System",
    uploadedAt: file.uploaded_at ?? "",
  };
}

export function ClientProfilePage() {
  const { clientReference = "" } = useParams();
  const navigate = useNavigate();
  const { user } = useAuth();
  const { getClient, refreshClients } = useClientData();
  const { addToast } = useToast();
  const client = getClient(clientReference);
  const [draft, setDraft] = useState<SeededClientProfile | null>(client ?? null);
  const [isClientLoading, setIsClientLoading] = useState(Boolean(!client));
  const [saveStatus, setSaveStatus] = useState<"notSaved" | "saving" | "saved">("notSaved");
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  const [previewDocument, setPreviewDocument] = useState<SeededGeneratedDocument | null>(null);
  const [isAddingDependant, setIsAddingDependant] = useState(false);
  const [dependantName, setDependantName] = useState("");
  const [dependantDob, setDependantDob] = useState("");
  const [dependantRelationship, setDependantRelationship] = useState("");
  const [backendDocuments, setBackendDocuments] = useState<SeededGeneratedDocument[]>([]);
  const [backendFiles, setBackendFiles] = useState<SeededClientFile[]>([]);
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const canUseBackend = Boolean(user);

  useEffect(() => {
    setDraft(client ?? null);
    if (client) {
      setIsClientLoading(false);
    }
  }, [client]);

  useEffect(() => {
    if (client) {
      return;
    }
    void refreshClients()
      .catch(() => undefined)
      .finally(() => setIsClientLoading(false));
  }, [client, refreshClients]);

  async function refreshArtifacts() {
    if (!canUseBackend || !clientReference) {
      return;
    }

    const [documents, files] = await Promise.all([
      listDocuments(clientReference),
      listFiles(clientReference),
    ]);

    setBackendDocuments(documents.map(mapBackendDocumentToSeeded));
    setBackendFiles(files.map(mapBackendFileToSeeded));
  }

  useEffect(() => {
    void refreshArtifacts().catch(() => {
      addToast("Failed to load client files and documents", "error");
    });
  }, [addToast, canUseBackend, clientReference]);

  const documents = useMemo(
    () =>
      canUseBackend
        ? backendDocuments
        : draft?.generatedDocuments.length
          ? draft.generatedDocuments
          : [
            {
              id: "placeholder-fact-find",
              documentType: "Fact Find",
              documentName: "Fact Find Draft",
              version: "—",
              status: "DOCX ready",
              generatedAt: "",
            },
            {
              id: "placeholder-terms",
              documentType: "Terms of Business",
              documentName: "Terms of Business",
              version: "—",
              status: "DOCX ready",
              generatedAt: "",
            },
            {
              id: "placeholder-sos",
              documentType: "Statement of Suitability",
              documentName: "Statement of Suitability",
              version: "—",
              status: "DOCX ready",
              generatedAt: "",
            },
          ],
    [backendDocuments, canUseBackend, draft?.generatedDocuments],
  );

  const files = useMemo(
    () => (canUseBackend ? backendFiles : (draft?.files ?? [])),
    [backendFiles, canUseBackend, draft?.files],
  );

  if (!client || !draft) {
    if (isClientLoading) {
      return (
        <section className="card">
          <h1>Loading Client</h1>
          <p className="text-muted">Fetching the latest client record.</p>
        </section>
      );
    }

    return (
      <section className="card">
        <h1>Client Not Found</h1>
        <p className="text-muted">The client you are looking for does not exist.</p>
        <Link className="btn btn-primary" to="/clients" style={{ marginTop: "var(--space-4)" }}>
          Back to clients
        </Link>
      </section>
    );
  }

  const resolvedDraft = draft;

  async function handleDownloadDocument(document: SeededGeneratedDocument) {
    if (canUseBackend) {
      await downloadBackendDocument(clientReference, document.id, document.documentName);
    }
    addToast(`Downloaded ${document.documentName}`, "success");
  }

  function handleRegenerateDocument(document: SeededGeneratedDocument) {
    addToast(`Open the workflow to regenerate ${document.documentName}`, "info");
    navigate(`/clients/${clientReference}/income-protection`);
  }

  async function handleDownloadFile(file: SeededClientFile) {
    if (canUseBackend) {
      await downloadBackendFile(clientReference, file.id, file.originalFilename);
    }
    addToast(`Downloaded ${file.originalFilename}`, "success");
  }

  async function handleDeleteFile(file: SeededClientFile) {
    if (canUseBackend) {
      await deleteBackendFile(clientReference, file.id);
      setBackendFiles((currentFiles) => currentFiles.filter((entry) => entry.id !== file.id));
    } else {
      setDraft((currentDraft) => {
        if (!currentDraft) {
          return currentDraft;
        }
        return { ...currentDraft, files: currentDraft.files.filter((entry) => entry.id !== file.id) };
      });
    }
    addToast(`Deleted ${file.originalFilename}`, "success");
  }

  function handleUploadFile() {
    fileInputRef.current?.click();
  }

  async function handleUploadFileSelection(event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    if (!file) {
      return;
    }

    try {
      if (canUseBackend) {
        const uploaded = await uploadFile(clientReference, file, "Client Upload", "general");
        setBackendFiles((currentFiles) => [mapBackendFileToSeeded(uploaded), ...currentFiles]);
      }
      addToast("File uploaded successfully", "success");
    } catch {
      addToast("File upload failed", "error");
    } finally {
      if (fileInputRef.current) {
        fileInputRef.current.value = "";
      }
    }
  }

  function handleAddDependant() {
    if (!dependantName.trim()) {
      return;
    }

    setDraft((currentDraft) => {
      if (!currentDraft) {
        return currentDraft;
      }
      return {
        ...currentDraft,
        dependants: [
          ...currentDraft.dependants,
          {
            name: dependantName.trim(),
            dateOfBirth: dependantDob,
            notes: dependantRelationship.trim(),
          },
        ],
      };
    });

    setDependantName("");
    setDependantDob("");
    setDependantRelationship("");
    setIsAddingDependant(false);
    addToast("Dependant added", "success");
  }

  async function handleDeleteClient() {
    try {
      if (canUseBackend) {
        await archiveBackendClient(clientReference);
        await refreshClients();
      }
      setIsDeleteModalOpen(false);
      addToast("Client archived", "success");
      navigate("/clients");
    } catch {
      addToast("Failed to archive client", "error");
    }
  }

  async function handleSaveDocuments() {
    setSaveStatus("saving");
    await refreshArtifacts();
    setSaveStatus("saved");
    addToast("Files and documents refreshed", "success");
    setTimeout(() => setSaveStatus("notSaved"), 2000);
  }

  const fullAddress = [resolvedDraft.townCity, resolvedDraft.county].filter(Boolean).join(", ") || "—";

  return (
    <div className="page-stack">
      <section className="section-divided">
        <div className="profile-header">
          <nav aria-label="Breadcrumb" className="breadcrumb">
            <Link to="/clients">Clients</Link>
            <span>/</span>
            <span>{resolvedDraft.fullName}</span>
          </nav>
          <h1 className="profile-name">{resolvedDraft.fullName}</h1>
          <div className="profile-meta-row">
            <span className="text-monospace" style={{ color: "var(--color-secondary)" }}>
              {resolvedDraft.clientReference}
            </span>
            <span>·</span>
            <Badge variant={getStatusVariant(resolvedDraft.status)}>{resolvedDraft.status}</Badge>
            <span>·</span>
            <span>last edited by {resolvedDraft.updatedBy}</span>
          </div>
        </div>

        <div className="page-actions" style={{ marginBottom: "var(--space-5)" }}>
          <Link className="btn btn-primary" to={`/clients/${resolvedDraft.clientReference}/edit`}>
            <Edit size={18} />
            Edit Client
          </Link>
          <Link className="btn btn-secondary" to={`/clients/${resolvedDraft.clientReference}/income-protection`}>
            <Shield size={18} />
            Open Income Protection
          </Link>
          <Button onClick={() => setIsDeleteModalOpen(true)} variant="danger">
            <Trash2 size={18} />
            Archive Client
          </Button>
          <Button isLoading={saveStatus === "saving"} onClick={handleSaveDocuments} variant="secondary">
            {saveStatus === "saved" ? <Check size={18} /> : <Save size={18} />}
            {saveStatus === "saving" ? "Saving..." : saveStatus === "saved" ? "Saved" : "Save Documents"}
          </Button>
        </div>

        <div className="profile-grid">
          <div className="profile-section">
            <h2 className="section-title">
              <Users size={20} />
              Personal Information
            </h2>
            <ProfileField label="Full name" value={resolvedDraft.fullName} />
            <ProfileField label="Title" value={resolvedDraft.title} />
            <ProfileField label="Email" value={resolvedDraft.email} />
            <ProfileField label="Mobile number" value={resolvedDraft.mobileNumber} />
            <ProfileField label="Work phone" value={resolvedDraft.workPhone} />
            <ProfileField label="Date of birth" value={formatDate(resolvedDraft.dateOfBirth)} />
            <ProfileField label="Marital status" value={resolvedDraft.maritalStatus} />
            <ProfileField label="Partner name" value={resolvedDraft.partnerName} />
          </div>

          <div className="profile-section">
            <h2 className="section-title">
              <FolderOpen size={20} />
              Address
            </h2>
            <ProfileField label="Home address line 1" value={resolvedDraft.homeAddressLine1} />
            <ProfileField label="Home address line 2" value={resolvedDraft.homeAddressLine2} />
            <ProfileField label="Town / City" value={resolvedDraft.townCity} />
            <ProfileField label="County" value={resolvedDraft.county} />
            <ProfileField label="Eircode" value={resolvedDraft.eircode} />
            <ProfileField label="Full address" value={fullAddress} />
            <ProfileField label="General notes" value={resolvedDraft.generalNotes} />
          </div>
        </div>
      </section>

      <section className="section-divided">
        <div className="section-header">
          <h2 className="section-title">
            <FileText size={20} />
            Generated Documents
          </h2>
        </div>
        <div className="file-list">
          {documents.map((document) => (
            <div key={document.id} className="file-item generated-document-item">
              <div className="file-icon">
                <FileText size={20} />
              </div>
              <div className="file-info generated-document-info">
                <div className="file-name">{document.documentName}</div>
                <div className="file-meta">
                  {document.documentType} &middot; Version {document.version}
                  {document.generatedAt ? ` · ${formatDate(document.generatedAt)}` : ""}
                </div>
              </div>
              <Badge variant={getStatusVariant(document.status)}>{document.status}</Badge>
              <div className="file-actions generated-doc-actions">
                <Button aria-label="Open" className="btn-sm" onClick={() => setPreviewDocument(document)} variant="secondary">
                  <Eye size={14} />
                  Open
                </Button>
                <Button className="btn-sm" onClick={() => handleDownloadDocument(document)} variant="secondary">
                  <Download size={14} />
                  Download
                </Button>
                <Button className="btn-sm" onClick={() => handleRegenerateDocument(document)} variant="text">
                  <RefreshCw size={14} />
                  Regenerate
                </Button>
              </div>
            </div>
          ))}
        </div>
      </section>

      <section className="section-divided">
        <div className="section-header">
          <h2 className="section-title">
            <FolderOpen size={20} />
            Files
          </h2>
          <Button onClick={handleUploadFile} variant="secondary">
            <Plus size={18} />
            Upload File
          </Button>
        </div>
        <input
          accept="*/*"
          onChange={(event) => void handleUploadFileSelection(event)}
          ref={fileInputRef}
          style={{ display: "none" }}
          type="file"
        />
        {files.length === 0 ? (
          <div className="empty-state">
            <div className="empty-state-icon">
              <FolderOpen size={28} />
            </div>
            <div className="empty-state-title">No files yet</div>
            <p className="empty-state-description">Upload supporting documents for this client.</p>
            <Button onClick={handleUploadFile} variant="primary">
              <Plus size={18} />
              Upload File
            </Button>
          </div>
        ) : (
          <div className="file-list">
            {files.map((file) => (
              <div key={file.id} className="file-item">
                <div className="file-icon">
                  <FileIcon filename={file.originalFilename} />
                </div>
                <div className="file-info">
                  <div className="file-name">{file.originalFilename}</div>
                  <div className="file-meta">
                    <span className={`category-badge ${getFileCategoryClass(file.category)}`}>{file.category}</span>
                    <span> &middot; </span>
                    <Badge variant={getStatusVariant(file.status)}>{file.status}</Badge>
                    <span> &middot; </span>
                    <span>by {file.uploadedBy} on {formatDate(file.uploadedAt)}</span>
                  </div>
                </div>
                <div className="file-actions">
                  <Button className="btn-sm" onClick={() => void handleDownloadFile(file)} variant="secondary">
                    <Download size={14} />
                    Download
                  </Button>
                  <Button className="btn-sm" onClick={() => void handleDeleteFile(file)} variant="danger">
                    <Trash2 size={14} />
                    Delete
                  </Button>
                </div>
              </div>
            ))}
          </div>
        )}
      </section>

      <section className="section-divided">
        <div className="section-header">
          <h2 className="section-title">
            <Users size={20} />
            Dependants
          </h2>
          {!isAddingDependant ? (
            <Button onClick={() => setIsAddingDependant(true)} variant="secondary">
              <Plus size={18} />
              Add Dependant
            </Button>
          ) : null}
        </div>

          {resolvedDraft.dependants.length === 0 && !isAddingDependant ? (
          <div className="empty-state">
            <div className="empty-state-icon">
              <Users size={28} />
            </div>
            <div className="empty-state-title">No dependants recorded</div>
            <p className="empty-state-description">Use the add button above to record dependants for client documentation.</p>
          </div>
        ) : null}

        {isAddingDependant ? (
          <div className="form-grid" style={{ marginBottom: "var(--space-4)" }}>
            <Input
              id="dependant-name"
              label="Name"
              onChange={(event) => setDependantName(event.target.value)}
              value={dependantName}
            />
            <Input
              id="dependant-dob"
              label="Date of birth"
              onChange={(event) => setDependantDob(event.target.value)}
              type="date"
              value={dependantDob}
            />
            <div className="form-grid-full">
              <Input
                id="dependant-relationship"
                label="Relationship"
                onChange={(event) => setDependantRelationship(event.target.value)}
                value={dependantRelationship}
              />
            </div>
            <div className="form-grid-full" style={{ display: "flex", gap: "var(--space-3)" }}>
              <Button onClick={handleAddDependant} variant="primary">
                Save Dependant
              </Button>
              <Button onClick={() => setIsAddingDependant(false)} variant="secondary">
                Cancel
              </Button>
            </div>
          </div>
        ) : null}

        {resolvedDraft.dependants.length > 0 ? (
          <div className="file-list">
            {resolvedDraft.dependants.map((dependant, index) => (
              <div className="file-item" key={`${dependant.name}-${index}`}>
                <div className="file-icon" style={{ background: "var(--color-secondary-light)", color: "var(--color-secondary)" }}>
                  <Users size={20} />
                </div>
                <div className="file-info">
                  <div className="file-name">{dependant.name}</div>
                  <div className="file-meta">
                    {dependant.dateOfBirth ? `DOB: ${formatDate(dependant.dateOfBirth)}` : "DOB not recorded"}
                    {dependant.notes ? ` · ${dependant.notes}` : ""}
                  </div>
                </div>
              </div>
            ))}
          </div>
        ) : null}
      </section>

      <Modal
        footer={
          <>
            <Button onClick={() => setIsDeleteModalOpen(false)} variant="secondary">
              Cancel
            </Button>
            <Button onClick={() => void handleDeleteClient()} variant="danger">
              Archive Client
            </Button>
          </>
        }
        isOpen={isDeleteModalOpen}
        onClose={() => setIsDeleteModalOpen(false)}
        title="Archive Client"
      >
        <p>Are you sure you want to archive {resolvedDraft.fullName}?</p>
        <p className="text-muted" style={{ marginTop: "var(--space-3)" }}>
          This removes the client from active work while preserving the record and associated documents and files.
        </p>
      </Modal>

      <Modal
        isOpen={Boolean(previewDocument)}
        onClose={() => setPreviewDocument(null)}
        size="large"
        title={previewDocument?.documentName ?? "Document Preview"}
      >
        {previewDocument?.previewHtml ? (
          <iframe
            className="document-preview-iframe"
            sandbox=""
            srcDoc={buildStandaloneDocumentPreviewHtml(previewDocument.previewHtml)}
            title={previewDocument.documentName}
          />
        ) : (
          <p className="text-muted">No preview available for this document.</p>
        )}
      </Modal>
    </div>
  );
}

function ProfileField({ label, value }: { label: string; value: string | undefined | null }) {
  const displayValue = formatEmpty(value);
  return (
    <div className="profile-field">
      <span className="profile-field-label">{label}</span>
      <span className={displayValue === "—" ? "profile-field-empty" : "profile-field-value"}>{displayValue}</span>
    </div>
  );
}
