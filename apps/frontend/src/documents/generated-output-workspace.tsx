import { useMemo, useRef, useState, type ChangeEvent, type ReactNode } from "react";
import { CheckCircle2, Copy, Edit2, Eye, FileDown, FileText, RefreshCw } from "lucide-react";

import { Badge, Button } from "../components/ui";
import type { GeneratedDocumentDraft } from "./document-types";
import { OMEGA_LOGO_DATA_URI } from "./omega-logo";
import { buildPdfStyledHtml, paginatePdfContent, A4_WIDTH_PX, A4_HEIGHT_PX, HEADER_HEIGHT, FOOTER_HEIGHT, OMEGA_FOOTER_LINES, shouldShowPdfShellHeader } from "./pdf-export";
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

function PreviewPage({
  bodyPadding,
  children,
  pageNumber,
  totalPages,
  showShellHeader,
  showShellFooter,
}: {
  bodyPadding: string;
  children: string;
  pageNumber: number;
  totalPages: number;
  showShellHeader: boolean;
  showShellFooter: boolean;
}) {
  const footerLines = OMEGA_FOOTER_LINES.map(
    (line) => `<div style="font-size:7.5px;font-family:Helvetica,Arial,sans-serif;color:#444;margin-top:3px;">${line}</div>`,
  ).join("");
  const pageNumberHtml = totalPages > 1 ? `<div style="font-size:7.5px;color:#888;margin-top:5px;">Page ${pageNumber} of ${totalPages}</div>` : "";

  return (
    <div
      className="generated-output-pdf-page"
      style={{
        width: A4_WIDTH_PX,
        minHeight: A4_HEIGHT_PX,
        height: "auto",
        background: "#fff",
        border: "1px solid #dbe3ee",
        boxShadow: "0 4px 16px rgba(15,23,42,0.08)",
        margin: "0 auto 24px",
        position: "relative",
        boxSizing: "border-box",
      }}
    >
      {showShellHeader ? (
        <div
          style={{
            textAlign: "center",
            padding: "20px 42px 12px",
            borderBottom: "1px solid #e5e7eb",
          }}
        >
          <img
            alt="Omega Financial Management"
            src={OMEGA_LOGO_DATA_URI}
            style={{ display: "block", width: 160, height: "auto", margin: "0 auto 8px" }}
          />
          <div style={{ fontSize: 10, fontFamily: "Helvetica,Arial,sans-serif", color: "#444" }}>Income Protection Workflow</div>
        </div>
      ) : null}
      <div
        className="generated-output-pdf-page-body"
        style={{
          padding: bodyPadding,
          minHeight: showShellFooter ? A4_HEIGHT_PX - HEADER_HEIGHT - FOOTER_HEIGHT - 40 : A4_HEIGHT_PX - 80,
        }}
        dangerouslySetInnerHTML={{ __html: children }}
      />
      {showShellFooter ? (
        <div
          style={{
            margin: "0 42px",
            padding: "12px 0 8px",
            borderTop: "1px solid #000",
            textAlign: "center",
          }}
          dangerouslySetInnerHTML={{ __html: footerLines + pageNumberHtml }}
        />
      ) : null}
    </div>
  );
}

function PdfPreview({ html }: { html: string }) {
  const isStatementSource = html.includes("workflow-document-statement-of-suitability");
  const styledHtml = useMemo(
    () => buildPdfStyledHtml(html, true, { stripFactFindLogosForPreview: isStatementSource }),
    [html, isStatementSource],
  );
  const pagination = paginatePdfContent(styledHtml);
  const isStatement = styledHtml.includes("workflow-document-statement-of-suitability");
  const showShellFooter = isStatement;
  const previewBodyPadding = isStatement
    ? "20px 24px 80px"
    : "72px 80px 80px";
  const shouldRenderShellHeader = (pageIndex: number) => isStatement
    ? shouldShowPdfShellHeader(isStatement, pageIndex)
    : false;

  if (pagination.mode === "continuous") {
    return (
      <PreviewPage
        bodyPadding={previewBodyPadding}
        pageNumber={1}
        showShellFooter={showShellFooter}
        showShellHeader={shouldRenderShellHeader(0)}
        totalPages={1}
      >
        {pagination.html}
      </PreviewPage>
    );
  }

  return (
    <>
      {pagination.pages.map((pageHtml, index) => (
        <PreviewPage
          bodyPadding={previewBodyPadding}
          key={`generated-output-page-${index + 1}`}
          pageNumber={index + 1}
          showShellFooter={showShellFooter}
          showShellHeader={shouldRenderShellHeader(index)}
          totalPages={pagination.pages.length}
        >
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
        <div className="generated-output-topbar">
          <div className="generated-output-heading">
            <span className="generated-output-heading-icon" aria-hidden="true">
              <CheckCircle2 size={16} />
            </span>
            <div>
              <h3>Generated Output</h3>
              <h4 className="sr-only">Generated preview</h4>
            </div>
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
          </div>
          <div className="generated-output-actions">
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

        <div className="generated-output-meta">
          <div className="generated-output-meta-copy">
            <p className="generated-output-subtitle">Edit the generated draft, preview the Omega layout, and export the final file.</p>
          </div>
          <div className="generated-output-status">
            {statusDotClass ? <span className={`status-dot ${statusDotClass}`} data-testid={statusDotTestId} /> : null}
            <Badge variant={draft.generationStatus === "completed" ? "saved" : "draft"}>{statusLabel}</Badge>
          </div>
          <div className="generated-output-template-picker">{templatePicker}</div>
        </div>
      </div>

      {!previewHtml ? (
        <div className="generated-output-empty-state">{emptyMessage}</div>
      ) : viewMode === "edit" ? (
        <div className="generated-output-edit-mode">
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
