export type BackendClientSummary = {
  client_reference: string;
  first_name: string;
  surname: string;
  full_name: string;
  status: string;
  created_by: string;
  assigned_to?: string;
  updated_by: string;
};

export type BackendDependant = {
  name: string;
  date_of_birth?: string;
  notes?: string;
};

export type BackendClientDetail = BackendClientSummary & {
  title: string;
  created_at: string;
  updated_at: string;
  archived_at?: string;
  email: string;
  mobile_number: string;
  work_phone: string;
  date_of_birth: string;
  marital_status: string;
  home_address_line_1: string;
  home_address_line_2: string;
  town_city: string;
  county: string;
  eircode: string;
  partner_name: string;
  partner_address: string;
  general_notes: string;
  dependants: BackendDependant[];
};

export type ClientUpsertPayload = {
  first_name: string;
  surname: string;
  email: string;
  mobile_number: string;
  marital_status: string;
  date_of_birth: string;
  title?: string;
  town_city?: string;
  county?: string;
  dependants?: Array<{ name: string; date_of_birth?: string; notes?: string }>;
  home_address_line_1?: string;
  home_address_line_2?: string;
  work_phone?: string;
  eircode?: string;
  partner_name?: string;
  partner_address?: string;
  assigned_to?: string;
};

async function parseJson<T>(response: Response): Promise<T> {
  if (!response.ok) {
    throw new Error(`Request failed: ${response.status}`);
  }
  return (await response.json()) as T;
}

export async function listClients(): Promise<BackendClientSummary[]> {
  const response = await fetch("/clients", { credentials: "same-origin" });
  return (await parseJson<{ items: BackendClientSummary[] }>(response)).items ?? [];
}

export async function getClient(clientReference: string): Promise<BackendClientDetail> {
  const response = await fetch(`/clients/${encodeURIComponent(clientReference)}`, { credentials: "same-origin" });
  return (await parseJson<{ item: BackendClientDetail }>(response)).item;
}

export async function createClient(payload: ClientUpsertPayload): Promise<BackendClientDetail> {
  const response = await fetch("/clients", {
    method: "POST",
    credentials: "same-origin",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });
  return (await parseJson<{ item: BackendClientDetail }>(response)).item;
}

export async function updateClient(clientReference: string, payload: Partial<ClientUpsertPayload>): Promise<BackendClientDetail> {
  const response = await fetch(`/clients/${encodeURIComponent(clientReference)}`, {
    method: "PATCH",
    credentials: "same-origin",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });
  return (await parseJson<{ item: BackendClientDetail }>(response)).item;
}

export async function archiveClient(clientReference: string): Promise<BackendClientDetail> {
  const response = await fetch(`/clients/${encodeURIComponent(clientReference)}/archive`, {
    method: "PATCH",
    credentials: "same-origin",
  });
  return (await parseJson<{ item: BackendClientDetail }>(response)).item;
}
