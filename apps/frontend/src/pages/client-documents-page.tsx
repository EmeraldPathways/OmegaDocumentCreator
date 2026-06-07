import { Link, useParams } from "react-router-dom";

import { getSeededClientProfile } from "../data/seeded-clients";

export function ClientDocumentsPage() {
  const { clientReference = "" } = useParams();
  const client = getSeededClientProfile(clientReference);

  if (!client) {
    return (
      <section className="panel">
        <h1>Client Folder Not Found</h1>
      </section>
    );
  }

  const folderName = `client-${client.clientReference.toLowerCase()}-${client.fullName.toLowerCase().replaceAll(" ", "-")}`;

  return (
    <div className="page-stack">
      <section className="panel">
        <div className="page-heading">
          <div>
            <p className="eyebrow">Client folder</p>
            <h1>{client.fullName}</h1>
            <p className="module-subtitle">{folderName}</p>
          </div>
          <div className="module-actions">
            <Link className="primary-action action-link secondary-action" to="/documents">
              Back to Documents
            </Link>
            <Link className="primary-action action-link" to={`/clients/${client.clientReference}/income-protection`}>
              Open Income Protection
            </Link>
          </div>
        </div>

        <section className="fact-find-section">
          <div className="fact-find-section-header">
            <p className="eyebrow">Generated output</p>
            <h2>Generated Documents</h2>
          </div>
          <div className="table-wrap">
            <table className="data-table">
              <thead>
                <tr>
                  <th>Document name</th>
                  <th>Type</th>
                  <th>Version</th>
                  <th>Status</th>
                  <th>Generated</th>
                </tr>
              </thead>
              <tbody>
                {client.generatedDocuments.map((document) => (
                  <tr key={document.id}>
                    <td>{document.documentName}</td>
                    <td>{document.documentType}</td>
                    <td>{document.version}</td>
                    <td>{document.status}</td>
                    <td>{document.generatedAt}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>

        <section className="fact-find-section">
          <div className="fact-find-section-header">
            <p className="eyebrow">Supporting records</p>
            <h2>Files</h2>
          </div>
          <div className="table-wrap">
            <table className="data-table">
              <thead>
                <tr>
                  <th>Filename</th>
                  <th>Category</th>
                  <th>Status</th>
                  <th>Uploaded by</th>
                  <th>Uploaded</th>
                </tr>
              </thead>
              <tbody>
                {client.files.map((file) => (
                  <tr key={file.id}>
                    <td>{file.originalFilename}</td>
                    <td>{file.category}</td>
                    <td>{file.status}</td>
                    <td>{file.uploadedBy}</td>
                    <td>{file.uploadedAt}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>
      </section>
    </div>
  );
}
