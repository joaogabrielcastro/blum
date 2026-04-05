const { sql } = require("../../config/database");
const { getValueByHeader, parseCsvLine } = require("./csvParseHelpers");

async function processCsvData(csvText, selectedBrand) {
  const lines = csvText.split("\n").filter((line) => line.trim());
  const products = [];

  const headers = lines[0].split(",").map((h) => h.trim().toLowerCase());

  for (let i = 1; i < lines.length; i++) {
    const values = parseCsvLine(lines[i]);

    const product = {
      productCode: getValueByHeader(headers, values, [
        "codigo",
        "sku",
        "productcode",
        "código",
        "ean",
      ]),
      name: getValueByHeader(headers, values, [
        "nome",
        "descricao",
        "descrição",
        "name",
        "product",
        "produto",
      ]),
      price:
        parseFloat(
          getValueByHeader(headers, values, [
            "preco",
            "preço",
            "price",
            "valor",
            "precounitario",
          ]),
        ) || 0,
      stock:
        parseInt(
          getValueByHeader(headers, values, [
            "estoque",
            "stock",
            "quantidade",
            "qtd",
            "quantity",
          ]),
        ) || 0,
      subcode: getValueByHeader(headers, values, [
        "subcode",
        "subcodigo",
        "subcódigo",
        "codigointerno",
        "interno",
      ]),
      brand: selectedBrand,
      category: getValueByHeader(headers, values, [
        "categoria",
        "category",
        "grupo",
      ]),
    };

    if (
      product.productCode &&
      product.name &&
      product.productCode.trim() !== ""
    ) {
      products.push(product);
    }
  }

  return products;
}

async function importProductsToDatabase(products) {
  const results = {
    created: 0,
    updated: 0,
    errors: 0,
    details: [],
  };

  for (let i = 0; i < products.length; i++) {
    const product = products[i];

    try {
      let subcode = product.subcode;
      if (!subcode) {
        subcode = `CSV-${product.productCode}-${Date.now().toString(36)}`;
      }

      const existing = await sql`
        SELECT id, name, productcode, stock, price 
        FROM products 
        WHERE productcode = ${product.productCode}
      `;

      if (existing.length > 0) {
        await sql`
          UPDATE products SET 
            name = ${product.name},
            price = ${product.price},
            stock = stock + ${product.stock},
            brand = ${product.brand},
            subcode = ${subcode}
          WHERE productcode = ${product.productCode}
          RETURNING id, name, stock, price, subcode
        `;

        results.updated++;
        results.details.push(
          `✅ Atualizado: ${product.productCode} - ${product.name.substring(0, 30)}...`,
        );
      } else {
        const newProduct = await sql`
          INSERT INTO products (
            name, productcode, subcode, price, stock, brand,
            minstock, createdat
          ) VALUES (
            ${product.name}, ${product.productCode}, ${subcode}, ${product.price}, 
            ${product.stock}, ${product.brand}, 0, NOW()
          )
          RETURNING id, name, productcode, brand, subcode
        `;

        results.created++;
        results.details.push(
          `🆕 Criado: ${product.productCode} - ${product.name.substring(0, 30)}...`,
        );
      }
    } catch (error) {
      results.errors++;
      results.details.push(
        `❌ Erro: ${product.productCode} - ${error.message}`,
      );
    }
  }

  return results;
}

module.exports = {
  processCsvData,
  importProductsToDatabase,
};
