import { cleanup, render, screen, waitFor } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { AuthProvider, useAuth } from "./auth-context";

function AuthProbe() {
  const { isSignedIn, user } = useAuth();

  return (
    <div>
      <span>{isSignedIn ? "signed-in" : "signed-out"}</span>
      <span>{user?.email ?? "no-email"}</span>
    </div>
  );
}

describe("AuthProvider", () => {
  beforeEach(() => {
    window.sessionStorage.clear();
    window.sessionStorage.setItem(
      "omega-session-user",
      JSON.stringify({
        email: "staff@omega.local",
        role: "staff",
      }),
    );
    vi.stubGlobal("fetch", vi.fn());
  });

  afterEach(() => {
    vi.restoreAllMocks();
    cleanup();
  });

  it("refreshes /auth/me once on bootstrap without re-triggering on normalized user updates", async () => {
    const fetchMock = vi.mocked(fetch);
    fetchMock.mockResolvedValue(
      new Response(
        JSON.stringify({
          user: {
            email: "staff@omega.local",
            role: "staff",
            first_name: "Staff",
          },
        }),
        {
          status: 200,
          headers: {
            "Content-Type": "application/json",
          },
        },
      ),
    );

    render(
      <AuthProvider>
        <AuthProbe />
      </AuthProvider>,
    );

    expect(await screen.findByText("signed-in")).toBeInTheDocument();
    expect(await screen.findByText("staff@omega.local")).toBeInTheDocument();

    await waitFor(() => {
      expect(fetchMock).toHaveBeenCalledTimes(1);
      expect(fetchMock).toHaveBeenCalledWith("/auth/me");
    });
  });
});
