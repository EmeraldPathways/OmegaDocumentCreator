import { render, screen } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { describe, expect, it } from "vitest";

import { AuthProvider } from "./auth/auth-context";
import { AppShell } from "./components/app-shell";

const routerFuture = {
  v7_startTransition: true,
  v7_relativeSplatPath: true,
} as const;

describe("AppShell", () => {
  it("shows the primary navigation items", () => {
    render(
      <MemoryRouter future={routerFuture}>
        <AuthProvider>
          <AppShell />
        </AuthProvider>
      </MemoryRouter>,
    );

    expect(screen.getByRole("link", { name: "Clients" })).toHaveAttribute("href", "/clients");
    expect(screen.getByRole("link", { name: "Fact Find" })).toHaveAttribute("href", "/fact-find");
    expect(screen.getByRole("link", { name: "Income Protection" })).toHaveAttribute("href", "/income-protection");
    expect(screen.getByRole("link", { name: "Files/Docs" })).toHaveAttribute("href", "/files-docs");
    expect(screen.queryByRole("link", { name: "Pensions" })).not.toBeInTheDocument();
    expect(screen.queryByText("Settings")).not.toBeInTheDocument();
    expect(screen.queryByText("Documents")).not.toBeInTheDocument();
    expect(screen.queryByText("Dashboard")).not.toBeInTheDocument();
    expect(screen.queryByText("Admin")).not.toBeInTheDocument();
    expect(screen.getByPlaceholderText("Search clients")).toBeInTheDocument();
  });
});
