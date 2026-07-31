import { describe, expect, it } from "vitest";

import { parseDownloadFilename } from "./generated-document-api";

describe("parseDownloadFilename", () => {
  it("parses RFC 5987 filename* values", () => {
    expect(
      parseDownloadFilename(
        "attachment; filename*=UTF-8''CLI-2026-0002_documents.zip",
        "fallback.zip",
      ),
    ).toBe("CLI-2026-0002_documents.zip");
  });

  it("falls back to plain filename values", () => {
    expect(
      parseDownloadFilename(
        'attachment; filename="statement.pdf"',
        "fallback.pdf",
      ),
    ).toBe("statement.pdf");
  });

  it("returns the fallback when no filename is present", () => {
    expect(parseDownloadFilename(null, "fallback.zip")).toBe("fallback.zip");
  });
});
