// routes/purchaseRoutes.js
const express = require('express');
const router = express.Router();
const purchaseController = require('../controllers/purchaseController');
const { uploadPdf, uploadCsv } = require('../middleware/upload');

// ✅ ROTAS SEPARADAS PARA CADA FLUXO
router.post('/process-pdf', uploadPdf, purchaseController.processPdf);
router.post('/finalize-pdf', purchaseController.finalizePurchaseFromPdf);
router.post('/finalize', purchaseController.finalizePurchase);
router.get('/test', purchaseController.testConnection);
router.post('/debug-pdf', uploadPdf, purchaseController.debugPdf);
router.post('/import-csv', uploadCsv, purchaseController.importCsv);

module.exports = router;