import {
  createContext,
  useCallback,
  useContext,
  useMemo,
} from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import apiService from "../services/apiService";
import {
  getClientDisplayName,
  normalizeClientsResponse,
} from "../utils/clients";
import { queryKeys } from "../services/queryKeys";

const AppDataContext = createContext(null);
const EMPTY_LIST = [];

function buildClientsMap(list) {
  const clientsMap = {};
  list.forEach((client) => {
    const id = client.id ?? client.Id;
    if (id == null) return;
    clientsMap[id] =
      getClientDisplayName(client) ||
      (client.cnpj != null && String(client.cnpj).trim()
        ? `CNPJ ${String(client.cnpj).trim()}`
        : "");
  });
  return clientsMap;
}

export function AppDataProvider({ enabled = true, children }) {
  const queryClient = useQueryClient();

  const clientsQuery = useQuery({
    queryKey: queryKeys.clients,
    queryFn: async () =>
      normalizeClientsResponse(await apiService.getClients()),
    enabled,
    staleTime: 5 * 60 * 1000,
  });

  const brandsQuery = useQuery({
    queryKey: queryKeys.brands,
    queryFn: async () => {
      const data = await apiService.getBrands();
      return Array.isArray(data) ? data : [];
    },
    enabled,
    staleTime: 5 * 60 * 1000,
  });

  const clientsList = clientsQuery.data ?? EMPTY_LIST;
  const brands = brandsQuery.data ?? EMPTY_LIST

  const clientsMap = useMemo(
    () => buildClientsMap(clientsList),
    [clientsList],
  );

  const invalidateClients = useCallback(
    () => queryClient.invalidateQueries({ queryKey: queryKeys.clients }),
    [queryClient],
  );

  const invalidateBrands = useCallback(
    () => queryClient.invalidateQueries({ queryKey: queryKeys.brands }),
    [queryClient],
  );

  const value = useMemo(
    () => ({
      clientsList,
      clientsMap,
      brands,
      isLoadingClients: clientsQuery.isLoading,
      isLoadingBrands: brandsQuery.isLoading,
      clientsError: clientsQuery.error,
      brandsError: brandsQuery.error,
      invalidateClients,
      invalidateBrands,
      refetchClients: clientsQuery.refetch,
      refetchBrands: brandsQuery.refetch,
    }),
    [
      clientsList,
      clientsMap,
      brands,
      clientsQuery.isLoading,
      brandsQuery.isLoading,
      clientsQuery.error,
      brandsQuery.error,
      invalidateClients,
      invalidateBrands,
      clientsQuery.refetch,
      brandsQuery.refetch,
    ],
  );

  return (
    <AppDataContext.Provider value={value}>{children}</AppDataContext.Provider>
  );
}

export function useAppData() {
  const ctx = useContext(AppDataContext);
  if (!ctx) {
    throw new Error("useAppData deve ser usado dentro de AppDataProvider");
  }
  return ctx;
}

/** Para módulos fora do provider (ex.: offline sync). */
export function useOptionalAppData() {
  return useContext(AppDataContext);
}
