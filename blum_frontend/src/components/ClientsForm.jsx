import { useState } from "react";
import apiService from "../services/apiService";
import { useToast } from "../context/ToastContext";

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

const ClientsForm = ({ client, onClientAdded, onCancel, variant = "page" }) => {
  const toast = useToast();
  const isEditing = !!client;
  const isDrawer = variant === "drawer";

  const [formData, setFormData] = useState({
    companyName: client?.companyName || "",
    nomeFantasia:
      client?.nomeFantasia || client?.nome_fantasia || "",
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
  });
  const [loading, setLoading] = useState(false);
  const [isSearching, setIsSearching] = useState(false);
  const [errors, setErrors] = useState({});

  // Formata o CNPJ para exibição
  const formatCNPJ = (cnpj) => {
    const cleanCNPJ = cnpj.replace(/\D/g, "");

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

  // Manipula a digitação normal
  const handleCnpjChange = (e) => {
    const value = e.target.value;
    const cleanCNPJ = value.replace(/\D/g, "").slice(0, 14);

    setFormData((prev) => ({
      ...prev,
      cnpj: cleanCNPJ, // Armazena apenas números
    }));
    setErrors((prev) => ({ ...prev, cnpj: "" }));
  };

  // Manipula o colar - CORREÇÃO DO PROBLEMA
  const handleCnpjPaste = (e) => {
    e.preventDefault();
    const pastedData = e.clipboardData.getData("text");
    const cleanCNPJ = pastedData.replace(/\D/g, "").slice(0, 14);

    setFormData((prev) => ({
      ...prev,
      cnpj: cleanCNPJ,
    }));
    setErrors((prev) => ({ ...prev, cnpj: "" }));

    // Dispara a busca automática se tiver 14 dígitos
    if (cleanCNPJ.length === 14) {
      handleCNPJSearch(cleanCNPJ);
    }
  };

  // Busca dados do CNPJ
  const handleCNPJSearch = async (cnpj) => {
    setIsSearching(true);
    try {
      const data = await apiService.queryCNPJ(cnpj);
      if (data.nome || data.razaoSocial || data.nomeFantasia) {
        setFormData((prev) => ({
          ...prev,
          companyName: data.razaoSocial || data.nome || prev.companyName,
          nomeFantasia: data.nomeFantasia || prev.nomeFantasia,
          phone: data.telefone || "",
          region: data.uf || "",
          email: data.email || "",
        }));
      } else {
        setErrors((prev) => ({ ...prev, cnpj: "CNPJ não encontrado" }));
      }
    } catch (error) {
      console.error("Erro ao buscar CNPJ:", error);
      setErrors((prev) => ({
        ...prev,
        cnpj: error.message || "Falha ao consultar CNPJ",
      }));
    } finally {
      setIsSearching(false);
    }
  };

  // Busca automática quando o CNPJ atinge 14 dígitos (digitação)
  const handleCnpjBlur = () => {
    if (formData.cnpj.length === 14 && !isSearching) {
      handleCNPJSearch(formData.cnpj);
    }
  };

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
    if (errors[name]) {
      setErrors((prev) => ({ ...prev, [name]: "" }));
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
      zipcode: String(formData.zipcode || "").trim(),
    };
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (!validateForm()) return;

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
              : "mx-auto w-full max-w-4xl rounded-2xl border border-zinc-200/80 bg-white/80 p-4 shadow-soft backdrop-blur-md sm:p-6 md:p-8"
          }
        >
          {!isDrawer ? (
            <h2 className="mb-6 text-2xl font-semibold tracking-tight text-zinc-900">
              {isEditing ? "Editar Cliente" : "Adicionar Novo Cliente"}
            </h2>
          ) : null}

          <form onSubmit={handleSubmit} className="space-y-5">
            <div className="grid grid-cols-1 gap-5 md:grid-cols-2">
              {/* Campo CNPJ Corrigido */}
              <div className="md:col-span-2">
                <label className="mb-1.5 block text-sm font-medium text-zinc-700">
                  CNPJ *
                </label>
                <input
                  className={`w-full rounded-xl border bg-white px-3 py-2.5 text-sm text-zinc-900 transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-brand/30 ${
                    errors.cnpj ? "border-red-400" : "border-zinc-200"
                  }`}
                  type="text"
                  value={formatCNPJ(formData.cnpj)}
                  onChange={handleCnpjChange}
                  onPaste={handleCnpjPaste}
                  onBlur={handleCnpjBlur}
                  disabled={isSearching || isEditing}
                  placeholder="00.000.000/0000-00"
                  maxLength={18}
                />
                {errors.cnpj && (
                  <p className="mt-1 text-xs text-red-500">{errors.cnpj}</p>
                )}
                {isSearching && (
                  <p className="mt-1 text-xs text-brand">
                    A procurar dados do CNPJ…
                  </p>
                )}
                {isEditing && (
                  <p className="mt-1 text-xs text-zinc-400">
                    CNPJ não pode ser alterado em edição
                  </p>
                )}
                {!isEditing && (
                  <p className="mt-1 text-xs text-zinc-400">
                    Digite ou cole os 14 dígitos do CNPJ
                  </p>
                )}
              </div>

              <div className="md:col-span-2">
                <label className="mb-1.5 block text-sm font-medium text-zinc-700">
                  Nome da Empresa *
                </label>
                <input
                  className={`w-full rounded-xl border bg-white px-3 py-2.5 text-sm text-zinc-900 transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-brand/30 ${
                    errors.companyName ? "border-red-400" : "border-zinc-200"
                  }`}
                  type="text"
                  name="companyName"
                  value={formData.companyName}
                  onChange={handleChange}
                  required
                />
                {errors.companyName && (
                  <p className="mt-1 text-xs text-red-500">
                    {errors.companyName}
                  </p>
                )}
              </div>

              <div className="md:col-span-2">
                <label className="mb-1.5 block text-sm font-medium text-zinc-700">
                  Nome fantasia
                </label>
                <input
                  className="w-full rounded-xl border border-zinc-200 bg-white px-3 py-2.5 text-sm text-zinc-900 transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-brand/30"
                  type="text"
                  name="nomeFantasia"
                  value={formData.nomeFantasia}
                  onChange={handleChange}
                  placeholder="Como o cliente é conhecido no dia a dia (opcional)"
                />
                <p className="mt-1 text-xs text-zinc-400">
                  Usado na busca de clientes nos pedidos.
                </p>
              </div>

              <div>
                <label className="mb-1.5 block text-sm font-medium text-zinc-700">
                  Pessoa de Contato
                </label>
                <input
                  className="w-full rounded-xl border border-zinc-200 bg-white px-3 py-2.5 text-sm text-zinc-900 transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-brand/30"
                  type="text"
                  name="contactPerson"
                  value={formData.contactPerson}
                  onChange={handleChange}
                  placeholder="Nome do responsável"
                />
              </div>

              <div>
                <label className="mb-1.5 block text-sm font-medium text-zinc-700">
                  Telefone
                </label>
                <input
                  className="w-full rounded-xl border border-zinc-200 bg-white px-3 py-2.5 text-sm text-zinc-900 transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-brand/30"
                  type="tel"
                  name="phone"
                  value={formData.phone}
                  onChange={handleChange}
                  placeholder="(00) 00000-0000"
                />
              </div>

              <div>
                <label className="mb-1.5 block text-sm font-medium text-zinc-700">
                  Email
                </label>
                <input
                  className="w-full rounded-xl border border-zinc-200 bg-white px-3 py-2.5 text-sm text-zinc-900 transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-brand/30"
                  type="email"
                  name="email"
                  value={formData.email}
                  onChange={handleChange}
                  placeholder="email@empresa.com"
                />
              </div>

              <div>
                <label className="mb-1.5 block text-sm font-medium text-zinc-700">
                  Região
                </label>
                <input
                  className="w-full rounded-xl border border-zinc-200 bg-white px-3 py-2.5 text-sm text-zinc-900 transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-brand/30"
                  type="text"
                  name="region"
                  value={formData.region}
                  onChange={handleChange}
                  placeholder="UF (ex.: PR)"
                />
              </div>

              <div className="md:col-span-2">
                <h3 className="mb-1 text-sm font-semibold text-zinc-900">
                  Endereço
                </h3>
                <p className="mb-3 text-xs text-zinc-400">
                  Para clientes da base PR (Paraná / PRL), preencha logradouro,
                  cidade e CEP para entregas e documentos.
                </p>
                <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                  <div className="md:col-span-2">
                    <label className="mb-1.5 block text-sm font-medium text-zinc-700">
                      Logradouro
                    </label>
                    <input
                      className="w-full rounded-xl border border-zinc-200 bg-white px-3 py-2.5 text-sm text-zinc-900 transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-brand/30"
                      type="text"
                      name="street"
                      value={formData.street}
                      onChange={handleChange}
                      placeholder="Rua, avenida…"
                    />
                  </div>
                  <div>
                    <label className="mb-1.5 block text-sm font-medium text-zinc-700">
                      Número
                    </label>
                    <input
                      className="w-full rounded-xl border border-zinc-200 bg-white px-3 py-2.5 text-sm text-zinc-900 transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-brand/30"
                      type="text"
                      name="number"
                      value={formData.number}
                      onChange={handleChange}
                    />
                  </div>
                  <div>
                    <label className="mb-1.5 block text-sm font-medium text-zinc-700">
                      Complemento
                    </label>
                    <input
                      className="w-full rounded-xl border border-zinc-200 bg-white px-3 py-2.5 text-sm text-zinc-900 transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-brand/30"
                      type="text"
                      name="complement"
                      value={formData.complement}
                      onChange={handleChange}
                    />
                  </div>
                  <div>
                    <label className="mb-1.5 block text-sm font-medium text-zinc-700">
                      Bairro
                    </label>
                    <input
                      className="w-full rounded-xl border border-zinc-200 bg-white px-3 py-2.5 text-sm text-zinc-900 transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-brand/30"
                      type="text"
                      name="neighborhood"
                      value={formData.neighborhood}
                      onChange={handleChange}
                    />
                  </div>
                  <div>
                    <label className="mb-1.5 block text-sm font-medium text-zinc-700">
                      Cidade
                    </label>
                    <input
                      className="w-full rounded-xl border border-zinc-200 bg-white px-3 py-2.5 text-sm text-zinc-900 transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-brand/30"
                      type="text"
                      name="city"
                      value={formData.city}
                      onChange={handleChange}
                    />
                  </div>
                  <div>
                    <label className="mb-1.5 block text-sm font-medium text-zinc-700">
                      CEP
                    </label>
                    <input
                      className="w-full rounded-xl border border-zinc-200 bg-white px-3 py-2.5 text-sm text-zinc-900 transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-brand/30"
                      type="text"
                      name="zipcode"
                      value={formData.zipcode}
                      onChange={handleChange}
                      placeholder="00000-000"
                    />
                  </div>
                </div>
              </div>
            </div>

            <div
              className={`mt-6 flex justify-end gap-2 border-t border-zinc-200/80 pt-5 ${
                isDrawer ? "sticky bottom-0 bg-white/90 pb-1 backdrop-blur-md" : ""
              }`}
            >
              <button
                type="button"
                onClick={onCancel}
                className="rounded-xl border border-zinc-200 px-4 py-2.5 text-sm font-semibold text-zinc-700 transition-all duration-200 hover:bg-zinc-50 active:scale-[0.98] disabled:opacity-50"
                disabled={loading}
              >
                Cancelar
              </button>
              <button
                type="submit"
                className="rounded-xl bg-brand px-4 py-2.5 text-sm font-semibold text-white shadow-soft transition-all duration-200 hover:bg-brand-600 active:scale-[0.98] disabled:cursor-not-allowed disabled:opacity-50"
                disabled={loading || isSearching}
              >
                {loading
                  ? "A guardar..."
                  : isEditing
                    ? "Atualizar cliente"
                    : "Guardar cliente"}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
};

export default ClientsForm;
