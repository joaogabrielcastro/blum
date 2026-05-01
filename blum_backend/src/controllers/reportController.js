const reportService = require("../services/reportService");
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

module.exports = exports;
