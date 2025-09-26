const express = require('express');
const router = express.Router();
const multer = require('multer');
const purchaseController = require('../controllers/purchaseController');

// Configuração do Multer para receber o arquivo em memória
const upload = multer({ storage: multer.memoryStorage() });

// Rota para processar o PDF
router.post('/process-pdf', upload.single('purchasePdf'), purchaseController.processPdf);
// Rota para finalizar compra
router.post('/finalize', purchaseController.finalizePurchase);

// Adicione esta linha nas suas rotas
router.get('/api/test', purchaseController.testConnection);

module.exports = router;