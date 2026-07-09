const reportService = require("../services/reportService");
const XLSX = require("xlsx");
const {
  mapSalesByRepPayload,
  mapCommissionReportPayload,
  mapCommissionByBrandPayload,
} = require("../mappers/apiResponseMapper");

// GET SALES BY REP - Vendas por representante
exports.getSalesByRep = async (req, res) => {
  try {
    const mapOptions = { camelOnly: req.apiVersion === "v2" };
    const sales = await reportService.getSalesByRep(req.user.tenantId);
    res.status(200).json(mapSalesByRepPayload(sales, mapOptions));
  } catch (error) {
    console.error(
      "Erro ao gerar relatório de vendas por representante:",
      error
    );
    res
      .status(500)
      .json({ error: "Erro ao gerar relatório de vendas por representante." });
  }
};

// GET REPORT STATS - Estatísticas do relatório
exports.getReportStats = async (req, res) => {
  try {
    const { period } = req.query;
    const stats = await reportService.getStats({
      period,
      authUser: {
        role: req.user.role,
        userId: req.user.userId,
        tenantId: req.user.tenantId,
      },
    });
    res.status(200).json(stats);
  } catch (error) {
    console.error("Erro ao buscar estatísticas do relatório:", error);
    res
      .status(500)
      .json({ error: "Erro ao buscar estatísticas do relatório." });
  }
};

// GET COMMISSION REPORT - Relatório de comissões
exports.getCommissionReport = async (req, res) => {
  try {
    const mapOptions = { camelOnly: req.apiVersion === "v2" };
    const { startDate, endDate } = req.query;
    let userId = req.query.userId;
    if (req.user.role === "salesperson") {
      userId = req.user.userId;
    }
    const results = await reportService.getCommissionReport({
      startDate,
      endDate,
      userId: userId || undefined,
      tenantId: req.user.tenantId,
    });
    res.status(200).json(mapCommissionReportPayload(results, mapOptions));
  } catch (error) {
    console.error("Erro ao gerar relatório de comissões:", error);
    res.status(500).json({ error: "Erro ao gerar relatório" });
  }
};

// GET COMMISSION BY BRAND - Relatório de comissões por marca
exports.getCommissionByBrand = async (req, res) => {
  try {
    const mapOptions = { camelOnly: req.apiVersion === "v2" };
    const { startDate, endDate, sellerId } = req.query;
    const results = await reportService.getCommissionByBrand({
      startDate,
      endDate,
      sellerId,
      tenantId: req.user.tenantId,
    });
    res.status(200).json(mapCommissionByBrandPayload(results, mapOptions));
  } catch (error) {
    console.error("Erro ao gerar relatório por marca:", error);
    res.status(500).json({ error: "Erro ao gerar relatório" });
  }
};

exports.exportSalesByRepExcel = async (req, res) => {
  try {
    const sales = await reportService.getSalesByRep(req.user.tenantId);
    const rows = sales.map((row) => ({
      Representante: row.sellerName || row.username,
      Usuario: row.username,
      "Vendas (R$)": parseFloat(row.totalSales) || 0,
    }));

    const sheet = XLSX.utils.json_to_sheet(rows);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, sheet, "Vendas por rep");
    const buffer = XLSX.write(workbook, { type: "buffer", bookType: "xlsx" });

    res.setHeader(
      "Content-Type",
      "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
    );
    res.setHeader(
      "Content-Disposition",
      'attachment; filename="blum-vendas-por-representante.xlsx"',
    );
    res.status(200).send(buffer);
  } catch (error) {
    console.error("Erro ao exportar Excel:", error);
    res.status(500).json({ error: "Erro ao exportar relatório Excel." });
  }
};

exports.getMonthlySalesSummaries = async (req, res) => {
  try {
    await reportService.syncMonthlySalesSummaries(req.user.tenantId);

    let sellerUserId = req.query.sellerUserId;
    if (req.user.role === "salesperson") {
      sellerUserId = req.user.userId;
    }

    const rows = await reportService.listMonthlySalesSummaries(
      req.user.tenantId,
      sellerUserId || null,
    );

    res.status(200).json(
      rows.map((row) => ({
        year: Number(row.year),
        month: Number(row.month),
        totalSales: parseFloat(row.total_sales) || 0,
        orderCount: Number(row.order_count) || 0,
        updatedAt: row.updated_at,
      })),
    );
  } catch (error) {
    console.error("Erro ao listar resumos mensais:", error);
    res.status(500).json({ error: "Erro ao listar resumos mensais de vendas." });
  }
};

exports.getSalesTarget = async (req, res) => {
  try {
    const year = parseInt(req.query.year, 10);
    const month = parseInt(req.query.month, 10);
    if (!Number.isInteger(year) || !Number.isInteger(month)) {
      return res.status(400).json({ error: "year e month são obrigatórios" });
    }

    let sellerUserId = req.query.sellerUserId;
    if (req.user.role === "salesperson") {
      sellerUserId = req.user.userId;
    } else if (sellerUserId === "" || sellerUserId === "company") {
      sellerUserId = null;
    }

    const targetAmount = await reportService.getSalesTarget({
      tenantId: req.user.tenantId,
      year,
      month,
      sellerUserId: sellerUserId ?? null,
    });

    res.status(200).json({ year, month, targetAmount, sellerUserId: sellerUserId ?? null });
  } catch (error) {
    console.error("Erro ao buscar meta de vendas:", error);
    res.status(500).json({ error: "Erro ao buscar meta de vendas." });
  }
};

exports.upsertSalesTarget = async (req, res) => {
  try {
    const year = parseInt(req.body.year, 10);
    const month = parseInt(req.body.month, 10);
    const targetAmount = req.body.targetAmount;

    if (!Number.isInteger(year) || !Number.isInteger(month)) {
      return res.status(400).json({ error: "year e month são obrigatórios" });
    }

    let sellerUserId = req.body.sellerUserId;
    if (req.user.role === "salesperson") {
      if (String(sellerUserId ?? req.user.userId) !== String(req.user.userId)) {
        return res.status(403).json({ error: "Sem permissão para alterar meta de outro vendedor" });
      }
      sellerUserId = req.user.userId;
    } else if (sellerUserId === "" || sellerUserId === "company" || sellerUserId == null) {
      sellerUserId = null;
    }

    const row = await reportService.upsertSalesTarget({
      tenantId: req.user.tenantId,
      year,
      month,
      sellerUserId,
      targetAmount,
    });

    res.status(200).json({
      year: Number(row.year),
      month: Number(row.month),
      targetAmount: parseFloat(row.target_amount) || 0,
      sellerUserId: row.seller_user_id,
    });
  } catch (error) {
    console.error("Erro ao salvar meta de vendas:", error);
    res.status(400).json({ error: error.message || "Erro ao salvar meta de vendas." });
  }
};

module.exports = exports;
