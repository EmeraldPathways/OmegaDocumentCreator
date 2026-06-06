import { Link, useParams } from "react-router-dom";

import { getSeededClientProfile } from "../data/seeded-clients";

export function ClientProfilePage() {
  const { clientReference = "" } = useParams();
  const client = getSeededClientProfile(clientReference);

  if (!client) {
    return (
      <section className="panel">
        <h1>Client Not Found</h1>
      </section>
    );
  }

  return (
    <div className="page-stack">
      <section className="panel">
        <div className="page-heading">
          <div>
            <p className="eyebrow">Client profile</p>
            <h1>{client.fullName}</h1>
          </div>
          <div className="module-actions">
            <Link className="primary-action action-link secondary-action" to={`/clients/${client.clientReference}/edit`}>
              Edit Client
            </Link>
            <Link className="primary-action action-link" to={`/clients/${client.clientReference}/income-protection`}>
              Open Income Protection
            </Link>
          </div>
        </div>

        <div className="profile-grid">
          <div className="mini-card">
            <span className="status-label">Reference</span>
            <strong>{client.clientReference}</strong>
          </div>
          <div className="mini-card">
            <span className="status-label">Status</span>
            <strong>{client.status}</strong>
          </div>
          <div className="mini-card">
            <span className="status-label">Title</span>
            <strong>{client.title}</strong>
          </div>
          <div className="mini-card">
            <span className="status-label">Email</span>
            <strong>{client.email}</strong>
          </div>
          <div className="mini-card">
            <span className="status-label">Mobile</span>
            <strong>{client.mobileNumber}</strong>
          </div>
          <div className="mini-card">
            <span className="status-label">Work phone</span>
            <strong>{client.workPhone || "Not provided"}</strong>
          </div>
          <div className="mini-card">
            <span className="status-label">Date of birth</span>
            <strong>{client.dateOfBirth}</strong>
          </div>
          <div className="mini-card">
            <span className="status-label">Marital status</span>
            <strong>{client.maritalStatus}</strong>
          </div>
          <div className="mini-card">
            <span className="status-label">Town / City</span>
            <strong>{client.townCity}</strong>
          </div>
          <div className="mini-card">
            <span className="status-label">County</span>
            <strong>{client.county}</strong>
          </div>
          <div className="mini-card">
            <span className="status-label">Partner name</span>
            <strong>{client.partnerName || "Not provided"}</strong>
          </div>
          <div className="mini-card">
            <span className="status-label">Last edited by</span>
            <strong>{client.updatedBy}</strong>
          </div>
        </div>

        <div className="dependants-panel">
          <h2>Dependants</h2>
          {client.dependants.length === 0 ? (
            <p>No dependants recorded.</p>
          ) : (
            <ul className="card-list">
              {client.dependants.map((dependant) => (
                <li className="mini-card" key={`${dependant.name}-${dependant.dateOfBirth}`}>
                  <strong>{dependant.name}</strong>
                  <span>{dependant.dateOfBirth}</span>
                  <span>{dependant.notes}</span>
                </li>
              ))}
            </ul>
          )}
        </div>
      </section>
    </div>
  );
}
