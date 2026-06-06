import { useState } from "react";

const seededUsers = [
  { name: "Omega Admin", role: "Admin", status: "Active" },
  { name: "Office Staff", role: "Staff", status: "Active" },
];

const seededAuditLogs = [
  {
    id: "AUD-0003",
    action: "Document generated",
    entity: "Statement of Suitability PDF",
    user: "Office Staff",
    client: "CLI-2026-0002",
    createdAt: "2026-06-06 14:10",
  },
  {
    id: "AUD-0002",
    action: "File uploaded",
    entity: "jamie-murphy-passport.pdf",
    user: "Office Staff",
    client: "CLI-2026-0002",
    createdAt: "2026-06-06 13:55",
  },
];

export function AdminPage() {
  const [backupStatus, setBackupStatus] = useState("Ready");

  return (
    <div className="page-stack">
      <section className="panel">
        <div className="page-heading">
          <div>
            <p className="eyebrow">Security and access</p>
            <h1>Admin</h1>
          </div>
          <button className="primary-action" type="button">
            Add Staff User
          </button>
        </div>

        <ul className="card-list">
          {seededUsers.map((user) => (
            <li className="mini-card" key={user.name}>
              <strong>{user.name}</strong>
              <span>{user.role}</span>
              <span>{user.status}</span>
            </li>
          ))}
        </ul>

        <section className="fact-find-section">
          <div className="fact-find-section-header">
            <p className="eyebrow">Stage 14 draft</p>
            <h2>Security</h2>
          </div>
          <ul className="card-list">
            <li className="mini-card">
              <span className="status-label">Remote access recommendation</span>
              <strong>Cloudflare Tunnel with Cloudflare Access</strong>
            </li>
            <li className="mini-card">
              <span className="status-label">Public port exposure</span>
              <strong>Disabled</strong>
            </li>
            <li className="mini-card">
              <span className="status-label">Password hashing</span>
              <strong>PBKDF2 enabled</strong>
            </li>
            <li className="mini-card">
              <span className="status-label">Role-based access</span>
              <strong>Enabled</strong>
            </li>
            <li className="mini-card">
              <span className="status-label">Session timeout</span>
              <strong>30 minutes</strong>
            </li>
            <li className="mini-card">
              <span className="status-label">Private file storage</span>
              <strong>Server-only client folders</strong>
            </li>
          </ul>
        </section>

        <section className="fact-find-section">
          <div className="fact-find-section-header">
            <p className="eyebrow">Stage 13 draft</p>
            <h2>Backups</h2>
          </div>
          <div className="module-actions">
            <button className="primary-action" onClick={() => setBackupStatus("Backup placeholder completed")} type="button">
              Run Backup Now
            </button>
            <span className="draft-status">Backup status: {backupStatus}</span>
          </div>
          <ul className="card-list">
            <li className="mini-card">
              <span className="status-label">Last successful backup</span>
              <strong>2026-06-05 18:00</strong>
            </li>
            <li className="mini-card">
              <span className="status-label">Database backup</span>
              <strong>database/omega-2026-06-05.sql</strong>
            </li>
            <li className="mini-card">
              <span className="status-label">Files backup</span>
              <strong>files/clients-2026-06-05.zip</strong>
            </li>
            <li className="mini-card">
              <span className="status-label">Documents backup</span>
              <strong>documents/generated-2026-06-05.zip</strong>
            </li>
          </ul>
        </section>

        <section className="fact-find-section">
          <div className="fact-find-section-header">
            <p className="eyebrow">Stage 12 draft</p>
            <h2>Audit Logs</h2>
          </div>
          <div className="table-wrap">
            <table className="data-table">
              <thead>
                <tr>
                  <th>Action</th>
                  <th>Entity</th>
                  <th>User</th>
                  <th>Client</th>
                  <th>Created at</th>
                </tr>
              </thead>
              <tbody>
                {seededAuditLogs.map((log) => (
                  <tr key={log.id}>
                    <td>{log.action}</td>
                    <td>{log.entity}</td>
                    <td>{log.user}</td>
                    <td>{log.client}</td>
                    <td>{log.createdAt}</td>
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
