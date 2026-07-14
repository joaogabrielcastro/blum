import {
  AUTH_NOTICE_FORBIDDEN,
  AUTH_NOTICE_KEY,
  AUTH_NOTICE_SESSION_EXPIRED,
  AUTH_NOTICE_SUBSCRIPTION_REQUIRED,
} from "../../constants/authNotice";
import { getStoredTenantSlug } from "../../constants/tenantStorage";
import { refreshAccessToken } from "../auth/refreshSession";
import type { ApiErrorBody, SubscriptionSummary } from "../../types/api";
import { PLAN_FEATURE_REQUIRED_EVENT } from "../../utils/planFeatures";
import { isSentryConfigured, Sentry } from "../../observability/sentry";

export const API_URL =
  process.env.REACT_APP_API_URL || "/api/v2";

export interface ApiRequestError extends Error {
  status?: number;
  code?: string;
  feature?: string;
  requiredPlan?: string;
  details?: unknown;
  subscription?: SubscriptionSummary;
  stockWarnings?: unknown[];
  requestId?: string | null;
}

interface RequestInternal {
  _authRetried?: boolean;
}

type AuthHeaders = Record<string, string>;

function createRequestId(): string {
  if (typeof crypto !== "undefined" && typeof crypto.randomUUID === "function") {
    return crypto.randomUUID();
  }
  return `req_${Date.now()}_${Math.random().toString(36).slice(2, 10)}`;
}

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
    "x-request-id": createRequestId(),
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
  const requestId =
    response.headers.get("x-request-id") ||
    response.headers.get("X-Request-Id");
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

  const attachMeta = (customError: ApiRequestError) => {
    customError.status = response.status;
    customError.requestId =
      requestId ||
      (typeof error.requestId === "string" ? error.requestId : null);
    if (isSentryConfigured() && response.status >= 500) {
      Sentry.captureException(customError, {
        tags: {
          request_id: customError.requestId || "unknown",
          http_status: String(response.status),
        },
      });
    }
    return customError;
  };

  if (error.details && Array.isArray(error.details) && error.details.length) {
    const customError = new Error(
      detailText || serverText || `Erro: ${response.status}`,
    ) as ApiRequestError;
    customError.details = error.details;
    throw attachMeta(customError);
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
  customError.code = error.code;
  customError.feature = error.feature;
  customError.requiredPlan = error.requiredPlan;
  customError.subscription = error.subscription;
  customError.stockWarnings = error.stockWarnings;
  throw attachMeta(customError);
}

function emitPlanFeatureRequired(error: ApiRequestError): void {
  if (error.code !== "PLAN_FEATURE_REQUIRED") return;
  try {
    window.dispatchEvent(
      new CustomEvent(PLAN_FEATURE_REQUIRED_EVENT, {
        detail: {
          feature: error.feature,
          requiredPlan: error.requiredPlan || "professional",
          message: error.message,
        },
      }),
    );
  } catch {
    /* ignore */
  }
}

function redirectAdminToSubscription(): void {
  try {
    sessionStorage.setItem(
      AUTH_NOTICE_KEY,
      AUTH_NOTICE_SUBSCRIPTION_REQUIRED,
    );
  } catch {
    /* ignore */
  }
  try {
    const saved = localStorage.getItem("user");
    const parsed = saved ? (JSON.parse(saved) as { role?: string }) : null;
    if (
      parsed?.role === "admin" &&
      !window.location.pathname.startsWith("/subscription")
    ) {
      window.location.href = "/subscription";
    }
  } catch {
    /* ignore */
  }
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
    try {
      await parseErrorResponse(response);
    } catch (err) {
      const apiErr = err as ApiRequestError;
      if (response.status === 402) {
        redirectAdminToSubscription();
        throw apiErr;
      }
      if (response.status === 403) {
        if (apiErr.code === "PLAN_FEATURE_REQUIRED") {
          emitPlanFeatureRequired(apiErr);
          throw apiErr;
        }
        forceLogout(403);
      }
      throw apiErr;
    }
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
    "x-request-id": createRequestId(),
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
    try {
      await parseErrorResponse(response);
    } catch (err) {
      const apiErr = err as ApiRequestError;
      if (response.status === 402) {
        redirectAdminToSubscription();
        throw apiErr;
      }
      if (response.status === 403) {
        if (apiErr.code === "PLAN_FEATURE_REQUIRED") {
          emitPlanFeatureRequired(apiErr);
          throw apiErr;
        }
        forceLogout(403);
      }
      throw apiErr;
    }
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
    try {
      await parseErrorResponse(response);
    } catch (err) {
      const apiErr = err as ApiRequestError;
      if (response.status === 402) {
        redirectAdminToSubscription();
        throw apiErr;
      }
      if (response.status === 403) {
        if (apiErr.code === "PLAN_FEATURE_REQUIRED") {
          emitPlanFeatureRequired(apiErr);
          throw apiErr;
        }
        forceLogout(403);
      }
      throw apiErr;
    }
  }

  return response.blob();
};
