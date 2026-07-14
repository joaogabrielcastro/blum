const express = require("express");
const router = express.Router();
const purchaseController = require("../controllers/purchaseController");
const { uploadPdf, uploadCsv } = require("../middleware/upload");
const { authenticate, authorize } = require("../middleware/authMiddleware");
const { requirePlanFeature } = require("../middleware/planFeatureMiddleware");

// Todas as rotas de compras são apenas para admin
const adminOnly = [authenticate, authorize("admin")];
const purchaseImport = [
  ...adminOnly,
  requirePlanFeature("purchase-import"),
];

// Rotas de processamento
router.post(
  "/process-pdf",
  ...purchaseImport,
  uploadPdf,
  purchaseController.processPdf
);
router.post(
  "/process-csv",
  ...purchaseImport,
  uploadCsv,
  purchaseController.processCsv
);
router.post(
  "/finalize-pdf",
  ...purchaseImport,
  purchaseController.finalizePurchaseFromPdf
);
router.post(
  "/finalize-csv",
  ...purchaseImport,
  purchaseController.finalizePurchaseFromCsv
);
router.post(
  "/import-csv",
  ...purchaseImport,
  uploadCsv,
  purchaseController.importCsv
);

// Rotas de consulta (admin ou vendedores com permissão)
router.get(
  "/price-history/:productId",
  authenticate,
  purchaseController.getPriceHistory
);
router.get(
  "/last-price/:productId",
  authenticate,
  purchaseController.getLastPurchasePrice
);

if (
  process.env.NODE_ENV !== "production" ||
  process.env.ENABLE_PURCHASE_DEBUG === "true"
) {
  router.get("/test", ...adminOnly, purchaseController.testConnection);
  router.post(
    "/debug-pdf",
    ...adminOnly,
    uploadPdf,
    purchaseController.debugPdf,
  );
}

module.exports = router;
