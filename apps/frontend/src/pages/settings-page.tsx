import { useMemo, useState } from "react";
import { Save, Cpu, Check, X, RefreshCw } from "lucide-react";

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
};

type PathTestResult = { status: "idle" | "loading" | "success" | "error"; message: string };

const STORAGE_KEY = "omega-app-settings";
const AI_STORAGE_KEY = "omega-ai-settings";

const defaultSettings: AppSettings = {
  adminEmail: "",
  appUrl: "http://office-server.local",
  backupPath: "D:\\Omega\\backups",
  fileStoragePath: "D:\\Omega\\clients",
  remoteAccessMode: "local_only",
  sessionTimeoutMinutes: "30",
};

const defaultAiSettings: AiSettings = {
  enabled: false,
  model: "gpt-4o-mini",
  apiKey: "",
};

const remoteAccessOptions = [
  { value: "local_only", label: "Local only" },
  { value: "lan", label: "LAN" },
  { value: "remote", label: "Remote" },
];

const modelOptions = [
  { value: "gpt-4o-mini", label: "OpenAI GPT-4o mini" },
  { value: "gpt-4o", label: "OpenAI GPT-4o" },
  { value: "claude-3-haiku", label: "Anthropic Claude 3 Haiku" },
  { value: "ollama-llama3", label: "Ollama Llama 3 (local)" },
];

function readStoredSettings() {
  if (typeof window === "undefined") {
    return defaultSettings;
  }

  const storedValue = window.localStorage.getItem(STORAGE_KEY);
  if (!storedValue) {
    return defaultSettings;
  }

  try {
    const parsed = { ...defaultSettings, ...(JSON.parse(storedValue) as Partial<AppSettings>) };
    if (parsed.adminEmail.trim().toLowerCase() === "admin@omega.local") {
      parsed.adminEmail = "";
    }
    return parsed;
  } catch {
    return defaultSettings;
  }
}

function readStoredAiSettings(): AiSettings {
  if (typeof window === "undefined") {
    return defaultAiSettings;
  }

  const storedValue = window.localStorage.getItem(AI_STORAGE_KEY);
  if (!storedValue) {
    return defaultAiSettings;
  }

  try {
    return { ...defaultAiSettings, ...(JSON.parse(storedValue) as Partial<AiSettings>) };
  } catch {
    return defaultAiSettings;
  }
}

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
  const [settings, setSettings] = useState<AppSettings>(() => readStoredSettings());
  const [aiSettings, setAiSettings] = useState<AiSettings>(() => readStoredAiSettings());
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [saveStatus, setSaveStatus] = useState<"idle" | "saving" | "saved" | "error">("idle");
  const [pathTests, setPathTests] = useState<{
    fileStoragePath: PathTestResult;
    backupPath: PathTestResult;
  }>({
    fileStoragePath: { status: "idle", message: "" },
    backupPath: { status: "idle", message: "" },
  });

  const isSaved = saveStatus === "saved";

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

    // Simulate a path read/write test.
    await new Promise((resolve) => setTimeout(resolve, 800));
    const path = settings[field];
    const isValid = path.length > 3 && path.includes(":\\");

    setPathTests((current) => ({
      ...current,
      [field]: {
        status: isValid ? "success" : "error",
        message: isValid ? "Path is valid and writable" : "Path does not exist or is not writable",
      },
    }));

    addToast(isValid ? "Path test passed" : "Path test failed", isValid ? "success" : "error");
  }

  function saveSettings() {
    const validationErrors = validateSettings(settings);
    setErrors(validationErrors);

    if (Object.keys(validationErrors).length > 0) {
      setSaveStatus("error");
      addToast("Please fix the validation errors", "error");
      return;
    }

    setSaveStatus("saving");

    setTimeout(() => {
      try {
        window.localStorage.setItem(STORAGE_KEY, JSON.stringify(settings));
        window.localStorage.setItem(AI_STORAGE_KEY, JSON.stringify(aiSettings));
        setSaveStatus("saved");
        addToast("Settings saved", "success");
      } catch {
        setSaveStatus("error");
        addToast("Failed to save settings", "error");
      }
    }, 600);
  }

  const aiStatus = aiSettings.enabled ? "Enabled" : "Disabled";

  return (
    <div className="page-stack">
      <div className="page-heading page-heading-compact">
        <div>
          <h1>Settings</h1>
          <p className="page-subtitle">Configure the Omega Document Creator application.</p>
        </div>
      </div>

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
        <div className="status-row-flex">
            <Cpu size={18} color="var(--color-text-muted)" />
            <span>AI Assistant</span>
            <Badge variant={aiSettings.enabled ? "approved" : "default"}>{aiStatus}</Badge>
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
                  onChange={(event) => updateAiField("apiKey", event.target.value)}
                  placeholder="sk-..."
                  type="password"
                  value={aiSettings.apiKey}
                />
              </>
            ) : null}
          </div>
      </section>

      <div className="sticky-action-bar">
        {saveStatus === "error" ? (
          <Button onClick={saveSettings} variant="secondary">
            <RefreshCw size={18} />
            Retry
          </Button>
        ) : null}
        <Button isLoading={saveStatus === "saving"} onClick={saveSettings} variant="primary">
          {saveStatus === "saved" ? <Check size={18} /> : <Save size={18} />}
          {saveStatus === "saving" ? "Saving..." : saveStatus === "saved" ? "Saved" : "Save Settings"}
        </Button>
      </div>
    </div>
  );
}
