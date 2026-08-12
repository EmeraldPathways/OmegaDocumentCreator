import { sanitizeGeneratedHtml } from "./document-api";
import { OMEGA_LOGO_DATA_URI } from "./omega-logo";

export const A4_WIDTH_PX = 794;
export const A4_HEIGHT_PX = 1123;
export const HEADER_HEIGHT = 120;
export const FOOTER_HEIGHT = 128;
const REPEATING_HEADER_TOP_OFFSET = 20;
const REPEATING_HEADER_BOTTOM_GAP = 10;
const PAGE_TOP_PADDING_WITH_REPEATING_HEADER =
  REPEATING_HEADER_TOP_OFFSET + HEADER_HEIGHT + REPEATING_HEADER_BOTTOM_GAP;
export const PAGE_CONTENT_HEIGHT = A4_HEIGHT_PX - PAGE_TOP_PADDING_WITH_REPEATING_HEADER - FOOTER_HEIGHT - 20;
const RENDER_SCALE = 3;
const A4_WIDTH_MM = 210;
const A4_HEIGHT_MM = 297;
const PAGE_TOP_PADDING_WITHOUT_HEADER = 28;

function resolvePageTopPaddingWithHeader(headerHeight = HEADER_HEIGHT) {
  return REPEATING_HEADER_TOP_OFFSET + headerHeight + REPEATING_HEADER_BOTTOM_GAP;
}

function resolvePageContentHeight(headerHeight = HEADER_HEIGHT) {
  return A4_HEIGHT_PX - resolvePageTopPaddingWithHeader(headerHeight) - FOOTER_HEIGHT - 20;
}

function shouldStartOnFreshPdfPage(element: Element) {
  return (
    element.classList.contains("fact-find-life-savings-group") ||
    element.classList.contains("fact-find-final-section-group") ||
    element.classList.contains("fact-find-asset-liability-section") ||
    element.classList.contains("fact-find-pension-self-section") ||
    element.classList.contains("fact-find-pension-partner-section")
  );
}

type JsPdfCtor = typeof import("jspdf").jsPDF;
type JsPdfInstance = InstanceType<JsPdfCtor>;

async function loadPdfDependencies() {
  const [{ default: html2canvas }, { jsPDF }] = await Promise.all([
    import("html2canvas"),
    import("jspdf"),
  ]);

  return { html2canvas, jsPDF };
}

function stripMarkdownFences(html: string) {
  return html.replace(/^\s*```html\s*/i, "").replace(/```\s*$/i, "").trim();
}

function appendStyle(existingStyle: string | null, nextStyle: string) {
  return [existingStyle ?? "", nextStyle].filter(Boolean).join(";");
}

function stripPreviewLogosForWorkflowPreview(html: string) {
  if (typeof DOMParser === "undefined") {
    return html;
  }

  const parser = new DOMParser();
  const sourceDocument = parser.parseFromString(stripMarkdownFences(html), "text/html");
  const factFindArticle = sourceDocument.querySelector(
    ".workflow-document-fact-find, .workflow-document-fact-find-update",
  );

  if (!factFindArticle) {
    return html;
  }

  factFindArticle.querySelectorAll(".document-top-logo").forEach((element) => {
    element.remove();
  });

  return sourceDocument.body.innerHTML.trim();
}

type BuildPdfStyledHtmlOptions = {
  stripFactFindLogosForPreview?: boolean;
};

function hasPdfClass(sourceElement: Element, className: string) {
  return sourceElement.classList.contains(className);
}

function isPdfBlock(sourceElement: Element) {
  return (
    hasPdfClass(sourceElement, "document-banner") ||
    hasPdfClass(sourceElement, "client-summary-grid") ||
    hasPdfClass(sourceElement, "document-grid") ||
    hasPdfClass(sourceElement, "document-section") ||
    hasPdfClass(sourceElement, "document-callout") ||
    hasPdfClass(sourceElement, "document-top-logo") ||
    hasPdfClass(sourceElement, "signatures-footer") ||
    hasPdfClass(sourceElement, "statement-letter-header") ||
    hasPdfClass(sourceElement, "statement-header-top") ||
    hasPdfClass(sourceElement, "statement-client-details") ||
    hasPdfClass(sourceElement, "statement-address-block") ||
    hasPdfClass(sourceElement, "statement-address-line") ||
    hasPdfClass(sourceElement, "statement-opening") ||
    hasPdfClass(sourceElement, "statement-section") ||
    hasPdfClass(sourceElement, "statement-important-notice") ||
    hasPdfClass(sourceElement, "statement-quote-block") ||
    hasPdfClass(sourceElement, "statement-quote-summary") ||
    hasPdfClass(sourceElement, "statement-quote-table") ||
    hasPdfClass(sourceElement, "statement-quote-row") ||
    hasPdfClass(sourceElement, "statement-quote-row-header") ||
    hasPdfClass(sourceElement, "statement-quote-cell") ||
    hasPdfClass(sourceElement, "statement-closing") ||
    hasPdfClass(sourceElement, "statement-declaration") ||
    hasPdfClass(sourceElement, "statement-important-info") ||
    hasPdfClass(sourceElement, "statement-footer-contact") ||
    hasPdfClass(sourceElement, "fact-find-signing-block") ||
    hasPdfClass(sourceElement, "fact-find-signature-row") ||
    hasPdfClass(sourceElement, "fact-find-signature-field") ||
    hasPdfClass(sourceElement, "fact-find-signature-field-date") ||
    hasPdfClass(sourceElement, "fact-find-request-copy") ||
    hasPdfClass(sourceElement, "fact-find-request-row") ||
    hasPdfClass(sourceElement, "fact-find-request-field") ||
    hasPdfClass(sourceElement, "fact-find-request-field-date")
  );
}

function elementIsStatement(sourceElement: Element) {
  const classList = sourceElement.classList;
  return (
    classList.contains("statement-letter-header") ||
    classList.contains("statement-header-top") ||
    classList.contains("statement-client-details") ||
    classList.contains("statement-logo") ||
    classList.contains("statement-address-block") ||
    classList.contains("statement-address-line") ||
    classList.contains("statement-letter-date") ||
    classList.contains("statement-opening") ||
    classList.contains("statement-section") ||
    classList.contains("statement-important-notice") ||
    classList.contains("statement-quote-block") ||
    classList.contains("statement-quote-summary") ||
    classList.contains("statement-quote-table") ||
    classList.contains("statement-quote-row") ||
    classList.contains("statement-quote-row-header") ||
    classList.contains("statement-quote-cell") ||
    classList.contains("statement-closing") ||
    classList.contains("statement-declaration") ||
    classList.contains("statement-important-info") ||
    classList.contains("statement-signature-area") ||
    classList.contains("statement-signature-line") ||
    classList.contains("statement-footer-contact") ||
    classList.contains("statement-document-body") ||
    (sourceElement.parentElement?.classList.contains("statement-document-body") ?? false) ||
    (sourceElement.parentElement?.classList.contains("statement-section") ?? false)
  );
}

function getFactFindQuoteGridTemplate(sourceElement: Element) {
  const rowContainer = sourceElement.classList.contains("statement-quote-row")
    || sourceElement.classList.contains("statement-quote-row-header")
    ? sourceElement
    : sourceElement.closest(".statement-quote-row, .statement-quote-row-header");

  if (!rowContainer) {
    return null;
  }

  if (rowContainer.closest(".fact-find-assets-table")) {
    return "minmax(160px,1.2fr) repeat(2,minmax(120px,1fr))";
  }

  if (rowContainer.closest(".fact-find-liabilities-table")) {
    return "minmax(120px,1.1fr) repeat(4,minmax(110px,1fr))";
  }

  if (rowContainer.closest(".fact-find-savings-table")) {
    return "minmax(76px,0.8fr) minmax(126px,1.28fr) minmax(82px,0.94fr) minmax(82px,0.94fr) minmax(64px,0.64fr)";
  }

  if (rowContainer.closest(".fact-find-life-insurance-compare-table")) {
    return "minmax(180px,1.3fr) repeat(2,minmax(120px,1fr))";
  }

  if (
    rowContainer.closest(".fact-find-life-insurance-summary-table")
    || rowContainer.closest(".fact-find-life-insurance-policy-table")
    || rowContainer.closest(".fact-find-pension-self-table")
    || rowContainer.closest(".fact-find-pension-partner-table")
  ) {
    return "minmax(200px,1.5fr) minmax(140px,1fr)";
  }

  return null;
}

function isCompactFactFindTableCell(sourceElement: Element) {
  const rowContainer = sourceElement.classList.contains("statement-quote-cell")
    ? sourceElement.parentElement
    : sourceElement.closest(".statement-quote-cell")?.parentElement;

  if (!rowContainer) {
    return false;
  }

  return Boolean(
    rowContainer.closest(".fact-find-assets-table")
    || rowContainer.closest(".fact-find-liabilities-table")
    || rowContainer.closest(".fact-find-savings-table")
    || rowContainer.closest(".fact-find-life-insurance-summary-table")
    || rowContainer.closest(".fact-find-life-insurance-compare-table")
    || rowContainer.closest(".fact-find-life-insurance-policy-table"),
  );
}

function elementStyles(sourceElement: Element) {
  const tagName = sourceElement.tagName.toLowerCase();
  const classList = sourceElement.classList;
  const isStmt = elementIsStatement(sourceElement);
  const workflowRoot = sourceElement.closest(".workflow-document");
  const isQuoteDoc = Boolean(workflowRoot?.classList.contains("workflow-document-quote"));
  const isFactFindDoc = Boolean(
    workflowRoot?.classList.contains("workflow-document-fact-find")
    || workflowRoot?.classList.contains("workflow-document-fact-find-update"),
  );

  // --- Statement formal document styles (stop web-card look) ---
  if (classList.contains("statement-document-body")) {
    return "display:block;color:#1f2937;font-family:Georgia,'Times New Roman',serif;font-size:14px;line-height:1.7";
  }

  if (classList.contains("statement-letter-header")) {
    return "display:flex;align-items:flex-start;gap:24px;margin:0 0 18px;padding-bottom:14px;border-bottom:2px solid #c68b2c;page-break-inside:avoid";
  }

  if (classList.contains("statement-header-top")) {
    return "display:flex;flex-direction:row;align-items:flex-start;gap:24px;margin-bottom:8px";
  }

  if (classList.contains("statement-logo")) {
    return "display:block;width:180px;height:auto;margin:0;border-radius:0;flex-shrink:0";
  }

  if (classList.contains("statement-client-details")) {
    return "display:flex;flex:1;flex-direction:column;align-items:flex-end;min-width:0;margin-left:auto;text-align:right;line-height:1";
  }

  if (classList.contains("statement-client-name")) {
    return "margin:0 0 8px;font-family:Georgia,'Times New Roman',serif;font-size:14px;font-weight:700;color:#000";
  }

  if (classList.contains("statement-address-block")) {
    return "display:block;text-align:right;margin:0 0 6px";
  }

  if (classList.contains("statement-address-line")) {
    return "display:block;margin:0;line-height:1;font-size:12px;color:#1f2937";
  }

  if (isStmt && tagName === "p" && sourceElement.parentElement?.classList.contains("statement-address-block")) {
    return "display:block;margin:0;line-height:1;font-size:12px;color:#1f2937";
  }

  if (isStmt && classList.contains("statement-letter-date")) {
    return "margin:0;text-align:right;font-family:Helvetica,Arial,sans-serif;font-size:12px;font-weight:600;line-height:1.15;color:#5b2230";
  }

  if (classList.contains("statement-opening")) {
    return `display:block;margin:0 0 ${isQuoteDoc ? "10px" : "24px"};page-break-inside:avoid`;
  }

  // Statement section headings: black, bold, underlined, serif
  if (isStmt && tagName === "h2") {
    return `margin:0 0 ${isQuoteDoc ? "6px" : "10px"};padding-bottom:${isQuoteDoc ? "4px" : "6px"};border-bottom:1px solid #e5e7eb;font-family:Helvetica,Arial,sans-serif;font-size:${isQuoteDoc ? "15px" : "16px"};font-weight:700;letter-spacing:0.02em;color:#5b2230`;
  }

  if (classList.contains("statement-important-notice")) {
    return "display:block;border:1.5px solid #000;padding:14px 16px;margin:0 0 20px;page-break-inside:avoid";
  }

  if (classList.contains("statement-recommendation-paragraph")) {
    return "display:block;margin:0;padding:12px 14px;border:1px solid #e5d5c5;border-radius:12px;background:#fffaf4;line-height:1.65;page-break-inside:avoid";
  }

  if (classList.contains("statement-quote-block")) {
    return `display:block;margin:0 0 ${isQuoteDoc ? "12px" : "20px"};page-break-inside:avoid`;
  }

  if (classList.contains("statement-quote-summary")) {
    return isQuoteDoc
      ? "display:grid;grid-template-columns:repeat(2,minmax(0,1fr));column-gap:18px;row-gap:2px;margin:0 0 6px;page-break-inside:avoid"
      : "display:block;margin:0 0 12px";
  }

  if (classList.contains("statement-quote-table")) {
    return `display:block;margin:0 0 ${isQuoteDoc ? "6px" : "8px"};border:1px solid #d6d3d1;border-radius:12px;overflow:hidden`;
  }

  if (classList.contains("statement-quote-row-header")) {
    const gridTemplateColumns = getFactFindQuoteGridTemplate(sourceElement) ?? "1.4fr 1fr 1fr 1fr";
    return `display:grid;grid-template-columns:${gridTemplateColumns};background:#f6ede3`;
  }

  if (classList.contains("statement-quote-row")) {
    const gridTemplateColumns = getFactFindQuoteGridTemplate(sourceElement) ?? "1.4fr 1fr 1fr 1fr";
    return `display:grid;grid-template-columns:${gridTemplateColumns};border-top:1px solid #e5e7eb`;
  }

  if (classList.contains("statement-quote-cell")) {
    const baseStyle = `display:block;padding:${
      isQuoteDoc
        ? "2px 5px"
        : isFactFindDoc && isCompactFactFindTableCell(sourceElement)
          ? "2px 5px"
          : "10px 12px"
    }`;
    return sourceElement.previousElementSibling === null ? baseStyle : `${baseStyle};border-left:1px solid #e5e7eb`;
  }

  if (classList.contains("statement-closing")) {
    return "display:block;margin:24px 0 0;page-break-inside:avoid";
  }

  if (classList.contains("statement-signature-area")) {
    return classList.contains("statement-signature-row")
      ? "display:flex;align-items:flex-start;column-gap:24px;margin:16px 0 0"
      : "display:block;margin:16px 0 0";
  }

  if (classList.contains("statement-signature-block")) {
    return "display:flex;flex-direction:column;align-items:flex-start";
  }

  if (classList.contains("statement-signature-block-date")) {
    return "display:flex;flex-direction:column;align-items:flex-start;margin-left:12px";
  }

  if (classList.contains("statement-signature-line")) {
    return "margin:0";
  }

  if (classList.contains("statement-signature-label")) {
    return "margin:8px 0 0";
  }

  if (classList.contains("statement-declaration")) {
    return "display:block;border:1px solid #000;padding:14px 16px;margin:20px 0 0;page-break-inside:avoid";
  }

  if (classList.contains("statement-important-info")) {
    return "display:block;border:1px solid #000;padding:14px 16px;margin:20px 0 0;page-break-inside:avoid";
  }

  if (classList.contains("fact-find-signing-block")) {
    return "display:block";
  }

  if (classList.contains("fact-find-signature-row")) {
    return "display:grid;grid-template-columns:76px minmax(200px,1fr) 28px 88px;align-items:center;column-gap:6px;margin:0 0 10px";
  }

  if (classList.contains("fact-find-signature-field")) {
    return "display:flex;align-items:center;min-width:0;align-self:center;padding-bottom:1px;border-bottom:1px solid #6b7280";
  }

  if (classList.contains("fact-find-signature-field-date")) {
    return "display:flex;align-items:center;min-width:0;align-self:center;width:88px;padding-bottom:1px;border-bottom:1px solid #6b7280";
  }

  if (classList.contains("fact-find-request-copy")) {
    return "display:block;margin:0 0 8px";
  }

  if (classList.contains("fact-find-request-row")) {
    return "display:flex;align-items:flex-start;gap:10px;margin:0 0 8px";
  }

  if (classList.contains("fact-find-request-field")) {
    return "display:block;flex:1 1 auto";
  }

  if (classList.contains("fact-find-request-field-date")) {
    return "display:block;flex:0 0 108px";
  }

  // Statement paragraphs: black, serif, tighter spacing
  if (isStmt && tagName === "p") {
    if (sourceElement.parentElement?.classList.contains("statement-quote-summary")) {
      return `margin:0;line-height:${isQuoteDoc ? "1.05" : "1.5"};white-space:pre-wrap;color:#1f2937;font-size:${isQuoteDoc ? "13px" : "14px"}`;
    }

    if (
      sourceElement.parentElement?.classList.contains("statement-quote-cell")
      && sourceElement.parentElement.parentElement?.classList.contains("statement-quote-row-header")
    ) {
      return `margin:0;line-height:1;white-space:pre-wrap;color:#5b2230;font-family:Helvetica,Arial,sans-serif;font-size:${
        isQuoteDoc ? "10px" : isFactFindDoc && isCompactFactFindTableCell(sourceElement) ? "9px" : "12px"
      };font-weight:700;letter-spacing:0.02em;text-transform:uppercase`;
    }

    if (sourceElement.parentElement?.classList.contains("statement-quote-cell")) {
      return `margin:0;line-height:${
        isQuoteDoc ? "1" : isFactFindDoc && isCompactFactFindTableCell(sourceElement) ? "1" : "1.7"
      };white-space:pre-wrap;color:#1f2937;font-size:${isQuoteDoc ? "13px" : isFactFindDoc && isCompactFactFindTableCell(sourceElement) ? "12px" : "14px"}`;
    }

    return "margin:0 0 8px;line-height:1.7;white-space:pre-wrap;color:#1f2937";
  }

  if (tagName === "strong" && sourceElement.parentElement?.classList.contains("statement-recommendation-paragraph")) {
    return "color:#5b2230;font-weight:700";
  }

  if (classList.contains("fact-find-signing-intro")) {
    return "margin:0 0 6px;font-weight:600";
  }

  if (classList.contains("fact-find-signing-subheading")) {
    return "margin:8px 0 6px;font-weight:700";
  }

  if (classList.contains("fact-find-signature-label")) {
    return "margin:0;min-width:0;font-size:12px;line-height:1;white-space:nowrap";
  }

  if (classList.contains("fact-find-signature-label-date")) {
    return "margin:0;min-width:0;font-size:12px;line-height:1;white-space:nowrap;text-align:left";
  }

  if (classList.contains("fact-find-signature-value")) {
    return "margin:0;min-height:0;line-height:1;padding:0;border-bottom:0;font-weight:600";
  }

  if (classList.contains("fact-find-request-value")) {
    return "margin:0;min-height:16px;padding:0 0 1px;border-bottom:1px solid #6b7280;font-weight:600";
  }

  if (classList.contains("fact-find-request-label")) {
    return "margin:2px 0 0;font-weight:700";
  }

  if (classList.contains("fact-find-request-footnote")) {
    return "margin:8px 0 0;font-size:9px;color:#6b7280";
  }

  if (classList.contains("fact-find-asset-liability-section")) {
    return "display:block;border:1px solid #e5e7eb;border-radius:14px;background:#faf7f2;padding:8px 10px;margin:0 0 8px;page-break-inside:avoid";
  }

  if (classList.contains("fact-find-asset-liability-layout")) {
    return "display:flex;flex-direction:column;gap:8px";
  }

  if (classList.contains("fact-find-detail-subsection")) {
    return "display:flex;flex-direction:column;gap:3px";
  }

  if (classList.contains("fact-find-comments-box")) {
    return "display:block;margin-top:2px;padding:3px 6px 4px;border:1px solid #d9e2ee;border-radius:10px;background:#ffffff";
  }

  if (classList.contains("fact-find-comments-label")) {
    return "margin:0 0 2px;font-size:10px;font-weight:700;color:#7c4b2a;letter-spacing:0.08em;text-transform:uppercase";
  }

  if (classList.contains("fact-find-comments-value")) {
    return "margin:0;font-size:11px;font-weight:600;color:#172033;line-height:1.05";
  }

  if (classList.contains("fact-find-life-insurance-card")) {
    return "display:flex;flex-direction:column;gap:2px";
  }

  if (classList.contains("fact-find-life-insurance-divider")) {
    return "display:none";
  }

  if (classList.contains("fact-find-life-insurance-block")) {
    return "display:flex;flex-direction:column;gap:1px";
  }

  if (
    classList.contains("fact-find-life-insurance-summary-label")
    || classList.contains("fact-find-life-insurance-policy-label")
  ) {
    return "margin:0;flex:1 1 auto;font-size:11px;line-height:1.05;color:#1f2937";
  }

  if (classList.contains("fact-find-life-insurance-value")) {
    return `margin:0;font-size:11px;line-height:1.05;color:${classList.contains("is-muted") ? "#7b7b7b" : "#1f2937"};flex:0 0 min(156px,34%)`;
  }

  if (classList.contains("fact-find-life-insurance-compare-table")) {
    return "display:block;overflow:hidden;border:1px solid #e6d6c7;border-radius:12px;background:rgba(255,255,255,0.86)";
  }

  if (classList.contains("fact-find-pension-self-section") || classList.contains("fact-find-pension-partner-section")) {
    return "display:block;padding:18px 20px;border:1px solid #e6d6c7;border-radius:22px;background:linear-gradient(180deg,#fffdfa 0%,#fff8f1 100%);page-break-inside:avoid";
  }

  if (classList.contains("fact-find-pension-card")) {
    return "display:flex;flex-direction:column;gap:16px";
  }

  if (classList.contains("fact-find-pension-panel")) {
    return "display:block;overflow:hidden;border:1px solid #e6d6c7;border-radius:20px;background:rgba(255,255,255,0.88)";
  }

  if (classList.contains("fact-find-pension-panel-header")) {
    return "display:flex;align-items:center;justify-content:space-between;gap:16px;padding:10px 16px;border-bottom:1px solid rgba(230,214,199,0.9);background:rgba(250,240,231,0.95)";
  }

  if (tagName === "h3" && sourceElement.parentElement?.classList.contains("fact-find-pension-panel-header")) {
    return "margin:0;font-size:11px;font-weight:700;color:#5b2230;letter-spacing:0.06em;text-transform:uppercase";
  }

  if (classList.contains("fact-find-pension-panel-status")) {
    return `margin:0;font-size:11px;font-weight:700;letter-spacing:0.06em;text-transform:uppercase;color:${classList.contains("is-positive") ? "#2f8a48" : "#5b2230"}`;
  }

  if (classList.contains("fact-find-pension-detail-list")) {
    return "display:flex;flex-direction:column";
  }

  if (classList.contains("fact-find-pension-metric-row") || classList.contains("fact-find-pension-contributions-row")) {
    return "display:flex;align-items:center;justify-content:space-between;gap:14px;padding:10px 16px;border-top:1px solid rgba(230,214,199,0.9)";
  }

  if (classList.contains("fact-find-pension-metric-label")) {
    return "margin:0;flex:1 1 auto;font-size:14px;color:#1f2937";
  }

  if (classList.contains("fact-find-pension-value")) {
    return `margin:0;flex:0 0 auto;min-width:120px;font-size:14px;font-weight:500;color:${classList.contains("is-muted") ? "#7b7b7b" : "#1f2937"}`;
  }

  if (classList.contains("fact-find-pension-contributions-values")) {
    return "display:grid;grid-template-columns:repeat(2,minmax(120px,1fr));gap:12px";
  }

  if (classList.contains("fact-find-pension-contribution-block")) {
    return "display:flex;flex-direction:column;gap:2px";
  }

  if (classList.contains("fact-find-pension-contribution-label")) {
    return "margin:0;font-size:12px;color:#5f5146";
  }

  if (classList.contains("fact-find-pension-empty-state")) {
    return "display:block;padding:16px;background:linear-gradient(180deg,#fbf7f1 0%,#f6efe5 100%)";
  }

  if (classList.contains("fact-find-pension-empty-title")) {
    return "margin:0 0 8px;font-size:14px;font-weight:700;color:#5b2230";
  }

  if (classList.contains("fact-find-pension-empty-copy")) {
    return "margin:0;font-size:12px;color:#5f5146";
  }

  if (isStmt && tagName === "strong") {
    return "font-weight:700;color:#1f2937";
  }

  if (isStmt && (tagName === "ul" || tagName === "ol")) {
    return "margin:0 0 10px;padding-left:22px;color:#1f2937";
  }

  if (isStmt && tagName === "li") {
    return "margin:0 0 6px;line-height:1.7;color:#1f2937";
  }

  // --- Existing non-Statement styles (unchanged) ---
  if (tagName === "article" && classList.contains("workflow-document")) {
    return "display:block;color:#1f2937;font-family:Georgia,'Times New Roman',serif;font-size:14px;line-height:1.6";
  }

  if (tagName === "div" && classList.contains("document-top-logo")) {
    return "display:flex;justify-content:center;margin:0 0 20px;page-break-inside:avoid";
  }

  if ((tagName === "header" || tagName === "div") && classList.contains("document-banner")) {
    return `display:block;background:#f6ede3;border:1px solid #e5d5c5;border-radius:16px;padding:${isFactFindDoc ? "16px 20px" : "22px 24px"};margin:0 0 ${isFactFindDoc ? "14px" : "18px"};page-break-inside:avoid`;
  }

  if (tagName === "p" && classList.contains("document-eyebrow")) {
    return "margin:0 0 8px;font-family:Helvetica,Arial,sans-serif;font-size:11px;font-weight:700;letter-spacing:1.4px;text-transform:uppercase;color:#7c4b2a";
  }

  if (tagName === "p" && classList.contains("document-subtitle")) {
    return "margin:8px 0 0;font-family:Helvetica,Arial,sans-serif;font-size:13px;color:#6b7280";
  }

  if ((tagName === "section" || tagName === "div") && classList.contains("fact-find-declarations-section")) {
    return "display:block;border:1px solid #e5e7eb;border-radius:12px;padding:8px 10px;margin:0;background:#faf7f2;page-break-inside:avoid";
  }

  if ((tagName === "section" || tagName === "div") && classList.contains("fact-find-life-savings-group")) {
    return "display:flex;flex-direction:column;gap:4px;margin:0 0 6px;page-break-inside:avoid";
  }

  if ((tagName === "section" || tagName === "div") && classList.contains("fact-find-final-section-group")) {
    return "display:flex;flex-direction:column;gap:5px;margin:0 0 6px;page-break-inside:avoid";
  }

  if ((tagName === "section" || tagName === "div") && classList.contains("fact-find-signatures-section")) {
    return "display:block;margin:0;padding:0;page-break-inside:avoid";
  }

  if ((tagName === "section" || tagName === "div") && classList.contains("fact-find-request-section")) {
    return "display:block;margin:0;padding:0;page-break-inside:avoid";
  }

  if ((tagName === "section" || tagName === "div") && classList.contains("fact-find-life-insurance-section")) {
    return "display:block;border:1px solid #e5e7eb;border-radius:12px;padding:8px 10px;margin:0;background:#faf7f2;page-break-inside:avoid";
  }

  if ((tagName === "section" || tagName === "div") && classList.contains("fact-find-savings-section")) {
    return "display:block;border:1px solid #e5e7eb;border-radius:12px;padding:8px 10px;margin:0;background:#faf7f2;page-break-inside:avoid";
  }

  if ((tagName === "section" || tagName === "div") && (classList.contains("client-summary-grid") || classList.contains("document-grid"))) {
    return `display:block;border:1px solid #e5e7eb;border-radius:14px;padding:${isFactFindDoc ? "14px 16px" : "18px 20px"};margin:0 0 ${isFactFindDoc ? "12px" : "16px"};background:#faf7f2;page-break-inside:avoid`;
  }

  if ((tagName === "section" || tagName === "div") && classList.contains("document-section")) {
    return "display:block;margin:0 0 16px;padding:0 0 2px;page-break-inside:avoid";
  }

  if ((tagName === "aside" || tagName === "div") && classList.contains("document-callout")) {
    return "display:block;background:#fff6e6;border-left:6px solid #c68b2c;border-radius:12px;padding:16px 18px;margin:0 0 16px;page-break-inside:avoid";
  }

  if ((tagName === "footer" || tagName === "div") && classList.contains("signatures-footer")) {
    return "display:block;margin-top:20px;padding-top:14px;border-top:2px solid #5b2230;page-break-inside:avoid";
  }

  if (tagName === "div" && classList.contains("grid-items")) {
    const isClientSummaryGrid = sourceElement.parentElement?.classList.contains("client-summary-grid") ?? false;
    const isDeclarationsGrid = sourceElement.parentElement?.classList.contains("fact-find-declarations-section") ?? false;
    const columns = isFactFindDoc && isClientSummaryGrid
      ? "repeat(3,minmax(180px,1fr))"
      : "repeat(2,minmax(0,1fr))";
    return `display:grid;grid-template-columns:${columns};gap:${isDeclarationsGrid ? "5px" : isFactFindDoc ? "7px" : "10px"}`;
  }

  if (tagName === "div" && classList.contains("grid-item")) {
    const isDeclarationsItem = sourceElement.parentElement?.parentElement?.classList.contains("fact-find-declarations-section") ?? false;
    return `display:block;background:#ffffff;border:1px solid #e5e7eb;border-radius:10px;padding:${
      isDeclarationsItem ? "4px 7px" : isFactFindDoc ? "6px 10px" : "10px 12px"
    };min-height:${isDeclarationsItem ? "0" : "48px"};line-height:${isFactFindDoc ? "1.2" : "1.6"}`;
  }

  if (tagName === "span" && classList.contains("grid-label")) {
    return "display:block;font-family:Helvetica,Arial,sans-serif;font-size:10px;font-weight:700;letter-spacing:0.6px;text-transform:uppercase;color:#7c4b2a;margin-bottom:4px";
  }

  if (tagName === "strong" && sourceElement.parentElement?.classList.contains("grid-item")) {
    return `display:block;font-size:13px;color:#111827;font-family:${isFactFindDoc ? "Helvetica,Arial,sans-serif" : "inherit"};line-height:${isFactFindDoc ? "1.2" : "inherit"}`;
  }

  if (!isStmt && tagName === "h1") {
    return "margin:0;font-family:Helvetica,Arial,sans-serif;font-size:26px;font-weight:700;line-height:1.2;color:#3c1321";
  }

  if (!isStmt && tagName === "h2") {
    const inTightFactFindGroup = Boolean(
      sourceElement.closest(".fact-find-life-insurance-section")
      || sourceElement.closest(".fact-find-savings-section")
      || sourceElement.closest(".fact-find-declarations-section")
      || sourceElement.closest(".fact-find-signatures-section")
      || sourceElement.closest(".fact-find-request-section")
    );
    return `margin:0 0 ${inTightFactFindGroup ? "6px" : "10px"};font-family:Helvetica,Arial,sans-serif;font-size:${inTightFactFindGroup ? "17px" : "18px"};font-weight:700;line-height:${inTightFactFindGroup ? "1.15" : "1.25"};color:#5b2230`;
  }

  if (!isStmt && tagName === "h3") {
    const inLifeInsuranceSection = Boolean(sourceElement.closest(".fact-find-life-insurance-section"));
    return `margin:0 0 ${inLifeInsuranceSection ? "4px" : "8px"};font-family:Helvetica,Arial,sans-serif;font-size:${inLifeInsuranceSection ? "13px" : "15px"};font-weight:700;color:#374151`;
  }

  if (!isStmt && tagName === "p") {
    return "margin:0 0 10px;line-height:1.6;white-space:pre-wrap";
  }

  if (tagName === "img" && classList.contains("document-top-logo-image")) {
    return "display:block;max-width:200px;height:auto;margin:0;border-radius:0";
  }

  if (tagName === "img") {
    return "display:block;max-width:100%;height:auto;margin:16px auto;border-radius:10px";
  }

  if (!isStmt && (tagName === "ul" || tagName === "ol")) {
    return "margin:0 0 10px;padding-left:22px";
  }

  if (!isStmt && tagName === "li") {
    return "margin:0 0 6px;line-height:1.6";
  }

  if (tagName === "strong" || tagName === "b") {
    return "font-weight:700";
  }

  if (tagName === "em" || tagName === "i") {
    return "font-style:italic";
  }

  if (tagName === "u") {
    return "text-decoration:underline";
  }

  return "";
}

function cloneStyledNode(sourceNode: Node, targetDocument: Document, addBlockClass: boolean): Node {
  if (sourceNode.nodeType === Node.TEXT_NODE) {
    return targetDocument.createTextNode(sourceNode.textContent ?? "");
  }

  if (sourceNode.nodeType !== Node.ELEMENT_NODE) {
    return targetDocument.createTextNode("");
  }

  const sourceElement = sourceNode as Element;
  const targetElement = targetDocument.createElement(sourceElement.tagName.toLowerCase());
  const styleValue = elementStyles(sourceElement);
  const className = sourceElement.getAttribute("class");
  const sourceStyle = sourceElement.getAttribute("style");
  const sourceAttributes = ["alt", "height", "src", "title", "width"];

  if (className) {
    targetElement.setAttribute("class", className);
  }

  sourceAttributes.forEach((attributeName) => {
    const value = sourceElement.getAttribute(attributeName);
    if (value) {
      targetElement.setAttribute(attributeName, value);
    }
  });

  if (styleValue) {
    targetElement.setAttribute("style", appendStyle(targetElement.getAttribute("style"), styleValue));
  }

  if (sourceStyle) {
    targetElement.setAttribute("style", appendStyle(targetElement.getAttribute("style"), sourceStyle));
  }

  if (addBlockClass && isPdfBlock(sourceElement)) {
    targetElement.classList.add("pdf-block");
  }

  Array.from(sourceElement.childNodes).forEach((child) => {
    targetElement.appendChild(cloneStyledNode(child, targetDocument, addBlockClass));
  });

  return targetElement;
}

export function buildPdfStyledHtml(html: string, addBlockClass = false, options?: BuildPdfStyledHtmlOptions) {
  const markdownStrippedHtml = stripMarkdownFences(html);
  const cleanedHtml = options?.stripFactFindLogosForPreview
    ? stripPreviewLogosForWorkflowPreview(markdownStrippedHtml)
    : markdownStrippedHtml;

  if (typeof DOMParser === "undefined") {
    return cleanedHtml;
  }

  const parser = new DOMParser();
  const sourceDocument = parser.parseFromString(cleanedHtml, "text/html");
  const targetDocument = document.implementation.createHTMLDocument("");

  Array.from(sourceDocument.body.childNodes).forEach((child) => {
    const clonedNode = cloneStyledNode(child, targetDocument, addBlockClass);
    if (clonedNode.textContent || clonedNode.nodeType === Node.ELEMENT_NODE) {
      targetDocument.body.appendChild(clonedNode);
    }
  });

  return targetDocument.body.innerHTML.trim();
}

function splitContentIntoPages(htmlContent: string, options?: { headerHeight?: number }) {
  const pageContentHeight = resolvePageContentHeight(options?.headerHeight);
  const pages: string[] = [];
  const tempContainer = document.createElement("div");
  tempContainer.style.cssText = `
    position:absolute;
    left:-9999px;
    top:-9999px;
    width:${A4_WIDTH_PX - 100}px;
    visibility:hidden;
    box-sizing:border-box;
  `;

  const contentDiv = document.createElement("div");
  contentDiv.innerHTML = htmlContent;
  tempContainer.appendChild(contentDiv);
  document.body.appendChild(tempContainer);

  const workflowArticle = contentDiv.querySelector(".workflow-document");
  const workflowArticleClass = workflowArticle?.getAttribute("class");
  const pageRoot = workflowArticle ?? contentDiv;
  const wrapPageHtml = (pageHtml: string) =>
    workflowArticleClass ? `<article class="${workflowArticleClass}">${pageHtml}</article>` : pageHtml;

  const elements = Array.from(pageRoot.querySelectorAll(".pdf-block")).filter((element) => {
    let parent = element.parentElement;
    while (parent && parent !== pageRoot) {
      if (parent.classList.contains("pdf-block")) {
        return false;
      }
      parent = parent.parentElement;
    }
    return true;
  });
  if (elements.length === 0) {
    document.body.removeChild(tempContainer);
    return { mode: "continuous", html: htmlContent } as const;
  }

  let currentPageHeight = 0;
  let currentPageElements: string[] = [];

  const getElementHeight = (element: Element) => {
    const style = window.getComputedStyle(element);
    const rectHeight = element.getBoundingClientRect().height;
    return rectHeight + (parseFloat(style.marginTop) || 0) + (parseFloat(style.marginBottom) || 0);
  };

  const createWrappedFragmentHtml = (sourceElement: Element, childHtml: string) => {
    const fragmentElement = document.createElement(sourceElement.tagName.toLowerCase());
    const className = sourceElement.getAttribute("class");
    const style = sourceElement.getAttribute("style");

    if (className) {
      fragmentElement.setAttribute("class", className);
    }

    if (style) {
      fragmentElement.setAttribute("style", style);
    }

    fragmentElement.innerHTML = childHtml;
    return fragmentElement.outerHTML;
  };

  const canSplitPdfElement = (element: Element) =>
    element.classList.contains("statement-section") ||
    element.classList.contains("statement-opening") ||
    element.classList.contains("statement-closing") ||
    element.classList.contains("document-section") ||
    element.classList.contains("document-grid") ||
    element.classList.contains("client-summary-grid") ||
    element.classList.contains("statement-quote-table") ||
    element.classList.contains("fact-find-asset-liability-layout") ||
    element.classList.contains("fact-find-detail-subsection") ||
    element.classList.contains("fact-find-life-insurance-card") ||
    element.classList.contains("fact-find-life-insurance-block") ||
    element.classList.contains("fact-find-pension-card") ||
    element.classList.contains("fact-find-pension-panel") ||
    element.classList.contains("fact-find-pension-detail-list");

  const splitOversizedStatementBlock = (element: Element, measuredHeight: number): Array<{ height: number; html: string }> | null => {
    if (!canSplitPdfElement(element)) {
      return null;
    }

    const children = Array.from(element.children);
    if (children.length < 2) {
      return null;
    }

    const childItems: Array<{ height: number; html: string }> = [];
    for (const child of children) {
      const childHeight = getElementHeight(child);
      if (childHeight > pageContentHeight) {
        const splitChildren = splitOversizedStatementBlock(child, childHeight);
        if (!splitChildren) {
          return null;
        }
        childItems.push(...splitChildren);
        continue;
      }

      childItems.push({
        height: childHeight,
        html: (child as HTMLElement).outerHTML,
      });
    }

    const wrapperHeight = Math.max(
      0,
      measuredHeight - childItems.reduce((total, child) => total + child.height, 0),
    );

    const fragments: Array<{ height: number; html: string }> = [];
    let fragmentChildren: string[] = [];
    let fragmentHeight = wrapperHeight;

    for (const childItem of childItems) {
      if (fragmentChildren.length > 0 && fragmentHeight + childItem.height > pageContentHeight) {
        fragments.push({
          height: fragmentHeight,
          html: createWrappedFragmentHtml(element, fragmentChildren.join("")),
        });
        fragmentChildren = [];
        fragmentHeight = wrapperHeight;
      }

      fragmentChildren.push(childItem.html);
      fragmentHeight += childItem.height;
    }

    if (fragmentChildren.length > 0) {
      fragments.push({
        height: fragmentHeight,
        html: createWrappedFragmentHtml(element, fragmentChildren.join("")),
      });
    }

    return fragments.length > 1 ? fragments : null;
  };

  const pendingItems: Array<{ element?: Element; height?: number; html?: string }> = elements.map((element) => ({ element }));

  while (pendingItems.length > 0) {
    const nextItem = pendingItems.shift();
    if (!nextItem) {
      continue;
    }

    const nextHeight = nextItem.element ? getElementHeight(nextItem.element) : (nextItem.height ?? 0);
    const nextHtml = nextItem.element ? (nextItem.element as HTMLElement).outerHTML : (nextItem.html ?? "");

    if (
      nextItem.element &&
      currentPageElements.length > 0 &&
      shouldStartOnFreshPdfPage(nextItem.element)
    ) {
      pages.push(wrapPageHtml(currentPageElements.join("")));
      currentPageElements = [];
      currentPageHeight = 0;
    }

    if (nextHeight > pageContentHeight) {
      if (nextItem.element) {
        const splitFragments = splitOversizedStatementBlock(nextItem.element, nextHeight);
        if (splitFragments) {
          pendingItems.unshift(
            ...splitFragments.map((fragment) => ({ height: fragment.height, html: fragment.html })),
          );
          continue;
        }
      }

      document.body.removeChild(tempContainer);
      return { mode: "continuous", html: htmlContent } as const;
    }

    if (currentPageElements.length > 0 && currentPageHeight + nextHeight > pageContentHeight) {
      pages.push(wrapPageHtml(currentPageElements.join("")));
      currentPageElements = [nextHtml];
      currentPageHeight = nextHeight;
      continue;
    }

    currentPageElements.push(nextHtml);
    currentPageHeight += nextHeight;
  }

  if (currentPageElements.length > 0) {
    pages.push(wrapPageHtml(currentPageElements.join("")));
  }

  document.body.removeChild(tempContainer);
  return { mode: "paged", pages } as const;
}

export function paginatePdfContent(htmlContent: string) {
  return splitContentIntoPages(htmlContent);
}

function downloadBlob(blob: Blob, filename: string) {
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement("a");
  anchor.href = url;
  anchor.download = filename;
  document.body.appendChild(anchor);
  anchor.click();
  document.body.removeChild(anchor);
  URL.revokeObjectURL(url);
}

export const OMEGA_FOOTER_LINES = [
  "Suite 31, The Mall, Beacon Court, Sandyford, Dublin 18. Tel: 01 293 8554",
  "Email: info@omegafinancial.ie Website: www.omegafinancial.ie",
  "Directors: John O'Connor B.A. CIM, Hilary O'Connor B.A. DBS",
  "OFM Financial Ltd trading as Omega Financial Management is regulated by the Central Bank of Ireland. Registered in Ireland Number 226937",
];

export function shouldShowPdfShellHeader(_isStatement: boolean, _pageIndex: number) {
  return true;
}

function extractRepeatingHeaderHtml(html: string) {
  if (typeof DOMParser === "undefined") {
    return { contentHtml: html, headerHtml: "" };
  }

  const parser = new DOMParser();
  const sourceDocument = parser.parseFromString(html, "text/html");
  const headerElement = sourceDocument.querySelector(".statement-letter-header");

  if (!headerElement) {
    return { contentHtml: html, headerHtml: "" };
  }

  const removableWrapper = headerElement.closest(".document-inline-header");
  if (removableWrapper) {
    removableWrapper.remove();
  } else {
    headerElement.remove();
  }

  return {
    contentHtml: sourceDocument.body.innerHTML.trim(),
    headerHtml: headerElement.outerHTML,
  };
}

function measureRepeatingHeaderHeight(headerHtml: string) {
  if (typeof document === "undefined" || !headerHtml) {
    return HEADER_HEIGHT;
  }

  const measureContainer = document.createElement("div");
  measureContainer.style.cssText = `
    position:absolute;
    left:-9999px;
    top:-9999px;
    width:${A4_WIDTH_PX - 100}px;
    visibility:hidden;
    box-sizing:border-box;
  `;
  measureContainer.innerHTML = headerHtml;
  document.body.appendChild(measureContainer);

  try {
    const headerElement = measureContainer.querySelector(".statement-letter-header");
    if (!headerElement) {
      return HEADER_HEIGHT;
    }

    const computedStyle = window.getComputedStyle(headerElement);
    const rectHeight = headerElement.getBoundingClientRect().height;
    const marginTop = parseFloat(computedStyle.marginTop) || 0;
    const marginBottom = parseFloat(computedStyle.marginBottom) || 0;
    return Math.ceil(rectHeight + marginTop + marginBottom);
  } finally {
    document.body.removeChild(measureContainer);
  }
}

function buildPageHtml(
  content: string,
  pageNumber: number,
  totalPages: number,
  options?: { headerHtml?: string; headerHeight?: number },
) {
  const footerLines = OMEGA_FOOTER_LINES.map(
    (line, index) => `<div style="font-size:7px;line-height:1.2;font-family:Helvetica,Arial,sans-serif;color:#444;margin-top:${index === 0 ? "0" : "2px"};">${line}</div>`,
  ).join("");
  const pageNumberHtml = totalPages > 1 ? `<div style="font-size:7px;line-height:1.1;color:#888;margin-top:5px;">Page ${pageNumber} of ${totalPages}</div>` : "";
  const headerHtml = options?.headerHtml
    ? `
      <div style="position:absolute;top:${REPEATING_HEADER_TOP_OFFSET}px;left:50px;right:50px;">
        ${options.headerHtml}
      </div>
    `
    : "";
  const contentTop = options?.headerHtml
    ? resolvePageTopPaddingWithHeader(options.headerHeight)
    : PAGE_TOP_PADDING_WITHOUT_HEADER;

  return `
    <div class="pdf-page" style="
      width:${A4_WIDTH_PX}px;
      height:${A4_HEIGHT_PX}px;
      position:relative;
      box-sizing:border-box;
      background:#ffffff;
      overflow:hidden;
      color:#000000;
      font-family:Georgia,'Times New Roman',serif;
      font-size:14px;
    ">
      ${headerHtml}
      <div style="position:absolute;top:${contentTop}px;left:50px;right:50px;bottom:${FOOTER_HEIGHT}px;overflow:hidden;">
        ${content}
      </div>
      <div style="position:absolute;bottom:18px;left:42px;right:42px;border-top:1px solid #000;padding-top:6px;text-align:center;">
        ${footerLines}
        ${pageNumberHtml}
      </div>
    </div>
  `;
}

function drawPdfPageChrome(pdf: JsPdfInstance, pageNumber: number, totalPages: number, options?: { showShellHeader?: boolean }) {
  if (options?.showShellHeader) {
    pdf.addImage(OMEGA_LOGO_DATA_URI, "PNG", 71, 9, 68, 18, undefined, "FAST");
    pdf.setFont("helvetica", "normal");
    pdf.setFontSize(10);
    pdf.setTextColor(68, 68, 68);
    pdf.text("Income Protection Workflow", 105, 34, { align: "center" });
  }

  pdf.setDrawColor(0, 0, 0);
  pdf.setLineWidth(0.2);
  pdf.line(42, 275, 168, 275);

  pdf.setFont("helvetica", "normal");
  pdf.setFontSize(7);
  pdf.setTextColor(68, 68, 68);
  let footerY = 279;
  OMEGA_FOOTER_LINES.forEach((line) => {
    const wrappedLines = pdf.splitTextToSize(line, 126);
    pdf.text(wrappedLines, 105, footerY, { align: "center", maxWidth: 126 });
    footerY += wrappedLines.length * 3.1 + 1;
  });

  if (totalPages > 1) {
    pdf.setTextColor(136, 136, 136);
    pdf.text(`Page ${pageNumber} of ${totalPages}`, 105, footerY + 2, { align: "center" });
  }
}

function stripHtml(html: string) {
  return html
    .replace(/<br\s*\/?>/gi, "\n")
    .replace(/<\/(p|div|section|aside|footer|header|h1|h2|h3|li)>/gi, "\n")
    .replace(/<[^>]+>/g, "")
    .replace(/\n{3,}/g, "\n\n")
    .trim();
}

function canRenderCanvas() {
  return (
    typeof window !== "undefined" &&
    typeof document !== "undefined" &&
    typeof HTMLCanvasElement !== "undefined" &&
    !window.navigator.userAgent.toLowerCase().includes("jsdom")
  );
}

export async function buildPdfBlobFromHtml(html: string): Promise<Blob> {
  const { html2canvas, jsPDF } = await loadPdfDependencies();

  if (!canRenderCanvas()) {
    const pdf = new jsPDF({ orientation: "portrait", unit: "mm", format: "a4" });
    const text = stripHtml(html);
    const lines = pdf.splitTextToSize(text, 170);
    pdf.text(lines, 20, 20);
    return pdf.output("blob");
  }

  const isStatement = html.includes("workflow-document-statement-of-suitability");
  const parsedContent = buildPdfStyledHtml(html, true, {
    stripFactFindLogosForPreview: !isStatement,
  });
  const headerExtraction = extractRepeatingHeaderHtml(parsedContent);
  const headerHeight = headerExtraction.headerHtml
    ? measureRepeatingHeaderHeight(headerExtraction.headerHtml)
    : HEADER_HEIGHT;
  const pagination = splitContentIntoPages(headerExtraction.contentHtml, { headerHeight });
  const container = document.createElement("div");
  container.style.cssText = "position:absolute;left:-9999px;top:-9999px;";
  document.body.appendChild(container);

  try {
    const pdf = new jsPDF({
      orientation: "portrait",
      unit: "mm",
      format: "a4",
      compress: false,
      precision: 16,
    });

    if (pagination.mode === "paged") {
      for (let pageIndex = 0; pageIndex < pagination.pages.length; pageIndex += 1) {
        const pageDiv = document.createElement("div");
        pageDiv.innerHTML = buildPageHtml(pagination.pages[pageIndex], pageIndex + 1, pagination.pages.length, {
          headerHtml: headerExtraction.headerHtml,
          headerHeight,
        });
        container.appendChild(pageDiv);

        const pageElement = pageDiv.querySelector(".pdf-page") as HTMLElement | null;
        if (!pageElement) {
          container.removeChild(pageDiv);
          continue;
        }

        const canvas = await html2canvas(pageElement, {
          scale: RENDER_SCALE,
          useCORS: true,
          allowTaint: true,
          width: A4_WIDTH_PX,
          height: A4_HEIGHT_PX,
          backgroundColor: "#ffffff",
          logging: false,
          removeContainer: true,
        });

        container.removeChild(pageDiv);
        if (pageIndex > 0) {
          pdf.addPage();
        }

        pdf.addImage(canvas.toDataURL("image/png"), "PNG", 0, 0, A4_WIDTH_MM, A4_HEIGHT_MM, undefined, "SLOW");
      }
    } else {
      const flowContainer = document.createElement("div");
      flowContainer.style.cssText = `
        width:${A4_WIDTH_PX - 100}px;
        box-sizing:border-box;
        background:#ffffff;
        padding:0;
      `;
      const flowHtml = headerExtraction.headerHtml
        ? `${headerExtraction.headerHtml}${pagination.html}`
        : pagination.html;
      flowContainer.innerHTML = flowHtml;
      container.appendChild(flowContainer);

      const flowCanvas = await html2canvas(flowContainer, {
        scale: RENDER_SCALE,
        useCORS: true,
        allowTaint: true,
        backgroundColor: "#ffffff",
        logging: false,
        removeContainer: true,
      });

      container.removeChild(flowContainer);

      const pageHeightPx = (
        A4_HEIGHT_PX
        - (headerExtraction.headerHtml ? resolvePageTopPaddingWithHeader(headerHeight) : PAGE_TOP_PADDING_WITHOUT_HEADER)
        - FOOTER_HEIGHT
      ) * RENDER_SCALE;
      const totalPages = Math.max(1, Math.ceil(flowCanvas.height / pageHeightPx));

      for (let pageIndex = 0; pageIndex < totalPages; pageIndex += 1) {
        const pageSliceHeight = Math.min(pageHeightPx, flowCanvas.height - pageIndex * pageHeightPx);
        const sliceCanvas = document.createElement("canvas");
        sliceCanvas.width = flowCanvas.width;
        sliceCanvas.height = pageSliceHeight;

        const sliceContext = sliceCanvas.getContext("2d");
        if (!sliceContext) {
          continue;
        }

        sliceContext.fillStyle = "#ffffff";
        sliceContext.fillRect(0, 0, sliceCanvas.width, sliceCanvas.height);
        sliceContext.drawImage(
          flowCanvas,
          0,
          pageIndex * pageHeightPx,
          flowCanvas.width,
          pageSliceHeight,
          0,
          0,
          flowCanvas.width,
          pageSliceHeight,
        );

        const contentHeightMm = (pageSliceHeight / pageHeightPx) * (A4_HEIGHT_MM - 58);
        if (pageIndex > 0) {
          pdf.addPage();
        }

        pdf.addImage(sliceCanvas.toDataURL("image/png"), "PNG", 12, 20, A4_WIDTH_MM - 24, contentHeightMm, undefined, "SLOW");
        drawPdfPageChrome(pdf, pageIndex + 1, totalPages, {
          showShellHeader: false,
        });
      }
    }

    return pdf.output("blob");
  } finally {
    document.body.removeChild(container);
  }
}

export function buildStandaloneDocumentPreviewHtml(html: string) {
  const styledContent = buildPdfStyledHtml(sanitizeGeneratedHtml(html), true, { stripFactFindLogosForPreview: true });
  const isStatement = styledContent.includes("workflow-document-statement-of-suitability");

  const statementPreviewCss = `
  .preview-page .workflow-document-statement-of-suitability {
    color: #000;
    font-family: Georgia, "Times New Roman", serif;
    font-size: 13px;
    line-height: 1.65;
  }
  .preview-page .workflow-document-statement-of-suitability .statement-letter-header,
  .preview-page .workflow-document-quote .statement-letter-header,
  .preview-page .workflow-document-fact-find .statement-letter-header,
  .preview-page .workflow-document-fact-find-update .statement-letter-header {
    display: flex;
    align-items: flex-start;
    gap: 24px;
    margin-bottom: 18px;
    padding-bottom: 14px;
    border-bottom: 2px solid #c68b2c;
  }
  .preview-page .workflow-document-statement-of-suitability .statement-header-top,
  .preview-page .workflow-document-quote .statement-header-top,
  .preview-page .workflow-document-fact-find .statement-header-top,
  .preview-page .workflow-document-fact-find-update .statement-header-top {
    display: flex;
    flex-direction: row;
    align-items: flex-start;
    gap: 24px;
    margin-bottom: 8px;
  }
  .preview-page .workflow-document-statement-of-suitability .statement-logo,
  .preview-page .workflow-document-quote .statement-logo,
  .preview-page .workflow-document-fact-find .statement-logo,
  .preview-page .workflow-document-fact-find-update .statement-logo {
    display: block;
    width: 180px;
    height: auto;
    margin: 0;
    border-radius: 0;
    flex-shrink: 0;
  }
  .preview-page .workflow-document-statement-of-suitability .statement-client-details,
  .preview-page .workflow-document-quote .statement-client-details,
  .preview-page .workflow-document-fact-find .statement-client-details,
  .preview-page .workflow-document-fact-find-update .statement-client-details {
    display: flex;
    flex: 1;
    flex-direction: column;
    align-items: flex-end;
    min-width: 0;
    margin-left: auto;
    text-align: right;
    line-height: 1;
  }
  .preview-page .workflow-document-statement-of-suitability .statement-client-name,
  .preview-page .workflow-document-quote .statement-client-name,
  .preview-page .workflow-document-fact-find .statement-client-name,
  .preview-page .workflow-document-fact-find-update .statement-client-name {
    margin: 0 0 8px;
    font-family: Georgia, "Times New Roman", serif;
    font-size: 14px;
    font-weight: 700;
    color: #000;
  }
  .preview-page .workflow-document-statement-of-suitability .statement-address-block,
  .preview-page .workflow-document-quote .statement-address-block,
  .preview-page .workflow-document-fact-find .statement-address-block,
  .preview-page .workflow-document-fact-find-update .statement-address-block {
    text-align: right;
    margin-bottom: 6px;
  }
  .preview-page .workflow-document-statement-of-suitability .statement-address-line,
  .preview-page .workflow-document-quote .statement-address-line,
  .preview-page .workflow-document-fact-find .statement-address-line,
  .preview-page .workflow-document-fact-find-update .statement-address-line,
  .preview-page .workflow-document-statement-of-suitability .statement-address-block p,
  .preview-page .workflow-document-quote .statement-address-block p,
  .preview-page .workflow-document-fact-find .statement-address-block p,
  .preview-page .workflow-document-fact-find-update .statement-address-block p {
    display: block;
    margin: 0;
    font-family: Helvetica, Arial, sans-serif;
    font-size: 12px;
    color: #1f2937;
    line-height: 1;
  }
  .preview-page .workflow-document-statement-of-suitability .statement-letter-date,
  .preview-page .workflow-document-quote .statement-letter-date,
  .preview-page .workflow-document-fact-find .statement-letter-date,
  .preview-page .workflow-document-fact-find-update .statement-letter-date {
    margin: 0;
    text-align: right;
    font-family: Helvetica, Arial, sans-serif;
    font-size: 12px;
    font-weight: 600;
    line-height: 1.15;
    color: #5b2230;
  }
  .preview-page .workflow-document-statement-of-suitability .statement-opening {
    margin-bottom: 20px;
  }
  .preview-page .workflow-document-statement-of-suitability h2 {
    margin: 0 0 10px;
    font-family: Georgia, "Times New Roman", serif;
    font-size: 16px;
    font-weight: 700;
    text-decoration: underline;
    color: #000;
  }
  .preview-page .workflow-document-statement-of-suitability .statement-important-notice {
    border: 1.5px solid #000;
    padding: 14px 16px;
    margin-bottom: 20px;
  }
  .preview-page .workflow-document-statement-of-suitability .statement-quote-block,
  .preview-page .workflow-document-quote .statement-quote-block {
    margin-bottom: 20px;
  }
  .preview-page .workflow-document-quote .statement-opening {
    margin-bottom: 10px;
  }
  .preview-page .workflow-document-quote .statement-section h2 {
    margin-bottom: 6px;
    padding-bottom: 4px;
    font-size: 15px;
  }
  .preview-page .workflow-document-statement-of-suitability .statement-quote-summary,
  .preview-page .workflow-document-quote .statement-quote-summary {
    margin-bottom: 12px;
  }
  .preview-page .workflow-document-quote .statement-quote-block {
    margin-bottom: 12px;
  }
  .preview-page .workflow-document-quote .statement-quote-summary {
    display: grid;
    grid-template-columns: repeat(2, minmax(0, 1fr));
    column-gap: 18px;
    row-gap: 2px;
    margin-bottom: 6px;
  }
  .preview-page .workflow-document-statement-of-suitability .statement-quote-summary p,
  .preview-page .workflow-document-statement-of-suitability .statement-quote-cell p,
  .preview-page .workflow-document-quote .statement-quote-summary p,
  .preview-page .workflow-document-quote .statement-quote-cell p {
    margin: 0;
  }
  .preview-page .workflow-document-quote .statement-quote-summary p {
    margin-bottom: 0;
    line-height: 1.05;
    font-size: 13px;
  }
  .preview-page .workflow-document-quote .statement-quote-summary p:last-child {
    margin-bottom: 0;
  }
  .preview-page .workflow-document-statement-of-suitability .statement-quote-table,
  .preview-page .workflow-document-quote .statement-quote-table {
    margin-bottom: 8px;
    border: 1px solid #d6d3d1;
    border-radius: 12px;
    overflow: hidden;
  }
  .preview-page .workflow-document-quote .statement-quote-table {
    margin-bottom: 6px;
  }
  .preview-page .workflow-document-statement-of-suitability .statement-quote-row-header,
  .preview-page .workflow-document-quote .statement-quote-row-header {
    display: grid;
    grid-template-columns: 1.4fr 1fr 1fr 1fr;
    background: #f6ede3;
  }
  .preview-page .workflow-document-statement-of-suitability .statement-quote-row,
  .preview-page .workflow-document-quote .statement-quote-row {
    display: grid;
    grid-template-columns: 1.4fr 1fr 1fr 1fr;
    border-top: 1px solid #e5e7eb;
  }
  .preview-page .workflow-document-statement-of-suitability .statement-quote-row:first-child,
  .preview-page .workflow-document-quote .statement-quote-row:first-child {
    border-top: 0;
  }
  .preview-page .workflow-document-statement-of-suitability .statement-quote-cell,
  .preview-page .workflow-document-quote .statement-quote-cell {
    padding: 10px 12px;
    border-left: 1px solid #e5e7eb;
  }
  .preview-page .workflow-document-quote .statement-quote-cell {
    padding: 3px 6px;
  }
  .preview-page .workflow-document-quote .statement-quote-cell p {
    line-height: 1;
    font-size: 13px;
  }
  .preview-page .workflow-document-quote .statement-quote-row-header .statement-quote-cell p {
    font-size: 10px;
    line-height: 1;
  }
  .preview-page .workflow-document-statement-of-suitability .statement-quote-cell:first-child,
  .preview-page .workflow-document-quote .statement-quote-cell:first-child {
    border-left: 0;
  }
  .preview-page .workflow-document-statement-of-suitability .statement-quote-row-header .statement-quote-cell p,
  .preview-page .workflow-document-quote .statement-quote-row-header .statement-quote-cell p {
    font-family: "Segoe UI", Tahoma, sans-serif;
    font-size: 12px;
    font-weight: 700;
    letter-spacing: 0.02em;
    text-transform: uppercase;
    color: #5b2230;
  }
  .preview-page .workflow-document-statement-of-suitability .statement-section {
    margin-bottom: 16px;
  }
  .preview-page .workflow-document-statement-of-suitability .statement-recommendation-paragraph {
    margin: 0;
    padding: 12px 14px;
    border: 1px solid #d8cabc;
    background: #fffaf4;
    line-height: 1.65;
  }
  .preview-page .workflow-document-statement-of-suitability .statement-recommendation-paragraph strong {
    color: #5b2230;
  }
  .preview-page .workflow-document-statement-of-suitability .statement-closing {
    margin-top: 24px;
  }
  .preview-page .workflow-document-statement-of-suitability .statement-signature-area {
    margin-top: 16px;
  }
  .preview-page .workflow-document-statement-of-suitability .statement-signature-row {
    display: flex;
    align-items: flex-start;
    column-gap: 24px;
  }
  .preview-page .workflow-document-statement-of-suitability .statement-signature-block {
    display: flex;
    flex-direction: column;
    align-items: flex-start;
  }
  .preview-page .workflow-document-statement-of-suitability .statement-signature-block-date {
    margin-left: 12px;
  }
  .preview-page .workflow-document-statement-of-suitability .statement-signature-line,
  .preview-page .workflow-document-statement-of-suitability .statement-signature-label {
    margin: 0;
  }
  .preview-page .workflow-document-statement-of-suitability .statement-signature-label {
    margin-top: 8px;
  }
  .preview-page .workflow-document-statement-of-suitability .statement-declaration {
    border: 1px solid #000;
    padding: 14px 16px;
    margin-top: 20px;
  }
  .preview-page .workflow-document-statement-of-suitability .statement-important-info {
    border: 1px solid #000;
    padding: 14px 16px;
    margin-top: 20px;
  }
  .preview-page .workflow-document-fact-find .fact-find-signing-intro,
  .preview-page .workflow-document-fact-find-update .fact-find-signing-intro {
    margin: 0 0 6px;
    font-weight: 600;
  }
  .preview-page .workflow-document-fact-find .fact-find-signing-subheading,
  .preview-page .workflow-document-fact-find-update .fact-find-signing-subheading {
    margin: 8px 0 6px;
    font-weight: 700;
  }
  .preview-page .workflow-document-fact-find .fact-find-signature-row,
  .preview-page .workflow-document-fact-find-update .fact-find-signature-row {
    display: grid;
    grid-template-columns: 76px minmax(200px, 1fr) 28px 88px;
    align-items: center;
    column-gap: 6px;
    margin-bottom: 10px;
  }
  .preview-page .workflow-document-fact-find .fact-find-signing-block > .fact-find-signature-row:first-of-type,
  .preview-page .workflow-document-fact-find-update .fact-find-signing-block > .fact-find-signature-row:first-of-type {
    margin-bottom: 20px;
  }
  .preview-page .workflow-document-fact-find .fact-find-signature-label,
  .preview-page .workflow-document-fact-find-update .fact-find-signature-label {
    margin: 0;
    min-width: 0;
    font-size: 12px;
    line-height: 1;
    white-space: nowrap;
  }
  .preview-page .workflow-document-fact-find .fact-find-signature-label-date,
  .preview-page .workflow-document-fact-find-update .fact-find-signature-label-date {
    min-width: 0;
    margin-left: 0;
    text-align: left;
  }
  .preview-page .workflow-document-fact-find .fact-find-signature-field,
  .preview-page .workflow-document-fact-find-update .fact-find-signature-field {
    display: flex;
    align-items: center;
    min-width: 0;
    align-self: center;
    padding-bottom: 1px;
    border-bottom: 1px solid #6b7280;
  }
  .preview-page .workflow-document-fact-find .fact-find-signature-field-date,
  .preview-page .workflow-document-fact-find-update .fact-find-signature-field-date {
    width: 88px;
  }
  .preview-page .workflow-document-fact-find .fact-find-signature-value,
  .preview-page .workflow-document-fact-find-update .fact-find-signature-value {
    margin: 0;
    min-height: 0;
    line-height: 1;
    padding: 0;
    font-weight: 600;
  }
  .preview-page .workflow-document-fact-find .fact-find-signature-field .fact-find-signature-value,
  .preview-page .workflow-document-fact-find-update .fact-find-signature-field .fact-find-signature-value {
    border-bottom: 0;
  }
  .preview-page .workflow-document-fact-find .fact-find-request-value,
  .preview-page .workflow-document-fact-find-update .fact-find-request-value {
    margin: 0;
    min-height: 16px;
    padding: 0 0 1px;
    border-bottom: 1px solid #6b7280;
    font-weight: 600;
  }
  .preview-page .workflow-document-fact-find .fact-find-request-copy,
  .preview-page .workflow-document-fact-find-update .fact-find-request-copy {
    margin-bottom: 8px;
  }
  .preview-page .workflow-document-fact-find .fact-find-request-copy p,
  .preview-page .workflow-document-fact-find-update .fact-find-request-copy p {
    margin: 0 0 8px;
  }
  .preview-page .workflow-document-fact-find .fact-find-request-row,
  .preview-page .workflow-document-fact-find-update .fact-find-request-row {
    display: flex;
    align-items: flex-start;
    gap: 10px;
    margin-bottom: 8px;
  }
  .preview-page .workflow-document-fact-find .fact-find-request-field,
  .preview-page .workflow-document-fact-find-update .fact-find-request-field {
    flex: 1 1 auto;
  }
  .preview-page .workflow-document-fact-find .fact-find-request-field-date,
  .preview-page .workflow-document-fact-find-update .fact-find-request-field-date {
    flex: 0 0 108px;
  }
  .preview-page .workflow-document-fact-find .fact-find-request-label,
  .preview-page .workflow-document-fact-find-update .fact-find-request-label {
    margin: 4px 0 0;
    font-weight: 700;
  }
  .preview-page .workflow-document-fact-find .fact-find-request-footnote,
  .preview-page .workflow-document-fact-find-update .fact-find-request-footnote {
    margin: 22px 0 0;
    font-size: 11px;
    color: #6b7280;
  }
  .preview-page .workflow-document-statement-of-suitability p {
    margin: 0 0 8px;
    line-height: 1.6;
    color: #000;
  }
  .preview-page .workflow-document-statement-of-suitability ul,
  .preview-page .workflow-document-statement-of-suitability ol {
    margin: 0 0 8px;
    padding-left: 22px;
    color: #000;
  }
  .preview-page .workflow-document-statement-of-suitability li {
    margin-bottom: 4px;
    line-height: 1.6;
    color: #000;
  }
  .preview-page .workflow-document-statement-of-suitability strong {
    color: #000;
  }
  `;

  return `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<style>
  * { box-sizing: border-box; margin: 0; padding: 0; }
  body {
    background: #e8edf5;
    display: flex;
    justify-content: center;
    padding: 32px 24px;
    font-family: Georgia, "Times New Roman", serif;
    font-size: 14px;
    line-height: 1.7;
    color: #0f172a;
    min-height: 100vh;
  }
  .preview-page {
    width: 794px;
    min-height: 1123px;
    background: #ffffff;
    border: 1px solid #dbe3ee;
    box-shadow: 0 8px 32px rgba(15, 23, 42, 0.12);
    padding: ${isStatement ? "72px 80px 48px" : "72px 80px 80px"};
  }
  .preview-page .workflow-document {
    color: #1f2937;
  }
  .preview-page .document-banner {
    background: #f6ede3;
    border: 1px solid #e5d5c5;
    border-radius: 16px;
    padding: 22px 24px;
    margin-bottom: 24px;
  }
  .preview-page .workflow-document-fact-find .document-banner,
  .preview-page .workflow-document-fact-find-update .document-banner {
    padding: 16px 20px;
    margin-bottom: 14px;
  }
  .preview-page .document-eyebrow {
    margin: 0 0 8px;
    font-family: "Segoe UI", Tahoma, sans-serif;
    font-size: 11px;
    font-weight: 700;
    letter-spacing: 0.14em;
    text-transform: uppercase;
    color: #7c4b2a;
  }
  .preview-page .document-subtitle {
    margin: 8px 0 0;
    font-family: "Segoe UI", Tahoma, sans-serif;
    font-size: 13px;
    color: #6b7280;
  }
  .preview-page .client-summary-grid,
  .preview-page .document-grid {
    border: 1px solid #e5e7eb;
    border-radius: 14px;
    background: #faf7f2;
    padding: 18px 20px;
    margin-bottom: 18px;
  }
  .preview-page .workflow-document-fact-find .client-summary-grid,
  .preview-page .workflow-document-fact-find .document-grid,
  .preview-page .workflow-document-fact-find-update .client-summary-grid,
  .preview-page .workflow-document-fact-find-update .document-grid {
    padding: 14px 16px;
    margin-bottom: 12px;
  }
  .preview-page .grid-items {
    display: grid;
    grid-template-columns: repeat(2, minmax(0, 1fr));
    gap: 10px;
  }
  .preview-page .workflow-document-fact-find .grid-items,
  .preview-page .workflow-document-fact-find-update .grid-items {
    gap: 7px;
  }
  .preview-page .workflow-document-fact-find .client-summary-grid .grid-items,
  .preview-page .workflow-document-fact-find-update .client-summary-grid .grid-items {
    grid-template-columns: repeat(3, minmax(180px, 1fr));
  }
  .preview-page .grid-item {
    background: #fff;
    border: 1px solid #e5e7eb;
    border-radius: 10px;
    padding: 10px 12px;
  }
  .preview-page .workflow-document-fact-find .grid-item,
  .preview-page .workflow-document-fact-find-update .grid-item {
    padding: 6px 10px;
    line-height: 1.2;
  }
  .preview-page .grid-label {
    display: block;
    margin-bottom: 4px;
    font-family: "Segoe UI", Tahoma, sans-serif;
    font-size: 10px;
    font-weight: 700;
    letter-spacing: 0.06em;
    text-transform: uppercase;
    color: #7c4b2a;
  }
  .preview-page .grid-item strong {
    display: block;
    font-size: 13px;
    color: #111827;
  }
  .preview-page .workflow-document-fact-find .grid-item strong,
  .preview-page .workflow-document-fact-find-update .grid-item strong {
    font-family: Helvetica, Arial, sans-serif;
    line-height: 1.2;
  }
  .preview-page .document-section {
    margin-bottom: 18px;
  }
  .preview-page .document-callout {
    border-left: 6px solid #c68b2c;
    border-radius: 12px;
    background: #fff6e6;
    padding: 16px 18px;
    margin-bottom: 18px;
  }
  .preview-page .signatures-footer {
    margin-top: 24px;
    padding-top: 16px;
    border-top: 2px solid #5b2230;
  }
  .preview-page h1 {
    margin: 0;
    font-family: "Segoe UI", Tahoma, sans-serif;
    font-size: 32px;
    font-weight: 700;
    line-height: 1.2;
    color: #3c1321;
  }
  .preview-page h2 {
    margin: 0 0 10px;
    font-family: "Segoe UI", Tahoma, sans-serif;
    font-size: 18px;
    font-weight: 700;
    line-height: 1.25;
    color: #5b2230;
  }
  .preview-page h3 {
    margin: 0 0 8px;
    font-family: "Segoe UI", Tahoma, sans-serif;
    font-size: 15px;
    font-weight: 700;
    color: #374151;
  }
  .preview-page .workflow-document-fact-find .fact-find-life-insurance-section > h2,
  .preview-page .workflow-document-fact-find .fact-find-savings-section > h2,
  .preview-page .workflow-document-fact-find .fact-find-declarations-section > h2,
  .preview-page .workflow-document-fact-find .fact-find-signatures-section > h2,
  .preview-page .workflow-document-fact-find .fact-find-request-section > h2,
  .preview-page .workflow-document-fact-find-update .fact-find-life-insurance-section > h2,
  .preview-page .workflow-document-fact-find-update .fact-find-savings-section > h2,
  .preview-page .workflow-document-fact-find-update .fact-find-declarations-section > h2,
  .preview-page .workflow-document-fact-find-update .fact-find-signatures-section > h2,
  .preview-page .workflow-document-fact-find-update .fact-find-request-section > h2 {
    margin-bottom: 6px;
    font-size: 17px;
    line-height: 1.15;
  }
  .preview-page .workflow-document-fact-find .fact-find-life-insurance-section h3,
  .preview-page .workflow-document-fact-find-update .fact-find-life-insurance-section h3 {
    margin-bottom: 4px;
    font-size: 13px;
  }
  .preview-page .workflow-document-fact-find .fact-find-life-savings-group,
  .preview-page .workflow-document-fact-find-update .fact-find-life-savings-group {
    display: flex;
    flex-direction: column;
    gap: 4px;
    margin-bottom: 6px;
  }
  .preview-page .workflow-document-fact-find .fact-find-final-section-group,
  .preview-page .workflow-document-fact-find-update .fact-find-final-section-group {
    display: flex;
    flex-direction: column;
    gap: 5px;
    margin-bottom: 6px;
  }
  .preview-page .workflow-document-fact-find .fact-find-life-insurance-section,
  .preview-page .workflow-document-fact-find .fact-find-savings-section,
  .preview-page .workflow-document-fact-find .fact-find-declarations-section,
  .preview-page .workflow-document-fact-find-update .fact-find-life-insurance-section,
  .preview-page .workflow-document-fact-find-update .fact-find-savings-section,
  .preview-page .workflow-document-fact-find-update .fact-find-declarations-section {
    padding: 8px 10px;
    margin-bottom: 0;
  }
  .preview-page .workflow-document-fact-find .fact-find-signatures-section,
  .preview-page .workflow-document-fact-find .fact-find-request-section,
  .preview-page .workflow-document-fact-find-update .fact-find-signatures-section,
  .preview-page .workflow-document-fact-find-update .fact-find-request-section {
    margin-bottom: 0;
  }
  .preview-page .workflow-document-fact-find .fact-find-declarations-section .grid-items,
  .preview-page .workflow-document-fact-find-update .fact-find-declarations-section .grid-items {
    gap: 5px;
  }
  .preview-page .workflow-document-fact-find .fact-find-declarations-section .grid-item,
  .preview-page .workflow-document-fact-find-update .fact-find-declarations-section .grid-item {
    padding: 4px 7px;
  }
  .preview-page .workflow-document-fact-find .fact-find-savings-table .statement-quote-row {
    grid-template-columns: minmax(76px, 0.8fr) minmax(126px, 1.28fr) minmax(82px, 0.94fr) minmax(82px, 0.94fr) minmax(64px, 0.64fr);
  }
  .preview-page .workflow-document-fact-find .fact-find-life-insurance-card {
    display: flex;
    flex-direction: column;
    gap: 2px;
  }
  .preview-page .workflow-document-fact-find .fact-find-life-insurance-summary-label,
  .preview-page .workflow-document-fact-find .fact-find-life-insurance-policy-label,
  .preview-page .workflow-document-fact-find .fact-find-life-insurance-value {
    margin: 0;
    font-size: 12px;
    line-height: 1.1;
    color: #1f2937;
  }
  .preview-page .workflow-document-fact-find .fact-find-life-insurance-summary-label,
  .preview-page .workflow-document-fact-find .fact-find-life-insurance-policy-label {
    flex: 1 1 auto;
  }
  .preview-page .workflow-document-fact-find .fact-find-life-insurance-value.is-muted {
    color: #7b7b7b;
  }
  .preview-page .workflow-document-fact-find .fact-find-life-insurance-value {
    flex: 0 0 min(156px, 34%);
  }
  .preview-page .workflow-document-fact-find .fact-find-life-insurance-divider {
    display: none;
  }
  .preview-page .workflow-document-fact-find .fact-find-life-insurance-block {
    display: flex;
    flex-direction: column;
    gap: 1px;
  }
  .preview-page .workflow-document-fact-find .fact-find-life-insurance-block h3 {
    margin: 0;
    font-size: 13px;
    font-weight: 700;
    color: #5b2230;
  }
  .preview-page .workflow-document-fact-find .fact-find-life-insurance-compare-table {
    overflow: hidden;
    border: 1px solid #e6d6c7;
    border-radius: 12px;
    background: rgba(255, 255, 255, 0.86);
  }
  .preview-page .workflow-document-fact-find .fact-find-life-insurance-compare-table .statement-quote-row {
    grid-template-columns: minmax(180px, 1.3fr) repeat(2, minmax(120px, 1fr));
  }
  .preview-page .workflow-document-fact-find .fact-find-life-insurance-summary-table .statement-quote-row,
  .preview-page .workflow-document-fact-find .fact-find-life-insurance-policy-table .statement-quote-row {
    grid-template-columns: minmax(200px, 1.5fr) minmax(140px, 1fr);
  }
  .preview-page .workflow-document-fact-find .fact-find-life-insurance-summary-table .statement-quote-row:not(.statement-quote-row-header),
  .preview-page .workflow-document-fact-find .fact-find-life-insurance-policy-table .statement-quote-row:not(.statement-quote-row-header) {
    background: #ffffff;
  }
  .preview-page .workflow-document-fact-find .fact-find-life-insurance-summary-table .statement-quote-cell:first-child p,
  .preview-page .workflow-document-fact-find .fact-find-life-insurance-policy-table .statement-quote-cell:first-child p {
    font-weight: 400;
  }
  .preview-page .workflow-document-fact-find .fact-find-life-insurance-compare-table .statement-quote-row:not(.statement-quote-row-header) {
    background: #ffffff;
  }
  .preview-page .workflow-document-fact-find .fact-find-life-insurance-compare-table .statement-quote-row-header {
    background: rgba(250, 240, 231, 0.95);
  }
  .preview-page .workflow-document-fact-find .fact-find-life-insurance-compare-table .statement-quote-cell:first-child p {
    font-weight: 400;
  }
  .preview-page .workflow-document-fact-find .fact-find-pension-self-section,
  .preview-page .workflow-document-fact-find .fact-find-pension-partner-section,
  .preview-page .workflow-document-fact-find-update .fact-find-pension-self-section,
  .preview-page .workflow-document-fact-find-update .fact-find-pension-partner-section {
    padding: 18px 20px;
    border: 1px solid #e6d6c7;
    border-radius: 22px;
    background:
      radial-gradient(circle at top left, rgba(214, 188, 160, 0.16), transparent 38%),
      linear-gradient(180deg, #fffdfa 0%, #fff8f1 100%);
  }
  .preview-page .workflow-document-fact-find .fact-find-pension-self-section > h2,
  .preview-page .workflow-document-fact-find .fact-find-pension-partner-section > h2,
  .preview-page .workflow-document-fact-find-update .fact-find-pension-self-section > h2,
  .preview-page .workflow-document-fact-find-update .fact-find-pension-partner-section > h2 {
    color: #5b2230;
    margin-bottom: 14px;
  }
  .preview-page .workflow-document-fact-find .fact-find-pension-self-table,
  .preview-page .workflow-document-fact-find .fact-find-pension-partner-table,
  .preview-page .workflow-document-fact-find-update .fact-find-pension-self-table,
  .preview-page .workflow-document-fact-find-update .fact-find-pension-partner-table {
    overflow: hidden;
    border: 1px solid #e6d6c7;
    border-radius: 18px;
    background: rgba(255, 255, 255, 0.88);
  }
  .preview-page .workflow-document-fact-find .fact-find-pension-self-table .statement-quote-row,
  .preview-page .workflow-document-fact-find .fact-find-pension-partner-table .statement-quote-row,
  .preview-page .workflow-document-fact-find-update .fact-find-pension-self-table .statement-quote-row,
  .preview-page .workflow-document-fact-find-update .fact-find-pension-partner-table .statement-quote-row {
    grid-template-columns: minmax(220px, 1.55fr) minmax(140px, 1fr);
  }
  .preview-page .workflow-document-fact-find .fact-find-pension-self-table .statement-quote-row-header,
  .preview-page .workflow-document-fact-find .fact-find-pension-partner-table .statement-quote-row-header,
  .preview-page .workflow-document-fact-find-update .fact-find-pension-self-table .statement-quote-row-header,
  .preview-page .workflow-document-fact-find-update .fact-find-pension-partner-table .statement-quote-row-header {
    background: rgba(250, 240, 231, 0.95);
  }
  .preview-page .workflow-document-fact-find .fact-find-pension-self-table .statement-quote-cell:first-child p,
  .preview-page .workflow-document-fact-find .fact-find-pension-partner-table .statement-quote-cell:first-child p,
  .preview-page .workflow-document-fact-find-update .fact-find-pension-self-table .statement-quote-cell:first-child p,
  .preview-page .workflow-document-fact-find-update .fact-find-pension-partner-table .statement-quote-cell:first-child p {
    font-weight: 600;
  }
  .preview-page .workflow-document-fact-find .fact-find-pension-card,
  .preview-page .workflow-document-fact-find-update .fact-find-pension-card {
    display: flex;
    flex-direction: column;
    gap: 16px;
  }
  .preview-page .workflow-document-fact-find .fact-find-pension-panel,
  .preview-page .workflow-document-fact-find-update .fact-find-pension-panel {
    overflow: hidden;
    border: 1px solid #e6d6c7;
    border-radius: 20px;
    background: rgba(255, 255, 255, 0.88);
  }
  .preview-page .workflow-document-fact-find .fact-find-pension-panel-header,
  .preview-page .workflow-document-fact-find-update .fact-find-pension-panel-header {
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 16px;
    padding: 10px 16px;
    border-bottom: 1px solid rgba(230, 214, 199, 0.9);
    background: rgba(250, 240, 231, 0.95);
  }
  .preview-page .workflow-document-fact-find .fact-find-pension-panel-header h3,
  .preview-page .workflow-document-fact-find-update .fact-find-pension-panel-header h3 {
    margin: 0;
    font-size: 11px;
    font-weight: 700;
    color: #5b2230;
    letter-spacing: 0.06em;
    text-transform: uppercase;
  }
  .preview-page .workflow-document-fact-find .fact-find-pension-panel-status,
  .preview-page .workflow-document-fact-find-update .fact-find-pension-panel-status {
    margin: 0;
    font-size: 11px;
    font-weight: 700;
    color: #5b2230;
    letter-spacing: 0.06em;
    text-transform: uppercase;
  }
  .preview-page .workflow-document-fact-find .fact-find-pension-panel-status.is-positive,
  .preview-page .workflow-document-fact-find-update .fact-find-pension-panel-status.is-positive {
    color: #2f8a48;
  }
  .preview-page .workflow-document-fact-find .fact-find-pension-detail-list,
  .preview-page .workflow-document-fact-find-update .fact-find-pension-detail-list {
    display: flex;
    flex-direction: column;
  }
  .preview-page .workflow-document-fact-find .fact-find-pension-metric-row,
  .preview-page .workflow-document-fact-find .fact-find-pension-contributions-row,
  .preview-page .workflow-document-fact-find-update .fact-find-pension-metric-row,
  .preview-page .workflow-document-fact-find-update .fact-find-pension-contributions-row {
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 14px;
    padding: 10px 16px;
    border-top: 1px solid rgba(230, 214, 199, 0.9);
  }
  .preview-page .workflow-document-fact-find .fact-find-pension-detail-list .fact-find-pension-metric-row:first-child,
  .preview-page .workflow-document-fact-find-update .fact-find-pension-detail-list .fact-find-pension-metric-row:first-child {
    border-top: 0;
  }
  .preview-page .workflow-document-fact-find .fact-find-pension-metric-label,
  .preview-page .workflow-document-fact-find-update .fact-find-pension-metric-label {
    margin: 0;
    flex: 1 1 auto;
    font-size: 14px;
    color: #1f2937;
  }
  .preview-page .workflow-document-fact-find .fact-find-pension-value,
  .preview-page .workflow-document-fact-find-update .fact-find-pension-value {
    margin: 0;
    flex: 0 0 auto;
    min-width: 120px;
    font-size: 14px;
    font-weight: 500;
    color: #1f2937;
  }
  .preview-page .workflow-document-fact-find .fact-find-pension-value.is-muted,
  .preview-page .workflow-document-fact-find-update .fact-find-pension-value.is-muted {
    color: #7b7b7b;
    font-weight: 500;
  }
  .preview-page .workflow-document-fact-find .fact-find-pension-contributions-values,
  .preview-page .workflow-document-fact-find-update .fact-find-pension-contributions-values {
    display: grid;
    grid-template-columns: repeat(2, minmax(120px, 1fr));
    gap: 12px;
  }
  .preview-page .workflow-document-fact-find .fact-find-pension-contribution-block,
  .preview-page .workflow-document-fact-find-update .fact-find-pension-contribution-block {
    display: flex;
    flex-direction: column;
    gap: 2px;
  }
  .preview-page .workflow-document-fact-find .fact-find-pension-contribution-label,
  .preview-page .workflow-document-fact-find-update .fact-find-pension-contribution-label {
    margin: 0;
    font-size: 12px;
    color: #5f5146;
  }
  .preview-page .workflow-document-fact-find .fact-find-pension-empty-state,
  .preview-page .workflow-document-fact-find-update .fact-find-pension-empty-state {
    padding: 16px;
    background: linear-gradient(180deg, #fbf7f1 0%, #f6efe5 100%);
  }
  .preview-page .workflow-document-fact-find .fact-find-pension-empty-title,
  .preview-page .workflow-document-fact-find-update .fact-find-pension-empty-title {
    margin: 0 0 8px;
    font-size: 14px;
    font-weight: 700;
    color: #5b2230;
  }
  .preview-page .workflow-document-fact-find .fact-find-pension-empty-copy,
  .preview-page .workflow-document-fact-find-update .fact-find-pension-empty-copy {
    margin: 0;
    font-size: 12px;
    color: #5f5146;
  }
  .preview-page .workflow-document-fact-find .fact-find-comments-box {
    margin-top: 2px;
    padding: 3px 6px 4px;
    border: 1px solid #d9e2ee;
    border-radius: 10px;
    background: #ffffff;
    box-shadow: inset 0 1px 0 rgba(255, 255, 255, 0.7);
  }
  .preview-page .workflow-document-fact-find .fact-find-comments-label {
    margin: 0 0 2px;
    font-size: 10px;
    font-weight: 700;
    color: #7c4b2a;
    letter-spacing: 0.08em;
    text-transform: uppercase;
  }
  .preview-page .workflow-document-fact-find .fact-find-comments-value {
    margin: 0;
    font-size: 11px;
    font-weight: 600;
    line-height: 1.05;
    color: #172033;
    line-height: 1.35;
  }
  .preview-page .workflow-document-fact-find .fact-find-savings-table .statement-quote-row:not(.statement-quote-row-header) {
    background: #ffffff;
  }
  .preview-page .workflow-document-fact-find .fact-find-assets-table .statement-quote-row:not(.statement-quote-row-header),
  .preview-page .workflow-document-fact-find .fact-find-liabilities-table .statement-quote-row:not(.statement-quote-row-header) {
    background: #ffffff;
  }
  .preview-page p {
    margin: 0 0 10px;
    line-height: 1.6;
  }
  .preview-page ul,
  .preview-page ol {
    margin: 0 0 10px;
    padding-left: 22px;
  }
  .preview-page li {
    margin-bottom: 6px;
  }
  .preview-page img {
    display: block;
    max-width: 100%;
    margin: 16px auto;
    border-radius: 10px;
  }
  .preview-page .document-top-logo {
    display: flex;
    justify-content: center;
    margin: 0 0 20px;
  }
  .preview-page .document-top-logo-image {
    display: block;
    max-width: 200px;
    height: auto;
    margin: 0;
    border-radius: 0;
  }
  ${isStatement ? statementPreviewCss : ""}
  .preview-page-footer {
    margin-top: 32px;
    padding-top: 18px;
    border-top: 1px solid #000;
    text-align: center;
    color: #444;
    font-family: Helvetica, Arial, sans-serif;
    font-size: 10px;
    line-height: 1.5;
  }
  .preview-page-footer p {
    margin: 0 0 2px;
  }
</style>
</head>
<body>
  <div class="preview-page">
    ${styledContent}
    <div class="preview-page-footer">
      <p>Suite 31, The Mall, Beacon Court, Sandyford, Dublin 18. Tel: 01 293 8554 Email: info@omegafinancial.ie Website: www.omegafinancial.ie</p>
      <p>Directors: John O'Connor B.A. CIM, Hilary O'Connor B.A. DBS</p>
      <p>OFM Financial Ltd trading as Omega Financial Management is regulated by the Central Bank of Ireland. Registered in Ireland Number 226937</p>
    </div>
  </div>
</body>
</html>`;
}

export async function exportHtmlToPdf(html: string, filename: string) {
  const blob = await buildPdfBlobFromHtml(html);
  downloadBlob(blob, filename);
  return blob;
}
