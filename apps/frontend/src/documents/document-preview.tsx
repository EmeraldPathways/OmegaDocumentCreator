import { sanitizeGeneratedHtml } from "./document-api";
import type { GeneratedDocumentDraft, GeneratedDocumentSection } from "./document-types";

type DocumentPreviewProps = {
  draft: GeneratedDocumentDraft;
  emptyMessage?: string;
  onExportDocx?: () => void;
  onExportPdf?: () => void;
  onSectionChange?: (sectionId: string, nextBodyHtml: string) => void;
  statusLabel: string;
  templateLabel: string;
};

function escapeHtml(value: string) {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

export function buildGeneratedPreviewHtml(sections: GeneratedDocumentSection[], fallbackHtml: string) {
  if (sections.length === 0) {
    return sanitizeGeneratedHtml(fallbackHtml);
  }

  return sections
    .map(
      (section) => `<section class="document-section"><h2>${escapeHtml(section.title)}</h2>${sanitizeGeneratedHtml(section.bodyHtml)}</section>`,
    )
    .join("");
}

export function DocumentPreview({
  draft,
  emptyMessage = "No generated preview yet.",
  onExportDocx,
  onExportPdf,
  onSectionChange,
  statusLabel,
  templateLabel,
}: DocumentPreviewProps) {
  const previewHtml = buildGeneratedPreviewHtml(draft.lastGeneratedSections, draft.lastGeneratedHtml);

  return (
    <section className="fact-find-section">
      <div className="fact-find-section-header">
        <h3>Generated preview</h3>
        {previewHtml ? (
          <div className="action-toolbar">
            <button className="primary-action secondary-action icon-btn" onClick={onExportDocx} type="button">
              Export DOCX
            </button>
            <button className="primary-action icon-btn" onClick={onExportPdf} type="button">
              Export PDF
            </button>
          </div>
        ) : null}
      </div>
      <div className="client-form-grid">
        <div>
          <strong>Template</strong>
          <p>{templateLabel}</p>
        </div>
        <div>
          <strong>Status</strong>
          <p>{statusLabel}</p>
        </div>
      </div>
      {draft.lastGeneratedSections.length > 0 && onSectionChange ? (
        <div className="client-form-grid">
          {draft.lastGeneratedSections.map((section) => (
            <label key={section.id}>
              {section.title} content
              <textarea
                onChange={(event) => onSectionChange(section.id, event.target.value)}
                rows={6}
                value={sanitizeGeneratedHtml(section.bodyHtml)}
              />
            </label>
          ))}
        </div>
      ) : null}
      {previewHtml ? <div className="fact-find-section" dangerouslySetInnerHTML={{ __html: previewHtml }} /> : <p>{emptyMessage}</p>}
    </section>
  );
}
