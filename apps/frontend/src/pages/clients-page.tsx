import { Link } from "react-router-dom";

import { useClientData } from "../data/client-data-context";

export function ClientsPage() {
  const { listClients } = useClientData();
  const clients = listClients();
  const activeClients = clients.filter((client) => client.status !== "Archived").length;
  const draftClients = clients.filter((client) => client.status === "Draft").length;

  return (
    <div className="page-stack">
      <section className="panel">
        <div className="page-heading">
          <div>
            <p className="eyebrow">Client records</p>
            <h1>Clients</h1>
            <p className="module-subtitle">Open a client file, review status, and jump straight into active Income Protection work.</p>
          </div>
          <Link className="primary-action action-link" to="/clients/new">
            Create Client
          </Link>
        </div>

        <div className="hero-stat-grid">
          <div className="hero-stat-card">
            <span className="status-label">Total clients</span>
            <strong>{clients.length}</strong>
            <span>All records currently available in the office system.</span>
          </div>
          <div className="hero-stat-card">
            <span className="status-label">Active files</span>
            <strong>{activeClients}</strong>
            <span>Client records ready for review, advice, or document updates.</span>
          </div>
          <div className="hero-stat-card">
            <span className="status-label">Drafts</span>
            <strong>{draftClients}</strong>
            <span>Records still being completed before client output is finalised.</span>
          </div>
        </div>

        <div className="table-wrap elevated-table-wrap">
          <table className="data-table">
            <thead>
              <tr>
                <th>Reference</th>
                <th>Client</th>
                <th>Status</th>
                <th>Last edited by</th>
                <th>Action</th>
              </tr>
            </thead>
            <tbody>
              {clients.map((client) => (
                <tr key={client.clientReference}>
                  <td>
                    <Link className="table-link" to={`/clients/${client.clientReference}`}>
                      {client.clientReference}
                    </Link>
                  </td>
                  <td>
                    <div className="client-table-cell">
                      <strong>{client.fullName}</strong>
                      <span>{client.email || "Email not recorded"}</span>
                    </div>
                  </td>
                  <td>
                    <span className="table-status-pill">{client.status}</span>
                  </td>
                  <td>{client.updatedBy}</td>
                  <td>
                    <Link className="table-action-link" to={`/clients/${client.clientReference}`}>
                      Open file
                    </Link>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>
    </div>
  );
}
