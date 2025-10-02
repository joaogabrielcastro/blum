const express = require('express');
const router = express.Router();
const multer = require('multer');
const purchaseController = require('../controllers/purchaseController');

const upload = multer({ storage: multer.memoryStorage() });

// Rotas principais
router.post('/process-pdf', upload.single('purchasePdf'), purchaseController.processPdf);
router.post('/finalize', purchaseController.finalizePurchase);

// ✅ Novas rotas de diagnóstico
router.get('/test', purchaseController.testConnection);
router.post('/debug-pdf', upload.single('purchasePdf'), purchaseController.debugPdf);

// ✅ Rota para ver modelos disponíveis
router.get('/models', (req, res) => {
  res.status(200).json({ 
    availableModels: purchaseController.AVAILABLE_MODELS 
  });
});

module.exports = router;