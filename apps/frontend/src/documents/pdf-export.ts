import html2canvas from "html2canvas";
import { jsPDF } from "jspdf";

const A4_WIDTH_PX = 794;
const A4_HEIGHT_PX = 1123;
const HEADER_HEIGHT = 120;
const FOOTER_HEIGHT = 110;
const PAGE_CONTENT_HEIGHT = A4_HEIGHT_PX - HEADER_HEIGHT - FOOTER_HEIGHT - 20;
const RENDER_SCALE = 3;
const A4_WIDTH_MM = 210;
const A4_HEIGHT_MM = 297;

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
    hasPdfClass(sourceElement, "statement-document-body") ||
    hasPdfClass(sourceElement, "statement-letter-header") ||
    hasPdfClass(sourceElement, "statement-address-block") ||
    hasPdfClass(sourceElement, "statement-opening") ||
    hasPdfClass(sourceElement, "statement-section") ||
    hasPdfClass(sourceElement, "statement-quote-summary") ||
    hasPdfClass(sourceElement, "statement-quote-table") ||
    hasPdfClass(sourceElement, "statement-quote-row") ||
    hasPdfClass(sourceElement, "statement-quote-row-header") ||
    hasPdfClass(sourceElement, "statement-quote-cell") ||
    hasPdfClass(sourceElement, "statement-footer-contact")
  );
}

function elementStyles(sourceElement: Element) {
  const tagName = sourceElement.tagName.toLowerCase();
  const classList = sourceElement.classList;

  if (tagName === "article" && classList.contains("workflow-document")) {
    return "display:block;color:#1f2937;font-family:Georgia,'Times New Roman',serif;font-size:14px;line-height:1.6";
  }

  if (tagName === "div" && classList.contains("document-top-logo")) {
    return "display:flex;justify-content:flex-start;margin:0 0 24px;page-break-inside:avoid";
  }

  if ((tagName === "header" || tagName === "div") && classList.contains("document-banner")) {
    return "display:block;background:#f6ede3;border:1px solid #e5d5c5;border-radius:16px;padding:22px 24px;margin:0 0 18px;page-break-inside:avoid";
  }

  if (tagName === "p" && classList.contains("document-eyebrow")) {
    return "margin:0 0 8px;font-family:Helvetica,Arial,sans-serif;font-size:11px;font-weight:700;letter-spacing:1.4px;text-transform:uppercase;color:#7c4b2a";
  }

  if (tagName === "p" && classList.contains("document-subtitle")) {
    return "margin:8px 0 0;font-family:Helvetica,Arial,sans-serif;font-size:13px;color:#6b7280";
  }

  if ((tagName === "section" || tagName === "div") && (classList.contains("client-summary-grid") || classList.contains("document-grid"))) {
    return "display:block;border:1px solid #e5e7eb;border-radius:14px;padding:18px 20px;margin:0 0 16px;background:#faf7f2;page-break-inside:avoid";
  }

  if ((tagName === "section" || tagName === "div") && classList.contains("document-section")) {
    return "display:block;margin:0 0 16px;padding:0 0 2px;page-break-inside:avoid";
  }

  if (tagName === "div" && classList.contains("statement-quote-summary")) {
    return "display:block;margin:0 0 12px";
  }

  if (tagName === "div" && classList.contains("statement-quote-table")) {
    return "display:block;border:1px solid #d6d3d1;border-radius:12px;overflow:hidden;margin:0 0 8px";
  }

  if (tagName === "div" && classList.contains("statement-quote-row-header")) {
    return "display:grid;grid-template-columns:1.4fr 1fr 1fr 1fr 1fr;background:#f6ede3;border-top:none";
  }

  if (tagName === "div" && classList.contains("statement-quote-row")) {
    return "display:grid;grid-template-columns:1.4fr 1fr 1fr 1fr 1fr;border-top:1px solid #e5e7eb";
  }

  if (tagName === "div" && classList.contains("statement-quote-cell")) {
    const baseStyle = "display:block;padding:10px 12px";
    return sourceElement.previousElementSibling === null ? baseStyle : `${baseStyle};border-left:1px solid #e5e7eb`;
  }

  if ((tagName === "aside" || tagName === "div") && classList.contains("document-callout")) {
    return "display:block;background:#fff6e6;border-left:6px solid #c68b2c;border-radius:12px;padding:16px 18px;margin:0 0 16px;page-break-inside:avoid";
  }

  if ((tagName === "footer" || tagName === "div") && classList.contains("signatures-footer")) {
    return "display:block;margin-top:20px;padding-top:14px;border-top:2px solid #5b2230;page-break-inside:avoid";
  }

  if (tagName === "div" && classList.contains("grid-items")) {
    return "display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:10px";
  }

  if (tagName === "div" && classList.contains("grid-item")) {
    return "display:block;background:#ffffff;border:1px solid #e5e7eb;border-radius:10px;padding:10px 12px;min-height:48px";
  }

  if (tagName === "span" && classList.contains("grid-label")) {
    return "display:block;font-family:Helvetica,Arial,sans-serif;font-size:10px;font-weight:700;letter-spacing:0.6px;text-transform:uppercase;color:#7c4b2a;margin-bottom:4px";
  }

  if (tagName === "strong" && sourceElement.parentElement?.classList.contains("grid-item")) {
    return "display:block;font-size:13px;color:#111827";
  }

  if (tagName === "h1") {
    return "margin:0;font-family:Helvetica,Arial,sans-serif;font-size:26px;font-weight:700;line-height:1.2;color:#3c1321";
  }

  if (tagName === "h2") {
    return "margin:0 0 10px;font-family:Helvetica,Arial,sans-serif;font-size:18px;font-weight:700;line-height:1.25;color:#5b2230";
  }

  if (tagName === "h3") {
    return "margin:0 0 8px;font-family:Helvetica,Arial,sans-serif;font-size:15px;font-weight:700;color:#374151";
  }

  if (tagName === "p") {
    return "margin:0 0 10px;line-height:1.6;white-space:pre-wrap";
  }

  if (tagName === "img" && classList.contains("document-top-logo-image")) {
    return "display:block;max-width:220px;height:auto;margin:0;border-radius:0";
  }

  if (tagName === "img" && classList.contains("statement-logo")) {
    return "display:block;width:180px;height:auto;margin:0 0 16px 0;border-radius:0";
  }

  if (tagName === "img") {
    return "display:block;max-width:100%;height:auto;margin:16px auto;border-radius:10px";
  }

  if (tagName === "ul" || tagName === "ol") {
    return "margin:0 0 10px;padding-left:22px";
  }

  if (tagName === "li") {
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

export function buildPdfStyledHtml(html: string, addBlockClass = false) {
  const cleanedHtml = stripPreviewLogosForWorkflowPreview(stripMarkdownFences(html));

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

function splitContentIntoPages(htmlContent: string) {
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

  for (const element of elements) {
    const nextHeight = getElementHeight(element);
    const nextHtml = (element as HTMLElement).outerHTML;

    if (nextHeight > PAGE_CONTENT_HEIGHT) {
      document.body.removeChild(tempContainer);
      return { mode: "continuous", html: htmlContent } as const;
    }

    if (currentPageElements.length > 0 && currentPageHeight + nextHeight > PAGE_CONTENT_HEIGHT) {
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

function buildPageHtml(content: string, pageNumber: number, totalPages: number) {
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
      <div style="position:absolute;top:${HEADER_HEIGHT}px;left:50px;right:50px;bottom:${FOOTER_HEIGHT}px;overflow:hidden;">
        ${content}
      </div>
      <div style="position:absolute;bottom:28px;left:42px;right:42px;border-top:1px solid #5b2230;padding-top:8px;text-align:center;">
        <div style="font-size:8px;font-family:Helvetica,Arial,sans-serif;color:#333;">Suite 31, The Mall, Beacon Court, Sandyford, Dublin 18 | Tel: 01 293 8554</div>
        <div style="font-size:8px;font-family:Helvetica,Arial,sans-serif;color:#333;margin-top:2px;">Email: info@omegafinancial.ie | Website: www.omegafinancial.ie</div>
        <div style="font-size:8px;font-family:Helvetica,Arial,sans-serif;color:#333;margin-top:2px;">Omega Financial Management is regulated by the Central Bank of Ireland.</div>
        ${totalPages > 1 ? `<div style="font-size:8px;color:#666;margin-top:6px;">Page ${pageNumber} of ${totalPages}</div>` : ""}
      </div>
    </div>
  `;
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
  if (!canRenderCanvas()) {
    const pdf = new jsPDF({ orientation: "portrait", unit: "mm", format: "a4" });
    const text = stripHtml(html);
    const lines = pdf.splitTextToSize(text, 170);
    pdf.text(lines, 20, 20);
    return pdf.output("blob");
  }

  const parsedContent = buildPdfStyledHtml(html, true);
  const pagination = splitContentIntoPages(parsedContent);
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
        pageDiv.innerHTML = buildPageHtml(pagination.pages[pageIndex], pageIndex + 1, pagination.pages.length);
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
      flowContainer.innerHTML = pagination.html;
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

      const pageHeightPx = (A4_HEIGHT_PX - HEADER_HEIGHT - FOOTER_HEIGHT) * RENDER_SCALE;
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
      }
    }

    return pdf.output("blob");
  } finally {
    document.body.removeChild(container);
  }
}

export function buildStandaloneDocumentPreviewHtml(html: string) {
  const styledContent = buildPdfStyledHtml(html, true);
  const isStatement = styledContent.includes("workflow-document-statement-of-suitability");
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
  .preview-page .grid-items {
    display: grid;
    grid-template-columns: repeat(2, minmax(0, 1fr));
    gap: 10px;
  }
  .preview-page .grid-item {
    background: #fff;
    border: 1px solid #e5e7eb;
    border-radius: 10px;
    padding: 10px 12px;
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
    justify-content: flex-start;
    margin: 0 0 24px;
  }
  .preview-page .document-top-logo-image {
    display: block;
    max-width: 220px;
    height: auto;
    margin: 0;
    border-radius: 0;
  }
  .preview-page .workflow-document-statement-of-suitability .statement-letter-header {
    margin-bottom: 28px;
    padding-bottom: 20px;
    border-bottom: 2px solid #c68b2c;
  }
  .preview-page .workflow-document-statement-of-suitability .statement-logo {
    display: block;
    width: 180px;
    height: auto;
    margin: 0 0 16px 0;
    border-radius: 0;
  }
  .preview-page .workflow-document-statement-of-suitability .statement-address-block {
    margin-bottom: 10px;
  }
  .preview-page .workflow-document-statement-of-suitability .statement-address-block p {
    margin: 0 0 2px;
    font-family: Helvetica, Arial, sans-serif;
    font-size: 13px;
    color: #374151;
    line-height: 1.4;
  }
  .preview-page .workflow-document-statement-of-suitability .statement-letter-date {
    margin: 0;
    font-family: Helvetica, Arial, sans-serif;
    font-size: 13px;
    font-weight: 600;
    color: #5b2230;
  }
  .preview-page-footer {
    margin-top: 32px;
    padding-top: 18px;
    border-top: 1px solid #5b2230;
    text-align: center;
    color: #475569;
    font-family: Helvetica, Arial, sans-serif;
    font-size: 11px;
    line-height: 1.5;
  }
  .preview-page-footer p {
    margin: 0 0 3px;
  }
</style>
</head>
<body>
  <div class="preview-page">
    ${styledContent}
    <div class="preview-page-footer">
      <p>Suite 31, The Mall, Beacon Court, Sandyford, Dublin 18 | Tel: 01 293 8554</p>
      <p>Email: info@omegafinancial.ie | Website: www.omegafinancial.ie</p>
      <p>Omega Financial Management is regulated by the Central Bank of Ireland.</p>
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
