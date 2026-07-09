import { useState, useEffect, useCallback } from "react";
import { Link } from "react-router-dom";
import { signupTenant, checkTenantTaxId, login } from "../services/apiService";
import { persistAuthSession } from "../utils/authSession";
import {
  formatTaxIdInput,
  formatTaxIdLabel,
  onlyTaxIdDigits,
  validateTaxIdClient,
} from "../utils/taxId";

const SignupPage = () => {
  const [companyName, setCompanyName] = useState("");
  const [taxId, setTaxId] = useState("");
  const [taxIdDigits, setTaxIdDigits] = useState("");
  const [taxIdType, setTaxIdType] = useState(null);
  const [adminEmail, setAdminEmail] = useState("");
  const [adminPassword, setAdminPassword] = useState("");
  const [adminName, setAdminName] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState("");
  const [taxIdStatus, setTaxIdStatus] = useState(null);
  const [localTaxIdError, setLocalTaxIdError] = useState("");

  const verifyTaxId = useCallback(async (digits) => {
    const local = validateTaxIdClient(digits);
    if (!local.ok) {
      setTaxIdStatus(null);
      setLocalTaxIdError(local.error || "");
      return;
    }
    setLocalTaxIdError("");
    setTaxIdType(local.type);
    try {
      const result = await checkTenantTaxId(local.digits);
      setTaxIdStatus(result);
      if (result.type) setTaxIdType(result.type);
    } catch {
      setTaxIdStatus(null);
    }
  }, []);

  useEffect(() => {
    const timer = setTimeout(() => {
      if (taxIdDigits.length >= 11) verifyTaxId(taxIdDigits);
      else {
        setTaxIdStatus(null);
        setLocalTaxIdError(
          taxIdDigits.length > 0 && taxIdDigits.length < 11
            ? "Informe os 11 dígitos do CPF ou 14 do CNPJ"
            : "",
        );
      }
    }, 400);
    return () => clearTimeout(timer);
  }, [taxIdDigits, verifyTaxId]);

  const handleTaxIdChange = (value) => {
    const digits = onlyTaxIdDigits(value).slice(0, 14);
    setTaxIdDigits(digits);
    setTaxId(formatTaxIdInput(digits));
    setTaxIdStatus(null);
    if (digits.length < 11) {
      setLocalTaxIdError("");
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");
    const local = validateTaxIdClient(taxIdDigits);
    if (!local.ok) {
      setLocalTaxIdError(local.error || "CNPJ ou CPF inválido");
      return;
    }

    setIsLoading(true);
    try {
      const trimmedEmail = adminEmail.trim();
      const trimmedPassword = adminPassword.trim();

      await signupTenant({
        companyName: companyName.trim(),
        taxId: local.digits,
        adminEmail: trimmedEmail,
        adminPassword: trimmedPassword,
        adminName: adminName.trim() || companyName.trim(),
      });

      const auth = await login(trimmedEmail, trimmedPassword);
      persistAuthSession(auth);

      window.location.href = "/subscription?onboarding=1";
    } catch (err) {
      setError(err.message || "Não foi possível criar a empresa.");
    } finally {
      setIsLoading(false);
    }
  };

  const taxIdComplete =
    taxIdDigits.length === 11 || taxIdDigits.length === 14;
  const taxIdValid = validateTaxIdClient(taxIdDigits).ok;

  const isFormValid =
    companyName.trim().length >= 2 &&
    taxIdComplete &&
    taxIdValid &&
    adminEmail.trim() !== "" &&
    adminPassword.trim().length >= 6 &&
    taxIdStatus?.available !== false &&
    !localTaxIdError;

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col justify-center px-4 py-10 sm:px-8">
      <div className="mx-auto w-full max-w-lg">
        <div className="mb-8 text-center">
          <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-2xl bg-gradient-to-br from-blue-600 to-blue-800 text-xl font-bold text-white shadow-lg">
            B
          </div>
          <h1 className="text-2xl font-bold text-slate-900">Criar conta no Blum</h1>
          <p className="mt-2 text-sm text-slate-500">
            Para empresas e representantes comerciais autônomos.
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
                Nome da empresa ou representante
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
              <label htmlFor="taxId" className="mb-1.5 block text-sm font-medium text-slate-700">
                CNPJ ou CPF
              </label>
              <input
                id="taxId"
                type="text"
                inputMode="numeric"
                autoComplete="off"
                value={taxId}
                onChange={(e) => handleTaxIdChange(e.target.value)}
                placeholder="00.000.000/0000-00 ou 000.000.000-00"
                required
                disabled={isLoading}
                className="w-full rounded-xl border border-slate-300 px-4 py-2.5 font-mono text-sm text-slate-900 focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500/20 disabled:bg-slate-50"
              />
              <p className="mt-1.5 text-xs text-slate-500">
                Documento da empresa (CNPJ) ou do representante autônomo (CPF). Identifica sua conta no sistema.
              </p>
              {localTaxIdError ? (
                <p className="mt-1 text-xs text-red-600">{localTaxIdError}</p>
              ) : null}
              {taxIdStatus && !taxIdStatus.available ? (
                <p className="mt-1 text-xs text-red-600">{taxIdStatus.error}</p>
              ) : null}
              {taxIdStatus?.available && taxIdType ? (
                <p className="mt-1 text-xs text-emerald-600">
                  {formatTaxIdLabel(taxIdType)} disponível para cadastro.
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
              {isLoading ? "Criando conta…" : "Criar conta"}
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
