const express = require("express");
const router = express.Router();
const ordersController = require("../controllers/orderController");

// Rotas para pedidos
router.get("/", ordersController.getAll);
router.post("/", ordersController.create);
router.get("/:id", ordersController.getById);
router.delete("/:id", ordersController.delete);
router.put("/:id/finalize", ordersController.finalize);
router.put("/:id", ordersController.update);
router.get("/stats/:clientId", ordersController.getClientStats);
router.get("/seller/:userId", ordersController.getOrdersBySeller);
router.put("/:id/status", ordersController.updateStatus);

module.exports = router;