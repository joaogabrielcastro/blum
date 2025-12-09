const express = require("express");
const router = express.Router();
const purchaseController = require("../controllers/purchaseController");
const { uploadPdf, uploadCsv } = require("../middleware/upload");
const { authenticate, authorize } = require("../middleware/authMiddleware");

// Todas as rotas de compras são apenas para admin
const adminOnly = [authenticate, authorize('admin')];

// Rotas de processamento
router.post("/process-pdf", ...adminOnly, uploadPdf, purchaseController.processPdf);
router.post("/process-csv", ...adminOnly, uploadCsv, purchaseController.processCsv);
router.post("/finalize-pdf", ...adminOnly, purchaseController.finalizePurchaseFromPdf);
router.post("/finalize-csv", ...adminOnly, purchaseController.finalizePurchaseFromCsv);
router.post("/import-csv", ...adminOnly, uploadCsv, purchaseController.importCsv);

// Rotas de consulta (admin ou vendedores com permissão)
router.get("/price-history/:productId", authenticate, purchaseController.getPriceHistory);
router.get("/last-price/:productId", authenticate, purchaseController.getLastPurchasePrice);

// Rotas de debug (apenas dev/admin)
router.get("/test", ...adminOnly, purchaseController.testConnection);
router.post("/debug-pdf", ...adminOnly, uploadPdf, purchaseController.debugPdf);

module.exports = router;
