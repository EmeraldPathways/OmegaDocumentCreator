import { AlignmentType, Document, HeadingLevel, Packer, Paragraph, TextRun } from "docx";
import { saveAs } from "file-saver";

function parseHtmlToDocx(html: string): Paragraph[] {
  if (typeof DOMParser === "undefined") {
    return [
      new Paragraph({
        children: [new TextRun(html.replace(/<[^>]+>/g, " "))],
        spacing: { after: 120 },
      }),
    ];
  }

  const parser = new DOMParser();
  const doc = parser.parseFromString(html, "text/html");
  const body = doc.body;
  const paragraphs: Paragraph[] = [];

  const processNode = (node: Node, isBold = false): Array<TextRun | string> => {
    const children: Array<TextRun | string> = [];

    node.childNodes.forEach((child) => {
      if (child.nodeType === Node.TEXT_NODE) {
        const text = child.textContent ?? "";
        if (text) {
          children.push(isBold ? new TextRun({ text, bold: true }) : text);
        }
        return;
      }

      if (child.nodeType !== Node.ELEMENT_NODE) {
        return;
      }

      const element = child as Element;
      switch (element.tagName.toLowerCase()) {
        case "strong":
        case "b":
          children.push(...processNode(element, true));
          break;
        case "em":
        case "i":
          children.push(new TextRun({ text: element.textContent ?? "", bold: isBold, italics: true }));
          break;
        case "u":
          children.push(
            new TextRun({
              text: element.textContent ?? "",
              bold: isBold,
              underline: { type: "single" },
            }),
          );
          break;
        case "br":
          children.push("\n");
          break;
        default:
          children.push(...processNode(element, isBold));
      }
    });

    return children;
  };

  const createTextRuns = (children: Array<TextRun | string>): TextRun[] => {
    const textRuns: TextRun[] = [];
    let currentText = "";

    children.forEach((child) => {
      if (typeof child === "string") {
        currentText += child;
        return;
      }

      if (currentText) {
        textRuns.push(new TextRun(currentText));
        currentText = "";
      }
      textRuns.push(child);
    });

    if (currentText) {
      textRuns.push(new TextRun(currentText));
    }

    return textRuns;
  };

  Array.from(body.children).forEach((element) => {
    const tagName = element.tagName.toLowerCase();
    const textRuns = createTextRuns(processNode(element));

    if (textRuns.length === 0) {
      return;
    }

    switch (tagName) {
      case "h1":
        paragraphs.push(
          new Paragraph({
            children: textRuns,
            heading: HeadingLevel.HEADING_1,
            alignment: AlignmentType.LEFT,
            spacing: { before: 240, after: 120 },
          }),
        );
        break;
      case "h2":
        paragraphs.push(
          new Paragraph({
            children: textRuns,
            heading: HeadingLevel.HEADING_2,
            spacing: { before: 200, after: 100 },
          }),
        );
        break;
      case "h3":
        paragraphs.push(
          new Paragraph({
            children: textRuns,
            heading: HeadingLevel.HEADING_3,
            spacing: { before: 160, after: 80 },
          }),
        );
        break;
      case "ul":
      case "ol":
        Array.from(element.children).forEach((li) => {
          if (li.tagName.toLowerCase() !== "li") {
            return;
          }

          const liRuns = createTextRuns(processNode(li));
          if (liRuns.length === 0) {
            return;
          }

          paragraphs.push(
            new Paragraph({
              children: liRuns,
              bullet: { level: 0 },
              indent: { left: 360 },
              spacing: { after: 80 },
            }),
          );
        });
        break;
      default:
        paragraphs.push(
          new Paragraph({
            children: textRuns,
            spacing: { after: 120 },
          }),
        );
    }
  });

  if (paragraphs.length === 0) {
    paragraphs.push(
      new Paragraph({
        children: [new TextRun(body.textContent ?? "No content")],
      }),
    );
  }

  return paragraphs;
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
        children: parseHtmlToDocx(html),
      },
    ],
  });

  const blob = await Packer.toBlob(doc);
  saveAs(blob, filename);
}
