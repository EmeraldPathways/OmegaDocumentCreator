import { useEffect, useState, type FormEvent } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import { Save, X, ArrowLeft } from "lucide-react";

import { useAuth } from "../auth/auth-context";
import { useClientData } from "../data/client-data-context";
import { listAssignableUsers, type AdminUser } from "../data/admin-api";
import { createEmptyClientProfile, type SeededClientProfile } from "../data/seeded-clients";
import { createDefaultDocumentDrafts } from "../documents/document-templates";
import { Button, Input, Select, Textarea, useToast } from "../components/ui";
import { useDebounce } from "../hooks/use-debounce";

const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const MOBILE_REGEX = /^\d{10,}$/;

const titleOptions = [
  { value: "", label: "Select title" },
  { value: "Mr", label: "Mr" },
  { value: "Mrs", label: "Mrs" },
  { value: "Ms", label: "Ms" },
  { value: "Dr", label: "Dr" },
  { value: "Other", label: "Other" },
];

const maritalStatusOptions = [
  { value: "", label: "Select status" },
  { value: "Single", label: "Single" },
  { value: "Married", label: "Married" },
  { value: "Civil Partnership", label: "Civil Partnership" },
  { value: "Divorced", label: "Divorced" },
  { value: "Widowed", label: "Widowed" },
  { value: "Separated", label: "Separated" },
];

function createBlankClient(nextReference: string, updatedBy: string): SeededClientProfile {
  return createEmptyClientProfile({
    clientReference: nextReference,
    status: "Draft",
    createdBy: updatedBy,
    updatedBy,
    advisorName: updatedBy,
    documentDrafts: createDefaultDocumentDrafts(),
  });
}

function buildFullName(firstName: string, surname: string) {
  return `${firstName} ${surname}`.trim();
}

function resolveActorLabel(role: string | null | undefined) {
  return role === "admin" ? "admin" : "staff";
}

export function ClientFormPage() {
  const { clientReference } = useParams();
  const navigate = useNavigate();
  const { getClient, listClients, saveClient, refreshClients } = useClientData();
  const { user } = useAuth();
  const { addToast } = useToast();
  const isEdit = Boolean(clientReference);
  const actorLabel = user?.email ?? resolveActorLabel(user?.role);
  const existingClient = clientReference ? getClient(clientReference) : undefined;
  const [assignableUsers, setAssignableUsers] = useState<AdminUser[]>([]);
  const [isClientLoading, setIsClientLoading] = useState(Boolean(isEdit && !existingClient));

  const [formState, setFormState] = useState<SeededClientProfile>(() => {
    if (existingClient) {
      return existingClient;
    }

    const nextReference = `CLI-2026-${String(listClients().length + 1).padStart(4, "0")}`;
    return createBlankClient(nextReference, actorLabel);
  });

  const [errors, setErrors] = useState<Record<string, string>>({});
  const [touched, setTouched] = useState<Record<string, boolean>>({});
  const [saveStatus, setSaveStatus] = useState<"idle" | "saving" | "saved">("idle");
  const [isSubmitting, setIsSubmitting] = useState(false);

  const debouncedFormState = useDebounce(formState, 1000);

  useEffect(() => {
    if (existingClient) {
      setFormState(existingClient);
      setIsClientLoading(false);
    }
  }, [existingClient]);

  useEffect(() => {
    void listAssignableUsers()
      .then(setAssignableUsers)
      .catch(() => undefined);
  }, []);

  useEffect(() => {
    if (!isEdit || existingClient) {
      return;
    }
    void refreshClients()
      .catch(() => undefined)
      .finally(() => setIsClientLoading(false));
  }, [existingClient, isEdit, refreshClients]);

  useEffect(() => {
    // Auto-save draft after 1 second of inactivity, but only if valid and not pristine on create.
    if (saveStatus === "saving" || isSubmitting) {
      return;
    }

    const validationErrors = validateForm(debouncedFormState);
    if (Object.keys(validationErrors).length > 0) {
      return;
    }

    if (debouncedFormState.firstName || debouncedFormState.surname || debouncedFormState.email) {
      performSave(debouncedFormState, false);
    }
  }, [debouncedFormState]);

  if (isEdit && !existingClient) {
    if (isClientLoading) {
      return (
        <section className="card">
          <h1>Loading Client</h1>
          <p className="text-muted">Fetching the latest client record.</p>
        </section>
      );
    }

    return (
      <section className="card">
        <h1>Client Not Found</h1>
        <p className="text-muted">The client you are trying to edit does not exist.</p>
        <Link className="btn btn-primary" to="/clients" style={{ marginTop: "var(--space-4)" }}>
          Back to clients
        </Link>
      </section>
    );
  }

  function validateForm(state: SeededClientProfile) {
    const nextErrors: Record<string, string> = {};

    if (!state.firstName.trim()) {
      nextErrors.firstName = "First name is required";
    }

    if (!state.surname.trim()) {
      nextErrors.surname = "Surname is required";
    }

    if (!state.email.trim()) {
      nextErrors.email = "Email is required";
    } else if (!EMAIL_REGEX.test(state.email.trim())) {
      nextErrors.email = "Enter a valid email address";
    }

    if (state.mobileNumber.trim() && !MOBILE_REGEX.test(state.mobileNumber.replace(/\D/g, ""))) {
      nextErrors.mobileNumber = "Mobile number must be at least 10 digits";
    }

    return nextErrors;
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

    setTouched((current) => ({ ...current, [field]: true }));
    setErrors((current) => {
      const next = { ...current };
      delete next[field];
      return next;
    });
  }

  async function performSave(state: SeededClientProfile, showToastOnSuccess = true) {
    setSaveStatus("saving");
    const nextClientDraft = {
      ...state,
      fullName: buildFullName(state.firstName, state.surname),
      updatedBy: actorLabel,
      advisorName: state.advisorName || actorLabel,
    };

    const nextClient = await saveClient(nextClientDraft);
    setFormState(nextClient);
    setSaveStatus("saved");
    if (showToastOnSuccess) {
      addToast("Client saved", "success");
    }
    setTimeout(() => setSaveStatus("idle"), 2000);
    return nextClient;
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setTouched({ firstName: true, surname: true, email: true, mobileNumber: true });
    const validationErrors = validateForm(formState);
    setErrors(validationErrors);

    if (Object.keys(validationErrors).length > 0) {
      addToast("Please fix the errors before saving", "error");
      return;
    }

    setIsSubmitting(true);
    const savedClient = await performSave(formState, true);
    setIsSubmitting(false);
    navigate(`/clients/${savedClient.clientReference}`);
  }

  function handleCancel() {
    if (isEdit) {
      navigate(`/clients/${formState.clientReference}`);
    } else {
      navigate("/clients");
    }
  }

  function getError(field: string) {
    return touched[field] ? errors[field] : undefined;
  }

  function requiredLabel(label: string) {
    return (
      <>
        {label} <span className="required">*</span>
      </>
    );
  }

  return (
    <div className="page-stack">
      <section className="card">
        <div className="page-heading page-heading-compact">
          <div>
            <p className="text-muted" style={{ fontSize: "var(--font-size-small)", textTransform: "uppercase", letterSpacing: "0.05em" }}>
              Client record
            </p>
            <h1>{isEdit ? "Edit Client" : "Create Client"}</h1>
            <p className="page-subtitle">{formState.clientReference}</p>
          </div>
          <div className="page-actions">
            <span className="text-muted" style={{ fontSize: "var(--font-size-small)", display: "inline-flex", alignItems: "center", gap: "6px" }}>
              {saveStatus === "saving" ? (
                <>
                  <span className="spinner" style={{ width: 14, height: 14, borderWidth: 2 }} />
                  Saving...
                </>
              ) : saveStatus === "saved" ? (
                <>
                  <CheckIcon />
                  Saved
                </>
              ) : (
                "Not saved yet"
              )}
            </span>
          </div>
        </div>

        <form id="client-form" onSubmit={handleSubmit}>
          <div className="form-grid">
            <Input
              error={getError("firstName")}
              id="firstName"
              label={requiredLabel("First name")}
              onChange={(event) => updateField("firstName", event.target.value)}
              required
              type="text"
              value={formState.firstName}
            />
            <Input
              error={getError("surname")}
              id="surname"
              label={requiredLabel("Surname")}
              onChange={(event) => updateField("surname", event.target.value)}
              required
              type="text"
              value={formState.surname}
            />
            <Select
              id="title"
              label="Title"
              onChange={(event) => updateField("title", event.target.value)}
              options={titleOptions}
              value={formState.title}
            />
            <Input
              error={getError("email")}
              id="email"
              label={requiredLabel("Email")}
              onChange={(event) => updateField("email", event.target.value)}
              required
              type="email"
              value={formState.email}
            />
            <Input
              error={getError("mobileNumber")}
              hint="At least 10 digits"
              id="mobileNumber"
              label="Mobile number"
              onChange={(event) => updateField("mobileNumber", event.target.value)}
              type="tel"
              value={formState.mobileNumber}
            />
            <Input
              id="workPhone"
              label="Work phone"
              onChange={(event) => updateField("workPhone", event.target.value)}
              type="tel"
              value={formState.workPhone}
            />
            <Input
              id="dateOfBirth"
              label="Date of birth"
              onChange={(event) => updateField("dateOfBirth", event.target.value)}
              type="date"
              value={formState.dateOfBirth}
            />
            <Select
              id="maritalStatus"
              label="Marital status"
              onChange={(event) => updateField("maritalStatus", event.target.value)}
              options={maritalStatusOptions}
              value={formState.maritalStatus}
            />
            <Input
              id="homeAddressLine1"
              label="Home address line 1"
              onChange={(event) => updateField("homeAddressLine1", event.target.value)}
              type="text"
              value={formState.homeAddressLine1}
            />
            <Input
              id="homeAddressLine2"
              label="Home address line 2"
              onChange={(event) => updateField("homeAddressLine2", event.target.value)}
              type="text"
              value={formState.homeAddressLine2}
            />
            <Input
              id="townCity"
              label="Town / City"
              onChange={(event) => updateField("townCity", event.target.value)}
              type="text"
              value={formState.townCity}
            />
            <Input
              id="county"
              label="County"
              onChange={(event) => updateField("county", event.target.value)}
              type="text"
              value={formState.county}
            />
            <Input
              id="eircode"
              label="Eircode"
              onChange={(event) => updateField("eircode", event.target.value)}
              type="text"
              value={formState.eircode}
            />
            <Input
              id="partnerName"
              label="Partner name"
              onChange={(event) => updateField("partnerName", event.target.value)}
              type="text"
              value={formState.partnerName}
            />
            <Input
              id="partnerAddress"
              label="Partner address"
              onChange={(event) => updateField("partnerAddress", event.target.value)}
              type="text"
              value={formState.partnerAddress}
            />
            <Select
              id="assignedTo"
              label="Assigned to"
              onChange={(event) => updateField("assignedTo" as keyof SeededClientProfile, event.target.value)}
              options={[
                { value: "", label: "Select assignee" },
                ...assignableUsers.map((assignableUser) => ({
                  value: assignableUser.email,
                  label: `${assignableUser.first_name} ${assignableUser.last_name} (${assignableUser.email})`,
                })),
              ]}
              value={formState.assignedTo ?? ""}
            />
            <Textarea
              className="form-grid-full"
              id="generalNotes"
              label="General notes"
              onChange={(event) => updateField("generalNotes", event.target.value)}
              rows={4}
              value={formState.generalNotes}
            />
          </div>

          <div className="form-actions">
            <div className="form-actions-left">
              <Button isLoading={isSubmitting} type="submit" variant="primary">
                <Save size={18} />
                Save Draft
              </Button>
              <Button onClick={handleCancel} type="button" variant="secondary">
                <X size={18} />
                Cancel
              </Button>
            </div>
            <div className="form-actions-right">
              <Link className="btn btn-text" to={isEdit ? `/clients/${formState.clientReference}` : "/clients"}>
                <ArrowLeft size={16} />
                Back to Profile
              </Link>
            </div>
          </div>
        </form>
      </section>
    </div>
  );
}

function CheckIcon() {
  return (
    <svg
      fill="none"
      height="14"
      stroke="currentColor"
      strokeLinecap="round"
      strokeLinejoin="round"
      strokeWidth="2"
      viewBox="0 0 24 24"
      width="14"
    >
      <polyline points="20 6 9 17 4 12" />
    </svg>
  );
}
