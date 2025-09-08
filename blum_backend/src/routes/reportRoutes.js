// Dentro de src/routes/reportRoutes.js
const express = require("express");
const router = express.Router();
const reportController = require("../controllers/reportController");

// Adicione ou verifique se esta rota existe:
router.get("/stats", reportController.getReportStats);

router.get("/sales-by-rep", reportController.getSalesByRep);

module.exports = router;