import { readFileSync } from "node:fs";
import path from "node:path";

import { afterEach, describe, expect, it, vi } from "vitest";

import { buildPdfStyledHtml, PAGE_CONTENT_HEIGHT, paginatePdfContent, shouldShowPdfShellHeader } from "./pdf-export";

const originalGetBoundingClientRect = HTMLElement.prototype.getBoundingClientRect;

function mockPdfHeights() {
  vi.spyOn(HTMLElement.prototype, "getBoundingClientRect").mockImplementation(function getBoundingClientRect(this: HTMLElement) {
    const element = this;
    const explicitHeight = Number(element.dataset.testHeight ?? "0");

    if (explicitHeight > 0) {
      return {
        bottom: explicitHeight,
        height: explicitHeight,
        left: 0,
        right: 0,
        top: 0,
        width: 0,
        x: 0,
        y: 0,
        toJSON() {
          return {};
        },
      };
    }

    const childHeight = Array.from(element.children).reduce((total, child) => {
      const childElement = child as HTMLElement;
      return total + Number(childElement.dataset.testHeight ?? "0");
    }, 0);

    return {
      bottom: childHeight,
      height: childHeight,
      left: 0,
      right: 0,
      top: 0,
      width: 0,
      x: 0,
      y: 0,
      toJSON() {
        return {};
      },
    };
  });
}

afterEach(() => {
  vi.restoreAllMocks();
  HTMLElement.prototype.getBoundingClientRect = originalGetBoundingClientRect;
  document.body.innerHTML = "";
});

describe("paginatePdfContent", () => {
  it("splits oversized statement sections by child content instead of falling back to continuous mode", () => {
    mockPdfHeights();

    const html = `
      <article class="workflow-document workflow-document-statement-of-suitability">
        <div class="statement-section pdf-block">
          <h2 data-test-height="80">Recommendation</h2>
          <p data-test-height="360">Paragraph 1</p>
          <p data-test-height="360">Paragraph 2</p>
          <p data-test-height="360">Paragraph 3</p>
        </div>
      </article>
    `;

    const pagination = paginatePdfContent(html);

    expect(PAGE_CONTENT_HEIGHT).toBeLessThan(80 + 360 + 360 + 360);
    expect(pagination.mode).toBe("paged");
    if (pagination.mode !== "paged") {
      return;
    }

    expect(pagination.pages).toHaveLength(2);
    expect(pagination.pages[0]).toContain("Paragraph 1");
    expect(pagination.pages[0]).toContain("Paragraph 2");
    expect(pagination.pages[1]).toContain("Paragraph 3");
  });
});

describe("shouldShowPdfShellHeader", () => {
  it("shows the shell header on every exported page", () => {
    expect(shouldShowPdfShellHeader(true, 0)).toBe(true);
    expect(shouldShowPdfShellHeader(true, 1)).toBe(true);
    expect(shouldShowPdfShellHeader(false, 0)).toBe(true);
  });
});

describe("quote table layout", () => {
  it("uses four columns across editor and PDF styling for quote rows", () => {
    const stylesPath = path.resolve(process.cwd(), "src/styles.css");
    const styles = readFileSync(stylesPath, "utf8");
    const styledHtml = buildPdfStyledHtml(
      '<article class="workflow-document workflow-document-quote"><div class="statement-quote-row"></div></article>',
      true,
    );

    expect(styles).toContain("grid-template-columns: 1.4fr 1fr 1fr 1fr;");
    expect(styledHtml).toContain("grid-template-columns:1.4fr 1fr 1fr 1fr");
  });
});
