import { cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";

import { RichDocumentEditor } from "./rich-document-editor";

afterEach(cleanup);

describe("RichDocumentEditor", () => {
  it("preserves workflow document classes after a minimal edit", async () => {
    Object.defineProperty(Text.prototype, "getClientRects", {
      configurable: true,
      value: () => [],
    });
    Object.defineProperty(Text.prototype, "getBoundingClientRect", {
      configurable: true,
      value: () =>
        ({
          bottom: 0,
          height: 0,
          left: 0,
          right: 0,
          top: 0,
          width: 0,
          x: 0,
          y: 0,
          toJSON: () => ({}),
        }) as DOMRect,
    });

    const onContentChange = vi.fn();

    render(
      <RichDocumentEditor
        content={[
          '<article class="workflow-document workflow-document-fact-find">',
          '<div class="document-banner"><p class="document-eyebrow">Fact Find</p><h1>Fact Find</h1><p class="document-subtitle">Jamie Murphy (CLI-2026-0002)</p></div>',
          '<div class="client-summary-grid"><h2>Client Summary</h2><div class="grid-items"><div class="grid-item"><span class="grid-label">Client</span><strong>Jamie Murphy</strong></div></div></div>',
          "</article>",
        ].join("")}
        fontSize="16px"
        onContentChange={onContentChange}
        onFontSizeChange={() => {}}
      />,
    );

    const editor = document.querySelector(".ProseMirror");
    expect(editor).not.toBeNull();

    const titleText = screen.getByRole("heading", { name: "Fact Find" }).firstChild;
    expect(titleText).not.toBeNull();

    const selection = window.getSelection();
    const range = document.createRange();
    range.selectNodeContents(titleText as Node);
    selection?.removeAllRanges();
    selection?.addRange(range);

    fireEvent.mouseUp(editor as Element);
    fireEvent.click(screen.getByRole("button", { name: "Bold" }));

    await waitFor(() => {
      expect(onContentChange).toHaveBeenCalled();
    });

    const latestHtml = onContentChange.mock.calls.at(-1)?.[0] as string;
    expect(latestHtml).toContain('class="workflow-document workflow-document-fact-find"');
    expect(latestHtml).toContain('class="document-banner"');
    expect(latestHtml).toContain('class="document-eyebrow"');
    expect(latestHtml).toContain('class="document-subtitle"');
    expect(latestHtml).toContain('class="client-summary-grid"');
    expect(latestHtml).toContain('class="grid-items"');
    expect(latestHtml).toContain('class="grid-item"');
    expect(latestHtml).toContain('class="grid-label"');
  });

  it("preserves the compact Quote summary class when rendering", async () => {
    Object.defineProperty(Text.prototype, "getClientRects", {
      configurable: true,
      value: () => [],
    });
    Object.defineProperty(Text.prototype, "getBoundingClientRect", {
      configurable: true,
      value: () =>
        ({
          bottom: 0,
          height: 0,
          left: 0,
          right: 0,
          top: 0,
          width: 0,
          x: 0,
          y: 0,
          toJSON: () => ({}),
        }) as DOMRect,
    });

    const onContentChange = vi.fn();

    render(
      <RichDocumentEditor
        content={[
          '<article class="workflow-document workflow-document-quote">',
          '<div class="statement-quote-block"><h2>Income Protection Quote Comparison</h2>',
          '<div class="client-summary-grid statement-quote-summary-grid"><div class="grid-items">',
          '<div class="grid-item"><span class="grid-label">Cover amount</span><strong>60000.00</strong></div>',
          "</div></div></div>",
          "</article>",
        ].join("")}
        fontSize="16px"
        onContentChange={onContentChange}
        onFontSizeChange={() => {}}
      />,
    );

    const editor = document.querySelector(".ProseMirror");
    expect(editor).not.toBeNull();
    expect(editor?.innerHTML).toContain('class="client-summary-grid statement-quote-summary-grid"');
  });

  it("preserves Fact Find section wrappers when rendering", async () => {
    Object.defineProperty(Text.prototype, "getClientRects", {
      configurable: true,
      value: () => [],
    });
    Object.defineProperty(Text.prototype, "getBoundingClientRect", {
      configurable: true,
      value: () =>
        ({
          bottom: 0,
          height: 0,
          left: 0,
          right: 0,
          top: 0,
          width: 0,
          x: 0,
          y: 0,
          toJSON: () => ({}),
        }) as DOMRect,
    });

    render(
      <RichDocumentEditor
        content={[
          '<article class="workflow-document workflow-document-fact-find">',
          '<section class="document-grid fact-find-life-insurance-section"><h2>Life Insurance &amp; Serious Illness</h2>',
          '<div class="fact-find-life-insurance-card"><div class="statement-quote-table fact-find-life-insurance-summary-table"></div></div>',
          "</section>",
          '<section class="document-grid fact-find-declarations-section"><h2>Declarations and Confirmations</h2>',
          '<div class="grid-items"><div class="grid-item"><span class="grid-label">Execution only</span><strong>Yes</strong></div></div>',
          "</section>",
          "</article>",
        ].join("")}
        fontSize="16px"
        onContentChange={() => {}}
        onFontSizeChange={() => {}}
      />,
    );

    const editor = document.querySelector(".ProseMirror");
    expect(editor).not.toBeNull();
    expect(editor?.innerHTML).toContain('class="document-grid fact-find-life-insurance-section"');
    expect(editor?.innerHTML).toContain('class="document-grid fact-find-declarations-section"');
  });
});
