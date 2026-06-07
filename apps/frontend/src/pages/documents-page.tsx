import { Link } from "react-router-dom";

import { useClientData } from "../data/client-data-context";

export function DocumentsPage() {
  const { listClients } = useClientData();
  const clients = listClients();

  return (
    <div className="page-stack">
      <section className="panel">
        <div className="page-heading">
          <div>
            <p className="eyebrow">Client folders</p>
            <h1>Documents</h1>
          </div>
        </div>

        <p className="module-subtitle">
          Open a client folder to view generated documents, uploaded files, and signed records in one place.
        </p>

        <div className="table-wrap">
          <table className="data-table">
            <thead>
              <tr>
                <th>Client folder</th>
                <th>Status</th>
                <th>Documents</th>
                <th>Files</th>
                <th>Action</th>
              </tr>
            </thead>
            <tbody>
              {clients.map((client) => (
                <tr key={client.clientReference}>
                  <td>
                    <strong>{client.fullName}</strong>
                    <div>{client.clientReference}</div>
                  </td>
                  <td>{client.status}</td>
                  <td>{client.generatedDocuments.length}</td>
                  <td>{client.files.length}</td>
                  <td>
                    <Link className="table-link" to={`/documents/${client.clientReference}`}>
                      Open folder
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
