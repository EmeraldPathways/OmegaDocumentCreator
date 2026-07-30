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

  it("throws a session-expired error when document generation returns 401", async () => {
    const fetchMock = vi.mocked(fetch);
    fetchMock.mockResolvedValueOnce(new Response(null, { status: 401 }));

    await expect(
      generateDocument({
        clientReference: "CLI-2026-0002",
        documentType: "Fact Find",
        templateId: "fact-find",
        workflowSnapshot: {},
      }),
    ).rejects.toThrow("Session expired. Please log in again.");

    expect(fetchMock).toHaveBeenCalledTimes(1);
  });

  it("normalizes integration request artifacts returned by the backend", async () => {
    const fetchMock = vi.mocked(fetch);
    fetchMock.mockResolvedValueOnce(
      new Response(
        JSON.stringify({
          item: {
            title: "Statement of Suitability",
            summary: "Generated summary",
            sections: [{ id: "summary", title: "Summary", body_html: "<p>Generated body</p>" }],
            warnings: [],
            generated_html: "<section><p>Generated body</p></section>",
            integration_requests: [
              {
                provider: "BestAdvice",
                request_type: "Phi",
                status: "sent",
                requested_at: "2026-06-19T10:00:00+00:00",
                request_fields: [{ label: "DOB", value: "08/11/1990" }],
                quote_results: [{ provider_name: "Acme Life", level_premium: "42.10" }],
                errors: [],
              },
            ],
          },
        }),
        { status: 200, headers: { "Content-Type": "application/json" } },
      ),
    );

    const document = await generateDocument({
      clientReference: "CLI-2026-0002",
      documentType: "Statement of Suitability",
      templateId: "statement-of-suitability",
      workflowSnapshot: {},
    });

    expect(document.integrationRequests).toEqual([
      {
        provider: "BestAdvice",
        requestType: "Phi",
        status: "sent",
        requestedAt: "2026-06-19T10:00:00+00:00",
        requestFields: [{ label: "DOB", value: "08/11/1990" }],
        quoteResults: [
          {
            providerName: "Acme Life",
            policyType: "",
            levelPremium: "42.10",
            escalation3Premium: "",
            escalation5Premium: "",
          },
        ],
        errors: [],
      },
    ]);
  });
});
