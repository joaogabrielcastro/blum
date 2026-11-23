const { sql, pool, beginTenantTransaction } = require("../../config/database");
const { requireTenantId } = require("../../utils/tenantContext");
const { invalidateProductsCache } = require("../../config/cache");
const { weightedAverageCost, marginPercent, roundCost } = require("../product/productCost");
const { changeProductStock } = require("../../repositories/orderRepository");
const { parseNfeXml, toStockQuantity, nfeError } = require("./nfeXmlParser");

/**
 * Compras por XML de NF-e (C2).
 * preview  → lê a nota, casa itens com o catálogo e calcula custo/margem.
 * confirm  → grava tudo numa transação (estoque, custo, nota, histórico).
 * reverse  → estorna a nota (devolve estoque e, se possível, o custo).
 */

const round2 = (n) => Math.round(Number(n) * 100) / 100;
const num = (v) => (v == null || v === "" ? null : Number(v));

function notFound(message) {
  const err = new Error(message);
  err.statusCode = 404;
  return err;
}

/** Preço que mantém a margem atual com o novo custo. */
function suggestPrice({ currentPrice, currentCost, newCost }) {
  const margin = marginPercent(currentPrice, currentCost);
  if (margin == null || newCost == null || margin >= 100) return null;
  const suggested = round2(newCost / (1 - margin / 100));
  return suggested > 0 ? suggested : null;
}

async function loadTenantTaxId(tenantId) {
  const rows = await sql`SELECT tax_id FROM tenants WHERE id = ${tenantId}`;
  return rows[0]?.tax_id || null;
}

async function findActiveInvoiceByKey(tenantId, accessKey) {
  const rows = await sql`
    SELECT id, number, imported_at FROM purchase_invoices
    WHERE tenant_id = ${tenantId} AND access_key = ${accessKey}
      AND status <> 'estornada'
    LIMIT 1
  `;
  return rows[0] || null;
}

/** Casa cada item da nota com um produto: vínculo salvo → EAN → código. */
async function matchItems({ tenantId, nfe, brand }) {
  const cnpj = nfe.emitter.cnpj || "";
  const codes = nfe.items.map((i) => i.supplierCode).filter(Boolean);
  const eans = nfe.items.map((i) => i.ean).filter(Boolean);

  const links = codes.length && cnpj
    ? await sql`
        SELECT supplier_code, product_id, conversion_factor
        FROM supplier_product_links
        WHERE tenant_id = ${tenantId} AND supplier_cnpj = ${cnpj}
          AND supplier_code = ANY(${codes})
      `
    : [];
  const byLink = new Map(links.map((l) => [l.supplier_code, l]));

  const byEanRows = eans.length
    ? await sql`
        SELECT id, ean FROM products
        WHERE tenant_id = ${tenantId} AND ean = ANY(${eans})
      `
    : [];
  const byEan = new Map(byEanRows.map((r) => [r.ean, r.id]));

  const byCodeRows = codes.length && brand
    ? await sql`
        SELECT id, productcode FROM products
        WHERE tenant_id = ${tenantId} AND productcode = ANY(${codes})
          AND (brand_id = ${brand.id} OR brand = ${brand.name})
      `
    : [];
  const byCode = new Map(byCodeRows.map((r) => [String(r.productcode), r.id]));

  const matches = nfe.items.map((item) => {
    const link = byLink.get(item.supplierCode);
    if (link) {
      return {
        productId: link.product_id,
        matchedBy: "vinculo",
        conversionFactor: Number(link.conversion_factor) || 1,
      };
    }
    if (item.ean && byEan.has(item.ean)) {
      return { productId: byEan.get(item.ean), matchedBy: "ean", conversionFactor: 1 };
    }
    if (byCode.has(item.supplierCode)) {
      return { productId: byCode.get(item.supplierCode), matchedBy: "codigo", conversionFactor: 1 };
    }
    return { productId: null, matchedBy: null, conversionFactor: 1 };
  });

  const ids = [...new Set(matches.map((m) => m.productId).filter(Boolean))];
  const products = ids.length
    ? await sql`
        SELECT id, name, productcode, brand, brand_id, stock, price, cost_price, last_cost
        FROM products WHERE tenant_id = ${tenantId} AND id = ANY(${ids})
      `
    : [];
  const productsById = new Map(products.map((p) => [Number(p.id), p]));
  return matches.map((m) => ({
    ...m,
    product: m.productId ? productsById.get(Number(m.productId)) || null : null,
  }));
}

function describeProduct(product) {
  if (!product) return null;
  return {
    id: product.id,
    name: product.name,
    productCode: product.productcode,
    brand: product.brand,
    stock: Number(product.stock),
    price: num(product.price),
    costPrice: num(product.cost_price),
    lastCost: num(product.last_cost),
  };
}

/** Números da linha para a conferência (dependem do produto e do fator). */
function computeLine(item, product, conversionFactor) {
  const { stockQuantity, rounded } = toStockQuantity(item.quantity, conversionFactor);
  const unitCost = stockQuantity > 0 ? roundCost(item.totalCost / stockQuantity) : 0;
  const currentCost = product ? num(product.cost_price) : null;
  const newAverageCost = product
    ? weightedAverageCost({
        currentStock: Number(product.stock),
        currentCost,
        quantity: stockQuantity,
        unitCost,
      })
    : unitCost;
  const price = product ? num(product.price) : null;
  const costChangePercent =
    currentCost && currentCost > 0
      ? Math.round(((unitCost - currentCost) / currentCost) * 1000) / 10
      : null;
  return {
    conversionFactor: Number(conversionFactor) || 1,
    stockQuantity,
    stockRounded: rounded,
    unitCost,
    newAverageCost,
    costChangePercent,
    currentMargin: marginPercent(price, currentCost),
    marginAfter: marginPercent(price, newAverageCost),
    suggestedPrice: product
      ? suggestPrice({ currentPrice: price, currentCost, newCost: newAverageCost })
      : null,
  };
}

async function resolveBrand({ tenantId, cnpj, brandId }) {
  if (brandId) {
    const rows = await sql`
      SELECT id, name, cnpj FROM brands WHERE id = ${Number(brandId)} AND tenant_id = ${tenantId}
    `;
    if (!rows.length) throw nfeError("Representada não encontrada.");
    return { ...rows[0], matchedBy: "escolhida" };
  }
  if (!cnpj) return null;
  const rows = await sql`
    SELECT id, name, cnpj FROM brands WHERE tenant_id = ${tenantId} AND cnpj = ${cnpj}
    ORDER BY id LIMIT 1
  `;
  return rows[0] ? { ...rows[0], matchedBy: "cnpj" } : null;
}

async function preview({ xml, tenantId, brandId }) {
  tenantId = requireTenantId(tenantId);
  const nfe = parseNfeXml(xml);
  const [duplicate, tenantTaxId, brand] = await Promise.all([
    findActiveInvoiceByKey(tenantId, nfe.accessKey),
    loadTenantTaxId(tenantId),
    resolveBrand({ tenantId, cnpj: nfe.emitter.cnpj, brandId }),
  ]);
  const matches = await matchItems({ tenantId, nfe, brand });

  const warnings = [];
  if (!nfe.authorized) {
    warnings.push("O XML não traz o protocolo de autorização da SEFAZ. Confira se a nota foi autorizada.");
  }
  if (tenantTaxId && nfe.recipient.doc && tenantTaxId !== nfe.recipient.doc) {
    warnings.push("Esta nota não foi emitida para o CNPJ da sua empresa.");
  }

  return {
    accessKey: nfe.accessKey,
    number: nfe.number,
    series: nfe.series,
    issuedAt: nfe.issuedAt,
    emitter: nfe.emitter,
    recipient: nfe.recipient,
    authorized: nfe.authorized,
    totals: nfe.totals,
    duplicate: duplicate
      ? { id: duplicate.id, importedAt: duplicate.imported_at }
      : null,
    brand: brand ? { id: brand.id, name: brand.name, matchedBy: brand.matchedBy } : null,
    warnings,
    items: nfe.items.map((item, index) => {
      const match = matches[index];
      return {
        ...item,
        matchedBy: match.matchedBy,
        product: describeProduct(match.product),
        ...computeLine(item, match.product, match.conversionFactor),
      };
    }),
  };
}

function validateDecisions(nfe, decisions) {
  const byNumber = new Map(
    (Array.isArray(decisions) ? decisions : []).map((d) => [Number(d.itemNumber), d]),
  );
  return nfe.items.map((item) => {
    const d = byNumber.get(item.itemNumber);
    if (!d) throw nfeError(`Item ${item.itemNumber} sem definição de produto.`);
    const productId = d.productId ? Number.parseInt(d.productId, 10) : null;
    if (!productId && !d.createProduct) {
      throw nfeError(`Item ${item.itemNumber} (${item.description}): escolha um produto ou marque "criar novo".`);
    }
    const factor = Number(String(d.conversionFactor ?? 1).replace(",", "."));
    if (!Number.isFinite(factor) || factor <= 0) {
      throw nfeError(`Item ${item.itemNumber}: fator de conversão inválido.`);
    }
    let newPrice = null;
    if (d.newPrice != null && d.newPrice !== "") {
      newPrice = round2(String(d.newPrice).replace(",", "."));
      if (!Number.isFinite(newPrice) || newPrice <= 0) {
        throw nfeError(`Item ${item.itemNumber}: novo preço de venda inválido.`);
      }
    }
    return { item, productId, createProduct: !productId, factor, newPrice };
  });
}

async function confirm({ xml, tenantId, brandId, items: decisions, user }) {
  tenantId = requireTenantId(tenantId);
  const nfe = parseNfeXml(xml);
  const brand = await resolveBrand({ tenantId, cnpj: nfe.emitter.cnpj, brandId });
  if (!brand) throw nfeError("Escolha a representada desta nota.");
  const plan = validateDecisions(nfe, decisions);

  const client = await pool.connect();
  let invoiceId;
  try {
    await beginTenantTransaction(client);

    const dup = await client.query(
      `SELECT id FROM purchase_invoices
       WHERE tenant_id = $1 AND access_key = $2 AND status <> 'estornada' LIMIT 1`,
      [tenantId, nfe.accessKey],
    );
    if (dup.rows.length) {
      const err = nfeError("Esta nota já foi importada.");
      err.statusCode = 409;
      throw err;
    }

    const inv = await client.query(
      `INSERT INTO purchase_invoices
        (tenant_id, access_key, number, series, issued_at, emitter_cnpj, emitter_name,
         recipient_doc, brand_id, brand_name, total_products, total_invoice, total_cost,
         items_count, xml, imported_by, imported_by_name)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,$16,$17)
       RETURNING id`,
      [tenantId, nfe.accessKey, nfe.number, nfe.series, nfe.issuedAt, nfe.emitter.cnpj,
        nfe.emitter.name, nfe.recipient.doc, brand.id, brand.name, nfe.totals.products,
        nfe.totals.invoice, nfe.totals.cost, nfe.items.length, String(xml),
        Number.parseInt(user?.userId, 10) || null, user?.username || null],
    );
    invoiceId = inv.rows[0].id;
    const purchaseAt = nfe.issuedAt || new Date().toISOString();
    const label = `NF ${nfe.number || nfe.accessKey.slice(25, 34)}`;

    for (const step of plan) {
      const { item, factor } = step;
      const { stockQuantity } = toStockQuantity(item.quantity, factor);
      if (stockQuantity <= 0) {
        throw nfeError(`Item ${item.itemNumber}: quantidade no estoque ficaria zero.`);
      }
      const unitCost = roundCost(item.totalCost / stockQuantity);

      let productId = step.productId;
      let previous = { cost: null, lastCost: null, lastPurchaseAt: null, price: null };
      let newAverageCost = unitCost;

      if (productId) {
        const cur = await client.query(
          `SELECT id, stock, price, cost_price, last_cost, last_purchase_at, brand_id
           FROM products WHERE id = $1 AND tenant_id = $2 FOR UPDATE`,
          [productId, tenantId],
        );
        const row = cur.rows[0];
        if (!row) throw nfeError(`Item ${item.itemNumber}: produto não encontrado.`);
        previous = {
          cost: num(row.cost_price),
          lastCost: num(row.last_cost),
          lastPurchaseAt: row.last_purchase_at,
          price: num(row.price),
        };
        newAverageCost = weightedAverageCost({
          currentStock: Number(row.stock),
          currentCost: previous.cost,
          quantity: stockQuantity,
          unitCost,
        });
        await client.query(
          `UPDATE products
           SET cost_price = $1, last_cost = $2, last_purchase_at = $3,
               ean = COALESCE(ean, $4)
           WHERE id = $5 AND tenant_id = $6`,
          [newAverageCost, unitCost, purchaseAt, item.ean, productId, tenantId],
        );
      } else {
        // Produto novo: preço de venda = informado ou, na falta, o custo (margem 0%).
        const created = await client.query(
          `INSERT INTO products
             (name, productcode, price, stock, brand, brand_id, minstock, tenant_id,
              createdat, cost_price, last_cost, last_purchase_at, ean)
           VALUES ($1,$2,$3,0,$4,$5,0,$6,NOW(),$7,$7,$8,$9)
           RETURNING id`,
          [item.description, item.supplierCode, step.newPrice ?? round2(unitCost),
            brand.name, brand.id, tenantId, unitCost, purchaseAt, item.ean],
        );
        productId = created.rows[0].id;
      }

      await changeProductStock(client, {
        productId,
        delta: stockQuantity,
        tenantId,
        movement: {
          type: "entrada_compra",
          referenceType: "purchase",
          referenceId: invoiceId,
          reason: label,
          userId: user?.userId,
        },
      });

      await client.query(
        `INSERT INTO price_history
           (product_id, tenant_id, event_type, purchase_price, quantity, purchase_date,
            old_cost, new_cost, changed_by, purchase_invoice_id)
         VALUES ($1,$2,'custo',$3,$4,$5,$6,$7,$8,$9)`,
        [productId, tenantId, unitCost, stockQuantity, purchaseAt, previous.cost,
          newAverageCost, user?.username || null, invoiceId],
      );

      let appliedPrice = null;
      if (step.productId && step.newPrice != null && step.newPrice !== previous.price) {
        await client.query(
          "UPDATE products SET price = $1 WHERE id = $2 AND tenant_id = $3",
          [step.newPrice, productId, tenantId],
        );
        await client.query(
          `INSERT INTO price_history
             (product_id, tenant_id, event_type, old_price, new_price, changed_by,
              changedat, purchase_invoice_id)
           VALUES ($1,$2,'venda',$3,$4,$5,NOW(),$6)`,
          [productId, tenantId, previous.price, step.newPrice,
            `${user?.username || "admin"} (${label})`, invoiceId],
        );
        appliedPrice = step.newPrice;
      }

      await client.query(
        `INSERT INTO purchase_invoice_items
           (tenant_id, invoice_id, item_number, product_id, supplier_code, ean, description,
            ncm, cfop, unit, quantity, conversion_factor, stock_quantity, unit_value,
            gross_value, discount, freight, insurance, other_expenses, ipi, icms_st, fcp_st,
            total_cost, unit_cost, previous_cost, previous_last_cost,
            previous_last_purchase_at, new_average_cost, previous_price, new_price,
            created_product)
         VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,$16,$17,$18,$19,$20,
                 $21,$22,$23,$24,$25,$26,$27,$28,$29,$30,$31)`,
        [tenantId, invoiceId, item.itemNumber, productId, item.supplierCode, item.ean,
          item.description, item.ncm, item.cfop, item.unit, item.quantity, step.factor,
          stockQuantity, item.unitValue, item.grossValue, item.discount, item.freight,
          item.insurance, item.otherExpenses, item.ipi, item.icmsSt, item.fcpSt,
          item.totalCost, unitCost, previous.cost, previous.lastCost,
          previous.lastPurchaseAt, newAverageCost, previous.price,
          appliedPrice ?? (step.createProduct ? step.newPrice ?? round2(unitCost) : null),
          step.createProduct],
      );

      if (nfe.emitter.cnpj && item.supplierCode) {
        await client.query(
          `INSERT INTO supplier_product_links
             (tenant_id, supplier_cnpj, supplier_code, product_id, conversion_factor)
           VALUES ($1,$2,$3,$4,$5)
           ON CONFLICT (tenant_id, supplier_cnpj, supplier_code)
           DO UPDATE SET product_id = EXCLUDED.product_id,
                         conversion_factor = EXCLUDED.conversion_factor,
                         updated_at = NOW()`,
          [tenantId, nfe.emitter.cnpj, item.supplierCode, productId, step.factor],
        );
      }
    }

    if (nfe.emitter.cnpj) {
      await client.query(
        "UPDATE brands SET cnpj = $1 WHERE id = $2 AND tenant_id = $3 AND cnpj IS NULL",
        [nfe.emitter.cnpj, brand.id, tenantId],
      );
    }

    await client.query("COMMIT");
  } catch (err) {
    await client.query("ROLLBACK");
    if (err.code === "23505") {
      const dupErr = nfeError("Esta nota já foi importada.");
      dupErr.statusCode = 409;
      throw dupErr;
    }
    throw err;
  } finally {
    client.release();
  }

  await invalidateProductsCache(tenantId);
  return getInvoice(invoiceId, tenantId);
}

function mapInvoice(row) {
  return {
    id: row.id,
    accessKey: row.access_key,
    number: row.number,
    series: row.series,
    issuedAt: row.issued_at,
    emitterCnpj: row.emitter_cnpj,
    emitterName: row.emitter_name,
    brandId: row.brand_id,
    brandName: row.brand_name,
    totalProducts: num(row.total_products),
    totalInvoice: num(row.total_invoice),
    totalCost: num(row.total_cost),
    itemsCount: Number(row.items_count),
    status: row.status,
    importedAt: row.imported_at,
    importedByName: row.imported_by_name,
    reversedAt: row.reversed_at,
    reversedByName: row.reversed_by_name,
  };
}

async function listInvoices({ tenantId, limit = 50 }) {
  tenantId = requireTenantId(tenantId);
  const safe = Math.min(200, Math.max(1, Number(limit) || 50));
  const rows = await sql`
    SELECT id, access_key, number, series, issued_at, emitter_cnpj, emitter_name,
           brand_id, brand_name, total_products, total_invoice, total_cost, items_count,
           status, imported_at, imported_by_name, reversed_at, reversed_by_name
    FROM purchase_invoices
    WHERE tenant_id = ${tenantId}
    ORDER BY imported_at DESC
    LIMIT ${safe}
  `;
  return rows.map(mapInvoice);
}

async function getInvoice(id, tenantId) {
  tenantId = requireTenantId(tenantId);
  const rows = await sql`
    SELECT * FROM purchase_invoices WHERE id = ${Number(id)} AND tenant_id = ${tenantId}
  `;
  if (!rows.length) throw notFound("Nota não encontrada.");
  const items = await sql`
    SELECT i.*, p.name AS product_name, p.productcode AS product_code
    FROM purchase_invoice_items i
    LEFT JOIN products p ON p.id = i.product_id AND p.tenant_id = i.tenant_id
    WHERE i.tenant_id = ${tenantId} AND i.invoice_id = ${Number(id)}
    ORDER BY i.item_number
  `;
  return {
    ...mapInvoice(rows[0]),
    items: items.map((i) => ({
      itemNumber: i.item_number,
      productId: i.product_id,
      productName: i.product_name,
      productCode: i.product_code,
      supplierCode: i.supplier_code,
      description: i.description,
      unit: i.unit,
      quantity: num(i.quantity),
      conversionFactor: num(i.conversion_factor),
      stockQuantity: Number(i.stock_quantity),
      grossValue: num(i.gross_value),
      discount: num(i.discount),
      freight: num(i.freight),
      ipi: num(i.ipi),
      icmsSt: num(i.icms_st),
      fcpSt: num(i.fcp_st),
      totalCost: num(i.total_cost),
      unitCost: num(i.unit_cost),
      previousCost: num(i.previous_cost),
      newAverageCost: num(i.new_average_cost),
      previousPrice: num(i.previous_price),
      newPrice: num(i.new_price),
      createdProduct: Boolean(i.created_product),
    })),
  };
}

/**
 * Estorno: devolve o estoque. O custo volta ao anterior só se nenhuma outra
 * compra do produto entrou depois desta nota; senão o custo atual é mantido.
 * Preços de venda alterados na importação não são revertidos.
 */
async function reverseInvoice({ id, tenantId, user }) {
  tenantId = requireTenantId(tenantId);
  const client = await pool.connect();
  const costKept = [];
  try {
    await beginTenantTransaction(client);
    const inv = await client.query(
      "SELECT id, status, number FROM purchase_invoices WHERE id = $1 AND tenant_id = $2 FOR UPDATE",
      [Number(id), tenantId],
    );
    const invoice = inv.rows[0];
    if (!invoice) throw notFound("Nota não encontrada.");
    if (invoice.status === "estornada") throw nfeError("Esta nota já foi estornada.");

    const items = await client.query(
      `SELECT * FROM purchase_invoice_items WHERE tenant_id = $1 AND invoice_id = $2`,
      [tenantId, invoice.id],
    );
    for (const item of items.rows) {
      if (!item.product_id) continue;
      await changeProductStock(client, {
        productId: item.product_id,
        delta: -Number(item.stock_quantity),
        tenantId,
        movement: {
          type: "estorno_compra",
          referenceType: "purchase",
          referenceId: invoice.id,
          reason: `Estorno da NF ${invoice.number || invoice.id}`,
          userId: user?.userId,
        },
      });
      const later = await client.query(
        `SELECT 1 FROM purchase_invoice_items i
         JOIN purchase_invoices v ON v.id = i.invoice_id
         WHERE i.tenant_id = $1 AND i.product_id = $2 AND i.invoice_id > $3
           AND v.status <> 'estornada' LIMIT 1`,
        [tenantId, item.product_id, invoice.id],
      );
      if (later.rows.length === 0) {
        await client.query(
          `UPDATE products SET cost_price = $1, last_cost = $2, last_purchase_at = $3
           WHERE id = $4 AND tenant_id = $5`,
          [item.previous_cost, item.previous_last_cost, item.previous_last_purchase_at,
            item.product_id, tenantId],
        );
        await client.query(
          `INSERT INTO price_history
             (product_id, tenant_id, event_type, old_cost, new_cost, changed_by,
              changedat, purchase_invoice_id)
           VALUES ($1,$2,'custo_manual',$3,$4,$5,NOW(),$6)`,
          [item.product_id, tenantId, item.new_average_cost, item.previous_cost,
            `Estorno NF ${invoice.number || invoice.id}`, invoice.id],
        );
      } else {
        costKept.push(item.description);
      }
    }
    await client.query(
      `UPDATE purchase_invoices
       SET status = 'estornada', reversed_at = NOW(), reversed_by_name = $1
       WHERE id = $2 AND tenant_id = $3`,
      [user?.username || null, invoice.id, tenantId],
    );
    await client.query("COMMIT");
  } catch (err) {
    await client.query("ROLLBACK");
    throw err;
  } finally {
    client.release();
  }
  await invalidateProductsCache(tenantId);
  return { invoice: await getInvoice(id, tenantId), costKept };
}

module.exports = {
  preview,
  confirm,
  listInvoices,
  getInvoice,
  reverseInvoice,
  suggestPrice,
};
