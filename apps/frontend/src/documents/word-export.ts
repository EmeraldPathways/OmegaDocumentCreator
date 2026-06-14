import { AlignmentType, Document, HeadingLevel, Packer, Paragraph, TextRun } from "docx";
import { saveAs } from "file-saver";

export type WordExportBlock =
  | { kind: "eyebrow"; text: string }
  | { kind: "heading1"; text: string }
  | { kind: "subtitle"; text: string }
  | { kind: "gridHeading"; text: string }
  | { kind: "gridItem"; label: string; value: string }
  | { kind: "sectionHeading"; text: string }
  | { kind: "calloutHeading"; text: string }
  | { kind: "footerHeading"; text: string }
  | { kind: "paragraph"; text: string }
  | { kind: "bullet"; text: string }
  | { kind: "spacer" };

function normalizeText(value: string | null | undefined) {
  return (value ?? "").replace(/\s+/g, " ").trim();
}

function textFromElement(element: Element | null | undefined) {
  return normalizeText(element?.textContent);
}

function buildFallbackBlocks(html: string): WordExportBlock[] {
  return [{ kind: "paragraph", text: normalizeText(html.replace(/<[^>]+>/g, " ")) || "No content" }];
}

function appendNestedContent(element: Element, blocks: WordExportBlock[]) {
  const tagName = element.tagName.toLowerCase();

  if (tagName === "p") {
    const text = textFromElement(element);
    if (text) {
      blocks.push({ kind: "paragraph", text });
    }
    return;
  }

  if (tagName === "ul" || tagName === "ol") {
    Array.from(element.children).forEach((item) => {
      if (item.tagName.toLowerCase() !== "li") {
        return;
      }
      const text = textFromElement(item);
      if (text) {
        blocks.push({ kind: "bullet", text });
      }
    });
    return;
  }

  if (/^h[1-3]$/.test(tagName)) {
    return;
  }

  Array.from(element.children).forEach((child) => appendNestedContent(child, blocks));
}

function extractBlocksFromElement(element: Element, blocks: WordExportBlock[]) {
  const tagName = element.tagName.toLowerCase();
  const classList = element.classList;

  if (tagName === "article") {
    Array.from(element.children).forEach((child) => extractBlocksFromElement(child, blocks));
    return;
  }

  if (tagName === "header" && classList.contains("document-banner")) {
    const eyebrow = textFromElement(element.querySelector(".document-eyebrow"));
    const title = textFromElement(element.querySelector("h1"));
    const subtitle = textFromElement(element.querySelector(".document-subtitle"));

    if (eyebrow) {
      blocks.push({ kind: "eyebrow", text: eyebrow });
    }
    if (title) {
      blocks.push({ kind: "heading1", text: title });
    }
    if (subtitle) {
      blocks.push({ kind: "subtitle", text: subtitle });
    }
    blocks.push({ kind: "spacer" });
    return;
  }

  if (tagName === "section" && (classList.contains("client-summary-grid") || classList.contains("document-grid"))) {
    const heading = textFromElement(element.querySelector("h2"));
    if (heading) {
      blocks.push({ kind: "gridHeading", text: heading });
    }

    Array.from(element.querySelectorAll(".grid-item")).forEach((gridItem) => {
      const label = textFromElement(gridItem.querySelector(".grid-label"));
      const value = textFromElement(gridItem.querySelector("strong")) || normalizeText(gridItem.textContent);
      if (label || value) {
        blocks.push({
          kind: "gridItem",
          label: label || "Item",
          value: value || "Not recorded",
        });
      }
    });

    blocks.push({ kind: "spacer" });
    return;
  }

  if (tagName === "section" && classList.contains("document-section")) {
    const heading = textFromElement(element.querySelector("h2"));
    if (heading) {
      blocks.push({ kind: "sectionHeading", text: heading });
    }
    Array.from(element.children).forEach((child) => appendNestedContent(child, blocks));
    blocks.push({ kind: "spacer" });
    return;
  }

  if (tagName === "aside" && classList.contains("document-callout")) {
    const heading = textFromElement(element.querySelector("h2"));
    if (heading) {
      blocks.push({ kind: "calloutHeading", text: heading });
    }
    Array.from(element.children).forEach((child) => appendNestedContent(child, blocks));
    blocks.push({ kind: "spacer" });
    return;
  }

  if (tagName === "footer" && classList.contains("signatures-footer")) {
    const heading = textFromElement(element.querySelector("h2"));
    if (heading) {
      blocks.push({ kind: "footerHeading", text: heading });
    }
    Array.from(element.children).forEach((child) => appendNestedContent(child, blocks));
    return;
  }

  if (tagName === "p") {
    const text = textFromElement(element);
    if (text) {
      blocks.push({ kind: "paragraph", text });
    }
    return;
  }

  if (tagName === "ul" || tagName === "ol") {
    Array.from(element.children).forEach((item) => {
      if (item.tagName.toLowerCase() !== "li") {
        return;
      }
      const text = textFromElement(item);
      if (text) {
        blocks.push({ kind: "bullet", text });
      }
    });
  }
}

export function extractWordExportBlocks(html: string): WordExportBlock[] {
  if (typeof DOMParser === "undefined") {
    return buildFallbackBlocks(html);
  }

  const parser = new DOMParser();
  const doc = parser.parseFromString(html, "text/html");
  const blocks: WordExportBlock[] = [];

  Array.from(doc.body.children).forEach((element) => extractBlocksFromElement(element, blocks));

  return blocks.length > 0 ? blocks : buildFallbackBlocks(html);
}

function createParagraphs(blocks: WordExportBlock[]) {
  return blocks.map((block) => {
    switch (block.kind) {
      case "eyebrow":
        return new Paragraph({
          children: [new TextRun({ text: block.text.toUpperCase(), bold: true, color: "7C4B2A", size: 20 })],
          spacing: { after: 60 },
        });
      case "heading1":
        return new Paragraph({
          children: [new TextRun({ text: block.text, bold: true })],
          heading: HeadingLevel.HEADING_1,
          alignment: AlignmentType.LEFT,
          spacing: { after: 120 },
        });
      case "subtitle":
        return new Paragraph({
          children: [new TextRun({ text: block.text, italics: true, color: "666666" })],
          spacing: { after: 180 },
        });
      case "gridHeading":
      case "sectionHeading":
      case "calloutHeading":
      case "footerHeading":
        return new Paragraph({
          children: [new TextRun({ text: block.text, bold: true, color: block.kind === "calloutHeading" ? "8A5A00" : "5B2230" })],
          heading: HeadingLevel.HEADING_2,
          spacing: { before: 120, after: 80 },
        });
      case "gridItem":
        return new Paragraph({
          children: [
            new TextRun({ text: `${block.label}: `, bold: true }),
            new TextRun({ text: block.value }),
          ],
          spacing: { after: 80 },
        });
      case "bullet":
        return new Paragraph({
          children: [new TextRun({ text: block.text })],
          bullet: { level: 0 },
          indent: { left: 360 },
          spacing: { after: 60 },
        });
      case "spacer":
        return new Paragraph({
          children: [new TextRun("")],
          spacing: { after: 120 },
        });
      case "paragraph":
      default:
        return new Paragraph({
          children: [new TextRun({ text: block.text })],
          spacing: { after: 120 },
        });
    }
  });
}

export async function exportHtmlToWord(
  html: string,
  filename: string,
  options: { title?: string; author?: string; subject?: string } = {},
) {
  const doc = new Document({
    creator: options.author ?? "Omega Document Creator",
    title: options.title ?? filename.replace(/\.docx$/i, ""),
    subject: options.subject ?? "Generated document",
    sections: [
      {
        properties: {},
        children: createParagraphs(extractWordExportBlocks(html)),
      },
    ],
  });

  const blob = await Packer.toBlob(doc);
  saveAs(blob, filename);
}
