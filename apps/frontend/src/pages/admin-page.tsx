import { useState } from "react";
import { Shield, UserPlus, Database, ClipboardList } from "lucide-react";

import { Badge, Button } from "../components/ui";

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

const securitySettings = [
  { label: "Remote access recommendation", value: "Cloudflare Tunnel with Cloudflare Access" },
  { label: "Public port exposure", value: "Disabled" },
  { label: "Password hashing", value: "PBKDF2 enabled" },
  { label: "Role-based access", value: "Enabled" },
  { label: "Session timeout", value: "30 minutes" },
  { label: "Private file storage", value: "Server-only client folders" },
];

const backupEntries = [
  { label: "Last successful backup", value: "2026-06-05 18:00" },
  { label: "Database backup", value: "database/omega-2026-06-05.sql" },
  { label: "Files backup", value: "files/clients-2026-06-05.zip" },
  { label: "Documents backup", value: "documents/generated-2026-06-05.zip" },
];

function getRoleVariant(role: string): Parameters<typeof Badge>[0]["variant"] {
  switch (role) {
    case "Admin":
      return "approved";
    case "Staff":
      return "active";
    default:
      return "default";
  }
}

function getStatusVariant(status: string): Parameters<typeof Badge>[0]["variant"] {
  switch (status) {
    case "Active":
      return "active";
    default:
      return "default";
  }
}

export function AdminPage() {
  const [backupStatus, setBackupStatus] = useState("Ready");

  return (
    <div className="page-stack">
      <section className="card">
        <div className="page-heading page-heading-compact">
          <div>
            <h1>Admin</h1>
            <p className="page-subtitle">Manage users, security, backups and audit logs.</p>
          </div>
          <div className="page-actions">
            <Button leftIcon={<UserPlus size={18} />} variant="primary">
              Add Staff User
            </Button>
          </div>
        </div>
      </section>

      <section className="card">
        <div className="card-header">
          <div>
            <h2 className="card-title">
              <Shield size={20} />
              Users
            </h2>
            <p className="card-subtitle">Manage staff access and roles.</p>
          </div>
        </div>

        {seededUsers.length === 0 ? (
          <div className="empty-state">
            <div className="empty-state-title">No users yet</div>
            <p className="empty-state-description">Add your first staff user to get started.</p>
            <Button leftIcon={<UserPlus size={18} />} variant="primary">
              Add Staff User
            </Button>
          </div>
        ) : (
          <div className="table-wrap">
            <table className="data-table">
              <thead>
                <tr>
                  <th scope="col">Name</th>
                  <th scope="col">Role</th>
                  <th scope="col">Status</th>
                </tr>
              </thead>
              <tbody>
                {seededUsers.map((user) => (
                  <tr key={user.name}>
                    <td className="font-medium">{user.name}</td>
                    <td>
                      <Badge variant={getRoleVariant(user.role)}>{user.role}</Badge>
                    </td>
                    <td>
                      <Badge variant={getStatusVariant(user.status)}>{user.status}</Badge>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>

      <section className="card">
        <div className="card-header">
          <div>
            <h2 className="card-title">
              <Shield size={20} />
              Security
            </h2>
            <p className="card-subtitle">Deployment and access guidance.</p>
          </div>
        </div>

        <div className="table-wrap">
          <table className="data-table">
            <thead>
              <tr>
                <th scope="col">Setting</th>
                <th scope="col">Value</th>
              </tr>
            </thead>
            <tbody>
              {securitySettings.map((setting) => (
                <tr key={setting.label}>
                  <td>{setting.label}</td>
                  <td className="font-medium">{setting.value}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>

      <section className="card">
        <div className="card-header">
          <div>
            <h2 className="card-title">
              <Database size={20} />
              Backups
            </h2>
            <p className="card-subtitle">Backup status and history.</p>
          </div>
        </div>

        <div className="module-actions" style={{ marginBottom: "var(--space-4)" }}>
          <Button onClick={() => setBackupStatus("Backup placeholder completed")} variant="primary">
            Run Backup Now
          </Button>
          <Badge variant="ready">Backup status: {backupStatus}</Badge>
        </div>

        <div className="table-wrap">
          <table className="data-table">
            <thead>
              <tr>
                <th scope="col">Backup</th>
                <th scope="col">Location / Time</th>
              </tr>
            </thead>
            <tbody>
              {backupEntries.map((entry) => (
                <tr key={entry.label}>
                  <td>{entry.label}</td>
                  <td className="font-medium">{entry.value}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>

      <section className="card">
        <div className="card-header">
          <div>
            <h2 className="card-title">
              <ClipboardList size={20} />
              Audit Logs
            </h2>
            <p className="card-subtitle">Recent system activity.</p>
          </div>
        </div>

        {seededAuditLogs.length === 0 ? (
          <div className="empty-state">
            <div className="empty-state-title">No audit logs yet</div>
            <p className="empty-state-description">System activity will appear here once records are created.</p>
          </div>
        ) : (
          <div className="table-wrap">
            <table className="data-table">
              <thead>
                <tr>
                  <th scope="col">Action</th>
                  <th scope="col">Entity</th>
                  <th scope="col">User</th>
                  <th scope="col">Client</th>
                  <th scope="col">Created at</th>
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
        )}
      </section>
    </div>
  );
}
