const { XMLParser } = require("fast-xml-parser");

/**
 * Leitura do XML da NF-e (modelo 55) e cálculo do custo final por item.
 *
 * Custo do item = vProd − vDesc + vFrete + vSeg + vOutro + IPI + ICMS-ST + FCP-ST
 * (créditos de ICMS/PIS/COFINS não são descontados — padrão Simples Nacional).
 */

function nfeError(message) {
  const err = new Error(message);
  err.statusCode = 400;
  return err;
}

const parser = new XMLParser({
  ignoreAttributes: false,
  attributeNamePrefix: "@_",
  removeNSPrefix: true,
  // Mantém tudo como texto: códigos e EAN têm zeros à esquerda.
  parseTagValue: false,
  parseAttributeValue: false,
  trimValues: true,
  processEntities: true,
  htmlEntities: false,
  isArray: (name) => name === "det",
});

const money = (value) => {
  if (value == null || value === "") return 0;
  const n = Number(String(value).replace(",", "."));
  return Number.isFinite(n) ? n : 0;
};

const round2 = (n) => Math.round(n * 100) / 100;
const round4 = (n) => Math.round(n * 10000) / 10000;
const onlyDigits = (value) => String(value ?? "").replace(/\D/g, "");

/** Primeiro objeto de imposto dentro de ICMS (ICMS00, ICMS10, ICMSSN202...). */
function firstChild(node) {
  if (!node || typeof node !== "object") return {};
  const key = Object.keys(node).find((k) => !k.startsWith("@_"));
  return key ? node[key] || {} : {};
}

function validEan(raw) {
  const digits = onlyDigits(raw);
  if (!digits || /^0+$/.test(digits)) return null;
  if (![8, 12, 13, 14].includes(digits.length)) return null;
  return digits;
}

function parseItem(det) {
  const prod = det.prod || {};
  const imposto = det.imposto || {};
  const icms = firstChild(imposto.ICMS);
  const ipiTrib = imposto.IPI?.IPITrib || {};

  const quantity = money(prod.qCom);
  const grossValue = money(prod.vProd);
  const discount = money(prod.vDesc);
  const freight = money(prod.vFrete);
  const insurance = money(prod.vSeg);
  const otherExpenses = money(prod.vOutro);
  const ipi = money(ipiTrib.vIPI);
  const icmsSt = money(icms.vICMSST);
  const fcpSt = money(icms.vFCPST);

  const totalCost = round2(
    grossValue - discount + freight + insurance + otherExpenses + ipi + icmsSt + fcpSt,
  );

  return {
    itemNumber: Number.parseInt(det["@_nItem"], 10) || 0,
    supplierCode: String(prod.cProd ?? "").trim(),
    ean: validEan(prod.cEAN) || validEan(prod.cEANTrib),
    description: String(prod.xProd ?? "").trim(),
    ncm: onlyDigits(prod.NCM) || null,
    cfop: onlyDigits(prod.CFOP) || null,
    unit: String(prod.uCom ?? "").trim().toUpperCase() || null,
    quantity,
    unitValue: money(prod.vUnCom),
    grossValue,
    discount,
    freight,
    insurance,
    otherExpenses,
    ipi,
    icmsSt,
    fcpSt,
    totalCost,
    /** Custo por unidade da nota (antes do fator de conversão). */
    unitCost: quantity > 0 ? round4(totalCost / quantity) : 0,
  };
}

/**
 * @param {string} xmlText conteúdo do arquivo .xml
 * @returns {{accessKey, number, series, issuedAt, emitter, recipient, authorized, totals, items}}
 */
function parseNfeXml(xmlText) {
  const text = String(xmlText ?? "").replace(/^﻿/, "").trim();
  if (!text.startsWith("<")) {
    throw nfeError("O arquivo não é um XML.");
  }
  // NF-e nunca usa DOCTYPE; bloquear evita expansão de entidades maliciosas.
  if (/<!DOCTYPE/i.test(text)) {
    throw nfeError("XML inválido: declaração DOCTYPE não é permitida.");
  }

  let doc;
  try {
    doc = parser.parse(text);
  } catch {
    throw nfeError("Não foi possível ler o XML. Verifique se o arquivo está completo.");
  }

  const proc = doc.nfeProc || null;
  const nfe = doc.nfeProc?.NFe || doc.NFe;
  const inf = nfe?.infNFe;
  if (!inf) {
    throw nfeError("Este XML não é uma NF-e (não encontrei os dados da nota).");
  }

  const ide = inf.ide || {};
  if (String(ide.mod) !== "55") {
    throw nfeError(
      `Modelo ${ide.mod || "desconhecido"} não suportado: envie o XML de uma NF-e (modelo 55).`,
    );
  }

  const keyFromId = onlyDigits(inf["@_Id"]);
  const infProt = proc?.protNFe?.infProt || {};
  const accessKey = keyFromId.length === 44 ? keyFromId : onlyDigits(infProt.chNFe);
  if (accessKey.length !== 44) {
    throw nfeError("Chave de acesso da nota não encontrada no XML.");
  }

  const dets = Array.isArray(inf.det) ? inf.det : [];
  if (dets.length === 0) {
    throw nfeError("A nota não tem itens.");
  }

  const icmsTot = inf.total?.ICMSTot || {};
  const items = dets.map(parseItem);

  return {
    accessKey,
    number: String(ide.nNF ?? "").trim() || null,
    series: String(ide.serie ?? "").trim() || null,
    issuedAt: ide.dhEmi || ide.dEmi || null,
    operationType: String(ide.tpNF ?? ""), // 0 = entrada, 1 = saída (do emitente)
    emitter: {
      cnpj: onlyDigits(inf.emit?.CNPJ || inf.emit?.CPF) || null,
      name: String(inf.emit?.xNome ?? "").trim() || null,
    },
    recipient: {
      doc: onlyDigits(inf.dest?.CNPJ || inf.dest?.CPF) || null,
      name: String(inf.dest?.xNome ?? "").trim() || null,
    },
    /** true = protocolo de autorização (cStat 100/150) presente no XML. */
    authorized: ["100", "150"].includes(String(infProt.cStat ?? "")),
    totals: {
      products: money(icmsTot.vProd),
      invoice: money(icmsTot.vNF),
      freight: money(icmsTot.vFrete),
      discount: money(icmsTot.vDesc),
      ipi: money(icmsTot.vIPI),
      icmsSt: money(icmsTot.vST),
      cost: round2(items.reduce((sum, item) => sum + item.totalCost, 0)),
    },
    items,
  };
}

/**
 * Converte a quantidade da nota para a unidade de estoque.
 * Estoque é inteiro: frações são arredondadas e sinalizadas.
 */
function toStockQuantity(quantity, conversionFactor = 1) {
  const factor = Number(conversionFactor) > 0 ? Number(conversionFactor) : 1;
  const exact = Number(quantity) * factor;
  const rounded = Math.round(exact);
  return {
    stockQuantity: rounded,
    rounded: Math.abs(exact - rounded) > 1e-6,
  };
}

module.exports = { parseNfeXml, toStockQuantity, nfeError, onlyDigits };
