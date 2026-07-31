import { useEffect, useMemo, useState, type FormEvent } from "react";
import { ClipboardList, Database, KeyRound, Shield, UserPlus } from "lucide-react";

import {
  createAdminUser,
  createBackup,
  disableAdminUser,
  dryRunRestore,
  executeRestore,
  enableAdminUser,
  getScheduleStatus,
  getSecurityStatus,
  getStorageReconciliationReport,
  listAdminUsers,
  listAuditLogs,
  listBackups,
  listRestoreAttempts,
  repairStorageReconciliation,
  resetAdminUserPassword,
  type AdminAuditLog,
  type AdminBackupRun,
  type AdminUser,
  type RestoreActionResponse,
  type RestoreAttempt,
  type SecurityStatus,
  type StorageReconciliationReport,
  validateRestore,
} from "../data/admin-api";
import { Badge, Button, Input, Modal, Select, useToast } from "../components/ui";

const roleOptions = [
  { value: "staff", label: "Staff" },
  { value: "manager", label: "Manager" },
  { value: "admin", label: "Admin" },
];

function formatDateTime(value: string | null | undefined) {
  if (!value) {
    return "Never";
  }

  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    return value;
  }

  return date.toLocaleString("en-GB", {
    day: "2-digit",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

function getRoleVariant(role: string): Parameters<typeof Badge>[0]["variant"] {
  if (role === "admin") {
    return "approved";
  }
  if (role === "manager") {
    return "pending";
  }
  return "active";
}

function getStatusVariant(status: string): Parameters<typeof Badge>[0]["variant"] {
  return status === "active" ? "active" : "pending";
}

function getBackupVariant(status: string): Parameters<typeof Badge>[0]["variant"] {
  if (status === "success") {
    return "approved";
  }
  if (status === "partial") {
    return "pending";
  }
  return "draft";
}

function renderArtifactStatus(path: string | null | undefined, present: boolean | undefined, emptyLabel = "—") {
  if (!path) {
    return emptyLabel;
  }

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "4px" }}>
      <span>{path}</span>
      <span style={{ fontSize: "var(--font-size-small)", color: present ? "var(--color-success-700)" : "var(--color-danger-700)" }}>
        {present ? "Present" : "Missing"}
      </span>
    </div>
  );
}

function summarizeAuditDetails(details: Record<string, unknown>) {
  const entries = Object.entries(details ?? {})
    .filter(([, value]) => value !== null && value !== undefined && value !== "")
    .slice(0, 3)
    .map(([key, value]) => `${key}: ${String(value)}`);

  return entries.length > 0 ? entries.join(" | ") : "â€”";
}

function renderStorageIssueList(
  items: Array<{ relative_path: string; client_reference?: string | null; document_name?: string; original_filename?: string }>,
) {
  if (items.length === 0) {
    return <span className="font-medium">None</span>;
  }

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "6px" }}>
      {items.slice(0, 3).map((item) => (
        <span key={`${item.relative_path}-${item.client_reference ?? ""}`}>
          {item.client_reference ? `${item.client_reference}: ` : ""}
          {item.original_filename ?? item.document_name ?? item.relative_path}
        </span>
      ))}
    </div>
  );
}

export function AdminPage() {
  const { addToast } = useToast();
  const [users, setUsers] = useState<AdminUser[]>([]);
  const [auditLogs, setAuditLogs] = useState<AdminAuditLog[]>([]);
  const [backups, setBackups] = useState<AdminBackupRun[]>([]);
  const [securityStatus, setSecurityStatus] = useState<SecurityStatus | null>(null);
  const [storageReport, setStorageReport] = useState<StorageReconciliationReport | null>(null);
  const [scheduleStatus, setScheduleStatus] = useState<Record<string, unknown> | null>(null);
  const [restoreAttemptsByBackup, setRestoreAttemptsByBackup] = useState<Record<string, RestoreAttempt[]>>({});
  const [restoreApprovals, setRestoreApprovals] = useState<Record<string, { token: string; expiresAt: string }>>({});
  const [restoreModalBackup, setRestoreModalBackup] = useState<AdminBackupRun | null>(null);
  const [newUser, setNewUser] = useState({
    first_name: "",
    last_name: "",
    email: "",
    password: "Omega123",
    role: "staff" as "admin" | "manager" | "staff",
  });
  const [auditFilters, setAuditFilters] = useState({
    user_email: "",
    action: "",
    entity_type: "",
    client_reference: "",
    from_date: "",
    to_date: "",
  });
  const [busy, setBusy] = useState<string>("");

  function storeRestoreApproval(backupId: string, response: RestoreActionResponse) {
    if (!response.confirmation_token || !response.confirmation_expires_at) {
      return;
    }
    setRestoreApprovals((current) => ({
      ...current,
      [backupId]: {
        token: response.confirmation_token!,
        expiresAt: response.confirmation_expires_at!,
      },
    }));
  }

  async function loadAdminData() {
    const [nextUsers, nextAuditLogs, nextBackups, nextSecurityStatus, nextStorageReport, nextScheduleStatus] = await Promise.all([
      listAdminUsers(),
      listAuditLogs(),
      listBackups(),
      getSecurityStatus(),
      getStorageReconciliationReport(),
      getScheduleStatus(),
    ]);
    setUsers(nextUsers);
    setAuditLogs(nextAuditLogs);
    setBackups(nextBackups);
    setSecurityStatus(nextSecurityStatus);
    setStorageReport(nextStorageReport);
    setScheduleStatus(nextScheduleStatus);
  }

  useEffect(() => {
    void loadAdminData().catch(() => {
      addToast("Failed to load admin data", "error");
    });
  }, [addToast]);

  const auditActions = useMemo(
    () => Array.from(new Set(auditLogs.map((log) => log.action))).sort(),
    [auditLogs],
  );

  async function handleCreateUser(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setBusy("create-user");
    try {
      await createAdminUser(newUser);
      setNewUser({
        first_name: "",
        last_name: "",
        email: "",
        password: "Omega123",
        role: "staff",
      });
      await loadAdminData();
      addToast("User created", "success");
    } catch {
      addToast("Failed to create user", "error");
    } finally {
      setBusy("");
    }
  }

  async function handleToggleUserStatus(user: AdminUser) {
    setBusy(`status-${user.id}`);
    try {
      if (user.status === "active") {
        await disableAdminUser(user.id);
      } else {
        await enableAdminUser(user.id);
      }
      await loadAdminData();
      addToast("User updated", "success");
    } catch {
      addToast("Failed to update user status", "error");
    } finally {
      setBusy("");
    }
  }

  async function handleResetPassword(user: AdminUser) {
    setBusy(`reset-${user.id}`);
    try {
      await resetAdminUserPassword(user.id, "Omega123", true);
      await loadAdminData();
      addToast(`Password reset for ${user.email}`, "success");
    } catch {
      addToast("Failed to reset password", "error");
    } finally {
      setBusy("");
    }
  }

  async function handleRunBackup() {
    setBusy("backup");
    try {
      await createBackup();
      await loadAdminData();
      addToast("Backup run created", "success");
    } catch {
      addToast("Backup failed", "error");
    } finally {
      setBusy("");
    }
  }

  async function handlePreviewStorageCleanup() {
    setBusy("storage-preview");
    try {
      const result = await repairStorageReconciliation(false);
      setStorageReport(result.report);
      addToast("Storage cleanup preview refreshed", "success");
    } catch {
      addToast("Failed to preview storage cleanup", "error");
    } finally {
      setBusy("");
    }
  }

  async function handleExecuteStorageCleanup() {
    setBusy("storage-execute");
    try {
      const result = await repairStorageReconciliation(true);
      setStorageReport(result.report);
      addToast("Storage cleanup completed", "success");
    } catch {
      addToast("Failed to execute storage cleanup", "error");
    } finally {
      setBusy("");
    }
  }

  async function handleValidateRestore(backupId: string) {
    setBusy(`validate-${backupId}`);
    try {
      const result = await validateRestore(backupId);
      storeRestoreApproval(backupId, result);
      addToast("Restore validation completed", "success");
    } catch {
      addToast("Restore validation failed", "error");
    } finally {
      setBusy("");
    }
  }

  async function handleDryRunRestore(backupId: string) {
    setBusy(`dry-run-${backupId}`);
    try {
      const result = await dryRunRestore(backupId);
      storeRestoreApproval(backupId, result);
      const attempts = await listRestoreAttempts(backupId);
      setRestoreAttemptsByBackup((current) => ({ ...current, [backupId]: attempts }));
      addToast("Restore dry run completed", "success");
    } catch {
      addToast("Restore dry run failed", "error");
    } finally {
      setBusy("");
    }
  }

  async function handleExecuteRestore() {
    if (!restoreModalBackup) {
      return;
    }
    const approval = restoreApprovals[restoreModalBackup.id];
    if (!approval?.token) {
      addToast("Run restore validation or dry run first", "error");
      return;
    }

    setBusy(`execute-${restoreModalBackup.id}`);
    try {
      await executeRestore(restoreModalBackup.id, approval.token);
      const attempts = await listRestoreAttempts(restoreModalBackup.id);
      setRestoreAttemptsByBackup((current) => ({ ...current, [restoreModalBackup.id]: attempts }));
      setRestoreApprovals((current) => {
        const next = { ...current };
        delete next[restoreModalBackup.id];
        return next;
      });
      setRestoreModalBackup(null);
      addToast("Restore executed", "success");
    } catch {
      addToast("Restore execute failed", "error");
    } finally {
      setBusy("");
    }
  }

  async function handleApplyAuditFilters(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setBusy("audit");
    try {
      const nextAuditLogs = await listAuditLogs(
        Object.fromEntries(Object.entries(auditFilters).filter(([, value]) => value.trim())) as typeof auditFilters,
      );
      setAuditLogs(nextAuditLogs);
    } catch {
      addToast("Failed to filter audit logs", "error");
    } finally {
      setBusy("");
    }
  }

  return (
    <div className="page-stack">
      <section className="card">
        <div className="page-heading page-heading-compact">
          <div>
            <h1>Admin</h1>
            <p className="page-subtitle">Manage users, security, backups and audit logs.</p>
          </div>
          <div className="page-actions">
            <Button isLoading={busy === "backup"} leftIcon={<Database size={18} />} onClick={() => void handleRunBackup()} variant="primary">
              Run Backup Now
            </Button>
          </div>
        </div>
      </section>

      <section className="card">
        <div className="card-header">
          <div>
            <h2 className="card-title">
              <UserPlus size={20} />
              Users
            </h2>
            <p className="card-subtitle">Live database users and password reset actions.</p>
          </div>
        </div>

        <form className="form-grid" onSubmit={handleCreateUser} style={{ marginBottom: "var(--space-5)" }}>
          <Input id="user-first-name" label="First name" onChange={(event) => setNewUser((current) => ({ ...current, first_name: event.target.value }))} value={newUser.first_name} />
          <Input id="user-last-name" label="Last name" onChange={(event) => setNewUser((current) => ({ ...current, last_name: event.target.value }))} value={newUser.last_name} />
          <Input id="user-email" label="Email" onChange={(event) => setNewUser((current) => ({ ...current, email: event.target.value }))} value={newUser.email} />
          <Input id="user-password" label="Temporary password" onChange={(event) => setNewUser((current) => ({ ...current, password: event.target.value }))} value={newUser.password} />
          <Select id="user-role" label="Role" onChange={(event) => setNewUser((current) => ({ ...current, role: event.target.value as "admin" | "manager" | "staff" }))} options={roleOptions} value={newUser.role} />
          <div style={{ display: "flex", alignItems: "end" }}>
            <Button isLoading={busy === "create-user"} leftIcon={<UserPlus size={18} />} type="submit" variant="primary">
              Add User
            </Button>
          </div>
        </form>

        <div className="table-wrap-flush">
          <table className="data-table">
            <thead>
              <tr>
                <th>Name</th>
                <th>Email</th>
                <th>Role</th>
                <th>Status</th>
                <th>Last login</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {users.map((user) => (
                <tr key={user.id}>
                  <td>{user.first_name} {user.last_name}</td>
                  <td>{user.email}</td>
                  <td><Badge variant={getRoleVariant(user.role)}>{user.role}</Badge></td>
                  <td>
                    <div style={{ display: "flex", gap: "8px", alignItems: "center" }}>
                      <Badge variant={getStatusVariant(user.status)}>{user.status}</Badge>
                      {user.force_password_change ? <Badge variant="pending">Password reset pending</Badge> : null}
                    </div>
                  </td>
                  <td>{formatDateTime(user.last_login_at)}</td>
                  <td>
                    <div style={{ display: "flex", gap: "8px", flexWrap: "wrap" }}>
                      <Button className="btn-sm" isLoading={busy === `reset-${user.id}`} leftIcon={<KeyRound size={14} />} onClick={() => void handleResetPassword(user)} variant="secondary">
                        Reset Password
                      </Button>
                      <Button className="btn-sm" isLoading={busy === `status-${user.id}`} onClick={() => void handleToggleUserStatus(user)} variant={user.status === "active" ? "danger" : "secondary"}>
                        {user.status === "active" ? "Disable" : "Enable"}
                      </Button>
                    </div>
                  </td>
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
              <Shield size={20} />
              Security
            </h2>
            <p className="card-subtitle">Live auth and storage status.</p>
          </div>
        </div>
        <div className="table-wrap-flush">
          <table className="data-table">
            <tbody>
              <tr><td>Environment</td><td className="font-medium">{securityStatus?.environment ?? "—"}</td></tr>
              <tr><td>App URL</td><td className="font-medium">{securityStatus?.app_url ?? "—"}</td></tr>
              <tr><td>Remote access mode</td><td className="font-medium">{securityStatus?.remote_access_mode ?? "—"}</td></tr>
              <tr><td>Password hashing</td><td className="font-medium">{securityStatus?.password_hashing ?? "—"}</td></tr>
              <tr><td>Session timeout</td><td className="font-medium">{securityStatus ? `${securityStatus.session_timeout_minutes} minutes` : "—"}</td></tr>
              <tr><td>Active sessions</td><td className="font-medium">{securityStatus?.active_session_count ?? "—"}</td></tr>
              <tr><td>Users</td><td className="font-medium">{securityStatus?.user_count ?? "—"}</td></tr>
              <tr><td>Disabled users</td><td className="font-medium">{securityStatus?.disabled_user_count ?? "—"}</td></tr>
              <tr><td>Force password change</td><td className="font-medium">{securityStatus?.force_password_change_count ?? "—"}</td></tr>
              <tr><td>Cookie secure</td><td className="font-medium">{String(securityStatus?.cookie_secure ?? false)}</td></tr>
              <tr><td>Scheduler status</td><td className="font-medium">{String(scheduleStatus?.running ?? false)}</td></tr>
            </tbody>
          </table>
        </div>
      </section>

      <section className="card">
        <div className="card-header">
          <div>
            <h2 className="card-title">
              <Database size={20} />
              Storage Reconciliation
            </h2>
            <p className="card-subtitle">Compare database records with local client storage and run safe cleanup.</p>
          </div>
          <div style={{ display: "flex", gap: "8px", flexWrap: "wrap" }}>
            <Button isLoading={busy === "storage-preview"} onClick={() => void handlePreviewStorageCleanup()} variant="secondary">
              Preview Cleanup
            </Button>
            <Button isLoading={busy === "storage-execute"} onClick={() => void handleExecuteStorageCleanup()} variant="danger">
              Execute Cleanup
            </Button>
          </div>
        </div>
        <div className="table-wrap-flush">
          <table className="data-table">
            <tbody>
              <tr><td>Storage root</td><td className="font-medium">{storageReport?.storage_root ?? "â€”"}</td></tr>
              <tr><td>Last scan</td><td className="font-medium">{formatDateTime(storageReport?.generated_at)}</td></tr>
              <tr><td>Missing file records</td><td>{storageReport?.summary.missing_file_record_count ?? 0}</td></tr>
              <tr><td>Invalid file records</td><td>{storageReport?.summary.invalid_file_record_count ?? 0}</td></tr>
              <tr><td>Missing document artifacts</td><td>{storageReport?.summary.missing_document_artifact_count ?? 0}</td></tr>
              <tr><td>Invalid document artifacts</td><td>{storageReport?.summary.invalid_document_artifact_count ?? 0}</td></tr>
              <tr><td>Orphaned disk files</td><td>{storageReport?.summary.orphaned_disk_file_count ?? 0}</td></tr>
              <tr><td>Missing file examples</td><td>{renderStorageIssueList(storageReport?.items.missing_file_records ?? [])}</td></tr>
              <tr><td>Missing document examples</td><td>{renderStorageIssueList(storageReport?.items.missing_document_artifacts ?? [])}</td></tr>
              <tr><td>Orphaned file examples</td><td>{renderStorageIssueList(storageReport?.items.orphaned_disk_files ?? [])}</td></tr>
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
            <p className="card-subtitle">Live backup runs and restore checks.</p>
          </div>
        </div>
        <div className="table-wrap-flush">
          <table className="data-table">
            <thead>
              <tr>
                <th>Created</th>
                <th>Status</th>
                <th>Database</th>
                <th>Files</th>
                <th>Documents</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {backups.map((backup) => (
                <tr key={backup.id}>
                  <td>{formatDateTime(backup.created_at)}</td>
                  <td><Badge variant={getBackupVariant(backup.status)}>{backup.status}</Badge></td>
                  <td>{renderArtifactStatus(backup.database_backup, backup.database_backup_present)}</td>
                  <td>{renderArtifactStatus(backup.files_backup, backup.files_backup_present)}</td>
                  <td>{renderArtifactStatus(backup.documents_backup, backup.documents_backup_present)}</td>
                  <td>
                    <div style={{ display: "flex", gap: "8px", flexWrap: "wrap" }}>
                      <Button className="btn-sm" isLoading={busy === `validate-${backup.id}`} onClick={() => void handleValidateRestore(backup.id)} variant="secondary">
                        Validate
                      </Button>
                      <Button className="btn-sm" isLoading={busy === `dry-run-${backup.id}`} onClick={() => void handleDryRunRestore(backup.id)} variant="secondary">
                        Dry Run Restore
                      </Button>
                      <Button
                        className="btn-sm"
                        isLoading={busy === `execute-${backup.id}`}
                        onClick={() => setRestoreModalBackup(backup)}
                        variant="danger"
                      >
                        Execute Restore
                      </Button>
                    </div>
                    {restoreApprovals[backup.id] ? (
                      <div style={{ marginTop: "8px", fontSize: "var(--font-size-small)", color: "var(--color-success-700)" }}>
                        Restore approved until {formatDateTime(restoreApprovals[backup.id]?.expiresAt)}
                      </div>
                    ) : null}
                    {(restoreAttemptsByBackup[backup.id] ?? []).length > 0 ? (
                      <div style={{ marginTop: "8px", fontSize: "var(--font-size-small)", color: "var(--color-text-muted)" }}>
                        Last restore attempt: {restoreAttemptsByBackup[backup.id][0]?.status} on {formatDateTime(restoreAttemptsByBackup[backup.id][0]?.created_at)}
                      </div>
                    ) : null}
                    <div style={{ marginTop: "8px", fontSize: "var(--font-size-small)", color: "var(--color-text-muted)" }}>
                      Manifest: {renderArtifactStatus(backup.manifest_path, backup.manifest_present, "Not recorded")}
                    </div>
                    {backup.error_message ? (
                      <div style={{ marginTop: "8px", fontSize: "var(--font-size-small)", color: "var(--color-danger-700)" }}>
                        {backup.error_message}
                      </div>
                    ) : null}
                  </td>
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
            <p className="card-subtitle">Persisted system activity with live filters.</p>
          </div>
        </div>

        <form className="form-grid" onSubmit={handleApplyAuditFilters} style={{ marginBottom: "var(--space-5)" }}>
          <Input id="audit-user-email" label="User email" onChange={(event) => setAuditFilters((current) => ({ ...current, user_email: event.target.value }))} value={auditFilters.user_email} />
          <Select
            id="audit-action"
            label="Action"
            onChange={(event) => setAuditFilters((current) => ({ ...current, action: event.target.value }))}
            options={[{ value: "", label: "All actions" }, ...auditActions.map((action) => ({ value: action, label: action }))]}
            value={auditFilters.action}
          />
          <Input id="audit-entity-type" label="Entity type" onChange={(event) => setAuditFilters((current) => ({ ...current, entity_type: event.target.value }))} value={auditFilters.entity_type} />
          <Input id="audit-client-reference" label="Client reference" onChange={(event) => setAuditFilters((current) => ({ ...current, client_reference: event.target.value }))} value={auditFilters.client_reference} />
          <Input id="audit-from-date" label="From date" onChange={(event) => setAuditFilters((current) => ({ ...current, from_date: event.target.value }))} type="date" value={auditFilters.from_date} />
          <Input id="audit-to-date" label="To date" onChange={(event) => setAuditFilters((current) => ({ ...current, to_date: event.target.value }))} type="date" value={auditFilters.to_date} />
          <div style={{ display: "flex", alignItems: "end" }}>
            <Button isLoading={busy === "audit"} type="submit" variant="secondary">
              Apply Filters
            </Button>
          </div>
        </form>

        <div className="table-wrap-flush">
          <table className="data-table">
            <thead>
              <tr>
                <th>Created</th>
                <th>Action</th>
                <th>User</th>
                <th>Entity</th>
                <th>Reference</th>
                <th>Details</th>
              </tr>
            </thead>
            <tbody>
              {auditLogs.map((log) => (
                <tr key={log.id}>
                  <td>{formatDateTime(log.created_at)}</td>
                  <td>{log.action}</td>
                  <td>{log.user_email ?? "—"}</td>
                  <td>{log.client_reference ? `${log.entity_type} (${log.client_reference})` : log.entity_type}</td>
                  <td>{log.client_name ?? log.entity_id}</td>
                  <td>{summarizeAuditDetails(log.details)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>

      <Modal
        isOpen={Boolean(restoreModalBackup)}
        onClose={() => setRestoreModalBackup(null)}
        title="Execute Restore"
        footer={(
          <>
            <Button onClick={() => setRestoreModalBackup(null)} variant="secondary">
              Cancel
            </Button>
            <Button
              isLoading={restoreModalBackup ? busy === `execute-${restoreModalBackup.id}` : false}
              onClick={() => { void handleExecuteRestore(); }}
              variant="danger"
            >
              Confirm Restore
            </Button>
          </>
        )}
      >
        <p>This will run a destructive database restore. Validate or dry run the backup first to issue a short-lived approval token.</p>
        {restoreModalBackup ? (
          <p style={{ marginTop: "12px", color: "var(--color-text-muted)" }}>
            Selected backup: {formatDateTime(restoreModalBackup.created_at)}
          </p>
        ) : null}
      </Modal>
    </div>
  );
}
