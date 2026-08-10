import { useMemo, useState } from "react";
import apiService from "../services/apiService";
import { useToast } from "../context/ToastContext";
import FormField, { inputClassName } from "./ui/FormField";
import { PrimaryButton, SecondaryButton } from "./ui/Surface";
import { formatCepDisplay, lookupCep } from "../utils/cepLookup";

const KNOWN_FIELDS = new Set([
  "companyName",
  "nomeFantasia",
  "contactPerson",
  "phone",
  "region",
  "cnpj",
  "email",
  "street",
  "number",
  "complement",
  "neighborhood",
  "city",
  "zipcode",
]);

function normalizeDetailPath(path) {
  return String(path || "")
    .replace(/^body\.?/i, "")
    .replace(/^\[\d+\]\.?/, "")
    .replace(/^clients\.?/i, "")
    .trim();
}

function hasAddressData(data) {
  return Boolean(
    data.street ||
      data.number ||
      data.neighborhood ||
      data.city ||
      data.zipcode ||
      data.complement,
  );
}

const ClientsForm = ({ client, onClientAdded, onCancel, variant = "page" }) => {
  const toast = useToast();
  const isEditing = !!client;
  const isDrawer = variant === "drawer";

  const initialData = useMemo(
    () => ({
      companyName: client?.companyName || "",
      nomeFantasia: client?.nomeFantasia || client?.nome_fantasia || "",
      contactPerson: client?.contactPerson || "",
      phone: client?.phone || "",
      region: client?.region || "",
      cnpj: client?.cnpj || "",
      email: client?.email || "",
      street: client?.street || "",
      number: client?.number || "",
      complement: client?.complement || "",
      neighborhood: client?.neighborhood || "",
      city: client?.city || "",
      zipcode: client?.zipcode || "",
    }),
    [client],
  );

  const [formData, setFormData] = useState(initialData);
  const [loading, setLoading] = useState(false);
  const [isSearching, setIsSearching] = useState(false);
  const [isCepSearching, setIsCepSearching] = useState(false);
  const [errors, setErrors] = useState({});
  const [showAddress, setShowAddress] = useState(() =>
    hasAddressData(initialData),
  );

  const formatCNPJ = (cnpj) => {
    const cleanCNPJ = String(cnpj || "").replace(/\D/g, "");
    if (cleanCNPJ.length <= 2) return cleanCNPJ;
    if (cleanCNPJ.length <= 5)
      return `${cleanCNPJ.slice(0, 2)}.${cleanCNPJ.slice(2)}`;
    if (cleanCNPJ.length <= 8)
      return `${cleanCNPJ.slice(0, 2)}.${cleanCNPJ.slice(
        2,
        5,
      )}.${cleanCNPJ.slice(5)}`;
    if (cleanCNPJ.length <= 12)
      return `${cleanCNPJ.slice(0, 2)}.${cleanCNPJ.slice(
        2,
        5,
      )}.${cleanCNPJ.slice(5, 8)}/${cleanCNPJ.slice(8)}`;
    return `${cleanCNPJ.slice(0, 2)}.${cleanCNPJ.slice(2, 5)}.${cleanCNPJ.slice(
      5,
      8,
    )}/${cleanCNPJ.slice(8, 12)}-${cleanCNPJ.slice(12, 14)}`;
  };

  const handleCnpjChange = (e) => {
    const cleanCNPJ = e.target.value.replace(/\D/g, "").slice(0, 14);
    setFormData((prev) => ({ ...prev, cnpj: cleanCNPJ }));
    setErrors((prev) => ({ ...prev, cnpj: "" }));
  };

  const handleCnpjPaste = (e) => {
    e.preventDefault();
    const cleanCNPJ = e.clipboardData
      .getData("text")
      .replace(/\D/g, "")
      .slice(0, 14);
    setFormData((prev) => ({ ...prev, cnpj: cleanCNPJ }));
    setErrors((prev) => ({ ...prev, cnpj: "" }));
    if (cleanCNPJ.length === 14) handleCNPJSearch(cleanCNPJ);
  };

  const handleCNPJSearch = async (cnpj) => {
    setIsSearching(true);
    try {
      const data = await apiService.queryCNPJ(cnpj);
      if (data.nome || data.razaoSocial || data.nomeFantasia) {
        setFormData((prev) => ({
          ...prev,
          companyName: data.razaoSocial || data.nome || prev.companyName,
          nomeFantasia: data.nomeFantasia || prev.nomeFantasia,
          phone: data.telefone || prev.phone,
          region: data.uf || prev.region,
          email: data.email || prev.email,
          street: data.street || prev.street,
          number: data.number || prev.number,
          complement: data.complement || prev.complement,
          neighborhood: data.neighborhood || prev.neighborhood,
          city: data.city || prev.city,
          zipcode: data.zipcode || prev.zipcode,
        }));
        if (
          data.street ||
          data.city ||
          data.zipcode ||
          data.neighborhood
        ) {
          setShowAddress(true);
          toast.info("Dados do CNPJ e endereço preenchidos automaticamente.");
        } else {
          toast.info("Dados do CNPJ preenchidos. Complete o endereço se precisar.");
        }
      } else {
        setErrors((prev) => ({ ...prev, cnpj: "CNPJ não encontrado" }));
      }
    } catch (error) {
      console.error("Erro ao buscar CNPJ:", error);
      setErrors((prev) => ({
        ...prev,
        cnpj: error.message || "Não foi possível consultar o CNPJ.",
      }));
    } finally {
      setIsSearching(false);
    }
  };

  const handleCnpjBlur = () => {
    if (formData.cnpj.length === 14 && !isSearching) {
      handleCNPJSearch(formData.cnpj);
    }
  };

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
    if (errors[name]) setErrors((prev) => ({ ...prev, [name]: "" }));
  };

  const handleZipcodeChange = (e) => {
    const clean = e.target.value.replace(/\D/g, "").slice(0, 8);
    setFormData((prev) => ({ ...prev, zipcode: clean }));
    setErrors((prev) => ({ ...prev, zipcode: "" }));
  };

  const handleCepLookup = async (rawZip) => {
    const clean = String(rawZip || "").replace(/\D/g, "");
    if (clean.length !== 8) return;
    setIsCepSearching(true);
    try {
      const data = await lookupCep(clean);
      if (!data) {
        setErrors((prev) => ({
          ...prev,
          zipcode: "CEP não encontrado",
        }));
        return;
      }
      setFormData((prev) => ({
        ...prev,
        zipcode: data.zipcode,
        street: data.street || prev.street,
        neighborhood: data.neighborhood || prev.neighborhood,
        city: data.city || prev.city,
        region: data.region || prev.region,
        complement: data.complement || prev.complement,
      }));
      setShowAddress(true);
    } catch (error) {
      setErrors((prev) => ({
        ...prev,
        zipcode: error.message || "Falha ao consultar CEP",
      }));
    } finally {
      setIsCepSearching(false);
    }
  };

  const handleZipcodeBlur = () => {
    if (formData.zipcode.replace(/\D/g, "").length === 8 && !isCepSearching) {
      handleCepLookup(formData.zipcode);
    }
  };

  const validateForm = () => {
    const newErrors = {};
    if (!formData.companyName.trim())
      newErrors.companyName = "Nome da empresa é obrigatório";
    if (!formData.cnpj.trim()) newErrors.cnpj = "CNPJ é obrigatório";
    if (formData.cnpj.length !== 14)
      newErrors.cnpj = "CNPJ deve ter 14 dígitos";
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const buildClientPayload = () => {
    const phone = String(formData.phone || "")
      .replace(/[^\d\s\-()+]/g, "")
      .trim();
    const email = String(formData.email || "").trim();
    return {
      companyName: String(formData.companyName || "").trim(),
      nomeFantasia: String(formData.nomeFantasia || "").trim(),
      contactPerson: String(formData.contactPerson || "").trim(),
      phone,
      region: String(formData.region || "").trim(),
      cnpj: String(formData.cnpj || "").replace(/\D/g, ""),
      email,
      street: String(formData.street || "").trim(),
      number: String(formData.number || "").trim(),
      complement: String(formData.complement || "").trim(),
      neighborhood: String(formData.neighborhood || "").trim(),
      city: String(formData.city || "").trim(),
      zipcode: String(formData.zipcode || "").replace(/\D/g, ""),
    };
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!validateForm()) {
      toast.warning("Preencha os campos obrigatórios.");
      return;
    }

    setLoading(true);
    try {
      const payload = buildClientPayload();
      if (isEditing) {
        await apiService.updateClient(client.id, payload);
        toast.success("Cliente atualizado com sucesso.");
      } else {
        await apiService.createClient(payload);
        toast.success("Cliente guardado com sucesso.");
      }
      onClientAdded();
    } catch (error) {
      console.error("Erro ao salvar cliente:", error);

      if (error.details && Array.isArray(error.details)) {
        const nextFieldErrors = {};
        for (const err of error.details) {
          const raw = normalizeDetailPath(err.path || err.param || "");
          const last = raw.includes(".") ? raw.split(".").pop() : raw;
          const msg =
            err.msg ||
            err.message ||
            (typeof err === "string" ? err : "Valor inválido");
          if (last && KNOWN_FIELDS.has(last)) {
            nextFieldErrors[last] = msg;
          }
        }
        if (Object.keys(nextFieldErrors).length > 0) {
          setErrors((prev) => ({ ...prev, ...nextFieldErrors }));
          if (
            nextFieldErrors.street ||
            nextFieldErrors.city ||
            nextFieldErrors.zipcode ||
            nextFieldErrors.neighborhood
          ) {
            setShowAddress(true);
          }
          toast.warning("Corrija os campos assinalados abaixo.");
          return;
        }
      }

      toast.error(
        error.message ||
          `Não foi possível ${isEditing ? "atualizar" : "guardar"} o cliente.`,
      );
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className={isDrawer ? "flex flex-col" : "flex h-full flex-col"}>
      <div className={isDrawer ? "" : "flex-1 overflow-auto"}>
        <div
          className={
            isDrawer
              ? "w-full"
              : "mx-auto w-full max-w-4xl rounded-2xl border border-edge bg-surface/80 p-4 shadow-soft backdrop-blur-md sm:p-6 md:p-8"
          }
        >
          {!isDrawer ? (
            <h2 className="mb-6 text-2xl font-semibold tracking-tight text-ink">
              {isEditing ? "Editar cliente" : "Novo cliente"}
            </h2>
          ) : null}

          <form onSubmit={handleSubmit} className="space-y-5">
            <div className="grid grid-cols-1 gap-5 md:grid-cols-2">
              <FormField
                className="md:col-span-2"
                label="CNPJ"
                required
                error={errors.cnpj}
                hint={
                  isEditing
                    ? "CNPJ não pode ser alterado em edição"
                    : isSearching
                      ? "A procurar dados do CNPJ…"
                      : "Digite ou cole os 14 dígitos — preenchemos o cadastro automaticamente"
                }
              >
                <input
                  className={inputClassName(Boolean(errors.cnpj))}
                  type="text"
                  value={formatCNPJ(formData.cnpj)}
                  onChange={handleCnpjChange}
                  onPaste={handleCnpjPaste}
                  onBlur={handleCnpjBlur}
                  disabled={isSearching || isEditing}
                  placeholder="00.000.000/0000-00"
                  maxLength={18}
                />
              </FormField>

              <FormField
                className="md:col-span-2"
                label="Nome da empresa"
                required
                error={errors.companyName}
              >
                <input
                  className={inputClassName(Boolean(errors.companyName))}
                  type="text"
                  name="companyName"
                  value={formData.companyName}
                  onChange={handleChange}
                  required
                />
              </FormField>

              <FormField
                className="md:col-span-2"
                label="Nome fantasia"
                hint="Usado na busca de clientes nos pedidos."
              >
                <input
                  className={inputClassName()}
                  type="text"
                  name="nomeFantasia"
                  value={formData.nomeFantasia}
                  onChange={handleChange}
                  placeholder="Como o cliente é conhecido (opcional)"
                />
              </FormField>

              <FormField label="Pessoa de contato">
                <input
                  className={inputClassName()}
                  type="text"
                  name="contactPerson"
                  value={formData.contactPerson}
                  onChange={handleChange}
                  placeholder="Nome do responsável"
                />
              </FormField>

              <FormField label="Telefone">
                <input
                  className={inputClassName()}
                  type="tel"
                  name="phone"
                  value={formData.phone}
                  onChange={handleChange}
                  placeholder="(00) 00000-0000"
                />
              </FormField>

              <FormField label="E-mail">
                <input
                  className={inputClassName()}
                  type="email"
                  name="email"
                  value={formData.email}
                  onChange={handleChange}
                  placeholder="email@empresa.com"
                />
              </FormField>

              <FormField label="UF" hint="Preenchida pelo CNPJ ou CEP.">
                <input
                  className={inputClassName()}
                  type="text"
                  name="region"
                  value={formData.region}
                  onChange={handleChange}
                  placeholder="Ex.: PR"
                  maxLength={2}
                />
              </FormField>
            </div>

            <div className="rounded-2xl border border-edge bg-surface-muted/50">
              <button
                type="button"
                onClick={() => setShowAddress((v) => !v)}
                className="flex w-full items-center justify-between gap-3 px-4 py-3 text-left"
              >
                <div>
                  <p className="text-sm font-semibold text-ink">
                    Endereço
                  </p>
                  <p className="text-xs text-ink-muted">
                    Opcional — para entregas e documentos
                  </p>
                </div>
                <span className="text-sm font-medium text-brand">
                  {showAddress ? "Ocultar" : "Adicionar"}
                </span>
              </button>

              {showAddress ? (
                <div className="grid grid-cols-1 gap-4 border-t border-edge p-4 md:grid-cols-2">
                  <FormField
                    label="CEP"
                    error={errors.zipcode}
                    hint={
                      isCepSearching
                        ? "A consultar CEP…"
                        : "Ao sair do campo, buscamos logradouro e cidade"
                    }
                  >
                    <input
                      className={inputClassName(Boolean(errors.zipcode))}
                      type="text"
                      name="zipcode"
                      value={formatCepDisplay(formData.zipcode)}
                      onChange={handleZipcodeChange}
                      onBlur={handleZipcodeBlur}
                      placeholder="00000-000"
                      maxLength={9}
                      disabled={isCepSearching}
                    />
                  </FormField>

                  <FormField label="Cidade">
                    <input
                      className={inputClassName()}
                      type="text"
                      name="city"
                      value={formData.city}
                      onChange={handleChange}
                    />
                  </FormField>

                  <FormField className="md:col-span-2" label="Logradouro">
                    <input
                      className={inputClassName()}
                      type="text"
                      name="street"
                      value={formData.street}
                      onChange={handleChange}
                      placeholder="Rua, avenida…"
                    />
                  </FormField>

                  <FormField label="Número">
                    <input
                      className={inputClassName()}
                      type="text"
                      name="number"
                      value={formData.number}
                      onChange={handleChange}
                    />
                  </FormField>

                  <FormField label="Complemento">
                    <input
                      className={inputClassName()}
                      type="text"
                      name="complement"
                      value={formData.complement}
                      onChange={handleChange}
                    />
                  </FormField>

                  <FormField className="md:col-span-2" label="Bairro">
                    <input
                      className={inputClassName()}
                      type="text"
                      name="neighborhood"
                      value={formData.neighborhood}
                      onChange={handleChange}
                    />
                  </FormField>
                </div>
              ) : null}
            </div>

            <div
              className={`mt-2 flex justify-end gap-2 border-t border-edge pt-5 ${
                isDrawer
                  ? "sticky bottom-0 bg-surface/90 pb-1 backdrop-blur-md"
                  : ""
              }`}
            >
              <SecondaryButton
                type="button"
                onClick={onCancel}
                disabled={loading}
              >
                Cancelar
              </SecondaryButton>
              <PrimaryButton
                type="submit"
                disabled={loading || isSearching || isCepSearching}
              >
                {loading
                  ? "A guardar…"
                  : isEditing
                    ? "Atualizar cliente"
                    : "Guardar cliente"}
              </PrimaryButton>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
};

export default ClientsForm;
