import { useMemo, useRef, useState, type ChangeEvent, type ReactNode } from "react";
import { Copy, Edit2, Eye, FileDown, FileText, Image as ImageIcon, RefreshCw } from "lucide-react";

import { Badge, Button } from "../components/ui";
import type { GeneratedDocumentDraft } from "./document-types";
import { buildPdfStyledHtml, paginatePdfContent } from "./pdf-export";
import { resolveDraftPreviewHtml } from "./document-preview";
import { RichDocumentEditor } from "./rich-document-editor";

type GeneratedOutputWorkspaceProps = {
  draft: GeneratedDocumentDraft;
  emptyMessage?: string;
  generateDisabled?: boolean;
  generateLabel?: string;
  onContentChange: (html: string) => void;
  onExportDocx: () => void;
  onExportPdf: () => void;
  onGenerate: () => void;
  statusDotClass?: string;
  statusDotTestId?: string;
  statusLabel: string;
  templatePicker: ReactNode;
};

type ViewMode = "edit" | "preview";

function PreviewPage({ children, pageNumber, totalPages }: { children: string; pageNumber: number; totalPages: number }) {
  return (
    <div className="generated-output-pdf-page">
      <div className="generated-output-pdf-page-header">
        <div className="generated-output-pdf-brand">Omega Financial Management</div>
        <div className="generated-output-pdf-subtitle">Income Protection Workflow</div>
      </div>
      <div className="generated-output-pdf-page-body" dangerouslySetInnerHTML={{ __html: children }} />
      <div className="generated-output-pdf-page-footer">
        <div>Suite 31, The Mall, Beacon Court, Sandyford, Dublin 18 | Tel: 01 293 8554</div>
        <div>Email: info@omegafinancial.ie | Website: www.omegafinancial.ie</div>
        {totalPages > 1 ? <div>{`Page ${pageNumber} of ${totalPages}`}</div> : null}
      </div>
    </div>
  );
}

function PdfPreview({ html }: { html: string }) {
  const styledHtml = useMemo(() => buildPdfStyledHtml(html, true), [html]);
  const pagination = paginatePdfContent(styledHtml);

  if (pagination.mode === "continuous") {
    return <PreviewPage pageNumber={1} totalPages={1}>{pagination.html}</PreviewPage>;
  }

  return (
    <>
      {pagination.pages.map((pageHtml, index) => (
        <PreviewPage key={`generated-output-page-${index + 1}`} pageNumber={index + 1} totalPages={pagination.pages.length}>
          {pageHtml}
        </PreviewPage>
      ))}
    </>
  );
}

export function GeneratedOutputWorkspace({
  draft,
  emptyMessage = "Generate a draft to start editing.",
  generateDisabled = false,
  generateLabel = "Generate Draft",
  onContentChange,
  onExportDocx,
  onExportPdf,
  onGenerate,
  statusDotClass,
  statusDotTestId,
  statusLabel,
  templatePicker,
}: GeneratedOutputWorkspaceProps) {
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const [copied, setCopied] = useState(false);
  const [fontSize, setFontSize] = useState("16px");
  const [viewMode, setViewMode] = useState<ViewMode>("edit");
  const previewHtml = resolveDraftPreviewHtml(draft);

  function handleCopy() {
    const plainText = previewHtml.replace(/<[^>]+>/g, " ").replace(/\s+/g, " ").trim();
    void navigator.clipboard.writeText(plainText);
    setCopied(true);
    window.setTimeout(() => setCopied(false), 1200);
  }

  function handleImageChange(event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    if (!file) {
      return;
    }

    const reader = new FileReader();
    reader.onload = () => {
      const dataUrl = typeof reader.result === "string" ? reader.result : "";
      if (!dataUrl) {
        return;
      }

      onContentChange(`${previewHtml}<p><img alt="${file.name}" src="${dataUrl}" style="width:60%;" /></p>`);
      setViewMode("edit");
    };
    reader.readAsDataURL(file);
    event.target.value = "";
  }

  return (
    <section className="generated-output-workspace">
      <input
        accept="image/*"
        className="sr-only"
        onChange={handleImageChange}
        ref={fileInputRef}
        type="file"
      />
      <div className="generated-output-header">
        <div className="generated-output-heading">
          <div>
            <h3>Generated Output</h3>
            <h4 className="sr-only">Generated preview</h4>
            <p className="generated-output-subtitle">Edit the generated draft, preview the Omega layout, and export the final file.</p>
          </div>
          <div className="generated-output-status">
            {statusDotClass ? <span className={`status-dot ${statusDotClass}`} data-testid={statusDotTestId} /> : null}
            <Badge variant={draft.generationStatus === "completed" ? "saved" : "draft"}>{statusLabel}</Badge>
          </div>
        </div>
        <div className="generated-output-actions">
          <div className="generated-output-template-picker">{templatePicker}</div>
          <div className="generated-output-view-toggle" role="group" aria-label="Generated output mode">
            <button
              aria-pressed={viewMode === "edit"}
              className={viewMode === "edit" ? "is-active" : ""}
              onClick={() => setViewMode("edit")}
              type="button"
            >
              <Edit2 size={14} />
              Edit
            </button>
            <button
              aria-pressed={viewMode === "preview"}
              className={viewMode === "preview" ? "is-active" : ""}
              onClick={() => setViewMode("preview")}
              type="button"
            >
              <Eye size={14} />
              PDF Preview
            </button>
          </div>
          <Button onClick={handleCopy} variant="secondary">
            <Copy size={16} />
            {copied ? "Copied" : "Copy Text"}
          </Button>
          <Button disabled={!previewHtml} onClick={onExportDocx} variant="secondary">
            <FileText size={16} />
            Export DOCX
          </Button>
          <Button disabled={!previewHtml} onClick={onExportPdf} variant="secondary">
            <FileDown size={16} />
            Export PDF
          </Button>
          <Button disabled={generateDisabled} onClick={onGenerate} variant="primary">
            <RefreshCw size={16} />
            {generateLabel}
          </Button>
        </div>
      </div>

      {!previewHtml ? (
        <div className="generated-output-empty-state">{emptyMessage}</div>
      ) : viewMode === "edit" ? (
        <div className="generated-output-edit-mode">
          <div className="generated-output-editor-actions">
            <Button onClick={() => fileInputRef.current?.click()} variant="secondary">
              <ImageIcon size={16} />
              Add Image
            </Button>
          </div>
          <RichDocumentEditor
            content={previewHtml}
            fontSize={fontSize}
            onAddImage={() => fileInputRef.current?.click()}
            onContentChange={onContentChange}
            onFontSizeChange={setFontSize}
          />
        </div>
      ) : (
        <div className="generated-output-preview-shell">
          <PdfPreview html={previewHtml} />
        </div>
      )}
    </section>
  );
}
