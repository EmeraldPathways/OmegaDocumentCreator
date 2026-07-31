export type AdminUser = {
  id: string;
  first_name: string;
  last_name: string;
  email: string;
  role: "admin" | "staff";
  status: "active" | "disabled";
  force_password_change?: boolean;
  last_login_at?: string | null;
};

export type AdminAuditLog = {
  id: string;
  user_id: string | null;
  user_email?: string | null;
  client_id: string | null;
  action: string;
  entity_type: string;
  entity_id: string;
  details: Record<string, unknown>;
  ip_address: string | null;
  created_at: string | null;
};

export type AdminBackupRun = {
  id: string;
  status: string;
  triggered_by: string | null;
  manifest_path?: string | null;
  manifest_present?: boolean;
  database_backup: string | null;
  database_backup_present?: boolean;
  files_backup: string | null;
  files_backup_present?: boolean;
  documents_backup: string | null;
  documents_backup_present?: boolean;
  error_message: string | null;
  created_at: string | null;
};

export type RestoreAttempt = {
  id: string;
  backup_run_id: string;
  status: string;
  mode: string;
  started_by: string | null;
  dump_file: string | null;
  error_message: string | null;
  created_at: string | null;
};

export type SecurityStatus = {
  app_url: string;
  environment: string;
  remote_access_mode: string;
  session_timeout_minutes: number;
  cookie_secure: boolean;
  cookie_samesite: string;
  password_hashing: string;
  user_count: number;
  disabled_user_count: number;
  force_password_change_count: number;
  active_session_count: number | null;
  file_storage_path: string;
  backup_path: string;
};

export type AdminSettings = {
  admin_email: string;
  app_url: string;
  backup_path: string;
  file_storage_path: string;
  remote_access_mode: string;
  session_timeout_minutes: number;
  ai_enabled: boolean;
  ai_model: string;
  ai_api_key: string;
};

async function parseJson<T>(response: Response): Promise<T> {
  if (!response.ok) {
    throw new Error(`Request failed: ${response.status}`);
  }
  return (await response.json()) as T;
}

export async function listAdminUsers(): Promise<AdminUser[]> {
  const response = await fetch("/admin/users", { credentials: "same-origin" });
  const payload = await parseJson<{ items: AdminUser[] }>(response);
  return payload.items ?? [];
}

export async function createAdminUser(payload: {
  first_name: string;
  last_name: string;
  email: string;
  password: string;
  role: "admin" | "staff";
}): Promise<AdminUser> {
  const response = await fetch("/admin/users", {
    method: "POST",
    credentials: "same-origin",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });
  return (await parseJson<{ item: AdminUser }>(response)).item;
}

export async function updateAdminUser(
  userId: string,
  payload: {
    first_name: string;
    last_name: string;
    role: "admin" | "staff";
    status?: "active" | "disabled";
    force_password_change?: boolean;
  },
): Promise<AdminUser> {
  const response = await fetch(`/admin/users/${encodeURIComponent(userId)}`, {
    method: "PATCH",
    credentials: "same-origin",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });
  return (await parseJson<{ item: AdminUser }>(response)).item;
}

export async function resetAdminUserPassword(
  userId: string,
  password: string,
  forcePasswordChange = true,
): Promise<AdminUser> {
  const response = await fetch(`/admin/users/${encodeURIComponent(userId)}/reset-password`, {
    method: "POST",
    credentials: "same-origin",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ password, force_password_change: forcePasswordChange }),
  });
  return (await parseJson<{ item: AdminUser }>(response)).item;
}

export async function disableAdminUser(userId: string): Promise<AdminUser> {
  const response = await fetch(`/admin/users/${encodeURIComponent(userId)}/disable`, {
    method: "PATCH",
    credentials: "same-origin",
  });
  return (await parseJson<{ item: AdminUser }>(response)).item;
}

export async function enableAdminUser(userId: string): Promise<AdminUser> {
  const response = await fetch(`/admin/users/${encodeURIComponent(userId)}/enable`, {
    method: "PATCH",
    credentials: "same-origin",
  });
  return (await parseJson<{ item: AdminUser }>(response)).item;
}

export async function listAuditLogs(filters?: {
  user_email?: string;
  action?: string;
  entity_type?: string;
  from_date?: string;
  to_date?: string;
}): Promise<AdminAuditLog[]> {
  const params = new URLSearchParams();
  if (filters?.user_email) params.set("user_email", filters.user_email);
  if (filters?.action) params.set("action", filters.action);
  if (filters?.entity_type) params.set("entity_type", filters.entity_type);
  if (filters?.from_date) params.set("from_date", filters.from_date);
  if (filters?.to_date) params.set("to_date", filters.to_date);
  const query = params.toString();
  const response = await fetch(`/admin/audit-logs${query ? `?${query}` : ""}`, { credentials: "same-origin" });
  return (await parseJson<{ items: AdminAuditLog[] }>(response)).items ?? [];
}

export async function listBackups(): Promise<AdminBackupRun[]> {
  const response = await fetch("/admin/backups", { credentials: "same-origin" });
  return (await parseJson<{ items: AdminBackupRun[] }>(response)).items ?? [];
}

export async function createBackup(): Promise<AdminBackupRun> {
  const response = await fetch("/admin/backups", { method: "POST", credentials: "same-origin" });
  return (await parseJson<{ item: AdminBackupRun }>(response)).item;
}

export async function validateRestore(backupId: string): Promise<Record<string, unknown>> {
  const response = await fetch(`/admin/backups/${encodeURIComponent(backupId)}/validate-restore`, {
    method: "POST",
    credentials: "same-origin",
  });
  return parseJson<Record<string, unknown>>(response);
}

export async function dryRunRestore(backupId: string): Promise<Record<string, unknown>> {
  const response = await fetch(`/admin/backups/${encodeURIComponent(backupId)}/dry-run-restore`, {
    method: "POST",
    credentials: "same-origin",
  });
  return parseJson<Record<string, unknown>>(response);
}

export async function listRestoreAttempts(backupId: string): Promise<RestoreAttempt[]> {
  const response = await fetch(`/admin/backups/${encodeURIComponent(backupId)}/restore-attempts`, {
    credentials: "same-origin",
  });
  return (await parseJson<{ items: RestoreAttempt[] }>(response)).items ?? [];
}

export async function getScheduleStatus(): Promise<Record<string, unknown>> {
  const response = await fetch("/admin/backups/schedule-status", { credentials: "same-origin" });
  return parseJson<Record<string, unknown>>(response);
}

export async function getSecurityStatus(): Promise<SecurityStatus> {
  const response = await fetch("/admin/security", { credentials: "same-origin" });
  return parseJson<SecurityStatus>(response);
}

export async function getAdminSettings(): Promise<AdminSettings> {
  const response = await fetch("/admin/settings", { credentials: "same-origin" });
  return parseJson<AdminSettings>(response);
}

export async function saveAdminSettings(payload: AdminSettings): Promise<AdminSettings> {
  const response = await fetch("/admin/settings", {
    method: "PUT",
    credentials: "same-origin",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });
  return parseJson<AdminSettings>(response);
}

export async function testAdminSettingsPath(path: string): Promise<{ passed: boolean; message: string }> {
  const response = await fetch("/admin/settings/test-path", {
    method: "POST",
    credentials: "same-origin",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ path }),
  });
  return parseJson<{ passed: boolean; message: string }>(response);
}

export async function listAssignableUsers(): Promise<AdminUser[]> {
  const response = await fetch("/users/assignable", { credentials: "same-origin" });
  return (await parseJson<{ items: AdminUser[] }>(response)).items ?? [];
}
