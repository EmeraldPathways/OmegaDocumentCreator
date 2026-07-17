import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { AuthProvider } from "../auth/auth-context";
import { ToastProvider } from "../components/ui";
import { ClientDataProvider } from "../data/client-data-context";
import { FactFindPage } from "./fact-find-page";

function renderFactFindPage() {
  render(
    <MemoryRouter>
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

  it("hides partner and no deferred provider sections until toggled on", () => {
    renderFactFindPage();

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
  }, 15000);
});
