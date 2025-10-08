const express = require('express');
const multer = require('multer');
const router = express.Router();

// ✅ IMPORTE CORRETAMENTE O CONTROLLER
const purchaseController = require('../controllers/purchaseController');

const upload = multer({ 
  storage: multer.memoryStorage(),
  limits: { fileSize: 10 * 1024 * 1024 } // 10MB
});

// ✅ ROTAS EXISTENTES - VERIFIQUE SE AS FUNÇÕES EXISTEM
router.post('/process-pdf', upload.single('purchasePdf'), purchaseController.processPdf);
router.post('/finalize-purchase', purchaseController.finalizePurchase);
router.get('/test-connection', purchaseController.testConnection);

// ✅ NOVA ROTA PARA CSV (SE FOR IMPLEMENTAR)
router.post('/import-csv', upload.single('productsCsv'), purchaseController.importCsv);

module.exports = router;