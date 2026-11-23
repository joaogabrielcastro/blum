const fs = require("fs");
const path = require("path");
const { parseNfeXml, toStockQuantity } = require("./nfeXmlParser");

const fixture = fs.readFileSync(
  path.join(__dirname, "..", "..", "..", "tests", "fixtures", "nfe-exemplo.xml"),
  "utf8",
);

describe("parseNfeXml", () => {
  const nfe = parseNfeXml(fixture);

  test("cabeçalho da nota", () => {
    expect(nfe.accessKey).toBe("41261111222333000181550010000012341000012345");
    expect(nfe.number).toBe("1234");
    expect(nfe.series).toBe("1");
    expect(nfe.emitter).toEqual({ cnpj: "11222333000181", name: "FORNECEDOR EXEMPLO LTDA" });
    expect(nfe.recipient.doc).toBe("44555666000199");
    expect(nfe.authorized).toBe(true);
    expect(nfe.totals.invoice).toBe(256.12);
  });

  test("custo final soma frete, IPI, ST e FCP-ST e tira desconto", () => {
    const [led] = nfe.items;
    // 192 − 4 + 12 + 9,60 + 9,60 + 1,92 = 221,12
    expect(led.totalCost).toBe(221.12);
    expect(led.unitCost).toBe(110.56); // por CX
    expect(led.unit).toBe("CX");
    expect(led.ean).toBe("7891234567895");
    expect(led.supplierCode).toBe("LED9QA");
  });

  test("item sem impostos e 'SEM GTIN'", () => {
    const fita = nfe.items[1];
    expect(fita.supplierCode).toBe("000777"); // zeros à esquerda preservados
    expect(fita.ean).toBeNull();
    expect(fita.totalCost).toBe(35);
    expect(fita.unitCost).toBe(3.5);
  });

  test("custo total da nota = soma dos itens", () => {
    expect(nfe.totals.cost).toBe(256.12);
  });

  test("rejeita o que não é NF-e", () => {
    expect(() => parseNfeXml("não é xml")).toThrow("O arquivo não é um XML.");
    expect(() => parseNfeXml("<root><a>1</a></root>")).toThrow("não é uma NF-e");
    expect(() =>
      parseNfeXml(fixture.replace("<mod>55</mod>", "<mod>65</mod>")),
    ).toThrow("Modelo 65 não suportado");
  });

  test("bloqueia DOCTYPE (entidades externas)", () => {
    const evil = '<?xml version="1.0"?><!DOCTYPE x [<!ENTITY e SYSTEM "file:///etc/passwd">]><NFe/>';
    expect(() => parseNfeXml(evil)).toThrow("DOCTYPE");
  });
});

describe("toStockQuantity", () => {
  test("aplica o fator de conversão (2 CX × 12 = 24 UN)", () => {
    expect(toStockQuantity(2, 12)).toEqual({ stockQuantity: 24, rounded: false });
  });
  test("sinaliza arredondamento", () => {
    expect(toStockQuantity(2.5, 1)).toEqual({ stockQuantity: 3, rounded: true });
  });
});
