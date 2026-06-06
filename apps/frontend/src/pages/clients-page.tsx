import { Link } from "react-router-dom";

const seededClients = [
  {
    clientReference: "CLI-2026-0001",
    fullName: "Test Client",
    status: "Draft",
    owner: "Omega Admin",
  },
  {
    clientReference: "CLI-2026-0002",
    fullName: "Jamie Murphy",
    status: "Active",
    owner: "Office Staff",
  },
];

export function ClientsPage() {
  return (
    <div className="page-stack">
      <section className="panel">
        <div className="page-heading">
          <div>
            <p className="eyebrow">Client records</p>
            <h1>Clients</h1>
          </div>
          <Link className="primary-action action-link" to="/clients/new">
            Create Client
          </Link>
        </div>

        <div className="table-wrap">
          <table className="data-table">
            <thead>
              <tr>
                <th>Reference</th>
                <th>Client</th>
                <th>Status</th>
                <th>Last edited by</th>
              </tr>
            </thead>
            <tbody>
              {seededClients.map((client) => (
                <tr key={client.clientReference}>
                  <td>
                    <Link className="table-link" to={`/clients/${client.clientReference}`}>
                      {client.clientReference}
                    </Link>
                  </td>
                  <td>{client.fullName}</td>
                  <td>{client.status}</td>
                  <td>{client.owner}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>
    </div>
  );
}
