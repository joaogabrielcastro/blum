const express = require("express");
const router = express.Router();
const reportController = require("../controllers/reportController");

router.get("/sales-by-rep", reportController.getSalesByRep);
router.get("/dashboard-stats", reportController.getDashboardStats);

module.exports = router;
