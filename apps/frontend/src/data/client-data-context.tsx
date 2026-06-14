import { createContext, useContext, useEffect, useMemo, useState, type PropsWithChildren } from "react";
import { createDefaultDocumentDrafts } from "../documents/document-templates";
import type { GeneratedDocumentDraft, SupportedDocumentType } from "../documents/document-types";

import {
  createSeededClientProfiles,
  type SeededClientFile,
  type SeededClientProfile,
  type SeededGeneratedDocument,
} from "./seeded-clients";

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

const STORAGE_KEY = "omega-client-records";
const ClientDataContext = createContext<ClientDataContextValue | null>(null);

function normalizeDocumentDrafts(documentDrafts?: Partial<Record<SupportedDocumentType, Partial<GeneratedDocumentDraft>>>) {
  const defaultDrafts = createDefaultDocumentDrafts();

  return {
    "Fact Find": {
      ...defaultDrafts["Fact Find"],
      ...documentDrafts?.["Fact Find"],
      lastGeneratedSections: documentDrafts?.["Fact Find"]?.lastGeneratedSections ?? defaultDrafts["Fact Find"].lastGeneratedSections,
    },
    "Terms of Business": {
      ...defaultDrafts["Terms of Business"],
      ...documentDrafts?.["Terms of Business"],
      lastGeneratedSections:
        documentDrafts?.["Terms of Business"]?.lastGeneratedSections ?? defaultDrafts["Terms of Business"].lastGeneratedSections,
    },
    "Statement of Suitability": {
      ...defaultDrafts["Statement of Suitability"],
      ...documentDrafts?.["Statement of Suitability"],
      lastGeneratedSections:
        documentDrafts?.["Statement of Suitability"]?.lastGeneratedSections ??
        defaultDrafts["Statement of Suitability"].lastGeneratedSections,
    },
  };
}

function normalizeClient(client: SeededClientProfile): SeededClientProfile {
  return {
    ...client,
    documentDrafts: normalizeDocumentDrafts(client.documentDrafts),
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

  const storedValue = window.localStorage.getItem(STORAGE_KEY);
  if (!storedValue) {
    return createSeededClientProfiles();
  }

  try {
    const parsedValue = JSON.parse(storedValue) as Record<string, SeededClientProfile>;
    return Object.keys(parsedValue).length > 0 ? normalizeClients(parsedValue) : createSeededClientProfiles();
  } catch {
    return createSeededClientProfiles();
  }
}

export function ClientDataProvider({ children }: PropsWithChildren) {
  const [clients, setClients] = useState<Record<string, SeededClientProfile>>(() => readStoredClients());

  useEffect(() => {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(clients));
  }, [clients]);

  function saveClient(client: SeededClientProfile) {
    setClients((currentClients) => ({
      ...currentClients,
      [client.clientReference]: normalizeClient(client),
    }));
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
