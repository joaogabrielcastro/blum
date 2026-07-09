import { API_URL } from "../api/core";
import { persistAuthSession } from "../../utils/authSession";
import type { AuthResponse } from "../../types/api";

let refreshInFlight: Promise<string> | null = null;

/**
 * Renova access token via refresh token (deduplica pedidos paralelos).
 */
export async function refreshAccessToken(): Promise<string> {
  if (refreshInFlight) {
    return refreshInFlight;
  }

  refreshInFlight = (async () => {
    const refreshToken = localStorage.getItem("refreshToken");
    if (!refreshToken) {
      throw new Error("Sessão expirada");
    }

    let response: Response;
    try {
      response = await fetch(`${API_URL}/auth/refresh`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ refreshToken }),
      });
    } catch {
      throw new Error("Sem ligação ao servidor para renovar a sessão");
    }

    const payload = (await response.json().catch(() => ({}))) as
      | AuthResponse
      | { error?: string };
    if (!response.ok) {
      throw new Error(
        ("error" in payload && payload.error) || "Falha ao renovar sessão",
      );
    }

    persistAuthSession(payload as AuthResponse);
    return (payload as AuthResponse).token;
  })();

  try {
    return await refreshInFlight;
  } finally {
    refreshInFlight = null;
  }
}

/** Limpa tokens locais (sem chamar API). */
export function clearLocalAuth(): void {
  localStorage.removeItem("token");
  localStorage.removeItem("user");
  localStorage.removeItem("refreshToken");
}
