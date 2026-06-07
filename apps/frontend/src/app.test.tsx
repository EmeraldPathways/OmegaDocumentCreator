import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { afterEach, describe, expect, it } from "vitest";

import { App } from "./App";

afterEach(() => {
  window.sessionStorage.clear();
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
    expect(screen.getAllByText("Open workflow")).toHaveLength(2);
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

  it("renders the top-level Income Protection workspace route", () => {
    render(
      <MemoryRouter initialEntries={["/income-protection"]}>
        <App />
      </MemoryRouter>,
    );

    expect(screen.getByRole("heading", { name: "Income Protection" })).toBeInTheDocument();
    expect(screen.getAllByText("Open workflow")).toHaveLength(2);
    expect(screen.getByText("CLI-2026-0002")).toBeInTheDocument();
  });

  it("renders the Documents route with generated document history", () => {
    render(
      <MemoryRouter initialEntries={["/documents"]}>
        <App />
      </MemoryRouter>,
    );

    expect(screen.getByRole("heading", { name: "Documents" })).toBeInTheDocument();
    expect(screen.getByText("Jamie Murphy")).toBeInTheDocument();
    expect(screen.getByText("CLI-2026-0002")).toBeInTheDocument();
    expect(screen.getAllByText("Open folder")).toHaveLength(2);
  });

  it("renders a client documents folder with files and generated documents", () => {
    render(
      <MemoryRouter initialEntries={["/documents/CLI-2026-0002"]}>
        <App />
      </MemoryRouter>,
    );

    expect(screen.getByRole("heading", { name: "Jamie Murphy" })).toBeInTheDocument();
    expect(screen.getByRole("heading", { name: "Generated Documents" })).toBeInTheDocument();
    expect(screen.getByRole("heading", { name: "Files" })).toBeInTheDocument();
    expect(
      screen.getAllByText("Jamie_Murphy_Statement_of_Suitability_2026-06-06.pdf").length,
    ).toBeGreaterThan(1);
    expect(screen.getByText("jamie-murphy-passport.pdf")).toBeInTheDocument();
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
    expect(screen.getAllByText("Jamie Murphy").length).toBeGreaterThan(0);
    expect(screen.getByText(/Jamie Murphy\s+\(CLI-2026-0002\)/)).toBeInTheDocument();
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

    expect(screen.getByText("Last saved: Not saved yet")).toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: "Save Draft" }));

    expect(screen.getByText("Last saved: Saved just now")).toBeInTheDocument();
  });

  it("shows the Fact Find missing-field checklist before final generation without blocking draft save", () => {
    render(
      <MemoryRouter initialEntries={["/clients/CLI-2026-0001/income-protection"]}>
        <App />
      </MemoryRouter>,
    );

    fireEvent.click(screen.getByRole("tab", { name: "Fact Find" }));
    fireEvent.click(screen.getByRole("button", { name: "Generate PDF" }));

    expect(screen.getByText("Generation status: Blocked by missing required fields")).toBeInTheDocument();
    expect(screen.getByRole("heading", { name: "Missing required fields" })).toBeInTheDocument();
    expect(screen.getAllByText("Occupation").length).toBeGreaterThan(1);
    expect(screen.getByText("Email or phone")).toBeInTheDocument();
    expect(screen.getAllByText("Advisor name").length).toBeGreaterThan(1);

    fireEvent.click(screen.getByRole("button", { name: "Save Draft" }));

    expect(screen.getByText("Last saved: Saved just now")).toBeInTheDocument();
  });

  it("adds a Fact Find DOCX record to generated documents when generation succeeds", () => {
    render(
      <MemoryRouter initialEntries={["/clients/CLI-2026-0002/income-protection"]}>
        <App />
      </MemoryRouter>,
    );

    fireEvent.click(screen.getByRole("tab", { name: "Fact Find" }));
    fireEvent.click(screen.getByRole("button", { name: "Generate DOCX" }));

    expect(screen.getByText("Generation status: DOCX generated")).toBeInTheDocument();

    fireEvent.click(screen.getByRole("tab", { name: "Generated Documents" }));

    expect(screen.getByText("Jamie_Murphy_Fact_Find_2026-06-06.docx")).toBeInTheDocument();
    expect(screen.getByText("DOCX ready")).toBeInTheDocument();
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
    expect(screen.getByRole("button", { name: "Generate Terms PDF" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Mark as Issued" })).toBeInTheDocument();
  });

  it("updates the Terms of Business issue status", () => {
    render(
      <MemoryRouter initialEntries={["/clients/CLI-2026-0002/income-protection"]}>
        <App />
      </MemoryRouter>,
    );

    fireEvent.click(screen.getByRole("tab", { name: "Terms of Business" }));

    expect(screen.getByText("Issue status: Draft")).toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: "Mark as Issued" }));

    expect(screen.getByText("Issue status: Issued today")).toBeInTheDocument();
  });

  it("adds a Terms of Business PDF record when generation is requested", () => {
    render(
      <MemoryRouter initialEntries={["/clients/CLI-2026-0002/income-protection"]}>
        <App />
      </MemoryRouter>,
    );

    fireEvent.click(screen.getByRole("tab", { name: "Terms of Business" }));
    fireEvent.click(screen.getByRole("button", { name: "Generate Terms PDF" }));

    expect(screen.getByText("Issue status: PDF generated")).toBeInTheDocument();

    fireEvent.click(screen.getByRole("tab", { name: "Generated Documents" }));

    expect(screen.getAllByText("Jamie_Murphy_Terms_of_Business_2026-06-06.pdf").length).toBeGreaterThan(1);
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
    expect(screen.getByRole("button", { name: "Generate DOCX" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Generate PDF" })).toBeInTheDocument();
  });

  it("updates the Statement of Suitability generation status", () => {
    render(
      <MemoryRouter initialEntries={["/clients/CLI-2026-0002/income-protection"]}>
        <App />
      </MemoryRouter>,
    );

    fireEvent.click(screen.getByRole("tab", { name: "Statement of Suitability" }));

    expect(screen.getByText("Document status: Draft")).toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: "Generate PDF" }));

    expect(screen.getByText("Document status: PDF generated")).toBeInTheDocument();
  });

  it("blocks Statement of Suitability final generation when essential fields are missing", () => {
    render(
      <MemoryRouter initialEntries={["/clients/CLI-2026-0001/income-protection"]}>
        <App />
      </MemoryRouter>,
    );

    fireEvent.click(screen.getByRole("tab", { name: "Statement of Suitability" }));
    fireEvent.click(screen.getByRole("button", { name: "Generate PDF" }));

    expect(screen.getByText("Document status: Blocked by missing required fields")).toBeInTheDocument();
    expect(screen.getByRole("heading", { name: "Missing required fields" })).toBeInTheDocument();
    expect(screen.getByText("Provider recommended")).toBeInTheDocument();
    expect(screen.getByText("Product recommended")).toBeInTheDocument();
    expect(screen.getAllByText("Advisor name").length).toBeGreaterThan(1);
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

    expect(screen.getByText("Upload status: Waiting for upload")).toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: "Upload File" }));

    expect(screen.getByText("Upload status: Upload placeholder queued")).toBeInTheDocument();
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
  });

  it("updates the document pack download placeholder status", () => {
    render(
      <MemoryRouter initialEntries={["/clients/CLI-2026-0002/income-protection"]}>
        <App />
      </MemoryRouter>,
    );

    fireEvent.click(screen.getByRole("tab", { name: "Generated Documents" }));

    expect(screen.getByText("Pack status: Waiting for request")).toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: "Download Document Pack" }));

    expect(screen.getByText("Pack status: Pack placeholder queued")).toBeInTheDocument();
  });
});
