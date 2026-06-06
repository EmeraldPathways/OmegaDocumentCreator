import { useParams } from "react-router-dom";

import { getSeededClientProfile } from "../data/seeded-clients";

export function ClientFormPage() {
  const { clientReference } = useParams();
  const isEdit = Boolean(clientReference);
  const client = clientReference ? getSeededClientProfile(clientReference) : undefined;

  if (isEdit && !client) {
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
            <p className="eyebrow">Client record</p>
            <h1>{isEdit ? "Edit Client" : "Create Client"}</h1>
          </div>
          <button className="primary-action" type="button">
            Save Draft
          </button>
        </div>

        <form className="client-form-grid">
          <label>
            First name
            <input defaultValue={client?.firstName ?? ""} type="text" />
          </label>
          <label>
            Surname
            <input defaultValue={client?.surname ?? ""} type="text" />
          </label>
          <label>
            Title
            <input defaultValue={client?.title ?? ""} type="text" />
          </label>
          <label>
            Mobile number
            <input defaultValue={client?.mobileNumber ?? ""} type="text" />
          </label>
          <label>
            Email
            <input defaultValue={client?.email ?? ""} type="email" />
          </label>
          <label>
            Marital status
            <input defaultValue={client?.maritalStatus ?? ""} type="text" />
          </label>
        </form>
      </section>
    </div>
  );
}
