import { Link } from "react-router-dom";

import { useClientData } from "../data/client-data-context";

export function FilesPage() {
  const { listClients } = useClientData();
  const files = listClients().flatMap((client) =>
    client.files.map((file) => ({
      ...file,
      clientReference: client.clientReference,
      clientName: client.fullName,
    })),
  );

  return (
    <div className="page-stack">
      <section className="panel">
        <div className="page-heading">
          <div>
            <p className="eyebrow">Client storage</p>
            <h1>Files</h1>
          </div>
        </div>

        <div className="table-wrap">
          <table className="data-table">
            <thead>
              <tr>
                <th>Filename</th>
                <th>Category</th>
                <th>Client</th>
                <th>Status</th>
                <th>Uploaded</th>
              </tr>
            </thead>
            <tbody>
              {files.map((file) => (
                <tr key={file.id}>
                  <td>{file.originalFilename}</td>
                  <td>{file.category}</td>
                  <td>
                    <Link className="table-link" to={`/clients/${file.clientReference}/income-protection`}>
                      {file.clientName}
                    </Link>
                  </td>
                  <td>{file.status}</td>
                  <td>{file.uploadedAt}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>
    </div>
  );
}
