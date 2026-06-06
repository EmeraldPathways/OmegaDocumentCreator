import { NavLink } from "react-router-dom";
import type { PropsWithChildren } from "react";

const navItems = [
  { label: "Dashboard", to: "/" },
  { label: "Clients", to: "/clients" },
  { label: "Income Protection", to: "/clients" },
  { label: "Documents", to: "/clients" },
  { label: "Files", to: "/clients" },
  { label: "Admin", to: "/admin" },
  { label: "Settings", to: "/settings" },
];

export function AppShell({ children }: PropsWithChildren) {
  return (
    <div className="app-shell">
      <aside className="sidebar">
        <div className="brand">
          <span className="brand-mark">Omega</span>
          <span className="brand-subtitle">Document Creator</span>
        </div>

        <nav className="nav">
          {navItems.map((item) => (
            <NavLink key={item.label} className="nav-link" to={item.to}>
              {item.label}
            </NavLink>
          ))}
        </nav>
      </aside>

      <main className="content">
        <header className="topbar">
          <input aria-label="Search clients" placeholder="Search clients" type="search" />
          <div className="status-card">
            <span className="status-label">Stage</span>
            <strong>Foundation</strong>
          </div>
        </header>

        <section className="page-body">{children}</section>
      </main>
    </div>
  );
}
