import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { AuthProvider } from "../auth/auth-context";
import { ToastProvider } from "../components/ui";
import { ClientDataProvider } from "../data/client-data-context";
import { FactFindPage } from "./fact-find-page";

const routerFuture = {
  v7_startTransition: true,
  v7_relativeSplatPath: true,
} as const;

function renderFactFindPage() {
  render(
    <MemoryRouter future={routerFuture}>
      <AuthProvider>
        <ClientDataProvider>
          <ToastProvider>
            <FactFindPage />
          </ToastProvider>
        </ClientDataProvider>
      </AuthProvider>
    </MemoryRouter>,
  );
}

describe("FactFindPage", () => {
  beforeEach(() => {
    window.localStorage.clear();
    window.sessionStorage.clear();
  });

  afterEach(() => {
    vi.restoreAllMocks();
    cleanup();
  });

  it("hides partner-only fields and keeps deferred provider sections visible", () => {
    renderFactFindPage();

    expect(screen.getByLabelText(/Add partner details/i)).toBeInTheDocument();
    expect(screen.queryByLabelText(/^Annual Cover Amount/i)).not.toBeInTheDocument();
    expect(screen.queryByLabelText(/^Monthly premium$/i)).not.toBeInTheDocument();
    expect(screen.queryByLabelText(/^Deferred period$/i)).not.toBeInTheDocument();
    expect(screen.queryByLabelText(/Partner Name/i)).not.toBeInTheDocument();
    expect(screen.queryAllByLabelText(/Partner Address/i)).toHaveLength(0);
    expect(screen.getByLabelText(/^No deferred provider$/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/^Deferred period provider$/i)).toBeInTheDocument();
    expect(screen.queryByLabelText(/^Client signature 2$/i)).not.toBeInTheDocument();
    expect(screen.queryByLabelText(/^Client signature 2 date$/i)).not.toBeInTheDocument();

    fireEvent.click(screen.getByLabelText(/Add partner details/i));
    expect(screen.getByLabelText(/Partner Name/i)).toBeInTheDocument();
    expect(screen.getAllByLabelText(/Partner Address/i)).toHaveLength(4);
    expect(screen.getByLabelText(/^Client signature 2$/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/^Client signature 2 date$/i)).toBeInTheDocument();
  }, 15000);
});
