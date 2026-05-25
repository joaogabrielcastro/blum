const { sql } = require("../../config/database");
const { invalidateProductsCache } = require("../../config/cache");

/**
 * Finalização de importação CSV ou PDF (mesma regra de negócio).
 * Produtos são sempre vinculados à representada escolhida (brandId).
 */
async function finalizePurchaseFromImport(req, res) {
  const { brandId, purchaseDate, items } = req.body;
  const tenantId = req.user?.tenantId || 1;

  if (!items || !Array.isArray(items) || items.length === 0) {
    return res.status(400).json({ error: "Nenhum item válido foi recebido." });
  }

  if (!brandId) {
    return res.status(400).json({ error: "ID da marca é obrigatório." });
  }

  const productCodes = items
    .map((item) => String(item.productCode || "").trim())
    .filter(Boolean);
  if (productCodes.length !== items.length) {
    return res.status(400).json({
      error: "Código de produto é obrigatório para todos os itens.",
    });
  }

  const duplicateProductCodes = productCodes.filter(
    (code, index) => productCodes.indexOf(code) !== index,
  );
  if (duplicateProductCodes.length > 0) {
    return res.status(400).json({
      error: "Códigos de produto duplicados no arquivo.",
      details: `Códigos repetidos: ${[...new Set(duplicateProductCodes)].join(", ")}`,
    });
  }

  try {
    const results = {
      updated: 0,
      created: 0,
      newProducts: [],
      errors: [],
    };

    const brandIdInt = parseInt(brandId, 10);
    if (isNaN(brandIdInt)) {
      return res.status(400).json({
        error: "ID da marca inválido.",
        details: `Não foi possível converter '${brandId}' para número`,
      });
    }

    const brandResult = await sql`
      SELECT id, name FROM brands WHERE id = ${brandIdInt} AND tenant_id = ${tenantId}
    `;

    if (brandResult.length === 0) {
      return res.status(400).json({
        error: "Marca não encontrada.",
        details: `ID: ${brandIdInt}`,
      });
    }

    const brandName = brandResult[0].name;
    const brandIdResolved = brandIdInt;

    const mappedIds = items
      .map((item) => Number.parseInt(item.mappedProductId, 10))
      .filter((id) => Number.isInteger(id) && id > 0);
    const uniqueMappedIds = [...new Set(mappedIds)];

    const existingMappedProducts =
      uniqueMappedIds.length > 0
        ? await sql`
            SELECT id, name, brand, price as current_price
            FROM products
            WHERE id = ANY(${uniqueMappedIds})
              AND tenant_id = ${tenantId}
          `
        : [];
    const mappedProductsById = new Map(
      existingMappedProducts.map((row) => [Number(row.id), row]),
    );

    const uniqueProductCodes = [...new Set(productCodes)];
    const existingByProductCode =
      uniqueProductCodes.length > 0
        ? await sql`
            SELECT id, productcode, brand
            FROM products
            WHERE productcode = ANY(${uniqueProductCodes})
              AND tenant_id = ${tenantId}
              AND (brand = ${brandName} OR brand_id = ${brandIdResolved})
          `
        : [];
    const productsByCode = new Map(
      existingByProductCode.map((row) => [String(row.productcode), row]),
    );

    const purchaseDateIso = purchaseDate || new Date().toISOString();

    for (const item of items) {
      try {
        if (!item.quantity || item.unitPrice == null) {
          throw new Error("Item sem quantidade ou preço");
        }

        const quantity = parseInt(item.quantity, 10);
        const price = parseFloat(item.unitPrice);
        const code = String(item.productCode || "").trim();

        if (isNaN(quantity) || quantity <= 0) {
          throw new Error(`Quantidade inválida: ${item.quantity}`);
        }

        if (isNaN(price) || price < 0) {
          throw new Error(`Preço unitário inválido: ${item.unitPrice}`);
        }

        let handled = false;

        const mappedIdRaw = item.mappedProductId;
        if (mappedIdRaw && mappedIdRaw !== "") {
          const productId = parseInt(mappedIdRaw, 10);
          if (isNaN(productId)) {
            throw new Error(`ID do produto inválido: ${mappedIdRaw}`);
          }

          const mapped = mappedProductsById.get(productId);
          if (!mapped) {
            throw new Error(`Produto não encontrado com ID: ${productId}`);
          }

          if (String(mapped.brand || "").trim() !== brandName) {
            throw new Error(
              `O produto mapeado (ID ${productId}) pertence à representada "${mapped.brand}", não a "${brandName}".`,
            );
          }

          const currentPrice = mapped.current_price;

          await sql`
            UPDATE products
            SET stock = stock + ${quantity},
                price = ${price},
                brand = ${brandName},
                brand_id = ${brandIdResolved},
                name = ${item.description || mapped.name}
            WHERE id = ${productId} AND tenant_id = ${tenantId}
          `;

          if (currentPrice !== price) {
            await sql`
              INSERT INTO price_history (product_id, tenant_id, purchase_price, quantity, purchase_date)
              VALUES (${productId}, ${tenantId}, ${price}, ${quantity}, ${purchaseDateIso})
            `;
          }

          results.updated++;
          handled = true;
        }

        if (!handled && code && item.description) {
          const existingWithCode = productsByCode.get(code);
          if (existingWithCode) {
            await sql`
              UPDATE products
              SET stock = stock + ${quantity},
                  price = ${price},
                  brand = ${brandName},
                  brand_id = ${brandIdResolved},
                  name = ${item.description}
              WHERE id = ${existingWithCode.id} AND tenant_id = ${tenantId}
            `;

            await sql`
              INSERT INTO price_history (product_id, tenant_id, purchase_price, quantity, purchase_date)
              VALUES (${existingWithCode.id}, ${tenantId}, ${price}, ${quantity}, ${purchaseDateIso})
            `;

            results.updated++;
          } else {
            const newProduct = await sql`
              INSERT INTO products (
                name,
                productcode,
                price,
                stock,
                brand,
                brand_id,
                minstock,
                tenant_id,
                createdat
              ) VALUES (
                ${item.description},
                ${code},
                ${price},
                ${quantity},
                ${brandName},
                ${brandIdResolved},
                0,
                ${tenantId},
                NOW()
              )
              RETURNING id, name, productcode, brand
            `;

            await sql`
              INSERT INTO price_history (product_id, tenant_id, purchase_price, quantity, purchase_date)
              VALUES (${newProduct[0].id}, ${tenantId}, ${price}, ${quantity}, ${purchaseDateIso})
            `;

            results.created++;
            results.newProducts.push({
              id: newProduct[0].id,
              name: newProduct[0].name,
              productcode: newProduct[0].productcode,
              brand: newProduct[0].brand,
            });
            productsByCode.set(code, newProduct[0]);
          }
        } else if (!handled) {
          throw new Error("Item sem código de produto ou descrição");
        }
      } catch (error) {
        results.errors.push({
          productCode: item.productCode,
          description: item.description,
          error: error.message,
        });
      }
    }

    await invalidateProductsCache();

    res.status(200).json({
      message: `Importação processada com sucesso! ${results.updated} produtos atualizados e ${results.created} novos produtos criados na marca ${brandName}.`,
      type: "success",
      results,
      brandUsed: brandName,
    });
  } catch (error) {
    console.error("finalizePurchaseFromImport:", error.message);

    res.status(500).json({
      error: "Falha ao processar importação.",
      details: error.message,
      suggestion:
        "Verifique se todos os campos estão preenchidos corretamente.",
    });
  }
}

module.exports = { finalizePurchaseFromImport };
