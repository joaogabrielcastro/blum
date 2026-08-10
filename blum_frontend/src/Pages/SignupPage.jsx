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
import AuthShell from "../components/auth/AuthShell";
import FormField, { inputClassName } from "../components/ui/FormField";
import { PrimaryButton } from "../components/ui/Surface";

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
    <AuthShell
      headline="Comece a operar em poucos minutos."
      description="Crie a conta da empresa, escolha o plano e convide a equipe quando estiver pronto."
    >
      <div className="rounded-2xl border border-edge bg-surface p-6 shadow-soft sm:p-8">
        <div className="mb-6">
          <h2 className="text-2xl font-semibold tracking-tight text-ink">
            Criar conta no Blum
          </h2>
          <p className="mt-1.5 text-sm text-ink-muted">
            Para empresas e representantes comerciais autônomos.
          </p>
        </div>

        {error ? (
          <div
            className="mb-5 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-800"
            role="alert"
          >
            {error}
          </div>
        ) : null}

        <form onSubmit={handleSubmit} className="space-y-4">
          <FormField
            label="Nome da empresa ou representante"
            htmlFor="companyName"
            required
          >
            <input
              id="companyName"
              type="text"
              value={companyName}
              onChange={(e) => setCompanyName(e.target.value)}
              placeholder="Ex.: Acme Representações"
              required
              disabled={isLoading}
              className={inputClassName()}
            />
          </FormField>

          <FormField
            label="CNPJ ou CPF"
            htmlFor="taxId"
            required
            error={
              localTaxIdError ||
              (taxIdStatus && !taxIdStatus.available
                ? taxIdStatus.error
                : undefined)
            }
            hint="Documento da empresa (CNPJ) ou do representante autônomo (CPF)."
          >
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
              className={`${inputClassName(Boolean(localTaxIdError || (taxIdStatus && !taxIdStatus.available)))} font-mono`}
            />
          </FormField>
          {taxIdStatus?.available && taxIdType && !localTaxIdError ? (
            <p className="-mt-2 text-xs text-emerald-600">
              {formatTaxIdLabel(taxIdType)} disponível para cadastro.
            </p>
          ) : null}

          <FormField
            label="E-mail do administrador"
            htmlFor="adminEmail"
            required
          >
            <input
              id="adminEmail"
              type="email"
              autoComplete="email"
              value={adminEmail}
              onChange={(e) => setAdminEmail(e.target.value)}
              placeholder="admin@suaempresa.com.br"
              required
              disabled={isLoading}
              className={inputClassName()}
            />
          </FormField>

          <FormField label="Nome do administrador" htmlFor="adminName">
            <input
              id="adminName"
              type="text"
              value={adminName}
              onChange={(e) => setAdminName(e.target.value)}
              placeholder="Seu nome (opcional)"
              disabled={isLoading}
              className={inputClassName()}
            />
          </FormField>

          <FormField
            label="Senha"
            htmlFor="adminPassword"
            required
            hint="Mínimo 6 caracteres"
          >
            <input
              id="adminPassword"
              type="password"
              autoComplete="new-password"
              value={adminPassword}
              onChange={(e) => setAdminPassword(e.target.value)}
              placeholder="••••••••"
              required
              minLength={6}
              disabled={isLoading}
              className={inputClassName()}
            />
          </FormField>

          <PrimaryButton
            type="submit"
            disabled={isLoading || !isFormValid}
            className="!min-h-11 w-full"
          >
            {isLoading ? "Criando conta…" : "Criar conta"}
          </PrimaryButton>
        </form>

        <p className="mt-6 border-t border-edge pt-6 text-center text-sm text-ink-muted">
          Já tem conta?{" "}
          <Link
            to="/login"
            className="font-semibold text-brand hover:text-brand-600 hover:underline"
          >
            Entrar
          </Link>
        </p>
      </div>
    </AuthShell>
  );
};

export default SignupPage;
