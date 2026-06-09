import { useState } from "react";
import { Save, Cpu } from "lucide-react";

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

  const isSaved = saveStatus === "Saved just now";

  return (
    <div className="page-stack">
      <section className="panel">
        <div className="page-heading page-heading-compact">
          <h1>Settings</h1>
          <div className="action-toolbar">
            <button className="primary-action icon-btn" onClick={saveSettings} type="button">
              <Save size={18} />
              Save Settings
            </button>
            <span className="compact-badge">
              <span className={`status-dot ${isSaved ? "status-dot-green" : "status-dot-grey"}`} />
              {saveStatus}
            </span>
          </div>
        </div>

        <div className="page-stack">
          <section className="settings-card">
            <div className="fact-find-section-header">
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

          <section className="settings-card">
            <div className="fact-find-section-header">
              <h2>AI Readiness</h2>
            </div>
            <div className="status-row">
              <Cpu size={18} color="var(--omega-grey)" />
              <span>Version 1 AI status</span>
              <strong>Disabled</strong>
            </div>
            <div className="status-row">
              <Cpu size={18} color="var(--omega-grey)" />
              <span>Future local model runner</span>
              <strong>Ollama-ready</strong>
            </div>
          </section>
        </div>
      </section>
    </div>
  );
}
