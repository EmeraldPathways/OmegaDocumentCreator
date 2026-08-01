import { createContext, useContext, useEffect, useMemo, useState, type PropsWithChildren } from "react";

import { useAuth } from "../auth/auth-context";
import { createDefaultDocumentDrafts } from "../documents/document-templates";
import type { GeneratedDocumentDraft, SupportedDocumentType } from "../documents/document-types";
import { isLegacyStatementDraft, resolveStatementDraft } from "../documents/statement-draft";

import { createClient, getClient as getBackendClient, listClients as listBackendClients, updateClient } from "./client-api";
import {
  createEmptyClientProfile,
  createSeededClientProfiles,
  type SeededClientFile,
  type SeededClientProfile,
  type SeededGeneratedDocument,
} from "./seeded-clients";

type ClientDataContextValue = {
  clients: Record<string, SeededClientProfile>;
  getClient: (clientReference: string) => SeededClientProfile | undefined;
  listClients: () => SeededClientProfile[];
  saveClient: (client: SeededClientProfile) => Promise<SeededClientProfile>;
  upsertFile: (clientReference: string, file: SeededClientFile) => void;
  upsertGeneratedDocument: (clientReference: string, document: SeededGeneratedDocument) => void;
  updateSelectedTemplate: (clientReference: string, documentType: SupportedDocumentType, templateId: string) => void;
  saveGeneratedDraft: (
    clientReference: string,
    documentType: SupportedDocumentType,
    draft: Partial<Omit<GeneratedDocumentDraft, "selectedTemplateId">>,
  ) => void;
  refreshClients: () => Promise<void>;
};

const ClientDataContext = createContext<ClientDataContextValue | null>(null);

function isPristineDraft(draft?: Partial<GeneratedDocumentDraft>) {
  if (!draft) {
    return true;
  }

  return (
    (draft.generationStatus ?? "idle") === "idle" &&
    !draft.lastGeneratedHtml &&
    (draft.lastGeneratedSections?.length ?? 0) === 0 &&
    (draft.integrationRequests?.length ?? 0) === 0 &&
    !draft.editedHtml
  );
}

function normalizeDraft(
  fallbackDraft: GeneratedDocumentDraft,
  storedDraft?: Partial<GeneratedDocumentDraft>,
): GeneratedDocumentDraft {
  const contentDraft = isPristineDraft(storedDraft) ? undefined : storedDraft;
  const integrationRequests =
    (contentDraft?.integrationRequests?.length ?? 0) > 0
      ? (contentDraft?.integrationRequests ?? fallbackDraft.integrationRequests)
      : fallbackDraft.integrationRequests;

  return {
    ...fallbackDraft,
    ...storedDraft,
    generationStatus: contentDraft?.generationStatus ?? fallbackDraft.generationStatus,
    lastGeneratedHtml: contentDraft?.lastGeneratedHtml ?? fallbackDraft.lastGeneratedHtml,
    lastGeneratedSections: contentDraft?.lastGeneratedSections ?? fallbackDraft.lastGeneratedSections,
    integrationRequests,
    editedHtml: contentDraft?.editedHtml ?? fallbackDraft.editedHtml,
  };
}

function normalizeDocumentDrafts(
  documentDrafts?: Partial<Record<SupportedDocumentType, Partial<GeneratedDocumentDraft>>>,
  fallbackDrafts?: Record<SupportedDocumentType, GeneratedDocumentDraft>,
) {
  const defaultDrafts = fallbackDrafts ?? createDefaultDocumentDrafts();

  return {
    "Fact Find": normalizeDraft(defaultDrafts["Fact Find"], documentDrafts?.["Fact Find"]),
    "Fact Find Update": normalizeDraft(defaultDrafts["Fact Find Update"], documentDrafts?.["Fact Find Update"]),
    "Terms of Business": normalizeDraft(defaultDrafts["Terms of Business"], documentDrafts?.["Terms of Business"]),
    "Statement of Suitability": normalizeDraft(
      defaultDrafts["Statement of Suitability"],
      documentDrafts?.["Statement of Suitability"],
    ),
    Quote: normalizeDraft(defaultDrafts.Quote, documentDrafts?.Quote),
    "Pensions Statement": normalizeDraft(defaultDrafts["Pensions Statement"], documentDrafts?.["Pensions Statement"]),
    "Pensions Quote": normalizeDraft(defaultDrafts["Pensions Quote"], documentDrafts?.["Pensions Quote"]),
  };
}

export function normalizeClient(client: SeededClientProfile): SeededClientProfile {
  const seededClients = createSeededClientProfiles();
  const seededClient = seededClients[client.clientReference];
  const fallbackClient = seededClient ?? createEmptyClientProfile({ clientReference: client.clientReference });
  const normalizedDocumentDrafts = normalizeDocumentDrafts(client.documentDrafts, fallbackClient.documentDrafts);
  const normalizedClient: SeededClientProfile = {
    ...fallbackClient,
    ...client,
    status: client.status ?? "Draft",
    dependants: client.dependants ?? fallbackClient.dependants,
    savingsInvestmentRows: client.savingsInvestmentRows ?? fallbackClient.savingsInvestmentRows,
    savedQuotes: Array.isArray(client.savedQuotes) ? client.savedQuotes : [],
    files: client.files ?? [],
    generatedDocuments: client.generatedDocuments ?? [],
    documentDrafts: normalizedDocumentDrafts,
  };

  const statementDraft = normalizedClient.documentDrafts["Statement of Suitability"];
  const pensionsStatementDraft = normalizedClient.documentDrafts["Pensions Statement"];
  const needsStatementMigration = isLegacyStatementDraft(statementDraft);
  const needsPensionsStatementMigration = isLegacyStatementDraft(pensionsStatementDraft);

  if (!needsStatementMigration && !needsPensionsStatementMigration) {
    return normalizedClient;
  }

  const statementProfile = {
    ...normalizedClient,
    documentDrafts: {
      ...normalizedDocumentDrafts,
      "Statement of Suitability": {
        ...statementDraft,
        editedHtml: "",
      },
      "Pensions Statement": {
        ...pensionsStatementDraft,
        editedHtml: "",
      },
    },
  };

  return {
    ...normalizedClient,
    documentDrafts: {
      ...normalizedDocumentDrafts,
      "Statement of Suitability": resolveStatementDraft(statementProfile, "Statement of Suitability"),
      "Pensions Statement": resolveStatementDraft(statementProfile, "Pensions Statement"),
    },
  };
}

export function mapBackendClientToSeeded(
  backendClient: Record<string, unknown>,
  existingClient?: SeededClientProfile,
): SeededClientProfile {
  const clientReference = String(backendClient.client_reference ?? existingClient?.clientReference ?? "");
  const seededClients = createSeededClientProfiles();
  const base = {
    ...(seededClients[clientReference] ?? createEmptyClientProfile({ clientReference })),
    ...(existingClient ?? {}),
  };

  return normalizeClient({
    ...base,
    clientReference: clientReference || base.clientReference,
    fullName: String(backendClient.full_name ?? base.fullName),
    firstName: String(backendClient.first_name ?? base.firstName),
    surname: String(backendClient.surname ?? base.surname),
    status: String(backendClient.status ?? base.status),
    title: String(backendClient.title ?? base.title ?? ""),
    email: String(backendClient.email ?? base.email ?? ""),
    mobileNumber: String(backendClient.mobile_number ?? base.mobileNumber ?? ""),
    workPhone: String(backendClient.work_phone ?? base.workPhone ?? ""),
    dateOfBirth: String(backendClient.date_of_birth ?? base.dateOfBirth ?? ""),
    maritalStatus: String(backendClient.marital_status ?? base.maritalStatus ?? ""),
    createdBy: String(backendClient.created_by ?? base.createdBy ?? ""),
    assignedTo: String(backendClient.assigned_to ?? base.assignedTo ?? ""),
    updatedBy: String(backendClient.updated_by ?? base.updatedBy ?? ""),
    townCity: String(backendClient.town_city ?? base.townCity ?? ""),
    county: String(backendClient.county ?? base.county ?? ""),
    homeAddressLine1: String(backendClient.home_address_line_1 ?? base.homeAddressLine1 ?? ""),
    homeAddressLine2: String(backendClient.home_address_line_2 ?? base.homeAddressLine2 ?? ""),
    eircode: String(backendClient.eircode ?? base.eircode ?? ""),
    partnerName: String(backendClient.partner_name ?? base.partnerName ?? ""),
    partnerAddress: String(backendClient.partner_address ?? base.partnerAddress ?? ""),
    generalNotes: String(backendClient.general_notes ?? base.generalNotes ?? ""),
    dependants: Array.isArray(backendClient.dependants)
      ? backendClient.dependants.map((dependant) => ({
          name: String((dependant as Record<string, unknown>).name ?? ""),
          dateOfBirth: String((dependant as Record<string, unknown>).date_of_birth ?? ""),
          notes: String((dependant as Record<string, unknown>).notes ?? ""),
        }))
      : (base.dependants ?? []),
  });
}

function buildClientPayload(client: SeededClientProfile) {
  return {
    first_name: client.firstName,
    surname: client.surname,
    email: client.email,
    mobile_number: client.mobileNumber,
    marital_status: client.maritalStatus,
    date_of_birth: client.dateOfBirth,
    title: client.title,
    town_city: client.townCity,
    county: client.county,
    dependants: client.dependants.map((dependant) => ({
      name: dependant.name,
      date_of_birth: dependant.dateOfBirth,
      notes: dependant.notes,
    })),
    home_address_line_1: client.homeAddressLine1,
    home_address_line_2: client.homeAddressLine2,
    work_phone: client.workPhone,
    eircode: client.eircode,
    partner_name: client.partnerName,
    partner_address: client.partnerAddress,
    assigned_to: client.assignedTo || undefined,
  };
}

export function ClientDataProvider({ children }: PropsWithChildren) {
  const { user } = useAuth();
  const [clients, setClients] = useState<Record<string, SeededClientProfile>>(() =>
    import.meta.env.MODE === "test" ? createSeededClientProfiles() : {},
  );

  async function refreshClients() {
    if (import.meta.env.MODE === "test") {
      return;
    }
    if (!user) {
      setClients({});
      return;
    }

    const summaries = await listBackendClients();
    const details = await Promise.all(summaries.map((client) => getBackendClient(client.client_reference)));
    setClients((currentClients) => {
      return Object.fromEntries(
        details.map((client) => {
          const existingClient = currentClients[client.client_reference];
          return [client.client_reference, mapBackendClientToSeeded(client as unknown as Record<string, unknown>, existingClient)];
        }),
      ) as Record<string, SeededClientProfile>;
    });
  }

  useEffect(() => {
    void refreshClients().catch(() => {
      if (import.meta.env.MODE === "test") {
        setClients(createSeededClientProfiles());
      }
    });
  }, [user?.email]);

  async function saveClient(client: SeededClientProfile) {
    if (import.meta.env.MODE === "test" || !user) {
      const normalized = normalizeClient(client);
      setClients((currentClients) => ({
        ...currentClients,
        [client.clientReference]: normalized,
      }));
      return normalized;
    }

    const payload = buildClientPayload(client);
    const isExistingClient = Boolean(client.clientReference && clients[client.clientReference]);
    const persisted = isExistingClient ? await updateClient(client.clientReference, payload) : await createClient(payload);
    const nextClient = mapBackendClientToSeeded(persisted as unknown as Record<string, unknown>, client);
    setClients((currentClients) => ({
      ...currentClients,
      [nextClient.clientReference]: nextClient,
    }));
    return nextClient;
  }

  function upsertGeneratedDocument(clientReference: string, document: SeededGeneratedDocument) {
    setClients((currentClients) => {
      const client = currentClients[clientReference];
      if (!client) {
        return currentClients;
      }

      return {
        ...currentClients,
        [clientReference]: {
          ...client,
          generatedDocuments: [document, ...client.generatedDocuments.filter((entry) => entry.id !== document.id)],
        },
      };
    });
  }

  function upsertFile(clientReference: string, file: SeededClientFile) {
    setClients((currentClients) => {
      const client = currentClients[clientReference];
      if (!client) {
        return currentClients;
      }

      return {
        ...currentClients,
        [clientReference]: {
          ...client,
          files: [file, ...client.files.filter((entry) => entry.id !== file.id)],
        },
      };
    });
  }

  function updateSelectedTemplate(clientReference: string, documentType: SupportedDocumentType, templateId: string) {
    setClients((currentClients) => {
      const client = currentClients[clientReference];
      if (!client) {
        return currentClients;
      }

      return {
        ...currentClients,
        [clientReference]: {
          ...normalizeClient(client),
          documentDrafts: {
            ...normalizeDocumentDrafts(client.documentDrafts),
            [documentType]: {
              ...normalizeDocumentDrafts(client.documentDrafts)[documentType],
              selectedTemplateId: templateId,
            },
          },
        },
      };
    });
  }

  function saveGeneratedDraft(
    clientReference: string,
    documentType: SupportedDocumentType,
    draft: Partial<Omit<GeneratedDocumentDraft, "selectedTemplateId">>,
  ) {
    setClients((currentClients) => {
      const client = currentClients[clientReference];
      if (!client) {
        return currentClients;
      }

      return {
        ...currentClients,
        [clientReference]: {
          ...normalizeClient(client),
          documentDrafts: {
            ...normalizeDocumentDrafts(client.documentDrafts),
            [documentType]: {
              ...normalizeDocumentDrafts(client.documentDrafts)[documentType],
              ...draft,
            },
          },
        },
      };
    });
  }

  const value = useMemo<ClientDataContextValue>(
    () => ({
      clients,
      getClient: (clientReference: string) => clients[clientReference],
      listClients: () => Object.values(clients),
      saveClient,
      upsertFile,
      upsertGeneratedDocument,
      updateSelectedTemplate,
      saveGeneratedDraft,
      refreshClients,
    }),
    [clients],
  );

  return <ClientDataContext.Provider value={value}>{children}</ClientDataContext.Provider>;
}

export function useClientData() {
  const context = useContext(ClientDataContext);

  if (!context) {
    throw new Error("useClientData must be used within a ClientDataProvider");
  }

  return context;
}
