import type { CnpjLookupResult } from "../../types/api";

interface CnpjWsResponse {
  razao_social?: string;
  estabelecimento?: {
    nome_fantasia?: string;
    telefone1?: string;
    telefone2?: string;
    email?: string;
    estado?: { sigla?: string };
    logradouro?: string;
    numero?: string;
    complemento?: string;
    bairro?: string;
    cep?: string;
    cidade?: { nome?: string };
  };
}

export const externalApi = {
  queryCNPJ: async (cnpj: string): Promise<CnpjLookupResult> => {
    const cleanCnpj = cnpj.replace(/\D/g, "");
    const response = await fetch(`https://publica.cnpj.ws/cnpj/${cleanCnpj}`);

    if (!response.ok) {
      if (response.status === 429) {
        throw new Error(
          "Limite de consultas excedido. Tente novamente mais tarde.",
        );
      }
      throw new Error("CNPJ não encontrado");
    }

    const data = (await response.json()) as CnpjWsResponse;
    const est = data.estabelecimento;
    const razaoSocial = data.razao_social || "";
    const nomeFantasia = est?.nome_fantasia || "";

    return {
      nome: razaoSocial || nomeFantasia || "",
      razaoSocial,
      nomeFantasia,
      telefone: est?.telefone1 || est?.telefone2 || "",
      uf: est?.estado?.sigla || "",
      email: est?.email || "",
      street: est?.logradouro || "",
      number: est?.numero || "",
      complement: est?.complemento || "",
      neighborhood: est?.bairro || "",
      city: est?.cidade?.nome || "",
      zipcode: (est?.cep || "").replace(/\D/g, ""),
    };
  },
};
