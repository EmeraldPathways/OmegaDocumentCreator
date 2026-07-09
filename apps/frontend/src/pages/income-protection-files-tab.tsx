import { type ChangeEvent, type Ref } from "react";
import {
  FolderOpen,
  Upload,
  Search,
  Download,
  Trash2,
} from "lucide-react";

import {
  File,
  FileText as FileTextIcon,
  FileType2,
} from "lucide-react";

import { Badge, Button } from "../components/ui";
import { formatDisplayDate, toLower } from "./income-protection-helpers";

export interface FilesTabDisplayFile {
  id: string;
  original_filename: string;
  file_type: string | null;
  category: string;
  uploaded_at: string | null;
  status: string | null;
}

export interface FilesTabProps {
  fileInputRef: Ref<HTMLInputElement>;
  uploadProgress: number;
  fileUploadStatus: string;
  fileFilter: string;
  onFileFilterChange: (value: string) => void;
  filteredFiles: FilesTabDisplayFile[];
  onFileSelect: () => void;
  onFileUpload: (event: ChangeEvent<HTMLInputElement>) => void;
  onFileDownload: (fileId: string, filename: string) => void;
  onFileDelete: (fileId: string, filename: string) => void;
}

function getFileIcon(filename: string) {
  const lower = toLower(filename);
  if (lower.endsWith(".pdf")) {
    return <FileType2 size={20} />;
  }
  if (lower.endsWith(".docx") || lower.endsWith(".doc")) {
    return <FileTextIcon size={20} />;
  }
  return <File size={20} />;
}

export function IncomeProtectionFilesTab({
  fileInputRef,
  uploadProgress,
  fileUploadStatus,
  fileFilter,
  onFileFilterChange,
  filteredFiles,
  onFileSelect,
  onFileUpload,
  onFileDownload,
  onFileDelete,
}: FilesTabProps) {
  return (
    <div className="page-stack">
      <div className="page-heading page-heading-compact">
        <div className="page-actions">
          <Button onClick={onFileSelect} variant="primary">
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
        onChange={(event) => { void onFileUpload(event); }}
        ref={fileInputRef}
        style={{ display: "none" }}
        type="file"
      />

      <div
        className="upload-zone"
        onClick={onFileSelect}
        onDragOver={(event) => event.preventDefault()}
        onDrop={(event) => {
          event.preventDefault();
          const dt = event.dataTransfer;
          if (dt?.files?.[0]) {
            const fakeEvent = { target: { files: dt.files } } as unknown as React.ChangeEvent<HTMLInputElement>;
            void onFileUpload(fakeEvent);
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

      <section className="section">
        <div className="section-header">
          <h3 className="section-title">Tracked client files</h3>
          <div style={{ maxWidth: "260px", width: "100%" }}>
            <div className="field-input-wrap">
              <Search size={16} style={{ marginLeft: "12px", color: "var(--color-text-muted)" }} />
              <input
                aria-label="Filter files"
                className="field-input"
                onChange={(event) => onFileFilterChange(event.target.value)}
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
            <Button onClick={onFileSelect} variant="primary">
              <Upload size={18} />
              Upload File
            </Button>
          </div>
        ) : (
          <div className="file-list" style={{ marginTop: "var(--space-4)" }}>
            {filteredFiles.map((file) => (
              <div className="file-item" key={file.id}>
                <div className="file-icon">{getFileIcon(file.original_filename)}</div>
                <div className="file-info">
                  <div className="file-name">{file.original_filename}</div>
                  <div className="file-meta">
                    {file.category} · {file.file_type ?? ""} · {file.uploaded_at ? formatDisplayDate(file.uploaded_at) : ""}
                  </div>
                </div>
                <Badge variant={toLower(file.status ?? "").includes("approved") ? "approved" : "draft"}>
                  {file.status ?? "Uploaded"}
                </Badge>
                <div className="file-actions">
                  <Button className="btn-sm" onClick={() => { void onFileDownload(file.id, file.original_filename); }} variant="secondary">
                    <Download size={14} />
                  </Button>
                  <Button className="btn-sm" onClick={() => { void onFileDelete(file.id, file.original_filename); }} variant="secondary">
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