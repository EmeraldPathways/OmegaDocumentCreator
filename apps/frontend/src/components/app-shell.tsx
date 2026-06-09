import { NavLink, useNavigate } from "react-router-dom";
import type { PropsWithChildren } from "react";
import { Users, Shield, Settings, Lock } from "lucide-react";

import { useAuth } from "../auth/auth-context";

const navItems = [
  { label: "Clients", to: "/clients", icon: Users },
  { label: "Income Protection", to: "/income-protection", icon: Shield },
  { label: "Settings", to: "/settings", icon: Settings },
];

export function AppShell({ children }: PropsWithChildren) {
  const navigate = useNavigate();
  const { isAdmin, isSignedIn, signOut, user } = useAuth();

  const visibleNavItems = isAdmin ? [...navItems, { label: "Admin", to: "/admin", icon: Lock }] : navItems;

  return (
    <div className="app-shell">
      <header className="app-header">
        <div className="header-row">
          <div className="brand">
            <span className="brand-mark">Omega</span>
            <span className="brand-subtitle">Document Creator</span>
          </div>

          <nav className="top-nav">
            {visibleNavItems.map((item) => {
              const Icon = item.icon;
              return (
                <NavLink key={item.label} className="nav-link" to={item.to}>
                  <Icon size={18} />
                  {item.label}
                </NavLink>
              );
            })}
          </nav>

          <div className="header-search">
            <input aria-label="Search clients" placeholder="Search clients" type="search" />
          </div>

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
      </header>

      <main className="content">
        <section className="page-body">{children}</section>
      </main>
    </div>
  );
}
