import { useState, useEffect, useMemo } from "react";
import {
  buildClientOrderSearchOption,
  clientMatchesSearchTerm,
  normalizeClientsResponse,
} from "../utils/clients";

const MAX_CLIENT_SEARCH_RESULTS = 60;
const MOBILE_CLIENT_BROWSE_COUNT = 50;

export function useOrderFormClients(clients, clientsList) {
  const [clientId, setClientId] = useState("");
  const [clientSearchTerm, setClientSearchTerm] = useState("");
  const [desktopClientListOpen, setDesktopClientListOpen] = useState(false);
  const [mobileClientPickerOpen, setMobileClientPickerOpen] = useState(false);

  const clientOptions = useMemo(() => {
    const list = normalizeClientsResponse(clientsList);
    if (list.length > 0) {
      return list
        .map((c) => {
          const id = c.id ?? c.Id;
          if (id == null) return null;
          return buildClientOrderSearchOption(c, id);
        })
        .filter(Boolean)
        .sort((a, b) => a.label.localeCompare(b.label, "pt-BR"));
    }
    return Object.entries(clients || {})
      .map(([id, name]) => {
        const label =
          name != null && String(name).trim() !== ""
            ? String(name)
            : `Cliente #${id}`;
        const lower = `${label} ${id}`.toLowerCase();
        return {
          id: String(id),
          label,
          primary: label,
          secondary: "",
          filterBlob: lower,
        };
      })
      .sort((a, b) => a.label.localeCompare(b.label, "pt-BR"));
  }, [clientsList, clients]);

  const mobileClientBrowseSlice = useMemo(
    () => clientOptions.slice(0, MOBILE_CLIENT_BROWSE_COUNT),
    [clientOptions],
  );

  const filteredClientOptions = useMemo(() => {
    const term = clientSearchTerm.trim();
    if (!term) return [];
    return clientOptions
      .filter((opt) => clientMatchesSearchTerm(opt, term))
      .slice(0, MAX_CLIENT_SEARCH_RESULTS);
  }, [clientOptions, clientSearchTerm]);

  const mobileClientDisplayList = clientSearchTerm.trim()
    ? filteredClientOptions
    : mobileClientBrowseSlice;

  useEffect(() => {
    if (!clientId) return;
    const selected = clientOptions.find(
      (option) => option.id === String(clientId),
    );
    if (selected) setClientSearchTerm(selected.label);
  }, [clientId, clientOptions]);

  const selectClientOption = (opt) => {
    setClientId(opt.id);
    setClientSearchTerm(opt.label);
    setDesktopClientListOpen(false);
    setMobileClientPickerOpen(false);
  };

  const resetClient = () => {
    setClientId("");
    setClientSearchTerm("");
  };

  return {
    clientId,
    setClientId,
    clientSearchTerm,
    setClientSearchTerm,
    desktopClientListOpen,
    setDesktopClientListOpen,
    mobileClientPickerOpen,
    setMobileClientPickerOpen,
    clientOptions,
    filteredClientOptions,
    mobileClientDisplayList,
    selectClientOption,
    resetClient,
    MOBILE_CLIENT_BROWSE_COUNT,
  };
}
