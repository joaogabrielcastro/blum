import { useState, useEffect, useRef } from "react";
import { Link, useLocation } from "react-router-dom";
import { login } from "../services/apiService";
import { persistAuthSession } from "../utils/authSession";
import {
  AUTH_NOTICE_KEY,
  AUTH_NOTICE_FORBIDDEN,
  AUTH_NOTICE_SESSION_EXPIRED,
  AUTH_NOTICE_SUBSCRIPTION_REQUIRED,
} from "../constants/authNotice";
import { resolveTenantSlugFromHost } from "../utils/tenantHost";
import AuthShell from "./auth/AuthShell";
import FormField, { inputClassName } from "./ui/FormField";
import { PrimaryButton, GhostButton } from "./ui/Surface";

const ROLE_LABELS = {
  admin: "Administrador",
  salesperson: "Vendedor",
};

const Login = ({ onLogin }) => {
  const location = useLocation();
  const hostTenantSlug = resolveTenantSlugFromHost();
  const usernameRef = useRef(null);

  const tenantFromSubdomain = Boolean(hostTenantSlug);
  const [tenantSlug] = useState(hostTenantSlug || "");
  const [tenantChoices, setTenantChoices] = useState(null);
  const [pendingLogin, setPendingLogin] = useState(null);

  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  const isFormValid = username.trim() !== "" && password.trim() !== "";

  useEffect(() => {
    const state = location.state;
    if (state?.message) {
      setSuccess(state.message);
    }
  }, [location.state]);

  useEffect(() => {
    try {
      const reason = sessionStorage.getItem(AUTH_NOTICE_KEY);
      if (reason) {
        sessionStorage.removeItem(AUTH_NOTICE_KEY);
        if (reason === AUTH_NOTICE_SESSION_EXPIRED) {
          setError("Sessão expirada. Inicie sessão novamente.");
        } else if (reason === AUTH_NOTICE_FORBIDDEN) {
          setError(
            "Sem permissão para essa ação. Use uma conta com acesso adequado.",
          );
        } else if (reason === AUTH_NOTICE_SUBSCRIPTION_REQUIRED) {
          setError(
            "Assinatura inativa. Inicie sessão e regularize o plano em Assinatura.",
          );
        }
      }
    } catch {
      /* ignore */
    }
  }, []);

  useEffect(() => {
    const t = setTimeout(() => usernameRef.current?.focus(), 100);
    return () => clearTimeout(t);
  }, []);

  const completeLogin = (response) => {
    persistAuthSession(response);
    onLogin(response.user.role, response.user.id, response.user);
  };

  const resolveTenantSlugForRequest = () => {
    if (tenantFromSubdomain) {
      return tenantSlug.trim();
    }
    return undefined;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");
    setSuccess("");
    setTenantChoices(null);

    const cleanUsername = username.trim();
    const cleanPassword = password.trim();
    const cleanSlug = resolveTenantSlugForRequest();

    if (!cleanUsername || !cleanPassword) {
      setError("Preencha e-mail e senha.");
      return;
    }

    setIsLoading(true);

    try {
      const response = await login(cleanUsername, cleanPassword, cleanSlug);
      completeLogin(response);
    } catch (err) {
      if (err.code === "MULTIPLE_TENANTS" && err.tenants?.length) {
        setPendingLogin({ username: cleanUsername, password: cleanPassword });
        setTenantChoices(err.tenants);
        setError("");
        return;
      }
      setError(err.message || "E-mail ou senha incorretos. Tente novamente.");
    } finally {
      setIsLoading(false);
    }
  };

  const handleSelectTenant = async (slug) => {
    if (!pendingLogin || !slug) return;
    setError("");
    setIsLoading(true);
    try {
      const response = await login(
        pendingLogin.username,
        pendingLogin.password,
        slug,
      );
      setTenantChoices(null);
      setPendingLogin(null);
      completeLogin(response);
    } catch (err) {
      setError(err.message || "Não foi possível entrar nesta empresa.");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <AuthShell>
      <div className="rounded-2xl border border-edge bg-surface p-6 shadow-soft sm:p-8 lg:p-10">
        <div className="mb-6 lg:mb-8">
          <h2 className="text-2xl font-semibold tracking-tight text-ink">
            Entrar
          </h2>
          <p className="mt-1.5 text-sm text-ink-muted">
            {tenantFromSubdomain
              ? `Acesso à empresa ${tenantSlug}`
              : tenantChoices?.length
                ? "Escolha a empresa para continuar."
                : "Informe e-mail e senha — identificamos sua empresa automaticamente."}
          </p>
        </div>

        {success ? (
          <div
            className="mb-5 rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-800"
            role="status"
            aria-live="polite"
          >
            {success}
          </div>
        ) : null}

        {error ? (
          <div
            className="mb-5 flex gap-3 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-800"
            role="alert"
            aria-live="assertive"
          >
            <svg
              className="mt-0.5 h-5 w-5 shrink-0"
              fill="currentColor"
              viewBox="0 0 20 20"
              aria-hidden
            >
              <path
                fillRule="evenodd"
                d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z"
                clipRule="evenodd"
              />
            </svg>
            <span>{error}</span>
          </div>
        ) : null}

        {tenantChoices?.length ? (
          <div
            className="mb-5 space-y-2"
            role="listbox"
            aria-label="Empresas disponíveis"
          >
            {tenantChoices.map((tenant) => (
              <button
                key={tenant.slug}
                type="button"
                disabled={isLoading}
                onClick={() => handleSelectTenant(tenant.slug)}
                className="flex min-h-11 w-full items-center justify-between rounded-xl border border-edge bg-surface-muted px-4 py-3 text-left transition hover:border-brand/40 hover:bg-brand-50 disabled:opacity-50 dark:hover:bg-brand/15"
              >
                <div>
                  <p className="font-semibold text-ink">{tenant.name}</p>
                  <p className="text-xs text-ink-muted">
                    {ROLE_LABELS[tenant.role] || tenant.role}
                  </p>
                </div>
                <span className="font-mono text-xs text-ink-muted">
                  {tenant.slug}
                </span>
              </button>
            ))}
            <GhostButton
              type="button"
              className="!px-0 !text-sm"
              onClick={() => {
                setTenantChoices(null);
                setPendingLogin(null);
              }}
            >
              Voltar
            </GhostButton>
          </div>
        ) : null}

        <form onSubmit={handleSubmit} className="space-y-4" noValidate>
          {!tenantChoices?.length ? (
            <>
              {tenantFromSubdomain ? (
                <div className="rounded-xl border border-brand-100 bg-brand-50/70 px-4 py-3">
                  <p className="text-xs font-medium uppercase tracking-wide text-brand-700">
                    Empresa
                  </p>
                  <p className="mt-0.5 font-mono text-sm font-semibold text-ink">
                    {tenantSlug}
                  </p>
                  <p className="mt-1 text-xs text-ink-muted">
                    Identificado automaticamente pelo endereço.
                  </p>
                </div>
              ) : null}

              <FormField label="E-mail ou usuário" htmlFor="username" required>
                <div className="relative">
                  <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3.5">
                    <svg
                      className="h-5 w-5 text-ink-muted"
                      fill="none"
                      stroke="currentColor"
                      viewBox="0 0 24 24"
                      aria-hidden
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={1.75}
                        d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z"
                      />
                    </svg>
                  </div>
                  <input
                    ref={usernameRef}
                    id="username"
                    type="text"
                    inputMode="email"
                    autoComplete="username"
                    value={username}
                    onChange={(e) => {
                      setUsername(e.target.value);
                      setError("");
                    }}
                    placeholder="seu@email.com"
                    required
                    disabled={isLoading}
                    className={`${inputClassName()} pl-11 pr-4`}
                  />
                </div>
              </FormField>

              <FormField label="Senha" htmlFor="password" required>
                <div className="relative">
                  <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3.5">
                    <svg
                      className="h-5 w-5 text-ink-muted"
                      fill="none"
                      stroke="currentColor"
                      viewBox="0 0 24 24"
                      aria-hidden
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={1.75}
                        d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z"
                      />
                    </svg>
                  </div>
                  <input
                    id="password"
                    type={showPassword ? "text" : "password"}
                    autoComplete="current-password"
                    value={password}
                    onChange={(e) => {
                      setPassword(e.target.value);
                      setError("");
                    }}
                    placeholder="Sua senha"
                    required
                    disabled={isLoading}
                    className={`${inputClassName()} pl-11 pr-12`}
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword((v) => !v)}
                    className="absolute inset-y-0 right-0 flex min-w-11 items-center justify-center rounded-r-xl px-3 text-ink-muted hover:text-ink focus:outline-none focus:ring-2 focus:ring-inset focus:ring-brand/40"
                    aria-label={
                      showPassword ? "Ocultar senha" : "Mostrar senha"
                    }
                    aria-pressed={showPassword}
                  >
                    {showPassword ? (
                      <svg
                        className="h-5 w-5"
                        fill="none"
                        stroke="currentColor"
                        viewBox="0 0 24 24"
                        aria-hidden
                      >
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          strokeWidth={1.75}
                          d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7a9.97 9.97 0 011.563-3.029m5.858.908a3 3 0 114.243 4.243M9.878 9.878l4.242 4.242M9.88 9.88l-3.29-3.29m7.532 7.532l3.29 3.29M3 3l3.59 3.59m0 0A9.953 9.953 0 0112 5c4.478 0 8.268 2.943 9.543 7a10.025 10.025 0 01-4.132 5.411m0 0L21 21"
                        />
                      </svg>
                    ) : (
                      <svg
                        className="h-5 w-5"
                        fill="none"
                        stroke="currentColor"
                        viewBox="0 0 24 24"
                        aria-hidden
                      >
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          strokeWidth={1.75}
                          d="M15 12a3 3 0 11-6 0 3 3 0 016 0z M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z"
                        />
                      </svg>
                    )}
                  </button>
                </div>
              </FormField>

              <PrimaryButton
                type="submit"
                disabled={isLoading || !isFormValid}
                className="!min-h-11 w-full"
              >
                {isLoading ? (
                  <>
                    <svg
                      className="h-5 w-5 animate-spin"
                      fill="none"
                      viewBox="0 0 24 24"
                      aria-hidden
                    >
                      <circle
                        className="opacity-25"
                        cx="12"
                        cy="12"
                        r="10"
                        stroke="currentColor"
                        strokeWidth="4"
                      />
                      <path
                        className="opacity-75"
                        fill="currentColor"
                        d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                      />
                    </svg>
                    Entrando…
                  </>
                ) : (
                  "Entrar"
                )}
              </PrimaryButton>
            </>
          ) : null}
        </form>

        <div className="mt-6 border-t border-edge pt-6 text-center">
          <p className="text-sm text-ink-muted">
            Primeira vez no Blum?{" "}
            <Link
              to="/signup"
              className="font-semibold text-brand hover:text-brand-600 hover:underline"
            >
              Criar empresa
            </Link>
          </p>
        </div>
      </div>
    </AuthShell>
  );
};

export default Login;
