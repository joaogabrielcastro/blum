import type { CnpjLookupResult } from "../../types/api";

interface CnpjWsResponse {
  razao_social?: string;
  estabelecimento?: {
    nome_fantasia?: string;
    telefone1?: string;
    telefone2?: string;
    email?: string;
    estado?: { sigla?: string };
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
    const razaoSocial = data.razao_social || "";
    const nomeFantasia = data.estabelecimento?.nome_fantasia || "";

    return {
      nome: razaoSocial || nomeFantasia || "",
      razaoSocial,
      nomeFantasia,
      telefone:
        data.estabelecimento?.telefone1 ||
        data.estabelecimento?.telefone2 ||
        "",
      uf: data.estabelecimento?.estado?.sigla || "",
      email: data.estabelecimento?.email || "",
    };
  },
};
