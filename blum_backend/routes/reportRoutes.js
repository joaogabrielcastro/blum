const express = require('express');
const reportController = require('../controllers/reportController');

const router = express.Router();

router.get('/sales-by-client', reportController.getSalesByClient);
router.get('/sales-by-salesperson', reportController.getSalesBySalesperson);
router.get('/top-selling-products', reportController.getTopSellingProducts);
router.get('/inventory-status', reportController.getInventoryStatus);

module.exports = router;