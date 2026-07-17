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

    expect(screen.getByRole("link", { name: "Clients" })).toHaveAttribute("href", "/clients");
    expect(screen.queryByRole("link", { name: "Fact Find" })).not.toBeInTheDocument();
    expect(screen.getByText("Fact Find").closest(".nav-link")).toHaveAttribute("aria-disabled", "true");
    expect(screen.getByRole("link", { name: "Income Protection" })).toHaveAttribute("href", "/income-protection");
    expect(screen.queryByRole("link", { name: "Pensions" })).not.toBeInTheDocument();
    expect(screen.getByText("Pensions").closest(".nav-link")).toHaveAttribute("aria-disabled", "true");
    expect(screen.queryByRole("link", { name: "Files/Docs" })).not.toBeInTheDocument();
    expect(screen.getByText("Files/Docs").closest(".nav-link")).toHaveAttribute("aria-disabled", "true");
    expect(screen.queryByText("Settings")).not.toBeInTheDocument();
    expect(screen.queryByText("Documents")).not.toBeInTheDocument();
    expect(screen.queryByText("Dashboard")).not.toBeInTheDocument();
    expect(screen.queryByText("Admin")).not.toBeInTheDocument();
    expect(screen.getByPlaceholderText("Search clients")).toBeInTheDocument();
  });
});
