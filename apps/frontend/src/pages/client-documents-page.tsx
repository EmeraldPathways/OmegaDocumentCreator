import { useEffect, useState } from "react";
import { Link, useParams } from "react-router-dom";

import { useClientData } from "../data/client-data-context";
import type { SeededClientProfile } from "../data/seeded-clients";

export function ClientDocumentsPage() {
  const { clientReference = "" } = useParams();
  const { getClient, saveClient } = useClientData();
  const client = getClient(clientReference);
  const [draft, setDraft] = useState<SeededClientProfile | null>(client ?? null);
  const [saveStatus, setSaveStatus] = useState("Not saved yet");

  useEffect(() => {
    setDraft(client ?? null);
  }, [client]);

  if (!client || !draft) {
    return (
      <section className="panel">
        <h1>Client Folder Not Found</h1>
      </section>
    );
  }

  const folderName = `client-${draft.clientReference.toLowerCase()}-${draft.fullName.toLowerCase().replaceAll(" ", "-")}`;

  function updateDocument(documentId: string, field: "documentName" | "documentType" | "status", value: string) {
    setDraft((currentDraft) => {
      if (!currentDraft) {
        return currentDraft;
      }

      return {
        ...currentDraft,
        generatedDocuments: currentDraft.generatedDocuments.map((document) =>
          document.id === documentId ? { ...document, [field]: value } : document,
        ),
      };
    });
  }

  function updateFile(fileId: string, field: "originalFilename" | "category" | "status", value: string) {
    setDraft((currentDraft) => {
      if (!currentDraft) {
        return currentDraft;
      }

      return {
        ...currentDraft,
        files: currentDraft.files.map((file) => (file.id === fileId ? { ...file, [field]: value } : file)),
      };
    });
  }

  function saveFolder() {
    saveClient(draft);
    setSaveStatus("Saved just now");
  }

  return (
    <div className="page-stack">
      <section className="panel">
        <div className="page-heading">
          <div>
            <p className="eyebrow">Client folder</p>
            <h1>{draft.fullName}</h1>
            <p className="module-subtitle">{folderName}</p>
          </div>
          <div className="module-actions">
            <Link className="primary-action action-link secondary-action" to="/documents">
              Back to Documents
            </Link>
            <Link className="primary-action action-link" to={`/clients/${draft.clientReference}/income-protection`}>
              Open Income Protection
            </Link>
            <button className="primary-action" onClick={saveFolder} type="button">
              Save Folder Changes
            </button>
            <span className="draft-status">Save status: {saveStatus}</span>
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
                {draft.generatedDocuments.map((document) => (
                  <tr key={document.id}>
                    <td>
                      <input
                        onChange={(event) => updateDocument(document.id, "documentName", event.target.value)}
                        type="text"
                        value={document.documentName}
                      />
                    </td>
                    <td>
                      <input
                        onChange={(event) => updateDocument(document.id, "documentType", event.target.value)}
                        type="text"
                        value={document.documentType}
                      />
                    </td>
                    <td>{document.version}</td>
                    <td>
                      <input onChange={(event) => updateDocument(document.id, "status", event.target.value)} type="text" value={document.status} />
                    </td>
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
                {draft.files.map((file) => (
                  <tr key={file.id}>
                    <td>
                      <input
                        onChange={(event) => updateFile(file.id, "originalFilename", event.target.value)}
                        type="text"
                        value={file.originalFilename}
                      />
                    </td>
                    <td>
                      <input onChange={(event) => updateFile(file.id, "category", event.target.value)} type="text" value={file.category} />
                    </td>
                    <td>
                      <input onChange={(event) => updateFile(file.id, "status", event.target.value)} type="text" value={file.status} />
                    </td>
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
