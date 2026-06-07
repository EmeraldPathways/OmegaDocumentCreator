import { useState } from "react";

type AppSettings = {
  adminEmail: string;
  appUrl: string;
  backupPath: string;
  fileStoragePath: string;
  remoteAccessMode: string;
  sessionTimeoutMinutes: string;
};

const STORAGE_KEY = "omega-app-settings";
const defaultSettings: AppSettings = {
  adminEmail: "admin@omega.local",
  appUrl: "http://office-server.local",
  backupPath: "D:\\Omega\\backups",
  fileStoragePath: "D:\\Omega\\clients",
  remoteAccessMode: "local_only",
  sessionTimeoutMinutes: "30",
};

function readStoredSettings() {
  if (typeof window === "undefined") {
    return defaultSettings;
  }

  const storedValue = window.localStorage.getItem(STORAGE_KEY);
  if (!storedValue) {
    return defaultSettings;
  }

  try {
    return { ...defaultSettings, ...(JSON.parse(storedValue) as Partial<AppSettings>) };
  } catch {
    return defaultSettings;
  }
}

export function SettingsPage() {
  const [settings, setSettings] = useState<AppSettings>(() => readStoredSettings());
  const [saveStatus, setSaveStatus] = useState("Not saved yet");

  function updateField(field: keyof AppSettings, value: string) {
    setSettings((currentSettings) => ({
      ...currentSettings,
      [field]: value,
    }));
  }

  function saveSettings() {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(settings));
    setSaveStatus("Saved just now");
  }

  return (
    <div className="page-stack">
      <section className="panel">
        <div className="page-heading">
          <div>
            <p className="eyebrow">Application settings</p>
            <h1>Settings</h1>
          </div>
          <div className="module-actions">
            <button className="primary-action" onClick={saveSettings} type="button">
              Save Settings
            </button>
            <span className="draft-status">Save status: {saveStatus}</span>
          </div>
        </div>

        <section className="fact-find-section">
          <div className="fact-find-section-header">
            <p className="eyebrow">Office configuration</p>
            <h2>Core App Settings</h2>
          </div>
          <form className="client-form-grid">
            <label>
              Admin email
              <input onChange={(event) => updateField("adminEmail", event.target.value)} type="email" value={settings.adminEmail} />
            </label>
            <label>
              App URL
              <input onChange={(event) => updateField("appUrl", event.target.value)} type="text" value={settings.appUrl} />
            </label>
            <label>
              File storage path
              <input onChange={(event) => updateField("fileStoragePath", event.target.value)} type="text" value={settings.fileStoragePath} />
            </label>
            <label>
              Backup path
              <input onChange={(event) => updateField("backupPath", event.target.value)} type="text" value={settings.backupPath} />
            </label>
            <label>
              Remote access mode
              <input onChange={(event) => updateField("remoteAccessMode", event.target.value)} type="text" value={settings.remoteAccessMode} />
            </label>
            <label>
              Session timeout minutes
              <input
                onChange={(event) => updateField("sessionTimeoutMinutes", event.target.value)}
                type="text"
                value={settings.sessionTimeoutMinutes}
              />
            </label>
          </form>
        </section>

        <section className="fact-find-section">
          <div className="fact-find-section-header">
            <p className="eyebrow">Future local AI</p>
            <h2>AI Readiness</h2>
          </div>
          <ul className="card-list">
            <li className="mini-card">
              <span className="status-label">Version 1 AI status</span>
              <strong>Disabled</strong>
              <span>No AI assistance is enabled in the current production scope.</span>
            </li>
            <li className="mini-card">
              <span className="status-label">Future local model runner</span>
              <strong>Ollama-ready</strong>
              <span>Reserved for local-only model execution on the office server in a later stage.</span>
            </li>
          </ul>
        </section>
      </section>
    </div>
  );
}
