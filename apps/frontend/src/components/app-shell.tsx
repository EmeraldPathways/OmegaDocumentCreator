import { NavLink, useNavigate } from "react-router-dom";
import type { PropsWithChildren } from "react";

import { useAuth } from "../auth/auth-context";

const navItems = [
  { label: "Clients", to: "/clients" },
  { label: "Income Protection", to: "/income-protection" },
  { label: "Settings", to: "/settings" },
];

export function AppShell({ children }: PropsWithChildren) {
  const navigate = useNavigate();
  const { isAdmin, isSignedIn, signOut, user } = useAuth();

  const visibleNavItems = isAdmin ? [...navItems, { label: "Admin", to: "/admin" }] : navItems;

  return (
    <div className="app-shell">
      <header className="app-header">
        <div className="header-row">
          <div className="brand">
            <span className="brand-mark">Omega</span>
            <span className="brand-subtitle">Document Creator</span>
          </div>

          <nav className="top-nav">
            {visibleNavItems.map((item) => (
              <NavLink key={item.label} className="nav-link" to={item.to}>
                {item.label}
              </NavLink>
            ))}
          </nav>

          <div className="session-actions">
            <span className="session-label">{isSignedIn ? user?.email : "Not signed in"}</span>
            {isSignedIn ? (
              <button
                className="primary-action secondary-action"
                onClick={() => {
                  signOut();
                  navigate("/income-protection");
                }}
                type="button"
              >
                Sign Out
              </button>
            ) : (
              <button className="primary-action secondary-action" onClick={() => navigate("/login")} type="button">
                Sign In
              </button>
            )}
          </div>
        </div>

        <div className="topbar">
          <input aria-label="Search clients" placeholder="Search clients" type="search" />
          <div className="status-card">
            <span className="status-label">Role</span>
            <strong>{user?.role ?? "guest"}</strong>
          </div>
        </div>
      </header>

      <main className="content">
        <section className="page-body">{children}</section>
      </main>
    </div>
  );
}
