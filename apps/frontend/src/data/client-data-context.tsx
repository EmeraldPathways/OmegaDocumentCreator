import { createContext, useContext, useEffect, useMemo, useState, type PropsWithChildren } from "react";

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
};

const STORAGE_KEY = "omega-client-records";
const ClientDataContext = createContext<ClientDataContextValue | null>(null);

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
    return Object.keys(parsedValue).length > 0 ? parsedValue : createSeededClientProfiles();
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
      [client.clientReference]: client,
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

  const value = useMemo<ClientDataContextValue>(
    () => ({
      clients,
      getClient: (clientReference: string) => clients[clientReference],
      listClients: () => Object.values(clients),
      saveClient,
      upsertFile,
      upsertGeneratedDocument,
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
