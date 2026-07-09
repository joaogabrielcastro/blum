import {
  getStoredTenantSlug,
  setStoredTenantSlug,
  clearStoredTenantSlug,
} from "../../constants/tenantStorage";
import { resetOfflineStorage } from "../../offline/db";
import { API_URL, apiRequest } from "./core";
import { clearLocalAuth } from "../auth/refreshSession";
import type { AuthResponse, VerifyTokenResponse } from "../../types/api";

export interface SignupTenantParams {
  companyName: string;
  slug: string;
  adminEmail: string;
  adminPassword: string;
  adminName: string;
}

export interface SignupTenantResponse {
  tenant?: { slug?: string };
  error?: string;
  message?: string;
}

export interface CheckSlugResponse {
  available: boolean;
  slug: string;
  error?: string;
}

export const login = async (
  username: string,
  password: string,
  tenantSlug?: string,
): Promise<AuthResponse> => {
  const slug = (tenantSlug || getStoredTenantSlug() || "default").trim();
  let response: Response;
  try {
    response = await fetch(`${API_URL}/auth/login`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-tenant-slug": slug,
      },
      body: JSON.stringify({ username, password, tenantSlug: slug }),
    });
  } catch {
    throw new Error(
      "Sem ligação à internet ou servidor indisponível. Verifique a rede e tente novamente.",
    );
  }

  if (!response.ok) {
    if (response.status >= 502 && response.status <= 504) {
      const viaProxy =
        typeof API_URL === "string" && API_URL.startsWith("/");
      throw new Error(
        viaProxy
          ? `A API não foi alcançada (${response.status}). Em dev: suba a API em :3011 (docker compose up -d). Em produção (Coolify): defina REACT_APP_API_URL=https://api-blum.jwsoftware.com.br/api/v2 no build do frontend ou corrija BACKEND_PROXY_HOST. Não indica senha errada.`
          : `A API não foi alcançada (${response.status}). Verifique se ${API_URL} está online. Não indica senha errada.`,
      );
    }
    const error = (await response.json().catch(() => ({}))) as {
      error?: string;
      message?: string;
    };
    const fromServer =
      (typeof error.error === "string" && error.error.trim()) ||
      (typeof error.message === "string" && error.message.trim()) ||
      "";
    const fallback429 =
      response.status === 429
        ? "Muitas tentativas de login. Aguarde alguns minutos e tente novamente."
        : "";
    throw new Error(fromServer || fallback429 || "Credenciais inválidas");
  }

  const data = (await response.json()) as AuthResponse;
  if (data?.user?.tenantSlug) {
    setStoredTenantSlug(data.user.tenantSlug);
  } else if (slug) {
    setStoredTenantSlug(slug);
  }
  return data;
};

export const signupTenant = async (
  params: SignupTenantParams,
): Promise<SignupTenantResponse> => {
  let response: Response;
  try {
    response = await fetch(`${API_URL}/tenants/signup`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(params),
    });
  } catch {
    throw new Error(
      "Sem ligação à internet ou servidor indisponível. Verifique a rede e tente novamente.",
    );
  }

  const payload = (await response.json().catch(() => ({}))) as SignupTenantResponse;
  if (!response.ok) {
    throw new Error(
      payload.error || payload.message || "Não foi possível criar a empresa",
    );
  }
  if (payload?.tenant?.slug) {
    setStoredTenantSlug(payload.tenant.slug);
  }
  return payload;
};

export const checkTenantSlug = async (
  slug: string,
): Promise<CheckSlugResponse> => {
  const normalized = encodeURIComponent(String(slug || "").trim());
  if (!normalized) {
    return { available: false, slug: "", error: "Identificador obrigatório" };
  }
  const response = await fetch(`${API_URL}/tenants/check-slug/${normalized}`);
  const payload = (await response.json().catch(() => ({}))) as CheckSlugResponse & {
    error?: string;
  };
  if (!response.ok) {
    throw new Error(payload.error || "Erro ao verificar identificador");
  }
  return payload;
};

export const verifyToken = async (): Promise<VerifyTokenResponse> =>
  apiRequest<VerifyTokenResponse>(`${API_URL}/auth/verify`);

export const logout = async (): Promise<void> => {
  const refreshToken = localStorage.getItem("refreshToken");
  try {
    if (refreshToken) {
      await fetch(`${API_URL}/auth/logout`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          ...(localStorage.getItem("token")
            ? { Authorization: `Bearer ${localStorage.getItem("token")}` }
            : {}),
        },
        body: JSON.stringify({ refreshToken }),
      });
    }
  } catch {
    /* ignore — limpa sessão local mesmo se API falhar */
  }
  try {
    await resetOfflineStorage();
  } catch {
    /* ignore */
  }
  clearLocalAuth();
  clearStoredTenantSlug();
};
