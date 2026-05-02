const { sql } = require("../../config/database");

/**
 * Finalização de importação CSV ou PDF (mesma regra de negócio).
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

  const missingSubcodes = items.filter(
    (item) => !item.subcode || item.subcode.trim() === "",
  );
  if (missingSubcodes.length > 0) {
    return res.status(400).json({
      error: "Subcódigo é obrigatório para todos os produtos.",
      details: `${missingSubcodes.length} itens sem subcódigo`,
    });
  }

  const subcodes = items.map((item) => item.subcode.trim());
  const duplicateSubcodes = subcodes.filter(
    (code, index) => subcodes.indexOf(code) !== index,
  );
  if (duplicateSubcodes.length > 0) {
    return res.status(400).json({
      error: "Subcódigos duplicados encontrados.",
      details: `Códigos repetidos: ${duplicateSubcodes.join(", ")}`,
    });
  }

  const productCodes = items
    .map((item) => String(item.productCode || "").trim())
    .filter(Boolean);
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

    const mappedIds = items
      .map((item) => Number.parseInt(item.mappedProductId, 10))
      .filter((id) => Number.isInteger(id) && id > 0);
    const uniqueMappedIds = [...new Set(mappedIds)];
    const existingBySubcode = await sql`
      SELECT id, name, subcode FROM products
      WHERE subcode = ANY(${subcodes})
        AND tenant_id = ${tenantId}
    `;
    for (const row of existingBySubcode) {
      const ownerItem = items.find(
        (item) =>
          item.subcode?.trim() === row.subcode &&
          Number.parseInt(item.mappedProductId, 10) === row.id,
      );
      if (ownerItem) continue;
      return res.status(400).json({
        error: `Subcódigo "${row.subcode}" já está em uso.`,
        details: `Usado pelo produto: ${row.name}`,
      });
    }

    const existingMappedProducts =
      uniqueMappedIds.length > 0
        ? await sql`
            SELECT id, name, price as current_price
            FROM products
            WHERE id = ANY(${uniqueMappedIds})
              AND tenant_id = ${tenantId}
          `
        : [];
    const mappedProductsById = new Map(
      existingMappedProducts.map((row) => [Number(row.id), row]),
    );

    const uniqueProductCodes = [
      ...new Set(
        items
          .map((item) => String(item.productCode || "").trim())
          .filter(Boolean),
      ),
    ];
    const existingByProductCode =
      uniqueProductCodes.length > 0
        ? await sql`
            SELECT id, productcode FROM products
            WHERE productcode = ANY(${uniqueProductCodes})
              AND tenant_id = ${tenantId}
          `
        : [];
    const productsByCode = new Map(
      existingByProductCode.map((row) => [String(row.productcode), row]),
    );

    for (const item of items) {
      try {
        if (!item.quantity || item.unitPrice == null) {
          throw new Error("Item sem quantidade ou preço");
        }

        const quantity = parseInt(item.quantity, 10);
        const price = parseFloat(item.unitPrice);
        const subcode = item.subcode.trim();

        if (isNaN(quantity) || quantity <= 0) {
          throw new Error(`Quantidade inválida: ${item.quantity}`);
        }

        if (isNaN(price) || price < 0) {
          throw new Error(`Preço unitário inválido: ${item.unitPrice}`);
        }

        if (item.mappedProductId && item.mappedProductId !== "") {
          const productId = parseInt(item.mappedProductId, 10);

          if (isNaN(productId)) {
            throw new Error(`ID do produto inválido: ${item.mappedProductId}`);
          }

          const existingProduct = mappedProductsById.get(productId);
          if (!existingProduct) {
            throw new Error(`Produto não encontrado com ID: ${productId}`);
          }

          const currentPrice = existingProduct.current_price;

          await sql`
            UPDATE products 
            SET stock = stock + ${quantity}, 
                price = ${price},
                subcode = ${subcode}
            WHERE id = ${productId} AND tenant_id = ${tenantId}
          `;

          if (currentPrice !== price) {
            await sql`
              INSERT INTO price_history (product_id, tenant_id, purchase_price, quantity, purchase_date)
              VALUES (${productId}, ${tenantId}, ${price}, ${quantity}, ${
                purchaseDate || new Date().toISOString()
              })
            `;
          }

          results.updated++;
        } else if (item.productCode && item.description) {
          const existingWithCode = productsByCode.get(String(item.productCode));
          if (existingWithCode) {
            await sql`
              UPDATE products 
              SET stock = stock + ${quantity}, 
                  price = ${price},
                  subcode = ${subcode}
              WHERE productcode = ${item.productCode} AND tenant_id = ${tenantId}
            `;

            await sql`
              INSERT INTO price_history (product_id, tenant_id, purchase_price, quantity, purchase_date)
              VALUES (${existingWithCode.id}, ${tenantId}, ${price}, ${quantity}, ${
                purchaseDate || new Date().toISOString()
              })
            `;

            results.updated++;
          } else {
            const newProduct = await sql`
              INSERT INTO products (
                name, 
                productcode, 
                subcode,
                price, 
                stock, 
                brand,
                minstock,
                tenant_id,
                createdat
              ) VALUES (
                ${item.description},
                ${item.productCode},
                ${subcode},
                ${price},
                ${quantity},
                ${brandName},
                0,
                ${tenantId},
                NOW()
              )
              RETURNING id, name, productcode, brand, subcode
            `;

            await sql`
              INSERT INTO price_history (product_id, tenant_id, purchase_price, quantity, purchase_date)
              VALUES (${newProduct[0].id}, ${tenantId}, ${price}, ${quantity}, ${
                purchaseDate || new Date().toISOString()
              })
            `;

            results.created++;
            results.newProducts.push({
              id: newProduct[0].id,
              name: newProduct[0].name,
              productcode: newProduct[0].productcode,
              brand: newProduct[0].brand,
              subcode: newProduct[0].subcode,
            });
          }
        } else {
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

    res.status(200).json({
      message: `Importação processada com sucesso! ${results.updated} produtos atualizados e ${results.created} novos produtos criados na marca ${brandName}.`,
      type: "success",
      results: results,
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
