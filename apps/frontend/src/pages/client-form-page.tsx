import { useEffect, useState, type FormEvent } from "react";
import { useNavigate, useParams } from "react-router-dom";

import { useAuth } from "../auth/auth-context";
import { useClientData } from "../data/client-data-context";
import { createSeededClientProfiles, type SeededClientProfile } from "../data/seeded-clients";
import { createDefaultDocumentDrafts } from "../documents/document-templates";

function createBlankClient(nextReference: string, updatedBy: string): SeededClientProfile {
  return {
    ...createSeededClientProfiles()["CLI-2026-0001"],
    clientReference: nextReference,
    fullName: "",
    firstName: "",
    surname: "",
    status: "Draft",
    title: "",
    email: "",
    mobileNumber: "",
    workPhone: "",
    dateOfBirth: "",
    maritalStatus: "",
    createdBy: updatedBy,
    updatedBy,
    townCity: "",
    county: "",
    partnerName: "",
    dependants: [],
    occupation: "",
    employmentStatus: "",
    income: "",
    provider: "",
    recommendedCover: "",
    premium: "",
    deferredPeriod: "",
    coverAge: "",
    advisorName: updatedBy,
    statementType: "",
    productType: "",
    letterDate: "",
    netMonthlyCost: "",
    documentDrafts: createDefaultDocumentDrafts(),
    files: [],
    generatedDocuments: [],
  };
}

function buildFullName(firstName: string, surname: string) {
  return `${firstName} ${surname}`.trim();
}

function resolveActorLabel(role: string | null | undefined) {
  return role === "admin" ? "Omega Admin" : "Office Staff";
}

export function ClientFormPage() {
  const { clientReference } = useParams();
  const navigate = useNavigate();
  const { getClient, listClients, saveClient } = useClientData();
  const { user } = useAuth();
  const isEdit = Boolean(clientReference);
  const actorLabel = resolveActorLabel(user?.role);
  const existingClient = clientReference ? getClient(clientReference) : undefined;
  const [saveStatus, setSaveStatus] = useState("Not saved yet");
  const [formState, setFormState] = useState<SeededClientProfile>(() => {
    if (existingClient) {
      return existingClient;
    }

    const nextReference = `CLI-2026-${String(listClients().length + 1).padStart(4, "0")}`;
    return createBlankClient(nextReference, actorLabel);
  });

  useEffect(() => {
    if (existingClient) {
      setFormState(existingClient);
    }
  }, [existingClient]);

  if (isEdit && !existingClient) {
    return (
      <section className="panel">
        <h1>Client Not Found</h1>
      </section>
    );
  }

  function updateField(field: keyof SeededClientProfile, value: string) {
    setFormState((currentState) => {
      const nextState = {
        ...currentState,
        [field]: value,
        updatedBy: actorLabel,
      };

      if (field === "firstName" || field === "surname") {
        nextState.fullName = buildFullName(
          field === "firstName" ? value : currentState.firstName,
          field === "surname" ? value : currentState.surname,
        );
      }

      return nextState;
    });
  }

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const nextClient = {
      ...formState,
      fullName: buildFullName(formState.firstName, formState.surname),
      updatedBy: actorLabel,
      advisorName: formState.advisorName || actorLabel,
    };

    saveClient(nextClient);
    setFormState(nextClient);
    setSaveStatus("Saved just now");
    navigate(`/clients/${nextClient.clientReference}`);
  }

  return (
    <div className="page-stack">
      <section className="panel">
        <div className="page-heading">
          <div>
            <p className="eyebrow">Client record</p>
            <h1>{isEdit ? "Edit Client" : "Create Client"}</h1>
            <p className="module-subtitle">{formState.clientReference}</p>
          </div>
          <div className="module-actions">
            <button className="primary-action" form="client-form" type="submit">
              Save Draft
            </button>
            <span className="draft-status">Save status: {saveStatus}</span>
          </div>
        </div>

        <form className="client-form-grid" id="client-form" onSubmit={handleSubmit}>
          <label>
            First name
            <input onChange={(event) => updateField("firstName", event.target.value)} type="text" value={formState.firstName} />
          </label>
          <label>
            Surname
            <input onChange={(event) => updateField("surname", event.target.value)} type="text" value={formState.surname} />
          </label>
          <label>
            Title
            <input onChange={(event) => updateField("title", event.target.value)} type="text" value={formState.title} />
          </label>
          <label>
            Mobile number
            <input onChange={(event) => updateField("mobileNumber", event.target.value)} type="text" value={formState.mobileNumber} />
          </label>
          <label>
            Email
            <input onChange={(event) => updateField("email", event.target.value)} type="email" value={formState.email} />
          </label>
          <label>
            Marital status
            <input onChange={(event) => updateField("maritalStatus", event.target.value)} type="text" value={formState.maritalStatus} />
          </label>
        </form>
      </section>
    </div>
  );
}
