// routes/purchaseRoutes.js
const express = require("express");
const router = express.Router();
const purchaseController = require("../controllers/purchaseController");
const { uploadPdf, uploadCsv } = require("../middleware/upload");

// ✅ ROTAS SEPARADAS PARA CADA FLUXO
router.post("/process-pdf", uploadPdf, purchaseController.processPdf);
router.post("/finalize-pdf", purchaseController.finalizePurchaseFromPdf);
router.post("/finalize-csv", purchaseController.finalizePurchaseFromCsv);
router.get("/test", purchaseController.testConnection);
router.post("/debug-pdf", uploadPdf, purchaseController.debugPdf);
router.post("/import-csv", uploadCsv, purchaseController.importCsv);
router.get("/price-history/:productId", purchaseController.getPriceHistory);
router.get("/last-price/:productId", purchaseController.getLastPurchasePrice);
router.post("/process-csv", uploadCsv, purchaseController.processCsv);

module.exports = router;
