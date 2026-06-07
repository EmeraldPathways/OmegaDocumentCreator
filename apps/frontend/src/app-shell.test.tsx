import { render, screen } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { describe, expect, it } from "vitest";

import { AuthProvider } from "./auth/auth-context";
import { AppShell } from "./components/app-shell";

describe("AppShell", () => {
  it("shows the primary navigation items", () => {
    render(
      <MemoryRouter>
        <AuthProvider>
          <AppShell />
        </AuthProvider>
      </MemoryRouter>,
    );

    expect(screen.getByText("Clients")).toBeInTheDocument();
    expect(screen.getByText("Income Protection")).toBeInTheDocument();
    expect(screen.getByText("Settings")).toBeInTheDocument();
    expect(screen.queryByText("Documents")).not.toBeInTheDocument();
    expect(screen.queryByText("Dashboard")).not.toBeInTheDocument();
    expect(screen.queryByText("Admin")).not.toBeInTheDocument();
    expect(screen.getByPlaceholderText("Search clients")).toBeInTheDocument();
  });
});
