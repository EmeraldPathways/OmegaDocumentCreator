import { useEffect, useRef, useState, type FormEvent } from "react";
import { NavLink, useNavigate } from "react-router-dom";
import type { PropsWithChildren } from "react";
import { Users, ClipboardList, Shield, Landmark, FolderOpen, Settings, Lock, User, LogOut, ChevronDown } from "lucide-react";

import { useAuth } from "../auth/auth-context";

const navItems = [
  { label: "Clients", to: "/clients", icon: Users },
  { label: "Fact Find", to: "/fact-find", icon: ClipboardList },
  { label: "Income Protection", to: "/income-protection", icon: Shield },
  { label: "Pensions", icon: Landmark },
  { label: "Files/Docs", to: "/files-docs", icon: FolderOpen },
  { label: "Settings", to: "/settings", icon: Settings },
];

export function AppShell({ children }: PropsWithChildren) {
  const navigate = useNavigate();
  const { isAdmin, isSignedIn, signOut, user } = useAuth();
  const [isUserMenuOpen, setIsUserMenuOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const userMenuRef = useRef<HTMLDivElement>(null);

  const visibleNavItems = isAdmin
    ? [...navItems, { label: "Admin", to: "/admin", icon: Lock }]
    : navItems.filter((item) => item.label !== "Settings");

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (userMenuRef.current && !userMenuRef.current.contains(event.target as Node)) {
        setIsUserMenuOpen(false);
      }
    }

    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  function handleSearch(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (searchQuery.trim()) {
      navigate(`/clients?search=${encodeURIComponent(searchQuery.trim())}`);
    }
  }

  const userInitial = user?.email?.[0]?.toUpperCase() ?? "?";
  const userName = user?.email ?? "Guest";

  return (
    <div className="app-shell">
      <header className="app-header">
        <div className="header-row">
          <NavLink className="brand" to="/">
            <span className="brand-mark">Ω</span>
            <span className="brand-text">
              <span className="brand-title">Omega</span>
              <span className="brand-subtitle">Document Creator</span>
            </span>
          </NavLink>

          <nav className="top-nav">
            {visibleNavItems.map((item) => {
              const Icon = item.icon;
              return item.to ? (
                <NavLink
                  key={item.label}
                  className={({ isActive }) => `nav-link${isActive ? " active" : ""}`}
                  to={item.to}
                >
                  <Icon size={18} />
                  <span>{item.label}</span>
                </NavLink>
              ) : (
                <span aria-disabled="true" className="nav-link" key={item.label}>
                  <Icon size={18} />
                  <span>{item.label}</span>
                </span>
              );
            })}
          </nav>

          <form className="header-search" onSubmit={handleSearch}>
            <input
              aria-label="Search clients"
              onChange={(event) => setSearchQuery(event.target.value)}
              placeholder="Search clients"
              type="search"
              value={searchQuery}
            />
          </form>

          <div className="session-actions">
            <div className="user-menu" ref={userMenuRef}>
              <button
                aria-expanded={isUserMenuOpen}
                aria-haspopup="true"
                className="user-menu-button"
                onClick={() => setIsUserMenuOpen((open) => !open)}
                type="button"
              >
                <span className="user-avatar" aria-hidden="true">
                  {userInitial}
                </span>
                <span className="hidden-mobile">{userName}</span>
                <ChevronDown size={16} />
              </button>
              {isUserMenuOpen ? (
                <div className="user-menu-dropdown">
                  <div className="user-menu-item" style={{ cursor: "default" }}>
                    <User size={16} />
                    <span>{userName}</span>
                  </div>
                  <div className="user-menu-divider" />
                  {isAdmin ? (
                    <button
                      className="user-menu-item"
                      onClick={() => {
                        setIsUserMenuOpen(false);
                        navigate("/settings");
                      }}
                      type="button"
                    >
                      <Settings size={16} />
                      Settings
                    </button>
                  ) : null}
                  {isSignedIn ? (
                    <button
                      className="user-menu-item"
                      onClick={() => {
                        setIsUserMenuOpen(false);
                        signOut();
                        navigate("/fact-find");
                      }}
                      type="button"
                    >
                      <LogOut size={16} />
                      Sign Out
                    </button>
                  ) : (
                    <button
                      className="user-menu-item"
                      onClick={() => {
                        setIsUserMenuOpen(false);
                        navigate("/login");
                      }}
                      type="button"
                    >
                      <LogOut size={16} />
                      Sign In
                    </button>
                  )}
                </div>
              ) : null}
            </div>
          </div>
        </div>
      </header>

      <main className="content">
        <section className="page-body">{children}</section>
      </main>
    </div>
  );
}
