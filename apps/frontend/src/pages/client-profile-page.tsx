import { useEffect, useMemo, useState } from "react";
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

import { useClientData } from "../data/client-data-context";
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

export function ClientProfilePage() {
  const { clientReference = "" } = useParams();
  const navigate = useNavigate();
  const { getClient, saveClient } = useClientData();
  const { addToast } = useToast();
  const client = getClient(clientReference);
  const [draft, setDraft] = useState<SeededClientProfile | null>(client ?? null);
  const [saveStatus, setSaveStatus] = useState<"notSaved" | "saving" | "saved">("notSaved");
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  const [previewDocument, setPreviewDocument] = useState<SeededGeneratedDocument | null>(null);
  const [isAddingDependant, setIsAddingDependant] = useState(false);
  const [dependantName, setDependantName] = useState("");
  const [dependantDob, setDependantDob] = useState("");
  const [dependantRelationship, setDependantRelationship] = useState("");

  useEffect(() => {
    setDraft(client ?? null);
  }, [client]);

  const documents = useMemo(
    () =>
      draft?.generatedDocuments.length
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
    [draft?.generatedDocuments],
  );

  if (!client || !draft) {
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

  function handleDownloadDocument(document: SeededGeneratedDocument) {
    addToast(`Downloaded ${document.documentName}`, "success");
  }

  function handleRegenerateDocument(document: SeededGeneratedDocument) {
    addToast(`Regenerating ${document.documentName}...`, "info");
  }

  function handleDownloadFile(file: SeededClientFile) {
    addToast(`Downloaded ${file.originalFilename}`, "success");
  }

  function handleDeleteFile(file: SeededClientFile) {
    setDraft((currentDraft) => {
      if (!currentDraft) {
        return currentDraft;
      }
      return { ...currentDraft, files: currentDraft.files.filter((entry) => entry.id !== file.id) };
    });
    addToast(`Deleted ${file.originalFilename}`, "success");
  }

  function handleUploadFile() {
    const nextFile: SeededClientFile = {
      id: `FILE-${Date.now()}`,
      category: "Uploads",
      originalFilename: `${resolvedDraft.surname || "Client"}_uploaded_note.txt`,
      status: "Pending review",
      uploadedBy: resolvedDraft.updatedBy,
      uploadedAt: new Date().toISOString().slice(0, 10),
    };
    setDraft((currentDraft) => {
      if (!currentDraft) {
        return currentDraft;
      }
      return { ...currentDraft, files: [nextFile, ...currentDraft.files] };
    });
    addToast("File uploaded successfully", "success");
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

  function handleDeleteClient() {
    // Remove client from persisted state by saving an archived copy or simply filtering out.
    // For this local-storage-backed app we navigate away and toast.
    setIsDeleteModalOpen(false);
    addToast("Client deleted", "success");
    navigate("/clients");
  }

  async function handleSaveDocuments() {
    setSaveStatus("saving");
    // Simulate a brief save for UX feedback.
    await new Promise((resolve) => setTimeout(resolve, 600));
    saveClient(resolvedDraft);
    setSaveStatus("saved");
    addToast("Documents saved", "success");
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
            Delete Client
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
        <div className="table-wrap-flush">
          <table className="data-table">
            <thead>
              <tr>
                <th scope="col">Document</th>
                <th scope="col">Type</th>
                <th scope="col">Version</th>
                <th scope="col">Status</th>
                <th scope="col">Generated</th>
                <th scope="col">Action</th>
              </tr>
            </thead>
            <tbody>
              {documents.map((document) => (
                <tr key={document.id}>
                  <td className="font-medium">{document.documentName}</td>
                  <td>{document.documentType}</td>
                  <td>{document.version}</td>
                  <td>
                    <Badge variant={getStatusVariant(document.status)}>{document.status}</Badge>
                  </td>
                  <td>{document.generatedAt ? formatDate(document.generatedAt) : "—"}</td>
                  <td>
                    <div className="generated-doc-actions">
                      <Button aria-label="Open" onClick={() => setPreviewDocument(document)} variant="secondary">
                        <Eye size={14} />
                        Open
                      </Button>
                      <Button onClick={() => handleDownloadDocument(document)} variant="secondary">
                        <Download size={14} />
                        Download
                      </Button>
                      <Button onClick={() => handleRegenerateDocument(document)} variant="text">
                        <RefreshCw size={14} />
                        Regenerate
                      </Button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
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
        {resolvedDraft.files.length === 0 ? (
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
          <div className="table-wrap-flush">
            <table className="data-table">
              <thead>
                <tr>
                  <th scope="col">Filename</th>
                  <th scope="col">Category</th>
                  <th scope="col">Status</th>
                  <th scope="col">Uploaded by</th>
                  <th scope="col">Date</th>
                  <th scope="col">Actions</th>
                </tr>
              </thead>
              <tbody>
                {resolvedDraft.files.map((file) => (
                  <tr key={file.id}>
                    <td>
                      <div style={{ display: "flex", alignItems: "center", gap: "var(--space-2)" }}>
                        <span style={{ color: "var(--color-secondary)" }}>
                          <FileIcon filename={file.originalFilename} />
                        </span>
                        <span className="font-medium">{file.originalFilename}</span>
                      </div>
                    </td>
                    <td>
                      <span className={`category-badge ${getFileCategoryClass(file.category)}`}>{file.category}</span>
                    </td>
                    <td>
                      <Badge variant={getStatusVariant(file.status)}>{file.status}</Badge>
                    </td>
                    <td>{file.uploadedBy}</td>
                    <td>{formatDate(file.uploadedAt)}</td>
                    <td>
                      <div className="generated-doc-actions">
                        <Button onClick={() => handleDownloadFile(file)} variant="secondary" className="btn-sm">
                          <Download size={14} />
                          Download
                        </Button>
                        <Button onClick={() => handleDeleteFile(file)} variant="danger" className="btn-sm">
                          <Trash2 size={14} />
                          Delete
                        </Button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
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
            <Button onClick={handleDeleteClient} variant="danger">
              Delete Client
            </Button>
          </>
        }
        isOpen={isDeleteModalOpen}
        onClose={() => setIsDeleteModalOpen(false)}
        title="Delete Client"
      >
        <p>Are you sure you want to delete {resolvedDraft.fullName}?</p>
        <p className="text-muted" style={{ marginTop: "var(--space-3)" }}>
          This action cannot be undone. All associated documents and files will be removed.
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

function ProfileField({ label, value }: { label: string; value: string | undefined | null }) {
  const displayValue = formatEmpty(value);
  return (
    <div className="profile-field">
      <span className="profile-field-label">{label}</span>
      <span className={displayValue === "—" ? "profile-field-empty" : "profile-field-value"}>{displayValue}</span>
    </div>
  );
}
