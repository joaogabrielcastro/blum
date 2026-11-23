import { API_URL, apiRequest } from "./core";
import type { ClientRecord } from "../../types/api";

export const clientsApi = {
  getClients: (): Promise<ClientRecord[]> =>
    apiRequest<ClientRecord[]>(`${API_URL}/clients`),

  createClient: (newClientData: Record<string, unknown>) =>
    apiRequest(`${API_URL}/clients`, {
      method: "POST",
      body: JSON.stringify(newClientData),
    }),

  updateClient: (clientid: string | number, clientData: Record<string, unknown>) =>
    apiRequest(`${API_URL}/clients/${clientid}`, {
      method: "PUT",
      body: JSON.stringify(clientData),
    }),

  deleteClient: (clientId: string | number) =>
    apiRequest(`${API_URL}/clients/${clientId}`, { method: "DELETE" }),

  getClientById: (clientId: string | number) =>
    apiRequest(`${API_URL}/clients/${clientId}`),
};
