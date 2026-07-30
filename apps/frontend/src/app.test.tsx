import type { ReactNode } from "react";
import { cleanup, render, screen } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { App } from "./App";
import { WorkflowDocumentSections } from "./pages/workflow-document-sections";

const routerFuture = {
  v7_startTransition: true,
  v7_relativeSplatPath: true,
} as const;

vi.mock("./auth/auth-context", () => ({
  AuthProvider: ({ children }: { children: ReactNode }) => children,
  useAuth: () => ({
    isSignedIn: true,
    isAdmin: true,
  }),
}));

vi.mock("./pages/fact-find-page", () => ({
  FactFindPage: () => (
    <section>
      <h1>Fact Find</h1>
      <button role="tab">Fact Find</button>
      <button role="tab">Fact Find Update</button>
    </section>
  ),
}));

vi.mock("./pages/income-protection-documents-page", () => ({
  IncomeProtectionDocumentsPage: () => (
    <section>
      <h1>Income Protection</h1>
      <button role="tab">Quote</button>
      <button role="tab">Statement of Suitability</button>
    </section>
  ),
}));

vi.mock("./pages/pensions-page", () => ({
  PensionsPage: () => (
    <section>
      <h1>Pensions</h1>
      <button role="tab">Quote</button>
      <button role="tab">Statement of Suitability</button>
      <label htmlFor="pensions-retirement-age">Retirement Age</label>
      <input id="pensions-retirement-age" />
      <label htmlFor="pensions-monthly-contribution">Monthly Contribution</label>
      <input id="pensions-monthly-contribution" />
    </section>
  ),
}));

vi.mock("./pages/files-docs-page", () => ({
  FilesDocsPage: () => (
    <section>
      <h1>Files/Docs</h1>
      <button role="tab">Files</button>
      <button role="tab">Generated Documents</button>
    </section>
  ),
}));

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
    <MemoryRouter initialEntries={[route]} future={routerFuture}>
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
