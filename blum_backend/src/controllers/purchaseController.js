const path = require("path");
const fs = require("fs").promises;
const { sql } = require("../config/database");
const { processPdf } = require("../services/purchase/pdfProcessService");
const { finalizePurchaseFromImport } = require("../services/purchase/purchaseFinalizeImportService");
const csvImportService = require("../services/purchase/csvImportService");
const purchaseRepository = require("../repositories/purchaseRepository");
const {
  mapPurchaseHistoryPayload,
  mapLastPurchasePriceRow,
} = require("../mappers/apiResponseMapper");

exports.processPdf = processPdf;
exports.finalizePurchaseFromCsv = finalizePurchaseFromImport;
exports.finalizePurchaseFromPdf = finalizePurchaseFromImport;

exports.testConnection = async (req, res) => {
  try {
    res.status(200).json({
      success: true,
      message: "Backend funcionando. Usando extração de texto por regex.",
      method: "fallback-text-extraction",
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error.message,
    });
  }
};

exports.debugPdf = async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ error: "Nenhum arquivo PDF enviado." });
    }

    const pdf = require("pdf-parse");
    const data = await pdf(req.file.buffer);

    const analysis = {
      totalLength: data.text.length,
      firstLines: data.text.split("\n").slice(0, 10),
      hasItens: data.text.includes("ITENS"),
      hasProduct: data.text.includes("Produto"),
      hasDescription: data.text.includes("Descrição"),
      hasQuantity:
        data.text.includes("Quant. Solíc") || data.text.includes("Quant"),
      hasPrice: data.text.includes("Preço Unit. Liq"),
      sampleText: data.text.substring(0, 1500),
      method: "fallback-text-extraction",
    };

    res.status(200).json(analysis);
  } catch (error) {
    res.status(500).json({
      error: error.message,
    });
  }
};

exports.importCsv = async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ error: "Nenhum arquivo CSV enviado." });
    }

    const { brandId } = req.body;

    if (!brandId) {
      return res
        .status(400)
        .json({ error: "ID da marca é obrigatório para importação CSV." });
    }

    const brandResult = await purchaseRepository.findBrandByIdAndTenant(
      parseInt(brandId, 10),
      req.user.tenantId,
    );
    if (brandResult.length === 0) {
      return res.status(400).json({ error: "Marca não encontrada." });
    }

    const brandName = brandResult[0].name;
    const csvText = req.file.buffer.toString("utf8");
    const products = await csvImportService.processCsvData(csvText, brandName);

    if (products.length === 0) {
      return res.status(400).json({
        error: "Nenhum produto válido encontrado no CSV",
        details: "Verifique os cabeçalhos e formato do arquivo",
      });
    }

    const results = await csvImportService.importProductsToDatabase(
      products,
      req.user.tenantId,
    );

    res.status(200).json({
      message: `Importação concluída! ${results.created} novos produtos, ${results.updated} atualizados na marca ${brandName}`,
      results: results,
      type: "success",
      brandUsed: brandName,
    });
  } catch (error) {
    console.error("ERRO na importação CSV:", error);
    res.status(500).json({
      error: "Falha na importação do CSV",
      details: error.message,
    });
  }
};

exports.processCsv = async (req, res) => {
  try {
    const mapOptions = { camelOnly: req.apiVersion === "v2" };
    if (!req.file) {
      return res.status(400).json({ error: "Nenhum arquivo CSV enviado." });
    }

    const csvText = req.file.buffer.toString("utf8");
    const products = await csvImportService.processCsvData(csvText, "");

    const parsed = products.map((p, index) => {
      const item = {
        productCode: p.productCode || "",
        description: p.name || `Produto ${index + 1}`,
        quantity: Number(p.stock || 1),
        unitPrice: Number(p.price || 0),
        subCode: p.subCode || p.subcode || p.productCode || `CSV-${index + 1}`,
      };
      if (!mapOptions.camelOnly) {
        item.subcode = item.subCode;
      }
      return item;
    });

    return res.status(200).json(parsed);
  } catch (error) {
    console.error("ERRO ao processar CSV (preview):", error);
    return res.status(500).json({ error: error.message });
  }
};

exports.getPriceHistory = async (req, res) => {
  const { productId } = req.params;
  const mapOptions = { camelOnly: req.apiVersion === "v2" };

  try {
    const history = await purchaseRepository.findPriceHistoryByProductAndTenant(
      parseInt(productId, 10),
      req.user.tenantId,
    );

    res.status(200).json(mapPurchaseHistoryPayload(history, mapOptions));
  } catch (error) {
    console.error("ERRO ao buscar histórico de preços:", error.message);
    res.status(500).json({
      error: "Erro ao buscar histórico de preços.",
      details: error.message,
    });
  }
};

exports.getLastPurchasePrice = async (req, res) => {
  const { productId } = req.params;
  const mapOptions = { camelOnly: req.apiVersion === "v2" };

  try {
    const lastPurchase = await sql`
      SELECT 
        purchase_price,
        purchase_date,
        quantity
      FROM price_history 
      WHERE COALESCE(product_id, productid) = ${parseInt(productId, 10)}
        AND tenant_id = ${req.user.tenantId}
      ORDER BY purchase_date DESC 
      LIMIT 1
    `;

    if (lastPurchase.length === 0) {
      return res.status(404).json({
        message: "Nenhum histórico de compra encontrado para este produto.",
      });
    }

    res.status(200).json(mapLastPurchasePriceRow(lastPurchase[0], mapOptions));
  } catch (error) {
    console.error("ERRO ao buscar último preço:", error.message);
    res.status(500).json({
      error: "Erro ao buscar último preço de compra.",
      details: error.message,
    });
  }
};

exports.listTempFiles = async (req, res) => {
  try {
    const tempDir = path.join(__dirname, "..", "temp");
    const files = await fs.readdir(tempDir);

    const fileDetails = await Promise.all(
      files.map(async (file) => {
        const filePath = path.join(tempDir, file);
        const stats = await fs.stat(filePath);
        return {
          name: file,
          size: stats.size,
          isFile: stats.isFile(),
          created: stats.birthtime,
        };
      }),
    );

    res.status(200).json({
      tempDir,
      files: fileDetails,
    });
  } catch (error) {
    res.status(500).json({
      error: error.message,
    });
  }
};
