const aiReadinessItems = [
  {
    label: "Version 1 AI status",
    value: "Disabled",
    detail: "No AI assistance is enabled in the current production scope.",
  },
  {
    label: "Future local model runner",
    value: "Ollama-ready",
    detail: "Reserved for local-only model execution on the office server in a later stage.",
  },
  {
    label: "Document search path",
    value: "Planned local RAG",
    detail: "Prepared for local embeddings and document search without external data transfer.",
  },
  {
    label: "Approval control",
    value: "Advisor review required",
    detail: "Any future AI wording must remain draft-only and require staff approval.",
  },
];

export function SettingsPage() {
  return (
    <div className="page-stack">
      <section className="panel">
        <div className="page-heading">
          <div>
            <p className="eyebrow">Stage 16 draft</p>
            <h1>Settings</h1>
          </div>
        </div>

        <div className="fact-find-section">
          <div className="fact-find-section-header">
            <p className="eyebrow">Future local AI</p>
            <h2>AI Readiness</h2>
          </div>
          <p className="module-subtitle">
            Version 1 keeps AI disabled. This settings surface exists to document the approved local-only
            expansion path for later releases without exposing live AI actions.
          </p>
          <ul className="card-list">
            {aiReadinessItems.map((item) => (
              <li className="mini-card" key={item.label}>
                <span className="status-label">{item.label}</span>
                <strong>{item.value}</strong>
                <span>{item.detail}</span>
              </li>
            ))}
          </ul>
        </div>
      </section>
    </div>
  );
}
