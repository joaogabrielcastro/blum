import { costFromProduct, marginPercent } from "./productCost";

/**
 * Cálculos da conferência de NF-e. Espelham o backend
 * (purchaseInvoiceService/productCost) para a tela reagir na hora; o valor
 * gravado é sempre o recalculado no servidor a partir do XML.
 */

const round2 = (n) => Math.round(n * 100) / 100;
const round4 = (n) => Math.round(n * 10000) / 10000;

export function parseFactor(value) {
  const n = Number(String(value ?? "").replace(",", "."));
  return Number.isFinite(n) && n > 0 ? n : null;
}

export function weightedAverageCost({ currentStock, currentCost, quantity, unitCost }) {
  const stock = Math.max(0, Number(currentStock) || 0);
  if (currentCost == null || stock === 0) return round4(unitCost);
  return round4((stock * currentCost + quantity * unitCost) / (stock + quantity));
}

export function suggestPrice({ currentPrice, currentCost, newCost }) {
  const margin = marginPercent(currentPrice, currentCost);
  if (margin == null || newCost == null || margin >= 100) return null;
  const suggested = round2(newCost / (1 - margin / 100));
  return suggested > 0 ? suggested : null;
}

/** Linha da conferência para um item da nota + produto escolhido + fator. */
export function computeInvoiceLine(item, product, factorInput) {
  const factor = parseFactor(factorInput) ?? 1;
  const exact = Number(item.quantity) * factor;
  const stockQuantity = Math.round(exact);
  const unitCost = stockQuantity > 0 ? round4(item.totalCost / stockQuantity) : 0;
  const currentCost = product ? costFromProduct(product) : null;
  const price = product?.price != null ? Number(product.price) : null;
  const newAverageCost = product
    ? weightedAverageCost({
        currentStock: product.stock,
        currentCost,
        quantity: stockQuantity,
        unitCost,
      })
    : unitCost;
  return {
    factor,
    stockQuantity,
    stockRounded: Math.abs(exact - stockQuantity) > 1e-6,
    unitCost,
    currentCost,
    newAverageCost,
    costChangePercent:
      currentCost && currentCost > 0
        ? Math.round(((unitCost - currentCost) / currentCost) * 1000) / 10
        : null,
    price,
    currentMargin: marginPercent(price, currentCost),
    marginAfter: marginPercent(price, newAverageCost),
    suggestedPrice: product
      ? suggestPrice({ currentPrice: price, currentCost, newCost: newAverageCost })
      : null,
  };
}

/** Lê os arquivos .xml escolhidos (texto). */
export function readXmlFiles(fileList) {
  const files = Array.from(fileList || []).filter((f) =>
    /\.xml$/i.test(f.name),
  );
  return Promise.all(
    files.map(
      (file) =>
        new Promise((resolve) => {
          const reader = new FileReader();
          reader.onload = () => resolve({ name: file.name, xml: String(reader.result || "") });
          reader.onerror = () => resolve({ name: file.name, xml: "", readError: true });
          reader.readAsText(file);
        }),
    ),
  );
}

export function formatAccessKey(key) {
  return String(key || "").replace(/(\d{4})(?=\d)/g, "$1 ");
}
