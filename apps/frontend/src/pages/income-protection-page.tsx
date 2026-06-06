import { useState } from "react";
import { Link, useParams } from "react-router-dom";

import { getSeededClientProfile } from "../data/seeded-clients";

const moduleTabs = [
  {
    id: "client-details",
    label: "Client Details",
    description: "Stage 4 shell placeholder. The shared client profile and reusable fields will stay here.",
  },
  {
    id: "fact-find",
    label: "Fact Find",
    description: "Stage 5 will add the Fact Find workflow, draft saving, and final-generation validation.",
  },
  {
    id: "terms-of-business",
    label: "Terms of Business",
    description: "Stage 6 will add the Terms of Business issuance workflow and generated PDF tracking.",
  },
  {
    id: "statement-of-suitability",
    label: "Statement of Suitability",
    description: "Stage 7 will add the recommendation workflow and client-specific output generation.",
  },
  {
    id: "files",
    label: "Files",
    description: "A later stage will add client uploads, folder visibility, and review status handling.",
  },
  {
    id: "generated-documents",
    label: "Generated Documents",
    description: "A later stage will list generated outputs, versions, and document history for this client.",
  },
] as const;

function hasValue(value: string) {
  return value.trim().length > 0;
}

function isPresent(value: string | null): value is string {
  return value !== null;
}

export function IncomeProtectionPage() {
  const { clientReference = "" } = useParams();
  const client = getSeededClientProfile(clientReference);
  const [activeTabId, setActiveTabId] = useState<(typeof moduleTabs)[number]["id"]>(moduleTabs[0].id);
  const [factFindDraftSavedLabel, setFactFindDraftSavedLabel] = useState("Not saved yet");
  const [factFindGenerationStatus, setFactFindGenerationStatus] = useState("Draft");
  const [showFactFindValidation, setShowFactFindValidation] = useState(false);
  const [termsIssueStatus, setTermsIssueStatus] = useState("Draft");
  const [statementDocumentStatus, setStatementDocumentStatus] = useState("Draft");
  const [showStatementValidation, setShowStatementValidation] = useState(false);
  const [fileUploadStatus, setFileUploadStatus] = useState("Waiting for upload");
  const [documentPackStatus, setDocumentPackStatus] = useState("Waiting for request");

  if (!client) {
    return (
      <section className="panel">
        <h1>Client Not Found</h1>
      </section>
    );
  }

  const activeTab = moduleTabs.find((tab) => tab.id === activeTabId) ?? moduleTabs[0];
  const remainingFactFindSections = [
    "Life Insurance & Serious Illness",
    "Additional Relevant Information",
    "Client Declarations",
    "Data Protection & Marketing Preferences",
    "PEP Confirmation",
    "Business Source",
    "Signatures",
    "Request for Information",
  ];
  const factFindMissingFields = [
    !hasValue(client.fullName) ? "Client name" : null,
    !hasValue(`${client.townCity} ${client.county}`.trim()) ? "Address" : null,
    !hasValue(client.dateOfBirth) ? "Date of birth" : null,
    !hasValue(client.occupation) ? "Occupation" : null,
    !hasValue(client.income) ? "Income / salary" : null,
    !hasValue(client.email) && !hasValue(client.mobileNumber) ? "Email or phone" : null,
    !hasValue(client.advisorName) ? "Advisor name" : null,
  ].filter(isPresent);
  const statementMissingFields = [
    !hasValue(client.fullName) ? "Client name" : null,
    !hasValue(`${client.townCity} ${client.county}`.trim()) ? "Address" : null,
    !hasValue(client.statementType) ? "Statement type" : null,
    !hasValue(client.provider) ? "Provider recommended" : null,
    !hasValue(client.productType) ? "Product recommended" : null,
    !hasValue(client.recommendedCover) ? "Recommended cover" : null,
    !hasValue(client.deferredPeriod) ? "Deferred period" : null,
    !hasValue(client.coverAge) ? "Cover to age" : null,
    !hasValue(client.premium) ? "Gross monthly premium" : null,
    !hasValue(client.advisorName) ? "Advisor name" : null,
    !hasValue(client.letterDate) ? "Letter date" : null,
  ].filter(isPresent);

  function handleFactFindGenerate(format: "DOCX" | "PDF") {
    if (factFindMissingFields.length > 0) {
      setShowFactFindValidation(true);
      setFactFindGenerationStatus("Blocked by missing required fields");
      return;
    }

    setShowFactFindValidation(false);
    setFactFindGenerationStatus(`${format} generated`);
  }

  function handleStatementGenerate(format: "DOCX" | "PDF") {
    if (statementMissingFields.length > 0) {
      setShowStatementValidation(true);
      setStatementDocumentStatus("Blocked by missing required fields");
      return;
    }

    setShowStatementValidation(false);
    setStatementDocumentStatus(`${format} generated`);
  }

  function renderTabPanel() {
    if (activeTab.id === "fact-find") {
      return (
        <div className="fact-find-stack">
          <div className="fact-find-header">
            <div>
              <p className="eyebrow">Stage 5 draft</p>
              <h2>Fact Find Draft</h2>
              <p>Start the client fact find with shared client details and reusable protection data.</p>
            </div>
            <div className="module-actions">
              <button className="primary-action" onClick={() => setFactFindDraftSavedLabel("Saved just now")} type="button">
                Save Draft
              </button>
              <button className="primary-action secondary-action" onClick={() => handleFactFindGenerate("DOCX")} type="button">
                Generate DOCX
              </button>
              <button className="primary-action" onClick={() => handleFactFindGenerate("PDF")} type="button">
                Generate PDF
              </button>
              <span className="draft-status">Last saved: {factFindDraftSavedLabel}</span>
              <span className="draft-status">Generation status: {factFindGenerationStatus}</span>
            </div>
          </div>

          <section className="fact-find-section">
            <div className="fact-find-section-header">
              <p className="eyebrow">Section 1</p>
              <h3>Personal Details</h3>
            </div>
            <form className="client-form-grid">
              <label>
                Client name
                <input defaultValue={client.fullName} type="text" />
              </label>
              <label>
                Marital status
                <input defaultValue={client.maritalStatus} type="text" />
              </label>
              <label>
                Date of birth
                <input defaultValue={client.dateOfBirth} type="text" />
              </label>
              <label>
                Email
                <input defaultValue={client.email} type="email" />
              </label>
              <label>
                Home / mobile
                <input defaultValue={client.mobileNumber} type="text" />
              </label>
              <label>
                Partner name
                <input defaultValue={client.partnerName} type="text" />
              </label>
            </form>
          </section>

          <section className="fact-find-section">
            <div className="fact-find-section-header">
              <p className="eyebrow">Section 2</p>
              <h3>Employment Details</h3>
            </div>
            <form className="client-form-grid">
              <label>
                Occupation
                <input defaultValue={client.occupation} type="text" />
              </label>
              <label>
                Employment status
                <input defaultValue={client.employmentStatus} type="text" />
              </label>
              <label>
                Income / salary
                <input defaultValue={client.income} type="text" />
              </label>
              <label>
                Advisor name
                <input defaultValue={client.advisorName} type="text" />
              </label>
            </form>
          </section>

          <section className="fact-find-section">
            <div className="fact-find-section-header">
              <p className="eyebrow">Section 3</p>
              <h3>Income Protection</h3>
            </div>
            <form className="client-form-grid">
              <label>
                Provider
                <input defaultValue={client.provider} type="text" />
              </label>
              <label>
                Recommended cover
                <input defaultValue={client.recommendedCover} type="text" />
              </label>
              <label>
                Monthly premium
                <input defaultValue={client.premium} type="text" />
              </label>
              <label>
                Deferred period
                <input defaultValue={client.deferredPeriod} type="text" />
              </label>
              <label>
                Cover to age
                <input defaultValue={client.coverAge} type="text" />
              </label>
            </form>
          </section>

          <section className="fact-find-section">
            <div className="fact-find-section-header">
              <p className="eyebrow">Remaining sections</p>
              <h3>Queued for the next Stage 5 slices</h3>
            </div>
            <ul className="card-list">
              {remainingFactFindSections.map((sectionName) => (
                <li className="mini-card" key={sectionName}>
                  <strong>{sectionName}</strong>
                </li>
              ))}
            </ul>
          </section>

          {showFactFindValidation ? (
            <section className="fact-find-section">
              <div className="fact-find-section-header">
                <p className="eyebrow">Stage 11 validation</p>
                <h3>Missing required fields</h3>
              </div>
              <ul className="card-list">
                {factFindMissingFields.map((fieldName) => (
                  <li className="mini-card validation-card" key={fieldName}>
                    <strong>{fieldName}</strong>
                  </li>
                ))}
              </ul>
            </section>
          ) : null}
        </div>
      );
    }

    if (activeTab.id === "terms-of-business") {
      return (
        <div className="fact-find-stack">
          <div className="fact-find-header">
            <div>
              <p className="eyebrow">Stage 6 draft</p>
              <h2>Terms of Business Draft</h2>
              <p>Record the current issue version, delivery details, and issuance state for this client.</p>
            </div>
            <div className="module-actions">
              <button className="primary-action" type="button">
                Generate Terms PDF
              </button>
              <button className="primary-action secondary-action" onClick={() => setTermsIssueStatus("Issued today")} type="button">
                Mark as Issued
              </button>
              <span className="draft-status">Issue status: {termsIssueStatus}</span>
            </div>
          </div>

          <section className="fact-find-section">
            <div className="fact-find-section-header">
              <p className="eyebrow">Issue record</p>
              <h3>Terms tracking</h3>
            </div>
            <form className="client-form-grid">
              <label>
                Terms version
                <input defaultValue={client.termsVersion} type="text" />
              </label>
              <label>
                Issued by
                <input defaultValue={client.advisorName} type="text" />
              </label>
              <label>
                Delivery method
                <input defaultValue={client.termsDeliveryMethod} type="text" />
              </label>
              <label>
                Client received terms
                <input defaultValue="Pending confirmation" type="text" />
              </label>
              <label>
                Client reviewed terms
                <input defaultValue="Pending confirmation" type="text" />
              </label>
              <label>
                Notes
                <input defaultValue="Issue with Income Protection recommendation pack." type="text" />
              </label>
            </form>
          </section>
        </div>
      );
    }

    if (activeTab.id === "statement-of-suitability") {
      return (
        <div className="fact-find-stack">
          <div className="fact-find-header">
            <div>
              <p className="eyebrow">Stage 7 draft</p>
              <h2>Statement of Suitability Draft</h2>
              <p>Capture the recommendation summary and generation actions for this client recommendation letter.</p>
            </div>
            <div className="module-actions">
              <button className="primary-action secondary-action" onClick={() => handleStatementGenerate("DOCX")} type="button">
                Generate DOCX
              </button>
              <button className="primary-action" onClick={() => handleStatementGenerate("PDF")} type="button">
                Generate PDF
              </button>
              <span className="draft-status">Document status: {statementDocumentStatus}</span>
            </div>
          </div>

          <section className="fact-find-section">
            <div className="fact-find-section-header">
              <p className="eyebrow">Letter header</p>
              <h3>Recommendation basics</h3>
            </div>
            <form className="client-form-grid">
              <label>
                Letter date
                <input defaultValue={client.letterDate} type="text" />
              </label>
              <label>
                Statement type
                <input defaultValue={client.statementType} type="text" />
              </label>
              <label>
                Provider name
                <input defaultValue={client.provider} type="text" />
              </label>
              <label>
                Product type
                <input defaultValue={client.productType} type="text" />
              </label>
              <label>
                Advisor name
                <input defaultValue={client.advisorName} type="text" />
              </label>
            </form>
          </section>

          <section className="fact-find-section">
            <div className="fact-find-section-header">
              <p className="eyebrow">Recommendation</p>
              <h3>Cover summary</h3>
            </div>
            <form className="client-form-grid">
              <label>
                Recommended cover
                <input defaultValue={client.recommendedCover} type="text" />
              </label>
              <label>
                Deferred period
                <input defaultValue={client.deferredPeriod} type="text" />
              </label>
              <label>
                Cover to age
                <input defaultValue={client.coverAge} type="text" />
              </label>
              <label>
                Gross monthly premium
                <input defaultValue={client.premium} type="text" />
              </label>
              <label>
                Net monthly cost
                <input defaultValue={client.netMonthlyCost} type="text" />
              </label>
            </form>
          </section>

          {showStatementValidation ? (
            <section className="fact-find-section">
              <div className="fact-find-section-header">
                <p className="eyebrow">Stage 11 validation</p>
                <h3>Missing required fields</h3>
              </div>
              <ul className="card-list">
                {statementMissingFields.map((fieldName) => (
                  <li className="mini-card validation-card" key={fieldName}>
                    <strong>{fieldName}</strong>
                  </li>
                ))}
              </ul>
            </section>
          ) : null}
        </div>
      );
    }

    if (activeTab.id === "files") {
      const folderName = `client-${client.clientReference.toLowerCase()}-${client.fullName.toLowerCase().replaceAll(" ", "-")}`;
      const folderLayout = [
        "fact-find/",
        "terms-of-business/",
        "statement-of-suitability/",
        "request-for-information/",
        "uploads/",
        "generated-documents/",
        "signed-documents/",
      ];

      return (
        <div className="fact-find-stack">
          <div className="fact-find-header">
            <div>
              <p className="eyebrow">Stage 8 draft</p>
              <h2>Client Files</h2>
              <p>Preview the client folder structure and seeded file metadata before real uploads and storage wiring.</p>
            </div>
            <div className="module-actions">
              <button className="primary-action" onClick={() => setFileUploadStatus("Upload placeholder queued")} type="button">
                Upload File
              </button>
              <span className="draft-status">Upload status: {fileUploadStatus}</span>
            </div>
          </div>

          <section className="fact-find-section">
            <div className="fact-find-section-header">
              <p className="eyebrow">Folder root</p>
              <h3>{folderName}</h3>
            </div>
            <ul className="card-list">
              {folderLayout.map((folder) => (
                <li className="mini-card" key={folder}>
                  <strong>{folder}</strong>
                </li>
              ))}
            </ul>
          </section>

          <section className="fact-find-section">
            <div className="fact-find-section-header">
              <p className="eyebrow">Seeded metadata</p>
              <h3>Tracked client files</h3>
            </div>
            <div className="table-wrap">
              <table className="data-table">
                <thead>
                  <tr>
                    <th>Category</th>
                    <th>Filename</th>
                    <th>Status</th>
                    <th>Uploaded by</th>
                    <th>Uploaded at</th>
                  </tr>
                </thead>
                <tbody>
                  {client.files.map((file) => (
                    <tr key={file.id}>
                      <td>{file.category}</td>
                      <td>{file.originalFilename}</td>
                      <td>{file.status}</td>
                      <td>{file.uploadedBy}</td>
                      <td>{file.uploadedAt}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </section>
        </div>
      );
    }

    if (activeTab.id === "generated-documents") {
      return (
        <div className="fact-find-stack">
          <div className="fact-find-header">
            <div>
              <p className="eyebrow">Stage 9 draft</p>
              <h2>Generated Documents</h2>
              <p>Preview generated-document history and the future client pack download flow.</p>
            </div>
            <div className="module-actions">
              <button className="primary-action" onClick={() => setDocumentPackStatus("Pack placeholder queued")} type="button">
                Download Document Pack
              </button>
              <span className="draft-status">Pack status: {documentPackStatus}</span>
            </div>
          </div>

          <section className="fact-find-section">
            <div className="fact-find-section-header">
              <p className="eyebrow">Generated history</p>
              <h3>Tracked outputs</h3>
            </div>
            <div className="table-wrap">
              <table className="data-table">
                <thead>
                  <tr>
                    <th>Document type</th>
                    <th>Document name</th>
                    <th>Version</th>
                    <th>Status</th>
                    <th>Generated at</th>
                  </tr>
                </thead>
                <tbody>
                  {client.generatedDocuments.map((document) => (
                    <tr key={document.id}>
                      <td>{document.documentType}</td>
                      <td>{document.documentName}</td>
                      <td>{document.version}</td>
                      <td>{document.status}</td>
                      <td>{document.generatedAt}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </section>
        </div>
      );
    }

    return (
      <>
        <p className="eyebrow">Stage placeholder</p>
        <h2>{activeTab.label}</h2>
        <p>{activeTab.description}</p>
      </>
    );
  }

  return (
    <div className="page-stack">
      <section className="panel">
        <div className="page-heading">
          <div>
            <p className="eyebrow">Client module</p>
            <h1>Income Protection</h1>
            <p className="module-subtitle">
              {client.fullName} ({client.clientReference})
            </p>
          </div>
          <div className="module-actions">
            <span className="module-status-badge">{client.status}</span>
            <Link className="primary-action action-link" to={`/clients/${client.clientReference}`}>
              View Client Record
            </Link>
          </div>
        </div>

        <div className="profile-grid module-summary-grid">
          <div className="mini-card">
            <span className="status-label">Client</span>
            <strong>{client.fullName}</strong>
          </div>
          <div className="mini-card">
            <span className="status-label">Email</span>
            <strong>{client.email}</strong>
          </div>
          <div className="mini-card">
            <span className="status-label">Phone</span>
            <strong>{client.mobileNumber}</strong>
          </div>
          <div className="mini-card">
            <span className="status-label">Date of birth</span>
            <strong>{client.dateOfBirth}</strong>
          </div>
          <div className="mini-card">
            <span className="status-label">Address base</span>
            <strong>
              {client.townCity}, {client.county}
            </strong>
          </div>
          <div className="mini-card">
            <span className="status-label">Dependants</span>
            <strong>{client.dependants.length}</strong>
          </div>
          <div className="mini-card">
            <span className="status-label">Partner</span>
            <strong>{client.partnerName || "Not provided"}</strong>
          </div>
          <div className="mini-card">
            <span className="status-label">Last edited by</span>
            <strong>{client.updatedBy}</strong>
          </div>
        </div>

        <div aria-label="Income Protection sections" className="module-tab-list" role="tablist">
          {moduleTabs.map((tab) => (
            <button
              key={tab.id}
              aria-controls={`panel-${tab.id}`}
              aria-selected={tab.id === activeTab.id}
              className={`module-tab${tab.id === activeTab.id ? " is-active" : ""}`}
              id={`tab-${tab.id}`}
              onClick={() => setActiveTabId(tab.id)}
              role="tab"
              type="button"
            >
              {tab.label}
            </button>
          ))}
        </div>

        <section
          aria-labelledby={`tab-${activeTab.id}`}
          className="module-tab-panel"
          id={`panel-${activeTab.id}`}
          role="tabpanel"
        >
          {renderTabPanel()}
        </section>
      </section>
    </div>
  );
}
