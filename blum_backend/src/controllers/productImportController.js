const productCatalogImportService = require("../services/product/productCatalogImportService");
const productExportService = require("../services/product/productExportService");

exports.previewImport = async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ error: "Nenhum arquivo enviado." });
    }

    const preview = productCatalogImportService.previewFromBuffer(
      req.file.buffer,
      { filename: req.file.originalname },
    );

    if (preview.rowCount === 0) {
      return res.status(400).json({
        error: "Nenhum produto válido encontrado no arquivo.",
        warnings: preview.warnings,
        profile: preview.profile,
      });
    }

    res.json(preview);
  } catch (error) {
    console.error("previewImport error:", error);
    res.status(500).json({ error: error.message || "Erro ao processar planilha." });
  }
};

exports.finalizeImport = async (req, res) => {
  try {
    const { brandId, stockMode, items, recordPriceHistory, purchaseDate } =
      req.body;

    if (!brandId) {
      return res.status(400).json({ error: "brandId é obrigatório." });
    }

    const result = await productCatalogImportService.finalizeImport({
      tenantId: req.user.tenantId,
      brandId,
      items,
      stockMode: stockMode || "replace",
      recordPriceHistory: Boolean(recordPriceHistory),
      purchaseDate,
    });

    res.json(result);
  } catch (error) {
    const status = error.status || error.statusCode || 500;
    if (status >= 500) console.error("finalizeImport error:", error);
    res.status(status).json({
      error: error.message || "Erro ao importar produtos.",
    });
  }
};

exports.exportCsv = async (req, res) => {
  try {
    const { brandId, q } = req.query;
    const result = await productExportService.exportProducts({
      tenantId: req.user.tenantId,
      brandId,
      q,
      format: "csv",
    });

    res.setHeader("Content-Type", result.contentType);
    res.setHeader(
      "Content-Disposition",
      `attachment; filename="${result.filename}"`,
    );
    res.status(200).send(result.buffer);
  } catch (error) {
    const status = error.status || 500;
    if (status >= 500) console.error("exportCsv error:", error);
    res.status(status).json({ error: error.message || "Erro ao exportar CSV." });
  }
};

exports.exportExcel = async (req, res) => {
  try {
    const { brandId, q } = req.query;
    const result = await productExportService.exportProducts({
      tenantId: req.user.tenantId,
      brandId,
      q,
      format: "xlsx",
    });

    res.setHeader("Content-Type", result.contentType);
    res.setHeader(
      "Content-Disposition",
      `attachment; filename="${result.filename}"`,
    );
    res.status(200).send(result.buffer);
  } catch (error) {
    const status = error.status || 500;
    if (status >= 500) console.error("exportExcel error:", error);
    res.status(status).json({
      error: error.message || "Erro ao exportar Excel.",
    });
  }
};
