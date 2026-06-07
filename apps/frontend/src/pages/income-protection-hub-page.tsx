import { Link } from "react-router-dom";

import { useClientData } from "../data/client-data-context";

export function IncomeProtectionHubPage() {
  const { listClients } = useClientData();
  const clients = listClients();

  return (
    <div className="page-stack">
      <section className="panel">
        <div className="page-heading">
          <div>
            <p className="eyebrow">Module workspace</p>
            <h1>Income Protection</h1>
          </div>
        </div>

        <p className="module-subtitle">
          Select a client to open the Income Protection workflow, including Fact Find, Terms of
          Business, Statement of Suitability, files, and generated documents.
        </p>

        <div className="table-wrap">
          <table className="data-table">
            <thead>
              <tr>
                <th>Reference</th>
                <th>Client</th>
                <th>Status</th>
                <th>Advisor</th>
                <th>Action</th>
              </tr>
            </thead>
            <tbody>
              {clients.map((client) => (
                <tr key={client.clientReference}>
                  <td>{client.clientReference}</td>
                  <td>{client.fullName}</td>
                  <td>{client.status}</td>
                  <td>{client.advisorName || client.updatedBy}</td>
                  <td>
                    <Link className="table-link" to={`/clients/${client.clientReference}/income-protection`}>
                      Open workflow
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
