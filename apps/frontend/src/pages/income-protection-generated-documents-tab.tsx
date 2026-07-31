import { Download, Eye, FileDown, FileText, RefreshCw, Trash2 } from "lucide-react";

import { Badge, Button, Modal } from "../components/ui";
import type { SeededGeneratedDocument } from "../data/seeded-clients";
import type { BackendGeneratedDocument } from "../documents/generated-document-api";
import { buildStandaloneDocumentPreviewHtml } from "../documents/pdf-export";
import { formatDisplayDate, getDocumentStatusVariant } from "./income-protection-helpers";

export interface GeneratedDocumentsTabProps {
  documentPackStatus: string;
  documentDownloadStatus: string;
  displayDocuments: BackendGeneratedDocument[];
  previewDocument: SeededGeneratedDocument | null;
  canUseBackend: boolean;
  hasLoadedBackendGeneratedDocuments: boolean;
  selectedClientReference: string;
  onPreviewDocument: (doc: SeededGeneratedDocument | null) => void;
  onDownloadPack: () => void;
  onNavigateToGenerate: () => void;
  onBackendDownload: (docId: string, docName: string) => void;
  onFallbackDownload: (doc: SeededGeneratedDocument) => void;
  onRegenerate: (doc: SeededGeneratedDocument) => void;
  onBackendDelete: (docId: string, docName: string) => void;
  addToast: (message: string, variant: "success" | "error") => void;
  downloadDocument: (clientReference: string, documentId: string, filename: string) => Promise<void>;
}

function buildPreviewPayload(doc: BackendGeneratedDocument) {
  return {
    id: doc.id,
    documentType: doc.document_type,
    documentName: doc.document_name,
    version: doc.version ?? "Version 1",
    status: doc.status,
    generatedAt: doc.generated_at ?? "",
    previewHtml: doc.preview_html ?? undefined,
    previewTitle: doc.preview_title ?? undefined,
  };
}

function getDocumentMeta(doc: BackendGeneratedDocument) {
  return [doc.document_type, doc.version ?? "Version 1", doc.generated_at ? formatDisplayDate(doc.generated_at) : null]
    .filter(Boolean)
    .join(" • ");
}

export function IncomeProtectionGeneratedDocumentsTab({
  documentPackStatus,
  documentDownloadStatus,
  displayDocuments,
  previewDocument,
  canUseBackend,
  hasLoadedBackendGeneratedDocuments,
  selectedClientReference,
  onPreviewDocument,
  onDownloadPack,
  onNavigateToGenerate,
  onBackendDownload,
  onFallbackDownload,
  onRegenerate,
  onBackendDelete,
  addToast,
  downloadDocument,
}: GeneratedDocumentsTabProps) {
  const resolvedPreviewDocument = previewDocument
    ? {
        ...previewDocument,
        generated_at: previewDocument.generatedAt,
      }
    : null;

  return (
    <div className="page-stack">
      <div className="page-heading page-heading-compact">
        <div className="page-actions">
          <Button
            isLoading={documentPackStatus === "Pack: Preparing pack..."}
            onClick={onDownloadPack}
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
          <Button onClick={onNavigateToGenerate} variant="primary">
            <FileDown size={18} />
            Generate your first draft
          </Button>
        </div>
      ) : (
        <section className="section">
          <div className="section-header">
            <h3 className="section-title">Tracked generated documents</h3>
          </div>

          <div className="file-list" style={{ marginTop: "var(--space-4)" }}>
            {displayDocuments.map((doc) => {
              const hasBackendArtifact = canUseBackend
                && hasLoadedBackendGeneratedDocuments
                && Boolean(doc.id && (doc.docx_file_path || doc.pdf_file_path));
              const previewPayload = buildPreviewPayload(doc);

              return (
                <div className="file-item generated-document-item" key={doc.id ?? `${doc.document_name}-${doc.version ?? ""}`}>
                  <div className="file-icon">
                    <FileText size={20} />
                  </div>
                  <div className="file-info generated-document-info">
                    <div className="file-name">{doc.document_name}</div>
                    <div className="file-meta">{getDocumentMeta(doc)}</div>
                  </div>
                  <Badge variant={getDocumentStatusVariant(doc.status)}>{doc.status ?? "Draft"}</Badge>
                  <div className="file-actions generated-doc-actions">
                    <Button
                      aria-label={`Preview ${doc.document_name}`}
                      className="btn-sm"
                      onClick={() => onPreviewDocument(previewPayload)}
                      variant="secondary"
                    >
                      <Eye size={14} />
                    </Button>
                    {hasBackendArtifact ? (
                      <Button
                        aria-label={`Download ${doc.document_name}`}
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
                      </Button>
                    ) : (
                      <Button
                        aria-label={`Download ${doc.document_name}`}
                        className="btn-sm"
                        onClick={() => onFallbackDownload(previewPayload)}
                        variant="secondary"
                      >
                        <Download size={14} />
                      </Button>
                    )}
                    {doc.document_type !== "Terms of Business" ? (
                      <Button
                        aria-label={`Regenerate ${doc.document_name}`}
                        className="btn-sm"
                        onClick={() => onRegenerate(previewPayload)}
                        variant="secondary"
                      >
                        <RefreshCw size={14} />
                      </Button>
                    ) : null}
                    {canUseBackend ? (
                      <Button
                        aria-label={`Delete ${doc.document_name}`}
                        className="btn-sm"
                        onClick={() => { void onBackendDelete(doc.id, doc.document_name); }}
                        variant="secondary"
                      >
                        <Trash2 size={14} />
                      </Button>
                    ) : null}
                  </div>
                </div>
              );
            })}
          </div>
        </section>
      )}

      <Modal
        isOpen={Boolean(previewDocument)}
        onClose={() => onPreviewDocument(null)}
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
