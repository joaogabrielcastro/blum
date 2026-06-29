const express = require("express");
const router = express.Router();
const reportController = require("../controllers/reportController");
const { authenticate, authorize } = require("../middleware/authMiddleware");

// Todas as rotas requerem autenticação
router.get("/stats", authenticate, reportController.getReportStats);
router.get(
  "/monthly-sales",
  authenticate,
  reportController.getMonthlySalesSummaries,
);
router.get("/sales-target", authenticate, reportController.getSalesTarget);
router.put("/sales-target", authenticate, reportController.upsertSalesTarget);
router.get(
  "/sales-by-rep",
  authenticate,
  authorize("admin"),
  reportController.getSalesByRep
);
router.get("/commissions", authenticate, reportController.getCommissionReport);
router.get(
  "/commissions/by-brand",
  authenticate,
  authorize("admin"),
  reportController.getCommissionByBrand
);

module.exports = router;
