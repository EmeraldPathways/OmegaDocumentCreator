import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

import { RichDocumentEditor } from "./rich-document-editor";

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
});
