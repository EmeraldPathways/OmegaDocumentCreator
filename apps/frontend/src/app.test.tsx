import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { App } from "./App";
import { WorkflowDocumentSections } from "./pages/workflow-document-sections";

describe("WorkflowDocumentSections", () => {
  it("shows only the sections configured for the page", () => {
    render(
      <WorkflowDocumentSections
        sectionIds={["fact-find", "fact-find-update"]}
        clientReference="C-1001"
        renderSection={(sectionId) => <h2>{sectionId}</h2>}
        workflowKind="fact-find"
      />,
    );

    expect(screen.getByText("fact-find")).toBeInTheDocument();
    expect(screen.getByText("fact-find-update")).toBeInTheDocument();
    expect(screen.queryByText("income-protection-quote")).not.toBeInTheDocument();
    expect(screen.queryByText("income-protection-statement")).not.toBeInTheDocument();
  });
});

function renderAppAt(route: string) {
  render(
    <MemoryRouter initialEntries={[route]}>
      <App />
    </MemoryRouter>,
  );
}

beforeEach(() => {
  window.localStorage.clear();
  window.sessionStorage.clear();
});

afterEach(() => {
  vi.restoreAllMocks();
  cleanup();
});

describe("App routes", () => {
  it("redirects the root route to Fact Find", () => {
    renderAppAt("/");

    expect(screen.getByRole("heading", { name: "Fact Find" })).toBeInTheDocument();
    expect(screen.getByRole("tab", { name: "Fact Find" })).toBeInTheDocument();
    expect(screen.getByRole("tab", { name: "Fact Find Update" })).toBeInTheDocument();
    expect(screen.getByLabelText(/Add partner details/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/Add no deferred provider details/i)).toBeInTheDocument();
    expect(screen.queryByLabelText(/Partner Name/i)).not.toBeInTheDocument();
    expect(screen.queryByLabelText(/^No deferred provider$/i)).not.toBeInTheDocument();
    expect(screen.queryByLabelText(/^Deferred period provider$/i)).not.toBeInTheDocument();
    expect(screen.queryByText("Pension Arrangements - Partner")).not.toBeInTheDocument();
    expect(screen.queryByLabelText(/^Client signature 2$/i)).not.toBeInTheDocument();
    expect(screen.queryByLabelText(/^Client signature 2 date$/i)).not.toBeInTheDocument();
    fireEvent.click(screen.getByLabelText(/Add no deferred provider details/i));
    expect(screen.getByLabelText(/^No deferred provider$/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/^Deferred period provider$/i)).toBeInTheDocument();
    fireEvent.click(screen.getByLabelText(/Add partner details/i));
    expect(screen.getByLabelText(/Partner Name/i)).toBeInTheDocument();
    expect(screen.getByText("Pension Arrangements - Partner")).toBeInTheDocument();
    expect(screen.getByLabelText(/^Client signature 2$/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/^Client signature 2 date$/i)).toBeInTheDocument();
    expect(screen.queryByRole("tab", { name: "Quote" })).not.toBeInTheDocument();
  });

  it("renders only quote and statement on the income-protection route", () => {
    renderAppAt("/income-protection");

    expect(screen.getByRole("heading", { name: "Income Protection" })).toBeInTheDocument();
    expect(screen.getByRole("tab", { name: "Quote" })).toBeInTheDocument();
    expect(screen.getByRole("tab", { name: "Statement of Suitability" })).toBeInTheDocument();
    expect(screen.queryByRole("tab", { name: "Fact Find" })).not.toBeInTheDocument();
    expect(screen.queryByRole("tab", { name: "Generated Documents" })).not.toBeInTheDocument();
  });

  it("renders pensions with its own quote and statement route surface", () => {
    renderAppAt("/pensions");

    expect(screen.getByRole("heading", { name: "Pensions" })).toBeInTheDocument();
    expect(screen.getByRole("tab", { name: "Quote" })).toBeInTheDocument();
    expect(screen.getByRole("tab", { name: "Statement of Suitability" })).toBeInTheDocument();
    expect(screen.getByLabelText(/Retirement Age/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/Monthly Contribution/i)).toBeInTheDocument();
    expect(screen.queryByLabelText(/Annual Cover Amount/i)).not.toBeInTheDocument();
    expect(screen.queryByRole("tab", { name: "Fact Find" })).not.toBeInTheDocument();
    expect(screen.queryByRole("tab", { name: "Generated Documents" })).not.toBeInTheDocument();
  });

  it("renders files and generated documents on the files-docs route", () => {
    renderAppAt("/files-docs");

    expect(screen.getByRole("heading", { name: "Files/Docs" })).toBeInTheDocument();
    expect(screen.getByRole("tab", { name: "Files" })).toBeInTheDocument();
    expect(screen.getByRole("tab", { name: "Generated Documents" })).toBeInTheDocument();
    expect(screen.queryByRole("tab", { name: "Fact Find" })).not.toBeInTheDocument();
    expect(screen.queryByRole("tab", { name: "Quote" })).not.toBeInTheDocument();
  });

  it("redirects legacy /files to /files-docs", () => {
    renderAppAt("/files");

    expect(screen.getByRole("heading", { name: "Files/Docs" })).toBeInTheDocument();
    expect(screen.getByRole("tab", { name: "Files" })).toBeInTheDocument();
    expect(screen.getByRole("tab", { name: "Generated Documents" })).toBeInTheDocument();
  });

  it("stores the selected client when redirecting from the legacy client workflow route", () => {
    renderAppAt("/clients/CLI-2026-0002/income-protection");

    expect(window.localStorage.getItem("omega-selected-income-protection-client")).toBe("CLI-2026-0002");
    expect(screen.getByRole("heading", { name: "Income Protection" })).toBeInTheDocument();
  });
});
