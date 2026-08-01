import { useEffect, useMemo, useState } from "react";
import { Save, Cpu, Check, X, RefreshCw } from "lucide-react";

import { getAdminSettings, saveAdminSettings, testAdminSettingsPath } from "../data/admin-api";
import { Badge, Button, Input, Select, Toggle, useToast } from "../components/ui";

type AppSettings = {
  adminEmail: string;
  appUrl: string;
  backupPath: string;
  fileStoragePath: string;
  remoteAccessMode: string;
  sessionTimeoutMinutes: string;
};

type AiSettings = {
  enabled: boolean;
  model: string;
  apiKey: string;
  apiKeyConfigured: boolean;
  clearApiKey: boolean;
};

type PathTestResult = { status: "idle" | "loading" | "success" | "error"; message: string };

const defaultSettings: AppSettings = {
  adminEmail: "",
  appUrl: "http://127.0.0.1:3007",
  backupPath: "D:\\Omega\\backups",
  fileStoragePath: "D:\\Omega\\clients",
  remoteAccessMode: "local_only",
  sessionTimeoutMinutes: "30",
};

const defaultAiSettings: AiSettings = {
  enabled: false,
  model: "gemini-2.0-flash",
  apiKey: "",
  apiKeyConfigured: false,
  clearApiKey: false,
};

const remoteAccessOptions = [
  { value: "local_only", label: "Local only" },
  { value: "lan", label: "LAN" },
  { value: "remote", label: "Remote" },
];

const modelOptions = [
  { value: "gemini-2.0-flash", label: "Gemini 2.0 Flash" },
];

function validateSettings(settings: AppSettings) {
  const errors: Record<string, string> = {};

  if (!settings.adminEmail.trim()) {
    errors.adminEmail = "Admin email is required";
  } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(settings.adminEmail.trim())) {
    errors.adminEmail = "Enter a valid email address";
  }

  if (!settings.appUrl.trim()) {
    errors.appUrl = "App URL is required";
  } else {
    try {
      new URL(settings.appUrl);
    } catch {
      errors.appUrl = "Enter a valid URL";
    }
  }

  const timeout = Number.parseInt(settings.sessionTimeoutMinutes, 10);
  if (Number.isNaN(timeout) || timeout < 5 || timeout > 120) {
    errors.sessionTimeoutMinutes = "Session timeout must be between 5 and 120 minutes";
  }

  return errors;
}

export function SettingsPage() {
  const { addToast } = useToast();
  const [settings, setSettings] = useState<AppSettings>(defaultSettings);
  const [aiSettings, setAiSettings] = useState<AiSettings>(defaultAiSettings);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [saveStatus, setSaveStatus] = useState<"idle" | "saving" | "saved" | "error">("idle");
  const [isLoading, setIsLoading] = useState(true);
  const [pathTests, setPathTests] = useState<{
    fileStoragePath: PathTestResult;
    backupPath: PathTestResult;
  }>({
    fileStoragePath: { status: "idle", message: "" },
    backupPath: { status: "idle", message: "" },
  });

  const isSaved = saveStatus === "saved";

  useEffect(() => {
    void getAdminSettings()
      .then((payload) => {
        setSettings({
          adminEmail: payload.admin_email ?? "",
          appUrl: payload.app_url ?? defaultSettings.appUrl,
          backupPath: payload.backup_path ?? defaultSettings.backupPath,
          fileStoragePath: payload.file_storage_path ?? defaultSettings.fileStoragePath,
          remoteAccessMode: payload.remote_access_mode ?? defaultSettings.remoteAccessMode,
          sessionTimeoutMinutes: String(payload.session_timeout_minutes ?? defaultSettings.sessionTimeoutMinutes),
        });
        setAiSettings({
          enabled: payload.ai_enabled ?? false,
          model: payload.ai_model ?? defaultAiSettings.model,
          apiKey: "",
          apiKeyConfigured: payload.ai_api_key_configured ?? false,
          clearApiKey: false,
        });
      })
      .catch(() => {
        addToast("Failed to load settings", "error");
      })
      .finally(() => setIsLoading(false));
  }, [addToast]);

  function updateField(field: keyof AppSettings, value: string) {
    setSettings((currentSettings) => ({
      ...currentSettings,
      [field]: value,
    }));
    setErrors((current) => {
      const next = { ...current };
      delete next[field];
      return next;
    });
    setSaveStatus("idle");
  }

  function updateAiField(field: keyof AiSettings, value: string | boolean) {
    setAiSettings((current) => ({
      ...current,
      [field]: value,
    }));
    setSaveStatus("idle");
  }

  async function testPath(field: "fileStoragePath" | "backupPath") {
    setPathTests((current) => ({
      ...current,
      [field]: { status: "loading", message: "" },
    }));
    const path = settings[field];
    const result = await testAdminSettingsPath(path);

    setPathTests((current) => ({
      ...current,
      [field]: {
        status: result.passed ? "success" : "error",
        message: result.message,
      },
    }));

    addToast(result.passed ? "Path test passed" : "Path test failed", result.passed ? "success" : "error");
  }

  async function saveSettings() {
    const validationErrors = validateSettings(settings);
    setErrors(validationErrors);

    if (Object.keys(validationErrors).length > 0) {
      setSaveStatus("error");
      addToast("Please fix the validation errors", "error");
      return;
    }

    setSaveStatus("saving");

    try {
      await saveAdminSettings({
        admin_email: settings.adminEmail,
        app_url: settings.appUrl,
        backup_path: settings.backupPath,
        file_storage_path: settings.fileStoragePath,
        remote_access_mode: settings.remoteAccessMode,
        session_timeout_minutes: Number.parseInt(settings.sessionTimeoutMinutes, 10),
        ai_enabled: aiSettings.enabled,
        ai_model: aiSettings.model,
        ai_api_key: aiSettings.apiKey || undefined,
        clear_ai_api_key: aiSettings.clearApiKey,
      });
      setAiSettings((current) => ({
        ...current,
        apiKey: "",
        apiKeyConfigured: current.clearApiKey ? false : current.apiKeyConfigured || current.apiKey.trim().length > 0,
        clearApiKey: false,
      }));
      setSaveStatus("saved");
      addToast("Settings saved. Restart the backend to apply changes.", "success");
    } catch {
      setSaveStatus("error");
      addToast("Failed to save settings", "error");
    }
  }

  const aiStatus = aiSettings.enabled ? "Enabled" : "Disabled";

  return (
    <div className="page-stack">
      <div className="page-heading page-heading-compact">
        <div>
          <h1>Settings</h1>
          <p className="page-subtitle">Configure the Omega Document Creator application. Saved changes apply after a backend restart.</p>
        </div>
      </div>

      {isLoading ? (
        <section className="section-divided">
          <p className="text-muted">Loading settings…</p>
        </section>
      ) : null}

      <section className="section-divided">
        <h2 className="section-title">Core App Settings</h2>
        <div className="form-grid">
            <Input
              error={errors.adminEmail}
              id="adminEmail"
              label="Admin email"
              onChange={(event) => updateField("adminEmail", event.target.value)}
              type="email"
              value={settings.adminEmail}
            />
            <Input
              error={errors.appUrl}
              id="appUrl"
              label="App URL"
              onChange={(event) => updateField("appUrl", event.target.value)}
              type="url"
              value={settings.appUrl}
            />
            <div className="form-grid-full">
              <div className="field">
                <label className="field-label" htmlFor="fileStoragePath">
                  File storage path
                </label>
                <div className="field-input-wrap">
                  <input
                    className="field-input"
                    id="fileStoragePath"
                    onChange={(event) => updateField("fileStoragePath", event.target.value)}
                    type="text"
                    value={settings.fileStoragePath}
                  />
                  <Button
                    className="field-suffix field-suffix-action"
                    onClick={() => testPath("fileStoragePath")}
                    variant="secondary"
                  >
                    Test Path
                  </Button>
                </div>
                {errors.fileStoragePath ? <span className="field-error">{errors.fileStoragePath}</span> : null}
                {pathTests.fileStoragePath.status !== "idle" ? (
                  <span className={`field-status ${pathTests.fileStoragePath.status === "success" ? "text-success" : "text-danger"}`}>
                    {pathTests.fileStoragePath.status === "success" ? <Check size={14} /> : <X size={14} />}
                    {pathTests.fileStoragePath.message}
                  </span>
                ) : null}
              </div>
            </div>
            <div className="form-grid-full">
              <div className="field">
                <label className="field-label" htmlFor="backupPath">
                  Backup path
                </label>
                <div className="field-input-wrap">
                  <input
                    className="field-input"
                    id="backupPath"
                    onChange={(event) => updateField("backupPath", event.target.value)}
                    type="text"
                    value={settings.backupPath}
                  />
                  <Button
                    className="field-suffix field-suffix-action"
                    onClick={() => testPath("backupPath")}
                    variant="secondary"
                  >
                    Test Path
                  </Button>
                </div>
                {errors.backupPath ? <span className="field-error">{errors.backupPath}</span> : null}
                {pathTests.backupPath.status !== "idle" ? (
                  <span className={`field-status ${pathTests.backupPath.status === "success" ? "text-success" : "text-danger"}`}>
                    {pathTests.backupPath.status === "success" ? <Check size={14} /> : <X size={14} />}
                    {pathTests.backupPath.message}
                  </span>
                ) : null}
              </div>
            </div>
            <Select
              id="remoteAccessMode"
              label="Remote access mode"
              onChange={(event) => updateField("remoteAccessMode", event.target.value)}
              options={remoteAccessOptions}
              value={settings.remoteAccessMode}
            />
            <Input
              error={errors.sessionTimeoutMinutes}
              hint="Between 5 and 120 minutes"
              id="sessionTimeoutMinutes"
              label="Session timeout"
              max={120}
              min={5}
              onChange={(event) => updateField("sessionTimeoutMinutes", event.target.value)}
              suffix={<span className="text-muted">minutes</span>}
              type="number"
              value={settings.sessionTimeoutMinutes}
            />
          </div>
      </section>

      <section className="section-divided">
        <h2 className="section-title">AI Readiness</h2>
        <p className="text-muted" style={{ marginBottom: "var(--space-3)" }}>
          Only Gemini is currently supported by the backend. API keys are stored server-side and are not returned to the browser.
        </p>
        <div className="status-row-flex">
            <Cpu size={18} color="var(--color-text-muted)" />
            <span>AI Assistant</span>
            <Badge variant={aiSettings.enabled ? "approved" : "default"}>{aiStatus}</Badge>
            <Badge variant="default">Restart required</Badge>
            <Badge variant={aiSettings.apiKeyConfigured ? "approved" : "pending"}>
              {aiSettings.apiKeyConfigured ? "API key stored" : "No API key stored"}
            </Badge>
          </div>
          <div className="form-grid" style={{ marginTop: "var(--space-4)" }}>
            <div className="form-grid-full">
              <Toggle
                checked={aiSettings.enabled}
                id="ai-enabled"
                label="Enable AI Assistant"
                onChange={(event) => updateAiField("enabled", event.target.checked)}
              />
            </div>
            {aiSettings.enabled ? (
              <>
                <Select
                  id="ai-model"
                  label="AI model"
                  onChange={(event) => updateAiField("model", event.target.value)}
                  options={modelOptions}
                  value={aiSettings.model}
                />
                <Input
                  id="ai-api-key"
                  label="API key"
                  hint="Leave blank to keep the stored key unchanged."
                  onChange={(event) => {
                    updateAiField("apiKey", event.target.value);
                    if (event.target.value.trim()) {
                      updateAiField("clearApiKey", false);
                    }
                  }}
                  placeholder={aiSettings.apiKeyConfigured ? "Stored key unchanged" : "Enter Gemini API key"}
                  type="password"
                  value={aiSettings.apiKey}
                />
                <div className="form-grid-full">
                  <Toggle
                    checked={aiSettings.clearApiKey}
                    id="ai-clear-api-key"
                    label="Clear stored API key on save"
                    onChange={(event) => updateAiField("clearApiKey", event.target.checked)}
                  />
                </div>
              </>
            ) : null}
          </div>
      </section>

      <div className="sticky-action-bar">
        {saveStatus === "error" ? (
          <Button onClick={() => void saveSettings()} variant="secondary">
            <RefreshCw size={18} />
            Retry
          </Button>
        ) : null}
        <Button isLoading={saveStatus === "saving"} onClick={() => void saveSettings()} variant="primary">
          {saveStatus === "saved" ? <Check size={18} /> : <Save size={18} />}
          {saveStatus === "saving" ? "Saving..." : saveStatus === "saved" ? "Saved" : "Save Settings"}
        </Button>
      </div>
    </div>
  );
}
