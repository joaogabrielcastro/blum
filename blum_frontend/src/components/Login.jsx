import { useState, useEffect, useRef } from "react";
import { Link, useLocation } from "react-router-dom";
import { login } from "../services/apiService";
import {
  AUTH_NOTICE_KEY,
  AUTH_NOTICE_FORBIDDEN,
  AUTH_NOTICE_SESSION_EXPIRED,
} from "../constants/authNotice";
import {
  getStoredTenantSlug,
  setStoredTenantSlug,
} from "../constants/tenantStorage";
import { resolveTenantSlugFromHost } from "../utils/tenantHost";

const FEATURES = [
  "Orçamentos e pedidos em tempo real",
  "Gestão de clientes e representadas",
  "Relatórios e equipe comercial integrados",
];

function BrandMark({ size = "md", onLogoError }) {
  const [logoError, setLogoError] = useState(false);
  const sizes = {
    sm: "h-10 w-10 rounded-xl text-base",
    md: "h-12 w-12 rounded-xl text-lg",
    lg: "h-14 w-14 rounded-2xl text-xl",
  };

  if (!logoError) {
    return (
      <img
        src="/images/BLU1M.jpg"
        alt=""
        className={`${sizes[size]} object-cover ring-2 ring-white/20`}
        onError={() => {
          setLogoError(true);
          onLogoError?.();
        }}
      />
    );
  }

  return (
    <div
      className={`flex ${sizes[size]} items-center justify-center bg-gradient-to-br from-blue-500 to-blue-800 font-bold text-white shadow-lg ring-2 ring-white/20`}
      aria-hidden
    >
      B
    </div>
  );
}

const Login = ({ onLogin }) => {
  const location = useLocation();
  const hostTenantSlug = resolveTenantSlugFromHost();
  const usernameRef = useRef(null);

  const initialSlug =
    hostTenantSlug || getStoredTenantSlug() || "default";

  const [tenantSlug, setTenantSlug] = useState(initialSlug);
  const tenantFromSubdomain = Boolean(hostTenantSlug);
  const [showCompanyField, setShowCompanyField] = useState(
    () =>
      tenantFromSubdomain ||
      (initialSlug && initialSlug !== "default"),
  );

  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  const isFormValid =
    tenantSlug.trim() !== "" && username.trim() !== "" && password.trim() !== "";

  useEffect(() => {
    const state = location.state;
    if (state?.tenantSlug) {
      setTenantSlug(state.tenantSlug);
      setStoredTenantSlug(state.tenantSlug);
      if (state.tenantSlug !== "default") setShowCompanyField(true);
    }
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

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");
    setSuccess("");

    const cleanUsername = username.trim();
    const cleanPassword = password.trim();
    const cleanSlug = tenantSlug.trim() || "default";

    if (!cleanUsername || !cleanPassword) {
      setError("Preencha e-mail e senha.");
      return;
    }

    setIsLoading(true);

    try {
      const response = await login(cleanUsername, cleanPassword, cleanSlug);
      localStorage.setItem("token", response.token);
      localStorage.setItem("user", JSON.stringify(response.user));
      if (response.user?.tenantSlug) {
        setStoredTenantSlug(response.user.tenantSlug);
      }
      onLogin(response.user.role, response.user.id, response.user);
    } catch (err) {
      setError(err.message || "E-mail ou senha incorretos. Tente novamente.");
    } finally {
      setIsLoading(false);
    }
  };

  const inputClass =
    "w-full rounded-xl border border-slate-300 bg-white py-2.5 text-slate-900 placeholder:text-slate-400 transition focus:border-blue-600 focus:outline-none focus:ring-2 focus:ring-blue-600/20 disabled:cursor-not-allowed disabled:bg-slate-50";

  return (
    <div className="min-h-screen bg-slate-50 lg:grid lg:grid-cols-[minmax(0,1.05fr)_minmax(0,1fr)]">
      {/* Painel de marca — desktop */}
      <div className="relative hidden lg:flex flex-col justify-between overflow-hidden bg-gradient-to-br from-slate-900 via-blue-950 to-blue-800 px-12 py-14 text-white">
        <div className="absolute inset-0 opacity-[0.08] bg-[radial-gradient(circle_at_30%_20%,white_0%,transparent_55%)]" />
        <div className="absolute -right-24 -top-24 h-80 w-80 rounded-full bg-blue-400/25 blur-3xl" />
        <div className="absolute -bottom-32 -left-16 h-96 w-96 rounded-full bg-indigo-500/20 blur-3xl" />

        <div className="relative z-10 flex items-center gap-3">
          <BrandMark size="md" />
          <div>
            <p className="text-2xl font-bold tracking-tight">Blum</p>
            <p className="text-sm text-blue-100/90">Gestão comercial</p>
          </div>
        </div>

        <div className="relative z-10 max-w-md">
          <h2 className="text-3xl font-bold leading-tight tracking-tight">
            Vendas, clientes e equipe no mesmo lugar.
          </h2>
          <p className="mt-4 text-base leading-relaxed text-blue-100/90">
            Plataforma para representantes comerciais que precisam de agilidade
            no campo e controle na operação.
          </p>
          <ul className="mt-8 space-y-3">
            {FEATURES.map((feature) => (
              <li key={feature} className="flex items-start gap-3 text-sm text-blue-50">
                <span className="mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-emerald-400/20 text-emerald-300">
                  <svg className="h-3 w-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3} aria-hidden>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                  </svg>
                </span>
                {feature}
              </li>
            ))}
          </ul>
        </div>

        <p className="relative z-10 text-xs text-blue-200/70">
          © {new Date().getFullYear()} JW Soluções · Blum
        </p>
      </div>

      {/* Formulário */}
      <div className="flex min-h-screen flex-col">
        {/* Faixa mobile */}
        <div className="bg-gradient-to-r from-slate-900 via-blue-950 to-blue-800 px-6 py-8 text-white lg:hidden">
          <div className="mx-auto flex max-w-md items-center gap-3">
            <BrandMark size="sm" />
            <div>
              <h1 className="text-xl font-bold tracking-tight">Blum</h1>
              <p className="text-sm text-blue-100/90">Gestão comercial</p>
            </div>
          </div>
        </div>

        <div className="flex flex-1 flex-col justify-center px-4 py-8 sm:px-8 lg:px-16 lg:py-10">
          <div className="mx-auto w-full max-w-md">
            <div className="rounded-2xl border border-slate-200/80 bg-white p-6 shadow-sm sm:p-8 lg:p-10">
              <div className="mb-6 lg:mb-8">
                <h2 className="text-2xl font-bold text-slate-900">Entrar</h2>
                <p className="mt-1.5 text-sm text-slate-500">
                  {tenantFromSubdomain
                    ? `Acesso à empresa ${tenantSlug}`
                    : "Use suas credenciais para acessar o sistema."}
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
                  className="mb-5 flex gap-3 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700"
                  role="alert"
                  aria-live="assertive"
                >
                  <svg className="mt-0.5 h-5 w-5 shrink-0" fill="currentColor" viewBox="0 0 20 20" aria-hidden>
                    <path
                      fillRule="evenodd"
                      d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z"
                      clipRule="evenodd"
                    />
                  </svg>
                  <span>{error}</span>
                </div>
              ) : null}

              <form onSubmit={handleSubmit} className="space-y-4" noValidate>
                {/* Empresa: subdomínio, expandido ou colapsado */}
                {tenantFromSubdomain ? (
                  <div className="rounded-xl border border-blue-100 bg-blue-50/60 px-4 py-3">
                    <p className="text-xs font-medium uppercase tracking-wide text-blue-700/80">
                      Empresa
                    </p>
                    <p className="mt-0.5 font-mono text-sm font-semibold text-slate-800">
                      {tenantSlug}
                    </p>
                    <p className="mt-1 text-xs text-slate-500">
                      Identificado automaticamente pelo endereço.
                    </p>
                  </div>
                ) : showCompanyField ? (
                  <div>
                    <label htmlFor="tenantSlug" className="mb-1.5 block text-sm font-medium text-slate-700">
                      Identificador da empresa
                    </label>
                    <input
                      id="tenantSlug"
                      type="text"
                      autoComplete="organization"
                      value={tenantSlug}
                      onChange={(e) => {
                        setTenantSlug(
                          e.target.value.toLowerCase().replace(/[^a-z0-9-]/g, ""),
                        );
                        setError("");
                      }}
                      placeholder="ex.: minha-empresa"
                      required
                      disabled={isLoading}
                      className={`${inputClass} px-4 font-mono text-sm`}
                    />
                    <p className="mt-1.5 text-xs text-slate-500">
                      Código da sua empresa no Blum. Ambiente legado:{" "}
                      <button
                        type="button"
                        className="font-mono text-blue-600 hover:underline"
                        onClick={() => {
                          setTenantSlug("default");
                          setError("");
                        }}
                      >
                        default
                      </button>
                    </p>
                  </div>
                ) : (
                  <input type="hidden" id="tenantSlug" name="tenantSlug" value={tenantSlug} readOnly />
                )}

                <div>
                  <label htmlFor="username" className="mb-1.5 block text-sm font-medium text-slate-700">
                    E-mail ou usuário
                  </label>
                  <div className="relative">
                    <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3.5">
                      <svg className="h-5 w-5 text-slate-400" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden>
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.75} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
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
                      className={`${inputClass} pl-11 pr-4`}
                    />
                  </div>
                </div>

                <div>
                  <label htmlFor="password" className="mb-1.5 block text-sm font-medium text-slate-700">
                    Senha
                  </label>
                  <div className="relative">
                    <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3.5">
                      <svg className="h-5 w-5 text-slate-400" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden>
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.75} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
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
                      className={`${inputClass} pl-11 pr-12`}
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword((v) => !v)}
                      className="absolute inset-y-0 right-0 flex items-center rounded-r-xl px-3.5 text-slate-400 hover:text-slate-600 focus:outline-none focus:ring-2 focus:ring-inset focus:ring-blue-500"
                      aria-label={showPassword ? "Ocultar senha" : "Mostrar senha"}
                      aria-pressed={showPassword}
                    >
                      {showPassword ? (
                        <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden>
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.75} d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7a9.97 9.97 0 011.563-3.029m5.858.908a3 3 0 114.243 4.243M9.878 9.878l4.242 4.242M9.88 9.88l-3.29-3.29m7.532 7.532l3.29 3.29M3 3l3.59 3.59m0 0A9.953 9.953 0 0112 5c4.478 0 8.268 2.943 9.543 7a10.025 10.025 0 01-4.132 5.411m0 0L21 21" />
                        </svg>
                      ) : (
                        <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden>
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.75} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                        </svg>
                      )}
                    </button>
                  </div>
                </div>

                {!tenantFromSubdomain && !showCompanyField ? (
                  <button
                    type="button"
                    onClick={() => setShowCompanyField(true)}
                    className="text-left text-sm text-blue-600 hover:text-blue-800 hover:underline"
                  >
                    Acessar outra empresa
                  </button>
                ) : null}

                <button
                  type="submit"
                  disabled={isLoading || !isFormValid}
                  className="flex w-full items-center justify-center rounded-xl bg-blue-700 py-3 text-sm font-semibold text-white shadow-md transition hover:bg-blue-800 focus:outline-none focus:ring-2 focus:ring-blue-600 focus:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
                >
                  {isLoading ? (
                    <>
                      <svg className="-ml-1 mr-2 h-5 w-5 animate-spin" fill="none" viewBox="0 0 24 24" aria-hidden>
                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                      </svg>
                      Entrando…
                    </>
                  ) : (
                    "Entrar"
                  )}
                </button>
              </form>

              <div className="mt-6 border-t border-slate-100 pt-6 text-center">
                <p className="text-sm text-slate-500">
                  Primeira vez no Blum?{" "}
                  <Link
                    to="/signup"
                    className="font-semibold text-blue-700 hover:text-blue-800 hover:underline"
                  >
                    Criar empresa
                  </Link>
                </p>
              </div>
            </div>

            <p className="mt-6 text-center text-xs text-slate-400 lg:hidden">
              © {new Date().getFullYear()} JW Soluções · Blum
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Login;
