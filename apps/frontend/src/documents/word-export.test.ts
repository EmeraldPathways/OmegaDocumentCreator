import { describe, expect, it } from "vitest";

import { extractWordExportBlocks } from "./word-export";

describe("extractWordExportBlocks", () => {
  it("extracts the same structured blocks from editor-safe workflow wrappers", () => {
    const blocks = extractWordExportBlocks(
      [
        '<article class="workflow-document workflow-document-statement-of-suitability">',
        '<div class="document-banner"><p class="document-eyebrow">Statement of Suitability</p><h1>Income Protection Statement</h1><p class="document-subtitle">Jamie Murphy (CLI-2026-0002)</p></div>',
        '<div class="client-summary-grid"><h2>Client Summary</h2><div class="grid-items"><div class="grid-item"><span class="grid-label">Client</span><strong>Jamie Murphy</strong></div><div class="grid-item"><span class="grid-label">Advisor</span><strong>Omega Advisor</strong></div></div></div>',
        '<div class="document-callout document-callout-warning"><h2>Warnings and Disclaimers</h2><div><p>Benefit subject to underwriting.</p><ul><li>Deferred period applies.</li></ul></div></div>',
        '<div class="signatures-footer"><h2>Signatures and Record</h2><div><p><strong>Advisor:</strong> Omega Advisor</p><p>Keep this document on file.</p></div></div>',
        "</article>",
      ].join(""),
    );

    expect(blocks).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ kind: "eyebrow", text: "Statement of Suitability" }),
        expect.objectContaining({ kind: "heading1", text: "Income Protection Statement" }),
        expect.objectContaining({ kind: "gridHeading", text: "Client Summary" }),
        expect.objectContaining({ kind: "gridItem", label: "Client", value: "Jamie Murphy" }),
        expect.objectContaining({ kind: "calloutHeading", text: "Warnings and Disclaimers" }),
        expect.objectContaining({ kind: "paragraph", text: "Benefit subject to underwriting." }),
        expect.objectContaining({ kind: "bullet", text: "Deferred period applies." }),
        expect.objectContaining({ kind: "footerHeading", text: "Signatures and Record" }),
        expect.objectContaining({ kind: "paragraph", text: "Keep this document on file." }),
      ]),
    );
  });
});
