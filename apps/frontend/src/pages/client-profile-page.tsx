import { useEffect, useState } from "react";
import { Link, useParams } from "react-router-dom";

import { useClientData } from "../data/client-data-context";
import type { SeededClientFile, SeededClientProfile, SeededGeneratedDocument } from "../data/seeded-clients";

type SelectedClientRecord =
  | { kind: "document"; record: SeededGeneratedDocument }
  | { kind: "file"; record: SeededClientFile };

export function ClientProfilePage() {
  const { clientReference = "" } = useParams();
  const { getClient, saveClient } = useClientData();
  const client = getClient(clientReference);
  const [draft, setDraft] = useState<SeededClientProfile | null>(client ?? null);
  const [saveStatus, setSaveStatus] = useState("Not saved yet");
  const [selectedRecord, setSelectedRecord] = useState<SelectedClientRecord | null>(null);

  useEffect(() => {
    setDraft(client ?? null);
  }, [client]);

  if (!client || !draft) {
    return (
      <section className="panel">
        <h1>Client Not Found</h1>
      </section>
    );
  }

  const resolvedDraft = draft;

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

  function saveClientFolder() {
    saveClient(resolvedDraft);
    setSaveStatus("Saved just now");
  }

  function openDocument(document: SeededGeneratedDocument) {
    setSelectedRecord({ kind: "document", record: document });
  }

  function openFile(file: SeededClientFile) {
    setSelectedRecord({ kind: "file", record: file });
  }

  return (
    <div className="page-stack">
      <section className="panel">
        <div className="page-heading">
          <div>
            <p className="eyebrow">Client profile</p>
            <h1>{draft.fullName}</h1>
            <p className="module-subtitle">
              {draft.clientReference} · {draft.status} · last edited by {draft.updatedBy}
            </p>
          </div>
          <div className="module-actions">
            <Link className="primary-action action-link secondary-action" to={`/clients/${draft.clientReference}/edit`}>
              Edit Client
            </Link>
            <Link className="primary-action action-link" to={`/clients/${draft.clientReference}/income-protection`}>
              Open Income Protection
            </Link>
            <button className="primary-action" onClick={saveClientFolder} type="button">
              Save Documents
            </button>
            <span className="draft-status">Save status: {saveStatus}</span>
          </div>
        </div>

        <div className="profile-grid profile-grid-prominent">
          <div className="mini-card">
            <span className="status-label">Reference</span>
            <strong>{draft.clientReference}</strong>
          </div>
          <div className="mini-card">
            <span className="status-label">Status</span>
            <strong>{draft.status}</strong>
          </div>
          <div className="mini-card">
            <span className="status-label">Title</span>
            <strong>{draft.title}</strong>
          </div>
          <div className="mini-card">
            <span className="status-label">Email</span>
            <strong>{draft.email || "Not provided"}</strong>
          </div>
          <div className="mini-card">
            <span className="status-label">Mobile</span>
            <strong>{draft.mobileNumber || "Not provided"}</strong>
          </div>
          <div className="mini-card">
            <span className="status-label">Work phone</span>
            <strong>{draft.workPhone || "Not provided"}</strong>
          </div>
          <div className="mini-card">
            <span className="status-label">Date of birth</span>
            <strong>{draft.dateOfBirth || "Not provided"}</strong>
          </div>
          <div className="mini-card">
            <span className="status-label">Marital status</span>
            <strong>{draft.maritalStatus || "Not provided"}</strong>
          </div>
          <div className="mini-card">
            <span className="status-label">Town / City</span>
            <strong>{draft.townCity || "Not provided"}</strong>
          </div>
          <div className="mini-card">
            <span className="status-label">County</span>
            <strong>{draft.county || "Not provided"}</strong>
          </div>
          <div className="mini-card">
            <span className="status-label">Partner name</span>
            <strong>{draft.partnerName || "Not provided"}</strong>
          </div>
          <div className="mini-card">
            <span className="status-label">Last edited by</span>
            <strong>{draft.updatedBy}</strong>
          </div>
        </div>

        <div className="dependants-panel">
          <h2>Dependants</h2>
          {draft.dependants.length === 0 ? (
            <p>No dependants recorded.</p>
          ) : (
            <ul className="card-list">
              {draft.dependants.map((dependant) => (
                <li className="mini-card" key={`${dependant.name}-${dependant.dateOfBirth}`}>
                  <strong>{dependant.name}</strong>
                  <span>{dependant.dateOfBirth}</span>
                  <span>{dependant.notes}</span>
                </li>
              ))}
            </ul>
          )}
        </div>

        <div className="split-record-grid">
          <section className="fact-find-section record-section">
            <div className="fact-find-section-header">
              <p className="eyebrow">Generated output</p>
              <h2>Generated Documents</h2>
            </div>
            <div className="table-wrap elevated-table-wrap">
              <table className="data-table">
                <thead>
                  <tr>
                    <th>Document name</th>
                    <th>Type</th>
                    <th>Version</th>
                    <th>Status</th>
                    <th>Generated</th>
                    <th>Action</th>
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
                      <td>
                        <button className="table-action-button" onClick={() => openDocument(document)} type="button">
                          Open
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </section>

          <section className="fact-find-section record-section">
            <div className="fact-find-section-header">
              <p className="eyebrow">Supporting records</p>
              <h2>Files</h2>
            </div>
            <div className="table-wrap elevated-table-wrap">
              <table className="data-table">
                <thead>
                  <tr>
                    <th>Filename</th>
                    <th>Category</th>
                    <th>Status</th>
                    <th>Uploaded by</th>
                    <th>Uploaded</th>
                    <th>Action</th>
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
                      <td>
                        <button className="table-action-button" onClick={() => openFile(file)} type="button">
                          Open
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </section>
        </div>

        {selectedRecord ? (
          <section className="fact-find-section record-preview-panel">
            <div className="fact-find-section-header">
              <p className="eyebrow">Open record</p>
              <h2>{selectedRecord.kind === "document" ? "Document Preview" : "File Preview"}</h2>
            </div>
            <div className="profile-grid">
              <div className="mini-card">
                <span className="status-label">Name</span>
                <strong>
                  {selectedRecord.kind === "document"
                    ? selectedRecord.record.documentName
                    : selectedRecord.record.originalFilename}
                </strong>
              </div>
              <div className="mini-card">
                <span className="status-label">Type</span>
                <strong>
                  {selectedRecord.kind === "document"
                    ? selectedRecord.record.documentType
                    : selectedRecord.record.category}
                </strong>
              </div>
              <div className="mini-card">
                <span className="status-label">Status</span>
                <strong>{selectedRecord.record.status}</strong>
              </div>
              <div className="mini-card">
                <span className="status-label">{selectedRecord.kind === "document" ? "Generated" : "Uploaded"}</span>
                <strong>
                  {selectedRecord.kind === "document"
                    ? selectedRecord.record.generatedAt
                    : selectedRecord.record.uploadedAt}
                </strong>
              </div>
            </div>
            <p className="module-subtitle">
              {selectedRecord.kind === "document"
                ? "This document is open in the client file. Edit its row above and save documents to keep changes."
                : "This file is open in the client file. Edit its row above and save documents to keep changes."}
            </p>
          </section>
        ) : null}
      </section>
    </div>
  );
}
