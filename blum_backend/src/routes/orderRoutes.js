const express = require("express");
const router = express.Router();
const ordersController = require("../controllers/orderController");

// Rotas existentes
router.get("/", ordersController.getAll);
router.post("/", ordersController.create);
router.delete("/:id", ordersController.delete);
router.put("/:id/finalize", ordersController.finalize);
router.put("/:id", ordersController.update);
router.get("/stats/:clientId", ordersController.getClientStats);

module.exports = router;