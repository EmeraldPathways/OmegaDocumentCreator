import { useEffect, useMemo, useState } from "react";
import { Link, useNavigate, useSearchParams } from "react-router-dom";
import { Users, FileText, Edit3, Plus, Search, ArrowRight, ChevronUp, ChevronDown } from "lucide-react";

import { useClientData } from "../data/client-data-context";
import type { SeededClientProfile } from "../data/seeded-clients";
import { Badge } from "../components/ui";
import { Skeleton } from "../components/ui";
import { useDebounce } from "../hooks/use-debounce";

type SortKey = "clientReference" | "fullName" | "status" | "updatedBy";
type SortDirection = "asc" | "desc";

function HighlightText({ text, query }: { text: string; query: string }) {
  if (!query.trim()) {
    return <>{text}</>;
  }

  const regex = new RegExp(`(${escapeRegExp(query)})`, "gi");
  const parts = text.split(regex);

  return (
    <>
      {parts.map((part, index) =>
        regex.test(part) ? (
          <span className="highlight" key={index}>
            {part}
          </span>
        ) : (
          <span key={index}>{part}</span>
        ),
      )}
    </>
  );
}

function escapeRegExp(value: string) {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

function getClientStatusVariant(status: string): Parameters<typeof Badge>[0]["variant"] {
  switch (status) {
    case "Active":
      return "active";
    case "Draft":
      return "draft";
    case "Approved":
      return "approved";
    default:
      return "default";
  }
}

function MetricCard({
  icon: Icon,
  value,
  label,
}: {
  icon: typeof Users;
  value: number | string;
  label: string;
}) {
  return (
    <div className="metric-card">
      <div className="metric-icon">
        <Icon size={22} />
      </div>
      <div>
        <div className="metric-value">{value}</div>
        <div className="metric-label">{label}</div>
      </div>
    </div>
  );
}

function SkeletonRows({ count }: { count: number }) {
  return (
    <>
      {Array.from({ length: count }).map((_, index) => (
        <tr key={index}>
          <td>
            <Skeleton />
          </td>
          <td>
            <Skeleton />
          </td>
          <td>
            <Skeleton />
          </td>
          <td>
            <Skeleton />
          </td>
          <td>
            <Skeleton />
          </td>
        </tr>
      ))}
    </>
  );
}

export function ClientsPage() {
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const { listClients } = useClientData();
  const [isLoading, setIsLoading] = useState(import.meta.env.MODE !== "test");
  const [searchQuery, setSearchQuery] = useState(searchParams.get("search") ?? "");
  const [sortKey, setSortKey] = useState<SortKey>("clientReference");
  const [sortDirection, setSortDirection] = useState<SortDirection>("desc");
  const debouncedSearch = useDebounce(searchQuery, 300);

  useEffect(() => {
    // Simulate initial data fetch; ensures skeleton is shown before data arrives.
    // In test mode, finish immediately so assertions do not need to wait.
    const delay = import.meta.env.MODE === "test" ? 0 : 400;
    const timer = setTimeout(() => {
      setIsLoading(false);
    }, delay);
    return () => clearTimeout(timer);
  }, []);

  useEffect(() => {
    const params = new URLSearchParams(searchParams);
    if (debouncedSearch.trim()) {
      params.set("search", debouncedSearch.trim());
    } else {
      params.delete("search");
    }
    setSearchParams(params, { replace: true });
  }, [debouncedSearch]);

  const clients = listClients();

  const filteredClients = useMemo(() => {
    const query = debouncedSearch.trim().toLowerCase();
    if (!query) {
      return clients;
    }

    return clients.filter(
      (client) =>
        client.fullName.toLowerCase().includes(query) ||
        client.clientReference.toLowerCase().includes(query) ||
        client.email?.toLowerCase().includes(query),
    );
  }, [clients, debouncedSearch]);

  const sortedClients = useMemo(() => {
    const sorted = [...filteredClients].sort((a, b) => {
      const aValue = a[sortKey] ?? "";
      const bValue = b[sortKey] ?? "";
      if (aValue < bValue) {
        return sortDirection === "asc" ? -1 : 1;
      }
      if (aValue > bValue) {
        return sortDirection === "asc" ? 1 : -1;
      }
      return 0;
    });
    return sorted;
  }, [filteredClients, sortKey, sortDirection]);

  const activeClients = clients.filter((client) => client.status !== "Archived").length;
  const draftClients = clients.filter((client) => client.status === "Draft").length;

  function handleSort(key: SortKey) {
    if (sortKey === key) {
      setSortDirection((current) => (current === "asc" ? "desc" : "asc"));
    } else {
      setSortKey(key);
      setSortDirection("asc");
    }
  }

  function SortHeader({ label, sortId }: { label: string; sortId: SortKey }) {
    const isActive = sortKey === sortId;
    return (
      <th className="sortable" onClick={() => handleSort(sortId)} scope="col">
        <span style={{ display: "inline-flex", alignItems: "center", gap: "4px" }}>
          {label}
          {isActive ? (
            sortDirection === "asc" ? (
              <ChevronUp size={14} />
            ) : (
              <ChevronDown size={14} />
            )
          ) : null}
        </span>
      </th>
    );
  }

  function openClient(client: SeededClientProfile) {
    navigate(`/clients/${client.clientReference}`);
  }

  return (
    <div className="page-stack">
      <section className="card">
        <div className="page-heading page-heading-compact">
          <div>
            <h1>Clients</h1>
            <p className="page-subtitle">Manage your client records and insurance documents.</p>
          </div>
          <div className="page-actions">
            <Link className="btn btn-primary" to="/clients/new">
              <Plus size={18} />
              Create Client
            </Link>
          </div>
        </div>

        <div className="metric-grid">
          <MetricCard icon={Users} label="Total clients" value={clients.length} />
          <MetricCard icon={FileText} label="Active files" value={activeClients} />
          <MetricCard icon={Edit3} label="Drafts" value={draftClients} />
        </div>
      </section>

      <section className="card">
        <div className="section-header">
          <div className="field" style={{ maxWidth: "320px", width: "100%" }}>
            <label className="field-label" htmlFor="client-search">
              Search clients
            </label>
            <div className="field-input-wrap">
              <Search size={16} style={{ marginLeft: "12px", color: "var(--color-text-muted)" }} />
              <input
                className="field-input"
                id="client-search"
                onChange={(event) => setSearchQuery(event.target.value)}
                placeholder="Search by name, reference, or email"
                type="search"
                value={searchQuery}
              />
            </div>
          </div>
          <span className="text-muted" style={{ fontSize: "var(--font-size-small)" }}>
            {isLoading ? "Loading..." : `${filteredClients.length} result${filteredClients.length === 1 ? "" : "s"} found`}
          </span>
        </div>

        <div className="table-wrap">
          <table className="data-table">
            <thead>
              <tr>
                <SortHeader label="Reference" sortId="clientReference" />
                <SortHeader label="Client" sortId="fullName" />
                <SortHeader label="Status" sortId="status" />
                <SortHeader label="Last edited by" sortId="updatedBy" />
                <th scope="col">Action</th>
              </tr>
            </thead>
            <tbody>
              {isLoading ? (
                <SkeletonRows count={5} />
              ) : sortedClients.length === 0 ? (
                <tr>
                  <td colSpan={5} style={{ padding: 0, border: 0 }}>
                    <div className="empty-state">
                      <div className="empty-state-icon">
                        <Users size={28} />
                      </div>
                      <div className="empty-state-title">No clients yet</div>
                      <p className="empty-state-description">
                        {debouncedSearch.trim()
                          ? "No clients match your search. Try different keywords."
                          : "Create your first client to start building insurance documents."}
                      </p>
                      <Link className="btn btn-primary" to="/clients/new">
                        <Plus size={18} />
                        Create your first client
                      </Link>
                    </div>
                  </td>
                </tr>
              ) : (
                sortedClients.map((client) => (
                  <tr
                    key={client.clientReference}
                    onClick={() => openClient(client)}
                    style={{ cursor: "pointer" }}
                    title="Open client profile"
                  >
                    <td>
                      <span className="text-monospace" style={{ color: "var(--color-secondary)", fontWeight: 500 }}>
                        <HighlightText query={debouncedSearch} text={client.clientReference} />
                      </span>
                    </td>
                    <td>
                      <div style={{ display: "flex", flexDirection: "column", gap: "2px" }}>
                        <span className="font-medium">
                          <HighlightText query={debouncedSearch} text={client.fullName} />
                        </span>
                        <span style={{ fontSize: "var(--font-size-small)", color: "var(--color-text-muted)" }}>
                          {client.email || "Email not recorded"}
                        </span>
                      </div>
                    </td>
                    <td>
                      <Badge variant={getClientStatusVariant(client.status)}>{client.status}</Badge>
                    </td>
                    <td>{client.updatedBy}</td>
                    <td>
                      <Link
                        className="btn btn-secondary btn-sm"
                        onClick={(event) => event.stopPropagation()}
                        to={`/clients/${client.clientReference}`}
                      >
                        <ArrowRight size={14} />
                        Open
                      </Link>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </section>
    </div>
  );
}
