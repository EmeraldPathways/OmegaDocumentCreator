import { createContext, useContext, useEffect, useMemo, useState, type PropsWithChildren } from "react";
import { createDefaultDocumentDrafts } from "../documents/document-templates";
import type { GeneratedDocumentDraft, SupportedDocumentType } from "../documents/document-types";
import { isLegacyStatementDraft, resolveStatementDraft } from "../documents/statement-draft";

import {
  createSeededClientProfiles,
  type SeededClientFile,
  type SeededClientProfile,
  type SeededGeneratedDocument,
} from "./seeded-clients";

const STORAGE_KEY = "omega-client-records";
const STORAGE_VERSION_KEY = "omega-client-records-version";
const STORAGE_VERSION = "3";

type ClientDataContextValue = {
  clients: Record<string, SeededClientProfile>;
  getClient: (clientReference: string) => SeededClientProfile | undefined;
  listClients: () => SeededClientProfile[];
  saveClient: (client: SeededClientProfile) => void;
  upsertFile: (clientReference: string, file: SeededClientFile) => void;
  upsertGeneratedDocument: (clientReference: string, document: SeededGeneratedDocument) => void;
  updateSelectedTemplate: (clientReference: string, documentType: SupportedDocumentType, templateId: string) => void;
  saveGeneratedDraft: (
    clientReference: string,
    documentType: SupportedDocumentType,
    draft: Partial<Omit<GeneratedDocumentDraft, "selectedTemplateId">>,
  ) => void;
};

const ClientDataContext = createContext<ClientDataContextValue | null>(null);

function writeClientsToStorage(clients: Record<string, SeededClientProfile>) {
  if (typeof window === "undefined") {
    return;
  }

  window.localStorage.setItem(STORAGE_VERSION_KEY, STORAGE_VERSION);
  window.localStorage.setItem(STORAGE_KEY, JSON.stringify(clients));
}

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
    "Quote": normalizeDraft(defaultDrafts["Quote"], documentDrafts?.["Quote"]),
  };
}

function normalizeClient(client: SeededClientProfile): SeededClientProfile {
  const seededClient = createSeededClientProfiles()[client.clientReference];
  const normalizedDocumentDrafts = normalizeDocumentDrafts(client.documentDrafts, seededClient?.documentDrafts);
  const normalizedClient: SeededClientProfile = {
    ...seededClient,
    ...client,
    status: client.status ?? "Draft",
    files: client.files ?? seededClient?.files ?? [],
    generatedDocuments: client.generatedDocuments ?? seededClient?.generatedDocuments ?? [],
    documentDrafts: normalizedDocumentDrafts,
  };

  const statementDraft = normalizedClient.documentDrafts["Statement of Suitability"];
  if (!isLegacyStatementDraft(statementDraft)) {
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
    },
  };

  return {
    ...normalizedClient,
    documentDrafts: {
      ...normalizedDocumentDrafts,
      "Statement of Suitability": resolveStatementDraft(statementProfile),
    },
  };
}

function normalizeClients(clients: Record<string, SeededClientProfile>) {
  return Object.fromEntries(
    Object.entries(clients).map(([clientReference, client]) => [clientReference, normalizeClient(client)]),
  ) as Record<string, SeededClientProfile>;
}

function readStoredClients() {
  if (typeof window === "undefined") {
    return createSeededClientProfiles();
  }

  const storedVersion = window.localStorage.getItem(STORAGE_VERSION_KEY);
  const storedValue = window.localStorage.getItem(STORAGE_KEY);

  if (!storedValue || storedVersion !== STORAGE_VERSION) {
    return createSeededClientProfiles();
  }

  try {
    const parsed = JSON.parse(storedValue) as Record<string, SeededClientProfile>;
    return normalizeClients(parsed);
  } catch {
    return createSeededClientProfiles();
  }
}

export function ClientDataProvider({ children }: PropsWithChildren) {
  const [clients, setClients] = useState<Record<string, SeededClientProfile>>(() => readStoredClients());

  function saveClient(client: SeededClientProfile) {
    setClients((currentClients) => {
      const nextClients = {
        ...currentClients,
        [client.clientReference]: normalizeClient(client),
      };
      writeClientsToStorage(nextClients);
      return nextClients;
    });
  }

  function upsertGeneratedDocument(clientReference: string, document: SeededGeneratedDocument) {
    setClients((currentClients) => {
      const client = currentClients[clientReference];
      if (!client) {
        return currentClients;
      }

      const nextClients = {
        ...currentClients,
        [clientReference]: {
          ...client,
          generatedDocuments: [document, ...client.generatedDocuments.filter((entry) => entry.id !== document.id)],
        },
      };
      writeClientsToStorage(nextClients);
      return nextClients;
    });
  }

  function upsertFile(clientReference: string, file: SeededClientFile) {
    setClients((currentClients) => {
      const client = currentClients[clientReference];
      if (!client) {
        return currentClients;
      }

      const nextClients = {
        ...currentClients,
        [clientReference]: {
          ...client,
          files: [file, ...client.files.filter((entry) => entry.id !== file.id)],
        },
      };
      writeClientsToStorage(nextClients);
      return nextClients;
    });
  }

  function updateSelectedTemplate(clientReference: string, documentType: SupportedDocumentType, templateId: string) {
    setClients((currentClients) => {
      const client = currentClients[clientReference];
      if (!client) {
        return currentClients;
      }

      const nextClients = {
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
      writeClientsToStorage(nextClients);
      return nextClients;
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

      const nextClients = {
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
      writeClientsToStorage(nextClients);
      return nextClients;
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
    }),
    [clients],
  );

  useEffect(() => {
    writeClientsToStorage(clients);
  }, [clients]);

  return <ClientDataContext.Provider value={value}>{children}</ClientDataContext.Provider>;
}

export function useClientData() {
  const context = useContext(ClientDataContext);

  if (!context) {
    throw new Error("useClientData must be used within a ClientDataProvider");
  }

  return context;
}
