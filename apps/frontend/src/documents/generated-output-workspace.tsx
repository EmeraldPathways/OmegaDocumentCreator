import { useMemo, useRef, useState, type ChangeEvent, type ReactNode } from "react";
import { CheckCircle2, Edit2, Eye, FileDown, RefreshCw } from "lucide-react";

import { Badge, Button } from "../components/ui";
import type { GeneratedDocumentDraft } from "./document-types";
import { OMEGA_LOGO_DATA_URI } from "./omega-logo";
import { buildPdfPreviewPages, buildPdfStyledHtml, A4_WIDTH_PX, A4_HEIGHT_PX, FOOTER_HEIGHT, OMEGA_FOOTER_LINES } from "./pdf-export";
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
  children,
  headerHtml,
  headerHeight,
  pageNumber,
  totalPages,
  showShellHeader,
  showShellFooter,
}: {
  children: string;
  headerHtml: string;
  headerHeight: number;
  pageNumber: number;
  totalPages: number;
  showShellHeader: boolean;
  showShellFooter: boolean;
}) {
  const footerLines = OMEGA_FOOTER_LINES.map(
    (line) => `<div style="font-size:7.5px;font-family:Helvetica,Arial,sans-serif;color:#444;margin-top:3px;">${line}</div>`,
  ).join("");
  const pageNumberHtml = totalPages > 1 ? `<div style="font-size:7.5px;color:#888;margin-top:5px;">Page ${pageNumber} of ${totalPages}</div>` : "";
  const contentTop = headerHtml ? 20 + headerHeight + 10 : 28;

  return (
    <div
      className="generated-output-pdf-page"
      style={{
        width: A4_WIDTH_PX,
        height: A4_HEIGHT_PX,
        minHeight: A4_HEIGHT_PX,
        background: "#fff",
        border: "1px solid #dbe3ee",
        boxShadow: "0 4px 16px rgba(15,23,42,0.08)",
        margin: "0 auto 24px",
        position: "relative",
        boxSizing: "border-box",
      }}
    >
      {headerHtml ? (
        <div
          style={{ position: "absolute", top: 20, left: 50, right: 50 }}
          dangerouslySetInnerHTML={{ __html: headerHtml }}
        />
      ) : showShellHeader ? (
        <div
          style={{
            position: "absolute",
            top: 20,
            left: 50,
            right: 50,
            textAlign: "center",
            paddingBottom: 12,
            borderBottom: "1px solid #e5e7eb",
          }}
        >
          <img
            alt="Omega Financial Management"
            src={OMEGA_LOGO_DATA_URI}
            style={{ display: "block", width: 160, height: "auto", margin: "0 auto 8px" }}
          />
        </div>
      ) : null}
      <div
        className="generated-output-pdf-page-body"
        style={{
          position: "absolute",
          top: contentTop,
          left: 50,
          right: 50,
          bottom: FOOTER_HEIGHT,
          overflow: "hidden",
          boxSizing: "border-box",
        }}
        dangerouslySetInnerHTML={{ __html: children }}
      />
      {showShellFooter ? (
        <div
          style={{
            position: "absolute",
            bottom: 18,
            left: 42,
            right: 42,
            borderTop: "1px solid #000",
            paddingTop: 6,
            textAlign: "center",
          }}
          dangerouslySetInnerHTML={{ __html: footerLines + pageNumberHtml }}
        />
      ) : null}
    </div>
  );
}

function PdfPreview({ html }: { html: string }) {
  const styledHtml = useMemo(
    () => buildPdfStyledHtml(html, true, { stripFactFindLogosForPreview: true }),
    [html],
  );
  const previewPages = useMemo(() => buildPdfPreviewPages(styledHtml), [styledHtml]);

  return (
    <>
      {previewPages.map((page, index) => (
        <PreviewPage
          headerHtml={page.headerHtml}
          headerHeight={page.headerHeight}
          key={`generated-output-page-${index + 1}`}
          pageNumber={index + 1}
          showShellFooter
          showShellHeader={!page.headerHtml}
          totalPages={previewPages.length}
        >
          {page.contentHtml}
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
  onExportPdf,
  onGenerate,
  statusDotClass,
  statusDotTestId,
  statusLabel,
}: GeneratedOutputWorkspaceProps) {
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const [fontSize, setFontSize] = useState("16px");
  const [viewMode, setViewMode] = useState<ViewMode>("edit");
  const previewHtml = resolveDraftPreviewHtml(draft);

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
            <p className="generated-output-subtitle">Edit the generated draft, preview the Omega layout, and export the final PDF.</p>
          </div>
          <div className="generated-output-status">
            {statusDotClass ? <span className={`status-dot ${statusDotClass}`} data-testid={statusDotTestId} /> : null}
            <Badge variant={draft.generationStatus === "completed" ? "saved" : "draft"}>{statusLabel}</Badge>
          </div>
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
