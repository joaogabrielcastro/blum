const reportService = require("../services/reportService");

// GET SALES BY REP - Vendas por representante
exports.getSalesByRep = async (req, res) => {
  try {
    const sales = await reportService.getSalesByRep();
    res.status(200).json(sales);
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
    const { period, userRole, userId } = req.query;
    const stats = await reportService.getStats({ period, userRole, userId });
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
    const { startDate, endDate, userId } = req.query;
    const results = await reportService.getCommissionReport({
      startDate,
      endDate,
      userId,
    });
    res.status(200).json(results);
  } catch (error) {
    console.error("Erro ao gerar relatório de comissões:", error);
    res.status(500).json({ error: "Erro ao gerar relatório" });
  }
};

// GET COMMISSION BY BRAND - Relatório de comissões por marca
exports.getCommissionByBrand = async (req, res) => {
  try {
    const { startDate, endDate, sellerId } = req.query;
    const results = await reportService.getCommissionByBrand({
      startDate,
      endDate,
      sellerId,
    });
    res.status(200).json(results);
  } catch (error) {
    console.error("Erro ao gerar relatório por marca:", error);
    res.status(500).json({ error: "Erro ao gerar relatório" });
  }
};

module.exports = exports;
