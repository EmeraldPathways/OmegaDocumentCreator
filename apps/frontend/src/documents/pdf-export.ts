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

function buildStyledHtml(html: string, addElementClass = false) {
  const elementClass = addElementClass ? 'class="pdf-el" ' : "";

  return html
    .replace(/^\s*```html\s*/i, "")
    .replace(/```\s*$/i, "")
    .trim()
    .replace(/<h1[^>]*>(.*?)<\/h1>/gi, `<div ${elementClass}style="font-size:22px;font-family:Helvetica,Arial,sans-serif;font-weight:700;margin-bottom:16px;color:#3c1321;">$1</div>`)
    .replace(/<h2[^>]*>(.*?)<\/h2>/gi, `<div ${elementClass}style="font-size:18px;font-family:Helvetica,Arial,sans-serif;font-weight:700;margin:16px 0 10px;color:#5b2230;border-bottom:1px solid #d6d6d6;padding-bottom:4px;">$1</div>`)
    .replace(/<h3[^>]*>(.*?)<\/h3>/gi, `<div ${elementClass}style="font-size:15px;font-family:Helvetica,Arial,sans-serif;font-weight:700;margin:12px 0 8px;color:#444;">$1</div>`)
    .replace(/<li[^>]*>(.*?)<\/li>/gi, (_match, content) => `<div ${elementClass}style="margin-left:18px;margin-bottom:6px;line-height:1.5;">• ${content.replace(/<\/?p[^>]*>/gi, "")}</div>`)
    .replace(/<ul[^>]*>|<\/ul>|<ol[^>]*>|<\/ol>/gi, "")
    .replace(/<p[^>]*>(.*?)<\/p>/gi, `<div ${elementClass}style="margin:0 0 8px;line-height:1.5;white-space:pre-wrap;">$1</div>`)
    .replace(/<strong>(.*?)<\/strong>/gi, `<span style="font-weight:700;">$1</span>`)
    .replace(/<b>(.*?)<\/b>/gi, `<span style="font-weight:700;">$1</span>`)
    .replace(/<br\s*\/?>/gi, "<br/>");
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

  const elements = Array.from(contentDiv.querySelectorAll(".pdf-el"));
  if (elements.length === 0) {
    document.body.removeChild(tempContainer);
    return [htmlContent];
  }

  let currentPageHeight = 0;
  let currentPageElements: string[] = [];

  const getElementHeight = (element: Element) => {
    const style = window.getComputedStyle(element);
    const rectHeight = element.getBoundingClientRect().height;
    return rectHeight + (parseFloat(style.marginTop) || 0) + (parseFloat(style.marginBottom) || 0);
  };

  elements.forEach((element) => {
    const nextHeight = getElementHeight(element);
    const nextHtml = (element as HTMLElement).outerHTML;

    if (currentPageElements.length > 0 && currentPageHeight + nextHeight > PAGE_CONTENT_HEIGHT) {
      pages.push(currentPageElements.join(""));
      currentPageElements = [nextHtml];
      currentPageHeight = nextHeight;
      return;
    }

    currentPageElements.push(nextHtml);
    currentPageHeight += nextHeight;
  });

  if (currentPageElements.length > 0) {
    pages.push(currentPageElements.join(""));
  }

  document.body.removeChild(tempContainer);
  return pages;
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
      font-family:'Times New Roman', Times, serif;
      font-size:14px;
    ">
      <div style="position:absolute;top:28px;left:42px;right:42px;height:88px;">
        <div style="font-family:Helvetica,Arial,sans-serif;font-size:24px;font-weight:700;color:#5b2230;">Omega Financial Management</div>
        <div style="font-family:Helvetica,Arial,sans-serif;font-size:11px;color:#666;margin-top:6px;">Income Protection Workflow</div>
      </div>
      <div style="position:absolute;top:${HEADER_HEIGHT}px;left:50px;right:50px;bottom:${FOOTER_HEIGHT}px;overflow:hidden;">
        ${content}
      </div>
      <div style="position:absolute;bottom:28px;left:42px;right:42px;border-top:1px solid #5b2230;padding-top:8px;text-align:center;">
        <div style="font-size:8px;font-family:Helvetica,Arial,sans-serif;color:#333;">Suite 31, The Mall, Beacon Court, Sandyford, Dublin 18 | Tel: 01 293 8554</div>
        <div style="font-size:8px;font-family:Helvetica,Arial,sans-serif;color:#333;margin-top:2px;">Email: info@omegafinancial.ie | Website: www.omegafinancial.ie</div>
        ${totalPages > 1 ? `<div style="font-size:8px;color:#666;margin-top:6px;">Page ${pageNumber} of ${totalPages}</div>` : ""}
      </div>
    </div>
  `;
}

function stripHtml(html: string) {
  return html
    .replace(/<br\s*\/?>/gi, "\n")
    .replace(/<\/(p|div|h1|h2|h3|li)>/gi, "\n")
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

export async function exportHtmlToPdf(html: string, filename: string) {
  if (!canRenderCanvas()) {
    const pdf = new jsPDF({ orientation: "portrait", unit: "mm", format: "a4" });
    const text = stripHtml(html);
    const lines = pdf.splitTextToSize(text, 170);
    pdf.text(lines, 20, 20);
    pdf.save(filename);
    return;
  }

  const parsedContent = buildStyledHtml(html, true);
  const pageContents = splitContentIntoPages(parsedContent);
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

    for (let pageIndex = 0; pageIndex < pageContents.length; pageIndex += 1) {
      const pageDiv = document.createElement("div");
      pageDiv.innerHTML = buildPageHtml(pageContents[pageIndex], pageIndex + 1, pageContents.length);
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

    pdf.save(filename);
  } finally {
    document.body.removeChild(container);
  }
}
