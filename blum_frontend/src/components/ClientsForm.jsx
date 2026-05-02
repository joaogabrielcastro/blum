import { useState } from "react";
import apiService from "../services/apiService";
import { useToast } from "../context/ToastContext";

const KNOWN_FIELDS = new Set([
  "companyName",
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

const ClientsForm = ({ client, onClientAdded, onCancel }) => {
  const toast = useToast();
  const isEditing = !!client;

  const [formData, setFormData] = useState({
    companyName: client?.companyName || "",
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
      if (data.nome) {
        setFormData((prev) => ({
          ...prev,
          companyName: data.nome,
          phone: data.telefone || "",
          region: data.uf || "",
          email: data.email || "", // Adiciona email se disponível
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
    <div className="h-full flex flex-col">
      <div className="flex-1 overflow-auto">
        <div className="bg-white p-2 sm:p-4 md:p-8 rounded-2xl shadow-xl border border-gray-200 max-w-4xl mx-auto w-full">
          <h2 className="text-2xl font-bold text-gray-800 mb-6">
            {isEditing ? "Editar Cliente" : "Adicionar Novo Cliente"}
          </h2>

          <form onSubmit={handleSubmit} className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {/* Campo CNPJ Corrigido */}
              <div className="md:col-span-2">
                <label className="block text-gray-700 text-sm font-medium mb-2">
                  CNPJ *
                </label>
                <input
                  className={`w-full p-3 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 ${
                    errors.cnpj ? "border-red-500" : "border-gray-300"
                  }`}
                  type="text"
                  value={formatCNPJ(formData.cnpj)} // Exibe formatado
                  onChange={handleCnpjChange}
                  onPaste={handleCnpjPaste} // Adiciona handler para colar
                  onBlur={handleCnpjBlur} // Busca ao sair do campo
                  disabled={isSearching || isEditing}
                  placeholder="00.000.000/0000-00"
                  maxLength={18} // Permite caracteres de formatação
                />
                {errors.cnpj && (
                  <p className="text-red-500 text-xs mt-1">{errors.cnpj}</p>
                )}
                {isSearching && (
                  <p className="text-blue-500 text-xs mt-1">
                    🔍 Buscando dados do CNPJ...
                  </p>
                )}
                {isEditing && (
                  <p className="text-gray-500 text-xs mt-1">
                    CNPJ não pode ser alterado em edição
                  </p>
                )}
                {!isEditing && (
                  <p className="text-gray-500 text-xs mt-1">
                    Digite ou cole os 14 dígitos do CNPJ
                  </p>
                )}
              </div>

              <div className="md:col-span-2">
                <label className="block text-gray-700 text-sm font-medium mb-2">
                  Nome da Empresa *
                </label>
                <input
                  className={`w-full p-3 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 ${
                    errors.companyName ? "border-red-500" : "border-gray-300"
                  }`}
                  type="text"
                  name="companyName"
                  value={formData.companyName}
                  onChange={handleChange}
                  required
                />
                {errors.companyName && (
                  <p className="text-red-500 text-xs mt-1">
                    {errors.companyName}
                  </p>
                )}
              </div>

              <div>
                <label className="block text-gray-700 text-sm font-medium mb-2">
                  Pessoa de Contato
                </label>
                <input
                  className="w-full p-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  type="text"
                  name="contactPerson"
                  value={formData.contactPerson}
                  onChange={handleChange}
                  placeholder="Nome do responsável"
                />
              </div>

              <div>
                <label className="block text-gray-700 text-sm font-medium mb-2">
                  Telefone
                </label>
                <input
                  className="w-full p-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  type="tel"
                  name="phone"
                  value={formData.phone}
                  onChange={handleChange}
                  placeholder="(00) 00000-0000"
                />
              </div>

              <div>
                <label className="block text-gray-700 text-sm font-medium mb-2">
                  Email
                </label>
                <input
                  className="w-full p-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  type="email"
                  name="email"
                  value={formData.email}
                  onChange={handleChange}
                  placeholder="email@empresa.com"
                />
              </div>

              <div>
                <label className="block text-gray-700 text-sm font-medium mb-2">
                  Região
                </label>
                <input
                  className="w-full p-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  type="text"
                  name="region"
                  value={formData.region}
                  onChange={handleChange}
                  placeholder="UF (ex.: PR)"
                />
              </div>

              <div className="md:col-span-2">
                <h3 className="text-sm font-semibold text-gray-800 mb-2">
                  Endereço
                </h3>
                <p className="text-xs text-gray-500 mb-3">
                  Para clientes da base PR (Paraná / PRL), preencha logradouro,
                  cidade e CEP para entregas e documentos.
                </p>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="md:col-span-2">
                    <label className="block text-gray-700 text-sm font-medium mb-2">
                      Logradouro
                    </label>
                    <input
                      className="w-full p-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                      type="text"
                      name="street"
                      value={formData.street}
                      onChange={handleChange}
                      placeholder="Rua, avenida…"
                    />
                  </div>
                  <div>
                    <label className="block text-gray-700 text-sm font-medium mb-2">
                      Número
                    </label>
                    <input
                      className="w-full p-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                      type="text"
                      name="number"
                      value={formData.number}
                      onChange={handleChange}
                    />
                  </div>
                  <div>
                    <label className="block text-gray-700 text-sm font-medium mb-2">
                      Complemento
                    </label>
                    <input
                      className="w-full p-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                      type="text"
                      name="complement"
                      value={formData.complement}
                      onChange={handleChange}
                    />
                  </div>
                  <div>
                    <label className="block text-gray-700 text-sm font-medium mb-2">
                      Bairro
                    </label>
                    <input
                      className="w-full p-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                      type="text"
                      name="neighborhood"
                      value={formData.neighborhood}
                      onChange={handleChange}
                    />
                  </div>
                  <div>
                    <label className="block text-gray-700 text-sm font-medium mb-2">
                      Cidade
                    </label>
                    <input
                      className="w-full p-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                      type="text"
                      name="city"
                      value={formData.city}
                      onChange={handleChange}
                    />
                  </div>
                  <div>
                    <label className="block text-gray-700 text-sm font-medium mb-2">
                      CEP
                    </label>
                    <input
                      className="w-full p-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
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

            <div className="flex justify-end space-x-4 mt-8 pt-6 border-t border-gray-200">
              <button
                type="button"
                onClick={onCancel}
                className="px-6 py-3 border border-gray-300 text-gray-700 font-bold rounded-lg hover:bg-gray-50 transition-colors"
                disabled={loading}
              >
                Cancelar
              </button>
              <button
                type="submit"
                className="px-6 py-3 bg-blue-600 text-white font-bold rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                disabled={loading || isSearching}
              >
                {loading
                  ? "A guardar..."
                  : isEditing
                    ? "Atualizar Cliente"
                    : "Guardar Cliente"}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
};

export default ClientsForm;
