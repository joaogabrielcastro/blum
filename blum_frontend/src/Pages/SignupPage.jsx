import { useState, useEffect, useCallback } from "react";
import { Link } from "react-router-dom";
import { signupTenant, checkTenantSlug, login } from "../services/apiService";
import { persistAuthSession } from "../utils/authSession";
import { getTenantLoginUrl } from "../utils/tenantHost";

function slugifyPreview(name) {
  return String(name || "")
    .trim()
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 60);
}

const SignupPage = () => {
  const [companyName, setCompanyName] = useState("");
  const [slug, setSlug] = useState("");
  const [slugTouched, setSlugTouched] = useState(false);
  const [adminEmail, setAdminEmail] = useState("");
  const [adminPassword, setAdminPassword] = useState("");
  const [adminName, setAdminName] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState("");
  const [slugStatus, setSlugStatus] = useState(null);

  useEffect(() => {
    if (!slugTouched && companyName) {
      setSlug(slugifyPreview(companyName));
    }
  }, [companyName, slugTouched]);

  const verifySlug = useCallback(async (value) => {
    const trimmed = value.trim();
    if (trimmed.length < 3) {
      setSlugStatus(null);
      return;
    }
    try {
      const result = await checkTenantSlug(trimmed);
      setSlugStatus(result);
    } catch {
      setSlugStatus(null);
    }
  }, []);

  useEffect(() => {
    const timer = setTimeout(() => {
      if (slug.trim().length >= 3) verifySlug(slug);
      else setSlugStatus(null);
    }, 400);
    return () => clearTimeout(timer);
  }, [slug, verifySlug]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");
    setIsLoading(true);
    try {
      const trimmedSlug = slug.trim();
      const trimmedEmail = adminEmail.trim();
      const trimmedPassword = adminPassword.trim();

      await signupTenant({
        companyName: companyName.trim(),
        slug: trimmedSlug,
        adminEmail: trimmedEmail,
        adminPassword: trimmedPassword,
        adminName: adminName.trim() || companyName.trim(),
      });

      const auth = await login(trimmedEmail, trimmedPassword, trimmedSlug);
      persistAuthSession(auth);

      window.location.href = "/subscription?onboarding=1";
    } catch (err) {
      setError(err.message || "Não foi possível criar a empresa.");
    } finally {
      setIsLoading(false);
    }
  };

  const isFormValid =
    companyName.trim().length >= 2 &&
    slug.trim().length >= 3 &&
    adminEmail.trim() !== "" &&
    adminPassword.trim().length >= 6 &&
    slugStatus?.available !== false;

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col justify-center px-4 py-10 sm:px-8">
      <div className="mx-auto w-full max-w-lg">
        <div className="mb-8 text-center">
          <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-2xl bg-gradient-to-br from-blue-600 to-blue-800 text-xl font-bold text-white shadow-lg">
            B
          </div>
          <h1 className="text-2xl font-bold text-slate-900">Criar empresa no Blum</h1>
          <p className="mt-2 text-sm text-slate-500">
            Cadastre sua empresa e comece a usar a plataforma.
          </p>
        </div>

        <div className="rounded-2xl border border-slate-200/80 bg-white p-8 shadow-sm">
          {error ? (
            <div className="mb-6 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700" role="alert">
              {error}
            </div>
          ) : null}

          <form onSubmit={handleSubmit} className="space-y-5">
            <div>
              <label htmlFor="companyName" className="mb-1.5 block text-sm font-medium text-slate-700">
                Nome da empresa
              </label>
              <input
                id="companyName"
                type="text"
                value={companyName}
                onChange={(e) => setCompanyName(e.target.value)}
                placeholder="Ex.: Acme Representações"
                required
                disabled={isLoading}
                className="w-full rounded-xl border border-slate-300 px-4 py-2.5 text-slate-900 focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500/20 disabled:bg-slate-50"
              />
            </div>

            <div>
              <label htmlFor="slug" className="mb-1.5 block text-sm font-medium text-slate-700">
                Identificador da empresa
              </label>
              <input
                id="slug"
                type="text"
                value={slug}
                onChange={(e) => {
                  setSlugTouched(true);
                  setSlug(e.target.value.toLowerCase().replace(/[^a-z0-9-]/g, ""));
                }}
                placeholder="acme-representacoes"
                required
                disabled={isLoading}
                className="w-full rounded-xl border border-slate-300 px-4 py-2.5 font-mono text-sm text-slate-900 focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500/20 disabled:bg-slate-50"
              />
              <p className="mt-1.5 text-xs text-slate-500">
                Usado no login para identificar sua empresa (ex.: <span className="font-mono">acme-representacoes</span>).
              </p>
              {slugStatus && !slugStatus.available ? (
                <p className="mt-1 text-xs text-red-600">{slugStatus.error}</p>
              ) : null}
              {slugStatus?.available ? (
                <p className="mt-1 text-xs text-emerald-600">
                  Identificador disponível — URL:{" "}
                  <span className="font-mono">{getTenantLoginUrl(slug)}</span>
                </p>
              ) : null}
            </div>

            <div>
              <label htmlFor="adminEmail" className="mb-1.5 block text-sm font-medium text-slate-700">
                E-mail do administrador
              </label>
              <input
                id="adminEmail"
                type="email"
                autoComplete="email"
                value={adminEmail}
                onChange={(e) => setAdminEmail(e.target.value)}
                placeholder="admin@suaempresa.com.br"
                required
                disabled={isLoading}
                className="w-full rounded-xl border border-slate-300 px-4 py-2.5 text-slate-900 focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500/20 disabled:bg-slate-50"
              />
            </div>

            <div>
              <label htmlFor="adminName" className="mb-1.5 block text-sm font-medium text-slate-700">
                Nome do administrador <span className="text-slate-400">(opcional)</span>
              </label>
              <input
                id="adminName"
                type="text"
                value={adminName}
                onChange={(e) => setAdminName(e.target.value)}
                placeholder="Seu nome"
                disabled={isLoading}
                className="w-full rounded-xl border border-slate-300 px-4 py-2.5 text-slate-900 focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500/20 disabled:bg-slate-50"
              />
            </div>

            <div>
              <label htmlFor="adminPassword" className="mb-1.5 block text-sm font-medium text-slate-700">
                Senha
              </label>
              <input
                id="adminPassword"
                type="password"
                autoComplete="new-password"
                value={adminPassword}
                onChange={(e) => setAdminPassword(e.target.value)}
                placeholder="Mínimo 6 caracteres"
                required
                minLength={6}
                disabled={isLoading}
                className="w-full rounded-xl border border-slate-300 px-4 py-2.5 text-slate-900 focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500/20 disabled:bg-slate-50"
              />
            </div>

            <button
              type="submit"
              disabled={isLoading || !isFormValid}
              className="flex w-full items-center justify-center rounded-xl bg-blue-600 py-3 text-sm font-semibold text-white shadow-sm transition hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
            >
              {isLoading ? "Criando empresa…" : "Criar empresa"}
            </button>
          </form>

          <p className="mt-6 text-center text-sm text-slate-500">
            Já tem conta?{" "}
            <Link to="/login" className="font-medium text-blue-600 hover:text-blue-700">
              Entrar
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
};

export default SignupPage;
