import {
  AUTH_NOTICE_FORBIDDEN,
  AUTH_NOTICE_KEY,
  AUTH_NOTICE_SESSION_EXPIRED,
} from "../../constants/authNotice";
import { getStoredTenantSlug } from "../../constants/tenantStorage";
import { refreshAccessToken } from "../auth/refreshSession";
import type { ApiErrorBody, SubscriptionSummary } from "../../types/api";

export const API_URL =
  process.env.REACT_APP_API_URL || "/api/v2";

export interface ApiRequestError extends Error {
  status?: number;
  code?: string;
  details?: unknown;
  subscription?: SubscriptionSummary;
  stockWarnings?: unknown[];
}

interface RequestInternal {
  _authRetried?: boolean;
}

type AuthHeaders = Record<string, string>;

export const getAuthHeaders = (): AuthHeaders => {
  const token = localStorage.getItem("token");
  let tenantSlug = getStoredTenantSlug();
  try {
    const savedUser = localStorage.getItem("user");
    if (savedUser) {
      const parsed = JSON.parse(savedUser) as { tenantSlug?: string };
      if (parsed?.tenantSlug) tenantSlug = parsed.tenantSlug;
    }
  } catch {
    /* ignore */
  }
  return {
    "Content-Type": "application/json",
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
    ...(tenantSlug ? { "x-tenant-slug": tenantSlug } : {}),
  };
};

const forceLogout = (status: number): void => {
  if (status === 401 || status === 403) {
    try {
      sessionStorage.setItem(
        AUTH_NOTICE_KEY,
        status === 403 ? AUTH_NOTICE_FORBIDDEN : AUTH_NOTICE_SESSION_EXPIRED,
      );
    } catch {
      /* ignore */
    }
    localStorage.removeItem("token");
    localStorage.removeItem("user");
    localStorage.removeItem("refreshToken");
    window.location.href = "/";
  }
};

const pickServerMessage = (payload: unknown): string | null => {
  if (payload == null || typeof payload !== "object") return null;
  const body = payload as ApiErrorBody;
  const tryString = (v: unknown): string | null =>
    typeof v === "string" && v.trim() !== "" ? v.trim() : null;

  return (
    tryString(body.error) ||
    tryString(body.message) ||
    (body.error &&
      typeof body.error === "object" &&
      tryString((body.error as { message?: string }).message)) ||
    null
  );
};

const formatValidationDetails = (details: unknown): string => {
  if (!Array.isArray(details) || details.length === 0) return "";
  return details
    .map((err: unknown) => {
      if (err == null) return "";
      const row = err as {
        path?: string;
        param?: string;
        type?: string;
        msg?: string;
        message?: string;
      };
      const loc = row.path ?? row.param ?? row.type ?? "campo";
      const msg =
        row.msg ||
        row.message ||
        (typeof err === "string" ? err : JSON.stringify(err));
      return `${loc}: ${msg}`;
    })
    .filter(Boolean)
    .join("\n");
};

async function parseErrorResponse(response: Response): Promise<never> {
  const rawText = await response.text();
  let error: ApiErrorBody = {};
  try {
    error = rawText ? JSON.parse(rawText) : {};
  } catch {
    error = {
      message: rawText
        ? rawText.slice(0, 500)
        : "Resposta inválida do servidor",
    };
  }

  const serverText = pickServerMessage(error);
  const detailText = formatValidationDetails(error.details);
  const stringDetails =
    typeof error.details === "string" && error.details.trim() !== ""
      ? error.details.trim()
      : "";

  if (error.details && Array.isArray(error.details) && error.details.length) {
    const customError = new Error(
      detailText || serverText || `Erro: ${response.status}`,
    ) as ApiRequestError;
    customError.details = error.details;
    customError.status = response.status;
    throw customError;
  }

  const messageWithDetails =
    serverText && stringDetails && !serverText.includes(stringDetails)
      ? `${serverText} ${stringDetails}`
      : serverText || (stringDetails ? `Erro: ${stringDetails}` : null);

  const customError = new Error(
    messageWithDetails ||
      (response.status === 429
        ? "Muitas requisições. Aguarde alguns minutos e tente novamente."
        : null) ||
      (rawText && !serverText && rawText.length < 400
        ? rawText.trim()
        : null) ||
      `Erro HTTP ${response.status}`,
  ) as ApiRequestError;
  customError.status = response.status;
  customError.code = error.code;
  customError.subscription = error.subscription;
  customError.stockWarnings = error.stockWarnings;
  throw customError;
}

async function handleUnauthorized<T>(
  response: Response,
  retryFn: () => Promise<T>,
  internal: RequestInternal,
): Promise<T> {
  if (internal._authRetried || !localStorage.getItem("refreshToken")) {
    forceLogout(401);
    return parseErrorResponse(response);
  }
  try {
    await refreshAccessToken();
    return retryFn();
  } catch {
    forceLogout(401);
    return parseErrorResponse(response);
  }
}

export const apiRequest = async <T = unknown>(
  url: string,
  options: RequestInit = {},
  internal: RequestInternal = {},
): Promise<T> => {
  let response: Response;
  try {
    response = await fetch(url, {
      ...options,
      headers: {
        ...getAuthHeaders(),
        ...(options.headers as Record<string, string> | undefined),
      },
    });
  } catch {
    throw new Error(
      "Sem ligação à internet ou servidor indisponível. Verifique a rede e tente novamente.",
    );
  }

  if (!response.ok) {
    if (response.status === 401) {
      return handleUnauthorized(response, () =>
        apiRequest<T>(url, options, { ...internal, _authRetried: true }),
      internal);
    }
    if (response.status === 403) {
      forceLogout(403);
    }
    return parseErrorResponse(response);
  }

  return response.json() as Promise<T>;
};

function getUploadHeaders(): AuthHeaders {
  const token = localStorage.getItem("token");
  let tenantSlug = getStoredTenantSlug();
  try {
    const savedUser = localStorage.getItem("user");
    if (savedUser) {
      const parsed = JSON.parse(savedUser) as { tenantSlug?: string };
      if (parsed?.tenantSlug) tenantSlug = parsed.tenantSlug;
    }
  } catch {
    /* ignore */
  }
  return {
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
    ...(tenantSlug ? { "x-tenant-slug": tenantSlug } : {}),
  };
}

/** Upload multipart sem Content-Type JSON. */
export const apiUpload = async <T = unknown>(
  url: string,
  formData: FormData,
  internal: RequestInternal = {},
): Promise<T> => {
  const response = await fetch(url, {
    method: "POST",
    headers: getUploadHeaders(),
    body: formData,
  });

  if (!response.ok) {
    if (response.status === 401) {
      return handleUnauthorized(response, () =>
        apiUpload<T>(url, formData, { ...internal, _authRetried: true }),
      internal);
    }
    if (response.status === 403) forceLogout(403);
    const errorData = (await response.json().catch(() => ({}))) as {
      error?: string;
    };
    throw new Error(errorData.error || `Erro ${response.status}`);
  }

  return response.json() as Promise<T>;
};

export const apiDownloadBlob = async (
  url: string,
  internal: RequestInternal = {},
): Promise<Blob> => {
  const response = await fetch(url, { headers: getAuthHeaders() });

  if (!response.ok) {
    if (response.status === 401) {
      return handleUnauthorized(response, () =>
        apiDownloadBlob(url, { ...internal, _authRetried: true }),
      internal);
    }
    if (response.status === 403) forceLogout(403);
    const payload = (await response.json().catch(() => ({}))) as {
      error?: string;
    };
    throw new Error(payload.error || "Erro ao baixar arquivo");
  }

  return response.blob();
};
