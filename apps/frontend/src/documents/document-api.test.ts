import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { generateDocument } from "./document-api";

describe("generateDocument", () => {
  beforeEach(() => {
    vi.stubGlobal("fetch", vi.fn());
    window.sessionStorage.clear();
  });

  afterEach(() => {
    vi.unstubAllGlobals();
    vi.clearAllMocks();
    window.sessionStorage.clear();
  });

  it("restores a demo staff API session when the browser is still unauthenticated", async () => {
    const fetchMock = vi.mocked(fetch);
    fetchMock
      .mockResolvedValueOnce(new Response(null, { status: 401 }))
      .mockResolvedValueOnce(new Response(JSON.stringify({ user: { email: "staff@omega.local", role: "staff" } }), { status: 200 }))
      .mockResolvedValueOnce(
        new Response(
          JSON.stringify({
            item: {
              title: "Fact Find",
              summary: "Generated summary",
              sections: [{ id: "summary", title: "Summary", body_html: "<p>Generated body</p>" }],
              warnings: [],
              generated_html: "<section><p>Generated body</p></section>",
            },
          }),
          { status: 200, headers: { "Content-Type": "application/json" } },
        ),
      );

    const document = await generateDocument({
      clientReference: "CLI-2026-0002",
      documentType: "Fact Find",
      templateId: "fact-find",
      workflowSnapshot: {},
    });

    expect(document.title).toBe("Fact Find");
    expect(fetchMock).toHaveBeenNthCalledWith(
      2,
      "/auth/login",
      expect.objectContaining({
        method: "POST",
        body: JSON.stringify({
          email: "staff@omega.local",
          password: "ChangeMe123!",
        }),
      }),
    );
    expect(fetchMock).toHaveBeenCalledTimes(3);
  });
});
