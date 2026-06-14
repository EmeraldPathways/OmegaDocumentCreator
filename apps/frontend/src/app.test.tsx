import { cleanup, fireEvent, render, screen, waitFor, within } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const { exportGeneratedDocumentMock, exportHtmlToPdfMock, exportHtmlToWordMock } = vi.hoisted(() => ({
  exportGeneratedDocumentMock: vi.fn(() => Promise.resolve()),
  exportHtmlToPdfMock: vi.fn(() => Promise.resolve()),
  exportHtmlToWordMock: vi.fn(() => Promise.resolve()),
}));

vi.mock("./documents/export-generated-document", async (importOriginal) => {
  const actual = await importOriginal<typeof import("./documents/export-generated-document")>();

  return {
    ...actual,
    exportGeneratedDocument: exportGeneratedDocumentMock,
  };
});

vi.mock("./documents/pdf-export", () => ({
  exportHtmlToPdf: exportHtmlToPdfMock,
}));

vi.mock("./documents/word-export", () => ({
  exportHtmlToWord: exportHtmlToWordMock,
}));

function createGenerateDocumentResponse(
  overrides?: Partial<{ generatedHtml: string; sectionBodyHtml: string; title: string; sectionTitle: string }>,
) {
  return {
    ok: true,
    json: async () => ({
      item: {
        title: overrides?.title ?? "Generated document",
        summary: "Generated summary",
        sections: [
          {
            id: "summary",
            title: overrides?.sectionTitle ?? "Summary",
            bodyHtml: overrides?.sectionBodyHtml ?? "<p>Generated body</p>",
          },
        ],
        warnings: [],
        generated_html: overrides?.generatedHtml ?? "<section><p>Generated body</p></section>",
      },
    }),
  };
}

import { App } from "./App";
import { ClientDataProvider, useClientData } from "./data/client-data-context";
import { createSeededClientProfiles } from "./data/seeded-clients";
import { builtInDocumentTemplates } from "./documents/document-templates";

beforeEach(() => {
  vi.stubGlobal("fetch", vi.fn().mockResolvedValue(createGenerateDocumentResponse()));
});

afterEach(() => {
  window.sessionStorage.clear();
  window.localStorage.clear();
  vi.unstubAllGlobals();
  vi.clearAllMocks();
  cleanup();
});

describe("App routes", () => {
  function signInAsAdmin() {
    window.sessionStorage.setItem(
      "omega-session-user",
      JSON.stringify({ email: "admin@omega.local", role: "admin" }),
    );
  }

  it("redirects the root route to Income Protection", () => {
    render(
      <MemoryRouter initialEntries={["/"]}>
        <App />
      </MemoryRouter>,
    );

    expect(screen.getByRole("heading", { name: "Income Protection" })).toBeInTheDocument();
    expect(screen.getAllByText(/Test Client\s+\(CLI-2026-0001\)/)).toHaveLength(1);
    expect(screen.getByRole("link", { name: "Add Client" })).toBeInTheDocument();
  });

  it("renders the clients page for the clients route", () => {
    render(
      <MemoryRouter initialEntries={["/clients"]}>
        <App />
      </MemoryRouter>,
    );

    expect(screen.getByRole("heading", { name: "Clients" })).toBeInTheDocument();
    expect(screen.getByText("CLI-2026-0001")).toBeInTheDocument();
    expect(screen.getByText("Jamie Murphy")).toBeInTheDocument();
  });

  it("redirects the top-level Income Protection route into a client workflow", () => {
    render(
      <MemoryRouter initialEntries={["/income-protection"]}>
        <App />
      </MemoryRouter>,
    );

    expect(screen.getByRole("heading", { name: "Income Protection" })).toBeInTheDocument();
    expect(screen.getAllByText(/Test Client\s+\(CLI-2026-0001\)/)).toHaveLength(1);
    expect(screen.getByLabelText("Search workflow clients")).toBeInTheDocument();
    expect(screen.getByLabelText("Select workflow client")).toBeInTheDocument();
  });

  it("redirects the Documents route to Clients", () => {
    render(
      <MemoryRouter initialEntries={["/documents"]}>
        <App />
      </MemoryRouter>,
    );

    expect(screen.getByRole("heading", { name: "Clients" })).toBeInTheDocument();
    expect(screen.getByText("Jamie Murphy")).toBeInTheDocument();
    expect(screen.getByText("CLI-2026-0002")).toBeInTheDocument();
  });

  it("redirects a document folder route to the client record with files and generated documents", () => {
    render(
      <MemoryRouter initialEntries={["/documents/CLI-2026-0002"]}>
        <App />
      </MemoryRouter>,
    );

    expect(screen.getByRole("heading", { name: "Jamie Murphy" })).toBeInTheDocument();
    expect(screen.getByRole("heading", { name: "Generated Documents" })).toBeInTheDocument();
    expect(screen.getByRole("heading", { name: "Files" })).toBeInTheDocument();
    expect(
      screen.getAllByDisplayValue("Jamie_Murphy_Statement_of_Suitability_2026-06-06.pdf").length,
    ).toBeGreaterThan(1);
    expect(screen.getByDisplayValue("jamie-murphy-passport.pdf")).toBeInTheDocument();
  });

  it("renders the Files route with tracked client uploads", () => {
    render(
      <MemoryRouter initialEntries={["/files"]}>
        <App />
      </MemoryRouter>,
    );

    expect(screen.getByRole("heading", { name: "Files" })).toBeInTheDocument();
    expect(screen.getByText("jamie-murphy-passport.pdf")).toBeInTheDocument();
    expect(screen.getByText("Proof of Age")).toBeInTheDocument();
  });

  it("renders the client profile page for an individual client route", () => {
    render(
      <MemoryRouter initialEntries={["/clients/CLI-2026-0002"]}>
        <App />
      </MemoryRouter>,
    );

    expect(screen.getByRole("heading", { name: "Jamie Murphy" })).toBeInTheDocument();
    expect(screen.getByText("CLI-2026-0002")).toBeInTheDocument();
    expect(screen.getAllByText("Active").length).toBeGreaterThan(0);
    expect(screen.getByText("0870000002")).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "Open Income Protection" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Save Documents" })).toBeInTheDocument();
    expect(screen.getByRole("heading", { name: "Generated Documents" })).toBeInTheDocument();
    expect(screen.getByRole("heading", { name: "Files" })).toBeInTheDocument();
  });

  it("opens a generated document from the client file", () => {
    render(
      <MemoryRouter initialEntries={["/clients/CLI-2026-0002"]}>
        <App />
      </MemoryRouter>,
    );

    fireEvent.click(screen.getAllByRole("button", { name: "Open" })[0]);

    expect(screen.getByRole("heading", { name: "Document Preview" })).toBeInTheDocument();
    expect(screen.getAllByText("Statement of Suitability").length).toBeGreaterThan(0);
  });

  it("renders the create client form route", () => {
    render(
      <MemoryRouter initialEntries={["/clients/new"]}>
        <App />
      </MemoryRouter>,
    );

    expect(screen.getByRole("heading", { name: "Create Client" })).toBeInTheDocument();
    expect(screen.getByLabelText("First name")).toBeInTheDocument();
    expect(screen.getByLabelText("Surname")).toBeInTheDocument();
    expect(screen.getByLabelText("Mobile number")).toBeInTheDocument();
  });

  it("creates new clients with empty idle document drafts", () => {
    render(
      <MemoryRouter initialEntries={["/clients/new"]}>
        <App />
      </MemoryRouter>,
    );

    fireEvent.change(screen.getByLabelText("First name"), { target: { value: "Casey" } });
    fireEvent.change(screen.getByLabelText("Surname"), { target: { value: "Doyle" } });
    fireEvent.change(screen.getByLabelText("Mobile number"), { target: { value: "0871234567" } });
    fireEvent.click(screen.getByRole("button", { name: "Save Draft" }));

    const storedClients = JSON.parse(window.localStorage.getItem("omega-client-records") ?? "{}") as Record<string, {
      documentDrafts?: Record<string, { generationStatus: string; lastGeneratedHtml: string; lastGeneratedSections: unknown[] }>;
    }>;
    const newClient = storedClients["CLI-2026-0003"];

    expect(newClient).toBeDefined();
    expect(newClient.documentDrafts?.["Fact Find"]).toMatchObject({
      selectedTemplateId: "fact-find",
      generationStatus: "idle",
      lastGeneratedHtml: "",
      lastGeneratedSections: [],
    });
    expect(newClient.documentDrafts?.["Terms of Business"]).toMatchObject({
      selectedTemplateId: "terms-of-business",
      generationStatus: "idle",
      lastGeneratedHtml: "",
      lastGeneratedSections: [],
    });
    expect(newClient.documentDrafts?.["Statement of Suitability"]).toMatchObject({
      selectedTemplateId: "statement-of-suitability",
      generationStatus: "idle",
      lastGeneratedHtml: "",
      lastGeneratedSections: [],
    });
  });

  it("renders the Admin page with seeded audit logs", () => {
    signInAsAdmin();

    render(
      <MemoryRouter initialEntries={["/admin"]}>
        <App />
      </MemoryRouter>,
    );

    expect(screen.getByRole("heading", { name: "Admin" })).toBeInTheDocument();
    expect(screen.getByRole("heading", { name: "Audit Logs" })).toBeInTheDocument();
    expect(screen.getByText("Document generated")).toBeInTheDocument();
    expect(screen.getByText("Statement of Suitability PDF")).toBeInTheDocument();
  });

  it("renders the Admin page with backup status and trigger action", () => {
    signInAsAdmin();

    render(
      <MemoryRouter initialEntries={["/admin"]}>
        <App />
      </MemoryRouter>,
    );

    expect(screen.getByRole("heading", { name: "Backups" })).toBeInTheDocument();
    expect(screen.getByText("Last successful backup")).toBeInTheDocument();
    expect(screen.getByText("2026-06-05 18:00")).toBeInTheDocument();
    expect(screen.getByText("Backup status: Ready")).toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: "Run Backup Now" }));

    expect(screen.getByText("Backup status: Backup placeholder completed")).toBeInTheDocument();
  });

  it("renders the Admin page with the Stage 14 security guidance", () => {
    signInAsAdmin();

    render(
      <MemoryRouter initialEntries={["/admin"]}>
        <App />
      </MemoryRouter>,
    );

    expect(screen.getByRole("heading", { name: "Security" })).toBeInTheDocument();
    expect(screen.getByText("Remote access recommendation")).toBeInTheDocument();
    expect(screen.getByText("Cloudflare Tunnel with Cloudflare Access")).toBeInTheDocument();
    expect(screen.getByText("Public port exposure")).toBeInTheDocument();
    expect(screen.getByText("Disabled")).toBeInTheDocument();
  });

  it("shows the Admin tab only when signed in as admin", () => {
    render(
      <MemoryRouter initialEntries={["/clients"]}>
        <App />
      </MemoryRouter>,
    );

    expect(screen.queryByText("Admin")).not.toBeInTheDocument();

    cleanup();
    window.sessionStorage.setItem(
      "omega-session-user",
      JSON.stringify({ email: "admin@omega.local", role: "admin" }),
    );

    render(
      <MemoryRouter initialEntries={["/clients"]}>
        <App />
      </MemoryRouter>,
    );

    expect(screen.getByRole("link", { name: "Admin" })).toBeInTheDocument();
  });

  it("renders the Settings page with Stage 16 AI readiness guidance", () => {
    render(
      <MemoryRouter initialEntries={["/settings"]}>
        <App />
      </MemoryRouter>,
    );

    expect(screen.getByRole("heading", { name: "Settings" })).toBeInTheDocument();
    expect(screen.getByRole("heading", { name: "AI Readiness" })).toBeInTheDocument();
    expect(screen.getByRole("heading", { name: "Core App Settings" })).toBeInTheDocument();
    expect(screen.getByText("Version 1 AI status")).toBeInTheDocument();
    expect(screen.getByText("Disabled")).toBeInTheDocument();
    expect(screen.getByText("Ollama-ready")).toBeInTheDocument();
  });

  it("renders the edit client form route", () => {
    render(
      <MemoryRouter initialEntries={["/clients/CLI-2026-0002/edit"]}>
        <App />
      </MemoryRouter>,
    );

    expect(screen.getByRole("heading", { name: "Edit Client" })).toBeInTheDocument();
    expect(screen.getByDisplayValue("Jamie")).toBeInTheDocument();
    expect(screen.getByDisplayValue("Murphy")).toBeInTheDocument();
  });

  it("renders the income protection shell for a selected client route", () => {
    render(
      <MemoryRouter initialEntries={["/clients/CLI-2026-0002/income-protection"]}>
        <App />
      </MemoryRouter>,
    );

    expect(screen.getByRole("heading", { name: "Income Protection" })).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "Add Client" })).toBeInTheDocument();
    expect(screen.getByLabelText("Search workflow clients")).toBeInTheDocument();
    expect(screen.getByLabelText("Select workflow client")).toHaveValue("CLI-2026-0002");
  });

  it("renders the Stage 4 tab labels", () => {
    render(
      <MemoryRouter initialEntries={["/clients/CLI-2026-0002/income-protection"]}>
        <App />
      </MemoryRouter>,
    );

    expect(screen.getByRole("tab", { name: "Client Details" })).toBeInTheDocument();
    expect(screen.getByRole("tab", { name: "Fact Find" })).toBeInTheDocument();
    expect(screen.getByRole("tab", { name: "Terms of Business" })).toBeInTheDocument();
    expect(screen.getByRole("tab", { name: "Statement of Suitability" })).toBeInTheDocument();
    expect(screen.getByRole("tab", { name: "Files" })).toBeInTheDocument();
    expect(screen.getByRole("tab", { name: "Generated Documents" })).toBeInTheDocument();
  });

  it("renders the first Fact Find draft fields with shared client values", () => {
    render(
      <MemoryRouter initialEntries={["/clients/CLI-2026-0002/income-protection"]}>
        <App />
      </MemoryRouter>,
    );

    fireEvent.click(screen.getByRole("tab", { name: "Fact Find" }));

    expect(screen.getByRole("heading", { name: "Fact Find Draft" })).toBeInTheDocument();
    expect(screen.getAllByDisplayValue("Jamie Murphy").length).toBeGreaterThan(1);
    expect(screen.getByDisplayValue("jamie.murphy@example.com")).toBeInTheDocument();
    expect(screen.getByDisplayValue("Employed")).toBeInTheDocument();
    expect(screen.getByDisplayValue("60000")).toBeInTheDocument();
    expect(screen.getAllByDisplayValue("Zurich Life").length).toBeGreaterThan(1);
    expect(screen.getByRole("heading", { name: "Life Insurance & Serious Illness" })).toBeInTheDocument();
    expect(screen.getByRole("heading", { name: "Request for Information" })).toBeInTheDocument();
  });

  it("updates the draft save status inside the Fact Find tab", () => {
    render(
      <MemoryRouter initialEntries={["/clients/CLI-2026-0002/income-protection"]}>
        <App />
      </MemoryRouter>,
    );

    fireEvent.click(screen.getByRole("tab", { name: "Fact Find" }));

    expect(screen.getByText("Not saved yet")).toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: "Save" }));

    expect(screen.getByText("Saved just now")).toBeInTheDocument();
  });

  it("shows the Fact Find missing-field checklist before final generation without blocking draft save", () => {
    render(
      <MemoryRouter initialEntries={["/clients/CLI-2026-0001/income-protection"]}>
        <App />
      </MemoryRouter>,
    );

    fireEvent.click(screen.getByRole("tab", { name: "Fact Find" }));
    fireEvent.click(screen.getByRole("button", { name: "Generate Draft" }));

    expect(screen.getByText("Generation: Blocked by missing required fields")).toBeInTheDocument();
    expect(screen.getByText(/Missing required fields/)).toBeInTheDocument();
    expect(screen.getAllByText(/Occupation/).length).toBeGreaterThan(1);
    expect(screen.getByText(/Email or phone/)).toBeInTheDocument();
    expect(screen.getAllByText(/Advisor name/).length).toBeGreaterThan(1);

    fireEvent.click(screen.getByRole("button", { name: "Save" }));

    expect(screen.getByText("Saved just now")).toBeInTheDocument();
  });

  it("renders the saved Fact Find generated preview without exporting or appending history", async () => {
    render(
      <MemoryRouter initialEntries={["/clients/CLI-2026-0002/income-protection"]}>
        <App />
      </MemoryRouter>,
    );

    fireEvent.click(screen.getByRole("tab", { name: "Fact Find" }));
    fireEvent.click(screen.getByRole("button", { name: "Generate Draft" }));

    await waitFor(() => {
      expect(screen.getByText("Generation: Draft generated")).toBeInTheDocument();
    });
    expect(screen.getByRole("heading", { name: "Generated preview" })).toBeInTheDocument();
    expect(screen.getByText("Generated body")).toBeInTheDocument();
    expect(exportGeneratedDocumentMock).not.toHaveBeenCalled();
  });

  it("allows inline editing of generated preview sections and persists the edited content after reopening", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue(
        createGenerateDocumentResponse({
          generatedHtml: "<section><h2>Summary</h2><p>Generated body</p></section>",
          sectionBodyHtml: "<p>Generated body</p>",
          sectionTitle: "Summary",
        }),
      ),
    );

    render(
      <MemoryRouter initialEntries={["/clients/CLI-2026-0002/income-protection"]}>
        <App />
      </MemoryRouter>,
    );

    fireEvent.click(screen.getByRole("tab", { name: "Fact Find" }));
    fireEvent.click(screen.getByRole("button", { name: "Generate Draft" }));

    await waitFor(() => {
      expect(screen.getByText("Generated body")).toBeInTheDocument();
    });

    fireEvent.change(screen.getByLabelText("Summary content"), {
      target: { value: "<p>Edited preview content</p>" },
    });

    await waitFor(() => {
      expect(screen.getByText("Edited preview content")).toBeInTheDocument();
    });

    cleanup();

    render(
      <MemoryRouter initialEntries={["/clients/CLI-2026-0002/income-protection"]}>
        <App />
      </MemoryRouter>,
    );

    fireEvent.click(screen.getByRole("tab", { name: "Fact Find" }));

    expect(screen.getByDisplayValue("<p>Edited preview content</p>")).toBeInTheDocument();
    expect(screen.getByText("Edited preview content")).toBeInTheDocument();
  });

  it("exports the edited preview directly from the preview panel after generation", async () => {
    render(
      <MemoryRouter initialEntries={["/clients/CLI-2026-0002/income-protection"]}>
        <App />
      </MemoryRouter>,
    );

    fireEvent.click(screen.getByRole("tab", { name: "Fact Find" }));
    fireEvent.click(screen.getByRole("button", { name: "Generate Draft" }));

    await waitFor(() => {
      expect(screen.getByText("Generated body")).toBeInTheDocument();
    });

    fireEvent.change(screen.getByLabelText("Summary content"), {
      target: { value: "<p>Edited preview export</p>" },
    });
    fireEvent.click(screen.getByRole("button", { name: "Export PDF" }));

    const exportCall = exportGeneratedDocumentMock.mock.calls[0];
    expect(exportCall?.[0]).toEqual(expect.objectContaining({ clientReference: "CLI-2026-0002" }));
    expect(exportCall?.[1]).toBe("Fact Find");
    expect(exportCall?.[2]).toBe("pdf");
    expect(exportCall?.[3]).toMatch(/^Jamie_Murphy_Fact_Find_\d{4}-\d{2}-\d{2}\.pdf$/);
    expect(exportCall?.[4]).toEqual(
      expect.objectContaining({
        title: "Fact Find",
        html: expect.stringContaining("Edited preview export"),
      }),
    );
    expect((exportCall?.[4] as { html: string }).html).toContain('class="workflow-document workflow-document-fact-find"');
  });

  it("records generated-document and file history when exporting from the preview panel", async () => {
    render(
      <MemoryRouter initialEntries={["/clients/CLI-2026-0002/income-protection"]}>
        <App />
      </MemoryRouter>,
    );

    fireEvent.click(screen.getByRole("tab", { name: "Fact Find" }));
    fireEvent.click(screen.getByRole("button", { name: "Generate Draft" }));

    await waitFor(() => {
      expect(screen.getByText("Generated body")).toBeInTheDocument();
    });

    fireEvent.click(screen.getByRole("button", { name: "Export PDF" }));

    await waitFor(() => {
      expect(exportGeneratedDocumentMock).toHaveBeenCalled();
    });

    fireEvent.click(screen.getByRole("tab", { name: "Generated Documents" }));
    const previewRow = screen.getByText(/Jamie_Murphy_Fact_Find_\d{4}-\d{2}-\d{2}\.pdf/).closest("tr");
    expect(previewRow).not.toBeNull();
    expect(within(previewRow as HTMLElement).getByText("PDF ready")).toBeInTheDocument();

    fireEvent.click(screen.getByRole("tab", { name: "Files" }));
    expect(screen.getByText(/Jamie_Murphy_Fact_Find_\d{4}-\d{2}-\d{2}\.pdf/)).toBeInTheDocument();
    expect(screen.getAllByText("Generated Documents").length).toBeGreaterThan(0);
  });

  it("versions repeated preview exports so history rows and filenames stay distinct", async () => {
    render(
      <MemoryRouter initialEntries={["/clients/CLI-2026-0002/income-protection"]}>
        <App />
      </MemoryRouter>,
    );

    fireEvent.click(screen.getByRole("tab", { name: "Fact Find" }));
    fireEvent.click(screen.getByRole("button", { name: "Generate Draft" }));

    await waitFor(() => {
      expect(screen.getByText("Generated body")).toBeInTheDocument();
    });

    fireEvent.click(screen.getByRole("button", { name: "Export PDF" }));
    fireEvent.click(screen.getByRole("button", { name: "Export PDF" }));

    fireEvent.click(screen.getByRole("tab", { name: "Generated Documents" }));

    await waitFor(() => {
      const firstExportRow = screen.getByText(/Jamie_Murphy_Fact_Find_\d{4}-\d{2}-\d{2}\.pdf/).closest("tr");
      const secondExportRow = screen.getByText(/Jamie_Murphy_Fact_Find_\d{4}-\d{2}-\d{2}_v2\.pdf/).closest("tr");

      expect(firstExportRow).not.toBeNull();
      expect(secondExportRow).not.toBeNull();
      expect(within(firstExportRow as HTMLElement).getByText("Version 1")).toBeInTheDocument();
      expect(within(secondExportRow as HTMLElement).getByText("Version 2")).toBeInTheDocument();
    });
  });

  it("keeps preview export versioning independent per client after switching clients", async () => {
    const storedClients = createSeededClientProfiles();
    storedClients["CLI-2026-0001"].documentDrafts["Fact Find"] = {
      ...storedClients["CLI-2026-0001"].documentDrafts["Fact Find"],
      generationStatus: "completed",
      lastGeneratedHtml: "<section><p>Client one preview</p></section>",
      lastGeneratedSections: [
        {
          id: "summary",
          title: "Summary",
          bodyHtml: "<p>Client one preview</p>",
        },
      ],
    };
    window.localStorage.setItem("omega-client-records", JSON.stringify(storedClients));

    render(
      <MemoryRouter initialEntries={["/clients/CLI-2026-0002/income-protection"]}>
        <App />
      </MemoryRouter>,
    );

    fireEvent.click(screen.getByRole("tab", { name: "Fact Find" }));
    fireEvent.click(screen.getByRole("button", { name: "Generate Draft" }));

    await waitFor(() => {
      expect(screen.getByText("Generated body")).toBeInTheDocument();
    });

    fireEvent.click(screen.getByRole("button", { name: "Export PDF" }));

    await waitFor(() => {
      expect(exportGeneratedDocumentMock).toHaveBeenCalledTimes(1);
    });

    fireEvent.change(screen.getByLabelText("Select workflow client"), {
      target: { value: "CLI-2026-0001" },
    });

    fireEvent.click(screen.getByRole("tab", { name: "Fact Find" }));
    fireEvent.click(screen.getByRole("button", { name: "Export PDF" }));

    await waitFor(() => {
      expect(exportGeneratedDocumentMock).toHaveBeenCalledTimes(2);
    });

    const storedState = JSON.parse(window.localStorage.getItem("omega-client-records") ?? "{}") as Record<
      string,
      { generatedDocuments: Array<{ documentName: string; version: string }> }
    >;

    expect(storedState["CLI-2026-0002"].generatedDocuments[0]).toEqual(
      expect.objectContaining({
        documentName: "Jamie_Murphy_Fact_Find_2026-06-06.pdf",
        version: "Version 1",
      }),
    );
    expect(storedState["CLI-2026-0001"].generatedDocuments[0]).toEqual(
      expect.objectContaining({
        documentName: "Test_Client_Fact_Find_2026-01-15_v2.pdf",
        version: "Version 2",
      }),
    );
  });

  it("does not burn version 1 when a preview export fails before succeeding", async () => {
    exportGeneratedDocumentMock.mockRejectedValueOnce(new Error("export failed"));

    render(
      <MemoryRouter initialEntries={["/clients/CLI-2026-0002/income-protection"]}>
        <App />
      </MemoryRouter>,
    );

    fireEvent.click(screen.getByRole("tab", { name: "Fact Find" }));
    fireEvent.click(screen.getByRole("button", { name: "Generate Draft" }));

    await waitFor(() => {
      expect(screen.getByText("Generated body")).toBeInTheDocument();
    });

    fireEvent.click(screen.getByRole("button", { name: "Export PDF" }));

    await waitFor(() => {
      expect(exportGeneratedDocumentMock).toHaveBeenCalledTimes(1);
    });

    let storedState = JSON.parse(window.localStorage.getItem("omega-client-records") ?? "{}") as Record<
      string,
      { generatedDocuments: Array<{ documentName: string; version: string }> }
    >;
    expect(
      storedState["CLI-2026-0002"].generatedDocuments.some(
        (document) => document.documentName === "Jamie_Murphy_Fact_Find_2026-06-06.pdf",
      ),
    ).toBe(false);

    fireEvent.click(screen.getByRole("button", { name: "Export PDF" }));

    await waitFor(() => {
      expect(exportGeneratedDocumentMock).toHaveBeenCalledTimes(2);
    });

    storedState = JSON.parse(window.localStorage.getItem("omega-client-records") ?? "{}") as Record<
      string,
      { generatedDocuments: Array<{ documentName: string; version: string }> }
    >;
    expect(storedState["CLI-2026-0002"].generatedDocuments[0]).toEqual(
      expect.objectContaining({
        documentName: "Jamie_Murphy_Fact_Find_2026-06-06.pdf",
        version: "Version 1",
      }),
    );
  });

  it("reserves unique pending versions across interleaving preview export completions", async () => {
    let resolveFirstExport: (() => void) | undefined;
    let resolveSecondExport: (() => void) | undefined;

    exportGeneratedDocumentMock.mockImplementationOnce(
      () =>
        new Promise<void>((resolve) => {
          resolveFirstExport = resolve;
        }),
    );
    exportGeneratedDocumentMock.mockImplementationOnce(
      () =>
        new Promise<void>((resolve) => {
          resolveSecondExport = resolve;
        }),
    );

    render(
      <MemoryRouter initialEntries={["/clients/CLI-2026-0002/income-protection"]}>
        <App />
      </MemoryRouter>,
    );

    fireEvent.click(screen.getByRole("tab", { name: "Fact Find" }));
    fireEvent.click(screen.getByRole("button", { name: "Generate Draft" }));

    await waitFor(() => {
      expect(screen.getByText("Generated body")).toBeInTheDocument();
    });

    fireEvent.click(screen.getByRole("button", { name: "Export PDF" }));
    fireEvent.click(screen.getByRole("button", { name: "Export PDF" }));

    await waitFor(() => {
      expect(exportGeneratedDocumentMock).toHaveBeenCalledTimes(2);
    });

    resolveSecondExport?.();

    await waitFor(() => {
      const storedState = JSON.parse(window.localStorage.getItem("omega-client-records") ?? "{}") as Record<
        string,
        { generatedDocuments: Array<{ documentName: string }> }
      >;
      expect(storedState["CLI-2026-0002"].generatedDocuments[0]?.documentName).toBe("Jamie_Murphy_Fact_Find_2026-06-06_v2.pdf");
    });

    fireEvent.click(screen.getByRole("button", { name: "Export PDF" }));

    await waitFor(() => {
      expect(exportGeneratedDocumentMock).toHaveBeenCalledTimes(3);
    });

    expect(exportGeneratedDocumentMock.mock.calls[2]?.[3]).toBe("Jamie_Murphy_Fact_Find_2026-06-06_v3.pdf");

    resolveFirstExport?.();
  });

  it("calls AI generation for Fact Find, saves the generated draft, and displays preview HTML", async () => {
    const fetchMock = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({
        item: {
          title: "Fact Find",
          summary: "Generated summary",
          sections: [
            {
              id: "summary",
              title: "Summary",
              bodyHtml: "<p>AI generated fact find summary.</p>",
            },
          ],
          warnings: [],
          generated_html: "<section><p>AI generated fact find summary.</p></section>",
        },
      }),
    });
    vi.stubGlobal("fetch", fetchMock);

    render(
      <MemoryRouter initialEntries={["/clients/CLI-2026-0002/income-protection"]}>
        <App />
      </MemoryRouter>,
    );

    fireEvent.click(screen.getByRole("tab", { name: "Fact Find" }));
    fireEvent.click(screen.getByRole("button", { name: "Generate Draft" }));

    await waitFor(() => {
      expect(fetchMock).toHaveBeenCalledTimes(1);
    });

    expect(fetchMock).toHaveBeenCalledWith(
      "/documents/generate",
      expect.objectContaining({
        method: "POST",
      }),
    );
    await waitFor(() => {
      const storedClients = JSON.parse(window.localStorage.getItem("omega-client-records") ?? "{}") as Record<
        string,
        {
          documentDrafts?: Record<
            string,
            { generationStatus: string; lastGeneratedHtml: string; lastGeneratedSections: Array<{ title: string }> }
          >;
        }
      >;

      expect(storedClients["CLI-2026-0002"]?.documentDrafts?.["Fact Find"]).toMatchObject({
        generationStatus: "completed",
        lastGeneratedHtml: "<section><p>AI generated fact find summary.</p></section>",
      });
      expect(storedClients["CLI-2026-0002"]?.documentDrafts?.["Fact Find"]?.lastGeneratedSections[0]).toMatchObject({
        title: "Summary",
      });
    });

    expect(screen.getByText("AI generated fact find summary.")).toBeInTheDocument();
    expect(exportGeneratedDocumentMock).not.toHaveBeenCalled();

    vi.unstubAllGlobals();
  });

  it("sanitizes generated preview HTML before storing and rendering it", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue(
        createGenerateDocumentResponse({
          generatedHtml:
            "<section><p>Safe preview</p><script>alert('x')</script><a href=\"javascript:alert('x')\" onclick=\"alert('x')\">Unsafe link</a><svg><foreignObject><p style=\"color:red\">Styled payload</p></foreignObject></svg><img src=\"x\" alt=\"bad\" /><custom-tag><strong>Nested safe text</strong></custom-tag></section>",
          sectionBodyHtml:
            "<p>Safe preview</p><script>alert('x')</script><a href=\"javascript:alert('x')\" onclick=\"alert('x')\">Unsafe link</a><svg><foreignObject><p style=\"color:red\">Styled payload</p></foreignObject></svg><img src=\"x\" alt=\"bad\" /><custom-tag><strong>Nested safe text</strong></custom-tag>",
        }),
      ),
    );

    render(
      <MemoryRouter initialEntries={["/clients/CLI-2026-0002/income-protection"]}>
        <App />
      </MemoryRouter>,
    );

    fireEvent.click(screen.getByRole("tab", { name: "Fact Find" }));
    fireEvent.click(screen.getByRole("button", { name: "Generate Draft" }));

    await waitFor(() => {
      expect(screen.getByText("Safe preview")).toBeInTheDocument();
    });

    const preview = screen.getByRole("heading", { name: "Generated preview" }).closest("section");
    expect(preview?.querySelector("script")).toBeNull();
    expect(preview?.querySelector("[onclick]")).toBeNull();
    expect(preview?.querySelector("svg")).toBeNull();
    expect(preview?.querySelector("img")).toBeNull();
    expect(preview?.querySelector("[style]")).toBeNull();
    expect(screen.getByText("Nested safe text")).toBeInTheDocument();

    const storedClients = JSON.parse(window.localStorage.getItem("omega-client-records") ?? "{}") as Record<
      string,
      {
        documentDrafts?: Record<string, { lastGeneratedHtml: string }>;
      }
    >;
    const storedHtml = storedClients["CLI-2026-0002"]?.documentDrafts?.["Fact Find"]?.lastGeneratedHtml ?? "";

    expect(storedHtml).not.toContain("<script");
    expect(storedHtml).not.toContain("onclick=");
    expect(storedHtml).not.toContain("javascript:");
    expect(storedHtml).not.toContain("<svg");
    expect(storedHtml).not.toContain("<img");
    expect(storedHtml).not.toContain("style=");
  });

  it("renders the Terms of Business draft fields and issue actions", () => {
    render(
      <MemoryRouter initialEntries={["/clients/CLI-2026-0002/income-protection"]}>
        <App />
      </MemoryRouter>,
    );

    fireEvent.click(screen.getByRole("tab", { name: "Terms of Business" }));

    expect(screen.getByRole("heading", { name: "Terms of Business Draft" })).toBeInTheDocument();
    expect(screen.getByDisplayValue("January 2026")).toBeInTheDocument();
    expect(screen.getByDisplayValue("Email")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Generate Draft" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Mark Issued" })).toBeInTheDocument();
  });

  it("updates the Terms of Business issue status", async () => {
    render(
      <MemoryRouter initialEntries={["/clients/CLI-2026-0002/income-protection"]}>
        <App />
      </MemoryRouter>,
    );

    fireEvent.click(screen.getByRole("tab", { name: "Terms of Business" }));

    expect(screen.getByText("Issue: Draft generated")).toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: "Mark Issued" }));

    await waitFor(() => {
      expect(screen.getByText("Issue: Issued today")).toBeInTheDocument();
    });
  });

  it("renders the Terms of Business generated preview without exporting or appending history", async () => {
    const fetchMock = vi.fn().mockResolvedValue(
      createGenerateDocumentResponse({
        title: "Terms of Business",
        sectionTitle: "Issue Details",
        sectionBodyHtml: "<p>Terms of Business issue copy.</p>",
        generatedHtml: "<section><h2>Issue Details</h2><p>Terms of Business issue copy.</p></section>",
      }),
    );
    vi.stubGlobal("fetch", fetchMock);

    render(
      <MemoryRouter initialEntries={["/clients/CLI-2026-0002/income-protection"]}>
        <App />
      </MemoryRouter>,
    );

    fireEvent.click(screen.getByRole("tab", { name: "Terms of Business" }));
    fireEvent.click(screen.getByRole("button", { name: "Generate Draft" }));

    await waitFor(() => {
      expect(screen.getByText("Issue: Draft generated")).toBeInTheDocument();
    });
    expect(fetchMock).toHaveBeenCalledWith(
      "/documents/generate",
      expect.objectContaining({
        body: expect.stringContaining('"document_type":"Terms of Business"'),
      }),
    );
    expect(screen.getByRole("heading", { name: "Generated preview" })).toBeInTheDocument();
    expect(screen.getByText("Issue Details")).toBeInTheDocument();
    expect(screen.getByText("Terms of Business issue copy.")).toBeInTheDocument();
    expect(exportGeneratedDocumentMock).not.toHaveBeenCalled();
  });

  it("renders template pickers for each supported generated document tab", () => {
    render(
      <MemoryRouter initialEntries={["/clients/CLI-2026-0002/income-protection"]}>
        <App />
      </MemoryRouter>,
    );

    fireEvent.click(screen.getByRole("tab", { name: "Fact Find" }));
    expect(screen.getByLabelText("Fact Find template")).toHaveValue("fact-find");

    fireEvent.click(screen.getByRole("tab", { name: "Terms of Business" }));
    expect(screen.getByLabelText("Terms of Business template")).toHaveValue("terms-of-business");

    fireEvent.click(screen.getByRole("tab", { name: "Statement of Suitability" }));
    expect(screen.getByLabelText("Statement of Suitability template")).toHaveValue("statement-of-suitability");
  });

  it("renders the Statement of Suitability draft fields and generation actions", () => {
    render(
      <MemoryRouter initialEntries={["/clients/CLI-2026-0002/income-protection"]}>
        <App />
      </MemoryRouter>,
    );

    fireEvent.click(screen.getByRole("tab", { name: "Statement of Suitability" }));

    expect(screen.getByRole("heading", { name: "Statement of Suitability Draft" })).toBeInTheDocument();
    expect(screen.getByDisplayValue("Personal Income Protection")).toBeInTheDocument();
    expect(screen.getByDisplayValue("Zurich Life")).toBeInTheDocument();
    expect(screen.getByDisplayValue("30000")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Generate Draft" })).toBeInTheDocument();
  });

  it("updates the Statement of Suitability generation status and renders preview HTML", async () => {
    const fetchMock = vi.fn().mockResolvedValue(
      createGenerateDocumentResponse({
        title: "Statement of Suitability",
        sectionTitle: "Recommendation",
        sectionBodyHtml: "<p>Statement recommendation copy.</p>",
        generatedHtml: "<section><h2>Recommendation</h2><p>Statement recommendation copy.</p></section>",
      }),
    );
    vi.stubGlobal("fetch", fetchMock);

    render(
      <MemoryRouter initialEntries={["/clients/CLI-2026-0002/income-protection"]}>
        <App />
      </MemoryRouter>,
    );

    fireEvent.click(screen.getByRole("tab", { name: "Statement of Suitability" }));

    expect(screen.getByText("Document: Draft generated")).toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: "Generate Draft" }));

    await waitFor(() => {
      expect(screen.getByText("Document: Draft generated")).toBeInTheDocument();
    });
    expect(fetchMock).toHaveBeenCalledWith(
      "/documents/generate",
      expect.objectContaining({
        body: expect.stringContaining('"document_type":"Statement of Suitability"'),
      }),
    );
    expect(screen.getByRole("heading", { name: "Generated preview" })).toBeInTheDocument();
    expect(screen.getByText("Recommendation")).toBeInTheDocument();
    expect(screen.getByText("Statement recommendation copy.")).toBeInTheDocument();
    expect(exportGeneratedDocumentMock).not.toHaveBeenCalled();
  });

  it("blocks Statement of Suitability final generation when essential fields are missing", () => {
    render(
      <MemoryRouter initialEntries={["/clients/CLI-2026-0001/income-protection"]}>
        <App />
      </MemoryRouter>,
    );

    fireEvent.click(screen.getByRole("tab", { name: "Statement of Suitability" }));
    fireEvent.click(screen.getByRole("button", { name: "Generate Draft" }));

    expect(screen.getByText("Document: Blocked by missing required fields")).toBeInTheDocument();
    expect(screen.getByText(/Missing required fields/)).toBeInTheDocument();
    expect(screen.getByText(/Provider recommended/)).toBeInTheDocument();
    expect(screen.getByText(/Product recommended/)).toBeInTheDocument();
    expect(screen.getAllByText(/Advisor name/).length).toBeGreaterThan(1);
  });

  it("shows a failed draft generation state without a success badge", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue({
        ok: false,
        status: 500,
      }),
    );

    render(
      <MemoryRouter initialEntries={["/clients/CLI-2026-0002/income-protection"]}>
        <App />
      </MemoryRouter>,
    );

    fireEvent.click(screen.getByRole("tab", { name: "Fact Find" }));
    fireEvent.click(screen.getByRole("button", { name: "Generate Draft" }));

    await waitFor(() => {
      expect(screen.getByText("Generation: Draft generation failed")).toBeInTheDocument();
    });

    expect(screen.getByText("Generation failed")).toBeInTheDocument();
    expect(screen.getByTestId("fact-find-generation-status-dot")).toHaveClass("status-dot-grey");
    expect(screen.getByTestId("fact-find-generation-status-dot")).not.toHaveClass("status-dot-green");
    expect(exportGeneratedDocumentMock).not.toHaveBeenCalled();
  });

  it("preserves the previous preview content when a later draft generation fails", async () => {
    const fetchMock = vi
      .fn()
      .mockResolvedValueOnce(
        createGenerateDocumentResponse({
          generatedHtml: "<section><p>First successful preview</p></section>",
          sectionBodyHtml: "<p>First successful preview</p>",
        }),
      )
      .mockResolvedValueOnce({
        ok: false,
        status: 500,
      });
    vi.stubGlobal("fetch", fetchMock);

    render(
      <MemoryRouter initialEntries={["/clients/CLI-2026-0002/income-protection"]}>
        <App />
      </MemoryRouter>,
    );

    fireEvent.click(screen.getByRole("tab", { name: "Fact Find" }));
    fireEvent.click(screen.getByRole("button", { name: "Generate Draft" }));

    await waitFor(() => {
      expect(screen.getByText("First successful preview")).toBeInTheDocument();
    });

    fireEvent.click(screen.getByRole("button", { name: "Generate Draft" }));

    await waitFor(() => {
      expect(screen.getByText("Generation: Draft generation failed")).toBeInTheDocument();
    });

    expect(screen.getByText("First successful preview")).toBeInTheDocument();
    expect(screen.getByText("Generation failed")).toBeInTheDocument();
  });

  it("renders the Files tab with client folder layout and seeded file metadata", () => {
    render(
      <MemoryRouter initialEntries={["/clients/CLI-2026-0002/income-protection"]}>
        <App />
      </MemoryRouter>,
    );

    fireEvent.click(screen.getByRole("tab", { name: "Files" }));

    expect(screen.getByRole("heading", { name: "Client Files" })).toBeInTheDocument();
    expect(screen.getByText("client-cli-2026-0002-jamie-murphy")).toBeInTheDocument();
    expect(screen.getByText("fact-find/")).toBeInTheDocument();
    expect(screen.getByText("statement-of-suitability/")).toBeInTheDocument();
    expect(screen.getByText("Proof of Age")).toBeInTheDocument();
    expect(screen.getByText("Pending review")).toBeInTheDocument();
  });

  it("updates the Files tab upload status placeholder", () => {
    render(
      <MemoryRouter initialEntries={["/clients/CLI-2026-0002/income-protection"]}>
        <App />
      </MemoryRouter>,
    );

    fireEvent.click(screen.getByRole("tab", { name: "Files" }));

    expect(screen.getByText("Upload: Waiting for upload")).toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: "Upload File" }));

    expect(screen.getByText("Upload: File saved")).toBeInTheDocument();
  });

  it("renders the Generated Documents tab with seeded history", () => {
    render(
      <MemoryRouter initialEntries={["/clients/CLI-2026-0002/income-protection"]}>
        <App />
      </MemoryRouter>,
    );

    fireEvent.click(screen.getByRole("tab", { name: "Generated Documents" }));

    expect(screen.getByRole("heading", { name: "Generated Documents" })).toBeInTheDocument();
    expect(screen.getByText("Jamie_Murphy_Statement_of_Suitability_2026-06-06.pdf")).toBeInTheDocument();
    expect(screen.getAllByText("Version 1")).toHaveLength(2);
    expect(screen.getAllByText("PDF ready")).toHaveLength(2);
    expect(screen.getAllByRole("button", { name: "Download" }).length).toBeGreaterThan(0);
  });

  it("downloads an individual generated document from the Generated Documents tab after export resolves", async () => {
    let resolveExport: (() => void) | undefined;
    exportGeneratedDocumentMock.mockImplementationOnce(
      () =>
        new Promise<void>((resolve) => {
          resolveExport = resolve;
        }),
    );

    render(
      <MemoryRouter initialEntries={["/clients/CLI-2026-0002/income-protection"]}>
        <App />
      </MemoryRouter>,
    );

    fireEvent.click(screen.getByRole("tab", { name: "Generated Documents" }));
    fireEvent.click(screen.getAllByRole("button", { name: "Download" })[0]);

    expect(screen.getByText(/Download: Downloading/)).toBeInTheDocument();
    expect(screen.queryByText(/Download: Downloaded/)).not.toBeInTheDocument();

    resolveExport?.();

    await waitFor(() => {
      expect(screen.getByText(/Download: Downloaded/)).toBeInTheDocument();
    });
  });

  it("downloads a preview-export history row using its stored preview artifact", () => {
    const storedClients = createSeededClientProfiles();
    storedClients["CLI-2026-0002"].generatedDocuments.unshift({
      id: "DOC-PREVIEW-1",
      documentType: "Terms of Business",
      documentName: "Jamie_Murphy_Terms_of_Business_preview.pdf",
      version: "Version 2",
      status: "PDF ready",
      generatedAt: "2026-06-13",
      previewHtml:
        '<article class="workflow-document workflow-document-terms-of-business"><header class="document-banner"><p class="document-eyebrow">Terms of Business</p><h1>Terms of Business</h1><p class="document-subtitle">Jamie Murphy (CLI-2026-0002)</p></header><section class="document-section"><h2>Issue Details</h2><p>Edited terms preview</p></section><footer class="signatures-footer"><h2>Signatures and Record</h2><p><strong>Advisor:</strong> Office Staff</p></footer></article>',
      previewTitle: "Terms of Business",
    });
    window.localStorage.setItem("omega-client-records", JSON.stringify(storedClients));

    render(
      <MemoryRouter initialEntries={["/clients/CLI-2026-0002/income-protection"]}>
        <App />
      </MemoryRouter>,
    );

    fireEvent.click(screen.getByRole("tab", { name: "Generated Documents" }));

    const termsRow = screen.getByText("Jamie_Murphy_Terms_of_Business_preview.pdf").closest("tr");
    expect(termsRow).not.toBeNull();

    fireEvent.click(within(termsRow as HTMLElement).getByRole("button", { name: "Download" }));

    expect(exportGeneratedDocumentMock).toHaveBeenCalledWith(
      expect.objectContaining({
        clientReference: "CLI-2026-0002",
      }),
      "Terms of Business",
      "pdf",
      "Jamie_Murphy_Terms_of_Business_preview.pdf",
      {
        html: '<article class="workflow-document workflow-document-terms-of-business"><header class="document-banner"><p class="document-eyebrow">Terms of Business</p><h1>Terms of Business</h1><p class="document-subtitle">Jamie Murphy (CLI-2026-0002)</p></header><section class="document-section"><h2>Issue Details</h2><p>Edited terms preview</p></section><footer class="signatures-footer"><h2>Signatures and Record</h2><p><strong>Advisor:</strong> Office Staff</p></footer></article>',
        title: "Terms of Business",
      },
    );
  });

  it("uses a historical row snapshot instead of the current draft when downloading an older row", () => {
    const storedClients = createSeededClientProfiles();
    storedClients["CLI-2026-0002"].advisorName = "Changed Advisor";
    storedClients["CLI-2026-0002"].townCity = "Limerick";
    storedClients["CLI-2026-0002"].county = "Clare";
    storedClients["CLI-2026-0002"].documentDrafts["Terms of Business"] = {
      ...storedClients["CLI-2026-0002"].documentDrafts["Terms of Business"],
      generationStatus: "completed",
      lastGeneratedHtml: "<section><p>Latest draft preview</p></section>",
      lastGeneratedSections: [
        {
          id: "issue-details",
          title: "Issue Details",
          bodyHtml: "<p>Latest draft preview</p>",
        },
      ],
    };
    window.localStorage.setItem("omega-client-records", JSON.stringify(storedClients));

    render(
      <MemoryRouter initialEntries={["/clients/CLI-2026-0002/income-protection"]}>
        <App />
      </MemoryRouter>,
    );

    fireEvent.click(screen.getByRole("tab", { name: "Generated Documents" }));

    const historicalRow = screen.getByText("Jamie_Murphy_Terms_of_Business_2026-06-06.pdf").closest("tr");
    expect(historicalRow).not.toBeNull();

    fireEvent.click(within(historicalRow as HTMLElement).getByRole("button", { name: "Download" }));

    const exportedSnapshot = exportGeneratedDocumentMock.mock.calls[0]?.[4];
    expect(exportedSnapshot).toEqual(
      expect.objectContaining({
        title: "Terms of Business",
        html: expect.stringContaining('class="workflow-document workflow-document-terms-of-business"'),
      }),
    );
    expect((exportedSnapshot as { html: string }).html).toContain("Terms of Business issued to Jamie Murphy.");
    expect((exportedSnapshot as { html: string }).html).toContain("Office Staff");
    expect((exportedSnapshot as { html: string }).html).not.toContain("Changed Advisor");
    expect((exportedSnapshot as { html: string }).html).not.toContain("Limerick");
  });

  it("shows the generated documents download badge as idle before any download", () => {
    render(
      <MemoryRouter initialEntries={["/clients/CLI-2026-0002/income-protection"]}>
        <App />
      </MemoryRouter>,
    );

    fireEvent.click(screen.getByRole("tab", { name: "Generated Documents" }));

    expect(screen.getByText("Download: No document downloaded yet")).toBeInTheDocument();
    expect(screen.getByTestId("generated-documents-download-status-dot")).toHaveClass("status-dot-grey");
    expect(screen.getByTestId("generated-documents-download-status-dot")).not.toHaveClass("status-dot-green");
  });

  it("updates the document pack download placeholder status", () => {
    render(
      <MemoryRouter initialEntries={["/clients/CLI-2026-0002/income-protection"]}>
        <App />
      </MemoryRouter>,
    );

    fireEvent.click(screen.getByRole("tab", { name: "Generated Documents" }));

    expect(screen.getByText("Pack: Waiting for request")).toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: "Download Pack" }));

    expect(screen.getByText("Pack: Document pack queued")).toBeInTheDocument();
  });

  it("persists client details after saving and reopening the workflow", () => {
    render(
      <MemoryRouter initialEntries={["/clients/CLI-2026-0002/income-protection"]}>
        <App />
      </MemoryRouter>,
    );

    fireEvent.change(screen.getByLabelText("Occupation"), { target: { value: "Senior Analyst" } });
    fireEvent.click(screen.getByRole("button", { name: "Save" }));

    cleanup();

    render(
      <MemoryRouter initialEntries={["/clients/CLI-2026-0002/income-protection"]}>
        <App />
      </MemoryRouter>,
    );

    expect(screen.getByDisplayValue("Senior Analyst")).toBeInTheDocument();
  });

  it("keeps a persisted custom template id visible in the workflow template picker", () => {
    const storedClients = createSeededClientProfiles();
    storedClients["CLI-2026-0002"].documentDrafts["Fact Find"].selectedTemplateId = "fact-find-custom";
    window.localStorage.setItem("omega-client-records", JSON.stringify(storedClients));

    render(
      <MemoryRouter initialEntries={["/clients/CLI-2026-0002/income-protection"]}>
        <App />
      </MemoryRouter>,
    );

    fireEvent.click(screen.getByRole("tab", { name: "Fact Find" }));

    expect(screen.getByLabelText("Fact Find template")).toHaveValue("fact-find-custom");
    expect(screen.getByRole("option", { name: "fact-find-custom" })).toBeInTheDocument();
    expect(screen.getAllByText("fact-find-custom")).toHaveLength(2);
  });

  it("clears county when the request information address is reduced to one part or emptied", () => {
    render(
      <MemoryRouter initialEntries={["/clients/CLI-2026-0002/income-protection"]}>
        <App />
      </MemoryRouter>,
    );

    fireEvent.click(screen.getByRole("tab", { name: "Fact Find" }));

    const addressInputs = screen.getAllByLabelText("Address");
    const requestInformationAddressInput = addressInputs[addressInputs.length - 1];

    fireEvent.change(requestInformationAddressInput, { target: { value: "Cork" } });
    expect(requestInformationAddressInput).toHaveValue("Cork, ");

    fireEvent.change(requestInformationAddressInput, { target: { value: "" } });
    expect(requestInformationAddressInput).toHaveValue("");
  });

  it("rehydrates persisted draft generation status after reopening the workflow", async () => {
    render(
      <MemoryRouter initialEntries={["/clients/CLI-2026-0002/income-protection"]}>
        <App />
      </MemoryRouter>,
    );

    fireEvent.click(screen.getByRole("tab", { name: "Fact Find" }));
    fireEvent.click(screen.getByRole("button", { name: "Generate Draft" }));

    await waitFor(() => {
      expect(screen.getByText("Generation: Draft generated")).toBeInTheDocument();
    });

    cleanup();

    render(
      <MemoryRouter initialEntries={["/clients/CLI-2026-0002/income-protection"]}>
        <App />
      </MemoryRouter>,
    );

    fireEvent.click(screen.getByRole("tab", { name: "Fact Find" }));

    expect(screen.getByText("Generation: Draft generated")).toBeInTheDocument();
    expect(screen.getByText("Ready to review")).toBeInTheDocument();
  });

  it("sanitizes persisted fallback preview HTML before rendering it", () => {
    const storedClients = createSeededClientProfiles();
    storedClients["CLI-2026-0002"].documentDrafts["Fact Find"] = {
      ...storedClients["CLI-2026-0002"].documentDrafts["Fact Find"],
      generationStatus: "completed",
      lastGeneratedSections: [],
      lastGeneratedHtml:
        "<section><p>Legacy preview</p><img src=\"x\" alt=\"bad\" /><a href=\"javascript:alert('x')\" onclick=\"alert('x')\">Unsafe link</a><custom-tag><strong>Nested safe text</strong></custom-tag></section>",
    };
    window.localStorage.setItem("omega-client-records", JSON.stringify(storedClients));

    render(
      <MemoryRouter initialEntries={["/clients/CLI-2026-0002/income-protection"]}>
        <App />
      </MemoryRouter>,
    );

    fireEvent.click(screen.getByRole("tab", { name: "Fact Find" }));

    const preview = screen.getByRole("heading", { name: "Generated preview" }).closest("section");
    expect(screen.getByText("Legacy preview")).toBeInTheDocument();
    expect(screen.getByText("Nested safe text")).toBeInTheDocument();
    expect(preview?.querySelector("img")).toBeNull();
    expect(preview?.querySelector("[onclick]")).toBeNull();
    expect(preview?.querySelector("a")).toBeNull();
  });

  it("sanitizes persisted section HTML before preview render and export", async () => {
    const storedClients = createSeededClientProfiles();
    storedClients["CLI-2026-0002"].documentDrafts["Fact Find"] = {
      ...storedClients["CLI-2026-0002"].documentDrafts["Fact Find"],
      generationStatus: "completed",
      lastGeneratedSections: [
        {
          id: "summary",
          title: "Summary",
          bodyHtml:
            "<p>Persisted section preview</p><img src=\"x\" alt=\"bad\" /><script>alert('x')</script><custom-tag><strong>Nested safe text</strong></custom-tag>",
        },
      ],
      lastGeneratedHtml: "",
    };
    window.localStorage.setItem("omega-client-records", JSON.stringify(storedClients));

    render(
      <MemoryRouter initialEntries={["/clients/CLI-2026-0002/income-protection"]}>
        <App />
      </MemoryRouter>,
    );

    fireEvent.click(screen.getByRole("tab", { name: "Fact Find" }));

    const preview = screen.getByRole("heading", { name: "Generated preview" }).closest("section");
    expect(screen.getByText("Persisted section preview")).toBeInTheDocument();
    expect(screen.getByText("Nested safe text")).toBeInTheDocument();
    expect(preview?.querySelector("img")).toBeNull();
    expect(preview?.querySelector("script")).toBeNull();

    fireEvent.click(screen.getByRole("button", { name: "Export PDF" }));

    const exportCall = exportGeneratedDocumentMock.mock.calls[0];
    expect(exportCall?.[0]).toEqual(expect.objectContaining({ clientReference: "CLI-2026-0002" }));
    expect(exportCall?.[1]).toBe("Fact Find");
    expect(exportCall?.[2]).toBe("pdf");
    expect(exportCall?.[3]).toMatch(/^Jamie_Murphy_Fact_Find_\d{4}-\d{2}-\d{2}\.pdf$/);
    expect(exportCall?.[4]).toEqual(
      expect.objectContaining({
        title: "Fact Find",
        html: expect.stringContaining("Persisted section preview"),
      }),
    );
    expect((exportCall?.[4] as { html: string }).html).toContain("Nested safe text");
    expect((exportCall?.[4] as { html: string }).html).not.toContain("<script");
    expect((exportCall?.[4] as { html: string }).html).not.toContain("<img");
  });

  it("persists settings after saving and reopening the page", () => {
    render(
      <MemoryRouter initialEntries={["/settings"]}>
        <App />
      </MemoryRouter>,
    );

    fireEvent.change(screen.getByLabelText("App URL"), { target: { value: "http://omega-office.local" } });
    fireEvent.click(screen.getByRole("button", { name: "Save Settings" }));

    cleanup();

    render(
      <MemoryRouter initialEntries={["/settings"]}>
        <App />
      </MemoryRouter>,
    );

    expect(screen.getByDisplayValue("http://omega-office.local")).toBeInTheDocument();
  });
});

describe("Document template state", () => {
  function DocumentDraftHarness() {
    const { getClient, saveGeneratedDraft, updateSelectedTemplate } = useClientData();
    const client = getClient("CLI-2026-0002");

    if (!client) {
      return null;
    }

    const factFindDraft = client.documentDrafts["Fact Find"];

    return (
      <div>
        <span>{factFindDraft.selectedTemplateId}</span>
        <span>{factFindDraft.generationStatus}</span>
        <span>{factFindDraft.lastGeneratedHtml || "no-html"}</span>
        <span>{factFindDraft.lastGeneratedSections[0]?.title || "no-section"}</span>
        <button
          onClick={() => updateSelectedTemplate("CLI-2026-0002", "Fact Find", "fact-find-custom")}
          type="button"
        >
          Change Template
        </button>
        <button
          onClick={() =>
            saveGeneratedDraft("CLI-2026-0002", "Fact Find", {
              generationStatus: "completed",
              lastGeneratedHtml: "<p>Generated fact find summary</p>",
              lastGeneratedSections: [
                {
                  id: "summary",
                  title: "Summary",
                  bodyHtml: "<p>Generated fact find summary</p>",
                },
              ],
            })
          }
          type="button"
        >
          Save Draft
        </button>
      </div>
    );
  }

  it("exposes the three built-in document templates", () => {
    expect(builtInDocumentTemplates).toHaveLength(3);
    expect(builtInDocumentTemplates.map((template) => template.documentType)).toEqual([
      "Fact Find",
      "Terms of Business",
      "Statement of Suitability",
    ]);
  });

  it("persists selected templates and generated draft content in client storage", () => {
    render(
      <ClientDataProvider>
        <DocumentDraftHarness />
      </ClientDataProvider>,
    );

    expect(screen.getByText("fact-find")).toBeInTheDocument();
    expect(screen.getByText("idle")).toBeInTheDocument();
    expect(screen.getByText("no-html")).toBeInTheDocument();
    expect(screen.getByText("no-section")).toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: "Change Template" }));
    fireEvent.click(screen.getByRole("button", { name: "Save Draft" }));

    expect(screen.getByText("fact-find-custom")).toBeInTheDocument();
    expect(screen.getByText("completed")).toBeInTheDocument();
    expect(screen.getByText("<p>Generated fact find summary</p>")).toBeInTheDocument();
    expect(screen.getByText("Summary")).toBeInTheDocument();

    cleanup();

    render(
      <ClientDataProvider>
        <DocumentDraftHarness />
      </ClientDataProvider>,
    );

    expect(screen.getByText("fact-find-custom")).toBeInTheDocument();
    expect(screen.getByText("completed")).toBeInTheDocument();
    expect(screen.getByText("<p>Generated fact find summary</p>")).toBeInTheDocument();
    expect(screen.getByText("Summary")).toBeInTheDocument();
  });

  it("backfills document drafts for legacy stored clients and persists later draft updates", () => {
    const legacyClients = createSeededClientProfiles();
    delete (legacyClients["CLI-2026-0002"] as { documentDrafts?: unknown }).documentDrafts;
    window.localStorage.setItem("omega-client-records", JSON.stringify(legacyClients));

    render(
      <ClientDataProvider>
        <DocumentDraftHarness />
      </ClientDataProvider>,
    );

    expect(screen.getByText("fact-find")).toBeInTheDocument();
    expect(screen.getByText("idle")).toBeInTheDocument();
    expect(screen.getByText("no-html")).toBeInTheDocument();
    expect(screen.getByText("no-section")).toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: "Change Template" }));
    fireEvent.click(screen.getByRole("button", { name: "Save Draft" }));

    cleanup();

    render(
      <ClientDataProvider>
        <DocumentDraftHarness />
      </ClientDataProvider>,
    );

    expect(screen.getByText("fact-find-custom")).toBeInTheDocument();
    expect(screen.getByText("completed")).toBeInTheDocument();
    expect(screen.getByText("<p>Generated fact find summary</p>")).toBeInTheDocument();
    expect(screen.getByText("Summary")).toBeInTheDocument();
  });
});

describe("Generated document export", () => {
  it("exports fallback preview-only HTML without merging it into a composed shell", async () => {
    const { exportGeneratedDocument } = await vi.importActual<typeof import("./documents/export-generated-document")>(
      "./documents/export-generated-document",
    );
    const clients = createSeededClientProfiles();

    await exportGeneratedDocument(
      clients["CLI-2026-0002"],
      "Fact Find",
      "pdf",
      "fact-find.pdf",
      {
        html: "<p>Fallback preview only</p><p>Second preview paragraph</p>",
        title: "Fact Find",
      },
    );

    expect(exportHtmlToPdfMock).toHaveBeenCalledWith(
      "<p>Fallback preview only</p><p>Second preview paragraph</p>",
      "fact-find.pdf",
    );
  });

  it("merges preview section overrides into the composed export HTML", async () => {
    const { exportGeneratedDocument } = await vi.importActual<typeof import("./documents/export-generated-document")>(
      "./documents/export-generated-document",
    );
    const clients = createSeededClientProfiles();

    await exportGeneratedDocument(
      clients["CLI-2026-0002"],
      "Statement of Suitability",
      "pdf",
      "statement.pdf",
      {
        html: [
          '<section class="document-section"><h2>Recommendation Section</h2><p>Edited recommendation copy.</p></section>',
          '<section class="document-section"><h2>Warnings and Disclaimers</h2><p>Edited warning copy.</p></section>',
        ].join(""),
        title: "Statement of Suitability",
      },
    );

    expect(exportHtmlToPdfMock).toHaveBeenCalledWith(
      expect.stringContaining('class="workflow-document'),
      "statement.pdf",
    );

    const exportedHtml = exportHtmlToPdfMock.mock.calls[0]?.[0] as string;
    expect(exportedHtml).toContain('class="client-summary-grid"');
    expect(exportedHtml).toContain("Edited recommendation copy.");
    expect(exportedHtml).toContain('class="document-callout document-callout-warning"');
    expect(exportedHtml).toContain("Edited warning copy.");
    expect(exportedHtml).toContain('class="signatures-footer"');
  });

  it("sanitizes HTML overrides before exporting", async () => {
    const { exportGeneratedDocument } = await vi.importActual<typeof import("./documents/export-generated-document")>(
      "./documents/export-generated-document",
    );
    const clients = createSeededClientProfiles();

    await exportGeneratedDocument(
      clients["CLI-2026-0002"],
      "Terms of Business",
      "pdf",
      "terms.pdf",
      {
        html: "<section><p>Safe</p><script>alert('x')</script><img src=\"x\" /><custom-tag><strong>Nested safe text</strong></custom-tag></section>",
        title: "Terms of Business",
      },
    );

    const exportedHtml = exportHtmlToPdfMock.mock.calls[0]?.[0] as string;
    expect(exportedHtml).toContain("<p>Safe</p>");
    expect(exportedHtml).toContain("<strong>Nested safe text</strong>");
    expect(exportedHtml).not.toContain("<script");
    expect(exportedHtml).not.toContain("<img");
    expect(exportHtmlToPdfMock).toHaveBeenCalledWith(exportedHtml, "terms.pdf");
  });

  it("builds styled PDF markup for composed workflow blocks", async () => {
    const { buildPdfStyledHtml } = await vi.importActual<typeof import("./documents/pdf-export")>("./documents/pdf-export");

    const styledHtml = buildPdfStyledHtml(
      [
        '<article class="workflow-document workflow-document-fact-find">',
        '<header class="document-banner"><p class="document-eyebrow">Fact Find</p><h1>Income Protection Fact Find</h1><p class="document-subtitle">Jamie Murphy (CLI-2026-0002)</p></header>',
        '<section class="client-summary-grid"><h2>Client Summary</h2><div class="grid-items"><div class="grid-item"><span class="grid-label">Client</span><strong>Jamie Murphy</strong></div></div></section>',
        '<aside class="document-callout document-callout-warning"><h2>Warnings and Disclaimers</h2><p>Please confirm details.</p></aside>',
        '<footer class="signatures-footer"><h2>Signatures and Record</h2><p><strong>Advisor:</strong> Omega Advisor</p></footer>',
        "</article>",
      ].join(""),
      true,
    );

    expect(styledHtml).toContain('class="pdf-block"');
    expect(styledHtml).toContain("grid-template-columns:repeat(2,minmax(0,1fr))");
    expect(styledHtml).toContain("background:#fff6e6");
    expect(styledHtml).toContain("border-top:2px solid #5b2230");
  });

  it("falls back to continuous PDF pagination for an oversized block", async () => {
    const { paginatePdfContent } = await vi.importActual<typeof import("./documents/pdf-export")>("./documents/pdf-export");
    const originalGetBoundingClientRect = Element.prototype.getBoundingClientRect;

    Element.prototype.getBoundingClientRect = function getBoundingClientRect() {
      if ((this as Element).classList?.contains("pdf-block")) {
        return {
          width: 600,
          height: 2000,
          top: 0,
          left: 0,
          right: 600,
          bottom: 2000,
          x: 0,
          y: 0,
          toJSON() {
            return {};
          },
        } as DOMRect;
      }

      return originalGetBoundingClientRect.call(this);
    };

    try {
      const pagination = paginatePdfContent('<section class="pdf-block"><p>Oversized content</p></section>');

      expect(pagination).toEqual({
        mode: "continuous",
        html: '<section class="pdf-block"><p>Oversized content</p></section>',
      });
    } finally {
      Element.prototype.getBoundingClientRect = originalGetBoundingClientRect;
    }
  });

  it("extracts structured DOCX blocks from composed preview HTML", async () => {
    const { extractWordExportBlocks } = await vi.importActual<typeof import("./documents/word-export")>(
      "./documents/word-export",
    );

    const blocks = extractWordExportBlocks(
      [
        '<article class="workflow-document workflow-document-statement-of-suitability">',
        '<header class="document-banner"><p class="document-eyebrow">Statement of Suitability</p><h1>Income Protection Statement</h1><p class="document-subtitle">Jamie Murphy (CLI-2026-0002)</p></header>',
        '<section class="client-summary-grid"><h2>Client Summary</h2><div class="grid-items"><div class="grid-item"><span class="grid-label">Client</span><strong>Jamie Murphy</strong></div><div class="grid-item"><span class="grid-label">Advisor</span><strong>Omega Advisor</strong></div></div></section>',
        '<aside class="document-callout document-callout-warning"><h2>Warnings and Disclaimers</h2><div><p>Benefit subject to underwriting.</p><ul><li>Deferred period applies.</li></ul></div></aside>',
        '<footer class="signatures-footer"><h2>Signatures and Record</h2><div><p><strong>Advisor:</strong> Omega Advisor</p><p>Keep this document on file.</p></div></footer>',
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
