import { cleanup, render, screen, waitFor } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { ToastProvider } from "../components/ui";
import { ClientDataProvider } from "../data/client-data-context";
import { ClientsPage } from "./clients-page";

vi.mock("../auth/auth-context", () => ({
  useAuth: () => ({
    user: {
      email: "info@omegafinancial.ie",
      role: "admin",
    },
  }),
}));

const routerFuture = {
  v7_startTransition: true,
  v7_relativeSplatPath: true,
} as const;

function renderClientsPage() {
  render(
    <MemoryRouter future={routerFuture}>
      <ClientDataProvider>
        <ToastProvider>
          <ClientsPage />
        </ToastProvider>
      </ClientDataProvider>
    </MemoryRouter>,
  );
}

describe("ClientsPage", () => {
  beforeEach(() => {
    window.localStorage.clear();
    window.sessionStorage.clear();
  });

  afterEach(() => {
    vi.restoreAllMocks();
    cleanup();
  });

  it("does not bootstrap client records from localStorage in test mode", async () => {
    window.localStorage.setItem("omega-client-records-version", "4");
    window.localStorage.setItem(
      "omega-client-records",
      JSON.stringify({
        "CLI-2026-9999": {
          clientReference: "CLI-2026-9999",
          fullName: "Browser Only Client",
          firstName: "Browser",
          surname: "Only",
          status: "Draft",
          email: "browser@example.com",
          updatedBy: "Browser",
        },
      }),
    );

    renderClientsPage();

    await waitFor(() => {
      expect(screen.getByText("Jamie Murphy")).toBeInTheDocument();
    });

    expect(screen.queryByText("Browser Only Client")).not.toBeInTheDocument();
  });
});
