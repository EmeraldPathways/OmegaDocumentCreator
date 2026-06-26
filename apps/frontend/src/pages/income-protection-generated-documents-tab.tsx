import { Download, Eye, FileDown, RefreshCw, Trash2 } from "lucide-react";

import { Badge, Button, Modal } from "../components/ui";
import { buildStandaloneDocumentPreviewHtml } from "../documents/pdf-export";
import { formatDisplayDate, getDocumentStatusVariant } from "./income-protection-helpers";
import type { SeededGeneratedDocument } from "../data/seeded-clients";
import type { BackendGeneratedDocument } from "../documents/generated-document-api";

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
        <div>
          <h2>Generated Documents</h2>
        </div>
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
                const hasBackendArtifact = canUseBackend
                  && hasLoadedBackendGeneratedDocuments
                  && Boolean(doc.id && (doc.docx_file_path || doc.pdf_file_path));
                return (
                <tr key={doc.id ?? `${doc.document_name}-${doc.version ?? ""}`}>
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
                          onPreviewDocument({
                            id: doc.id,
                            documentType: doc.document_type,
                            documentName: doc.document_name,
                            version: doc.version ?? "Version 1",
                            status: doc.status,
                            generatedAt: doc.generated_at ?? "",
                            previewHtml: doc.preview_html ?? undefined,
                            previewTitle: doc.preview_title ?? undefined,
                          });
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
                          onClick={() => onFallbackDownload({
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
                          onClick={() => onRegenerate({
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
                      {canUseBackend ? (
                        <Button
                          className="btn-sm"
                          onClick={() => { void onBackendDelete(doc.id, doc.document_name); }}
                          variant="text"
                        >
                          <Trash2 size={14} />
                          Delete
                        </Button>
                      ) : null}
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
        onClose={() => onPreviewDocument(null)}
        size="large"
        title={previewDocument?.documentName ?? "Document Preview"}
      >
        {previewDocument?.previewHtml ? (
          <iframe
            className="document-preview-iframe"
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