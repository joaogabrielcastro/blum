const express = require("express");
const router = express.Router();
const ordersController = require("../controllers/orderController");
const { authenticate } = require("../middleware/authMiddleware");
const {
  validateOrder,
  validateId,
  validateOrderPaymentMethodUpdate,
  validateClientItemHistoryParams,
} = require("../middleware/validation");

// Todas as rotas requerem autenticação
router.get("/", authenticate, ordersController.getAll);
router.get(
  "/clients/:clientId/products/:productId/price-history",
  authenticate,
  validateClientItemHistoryParams,
  ordersController.getClientItemPriceHistory,
);
router.get("/seller/:userId", authenticate, ordersController.getOrdersBySeller);
router.get(
  "/stats/:clientId",
  authenticate,
  validateId,
  ordersController.getClientStats
);
router.get("/:id", authenticate, validateId, ordersController.getById);
router.post("/", authenticate, validateOrder, ordersController.create);
router.put(
  "/:id/convert-to-pedido",
  authenticate,
  validateId,
  ordersController.convertToPedido
);
router.put(
  "/:id/finalize",
  authenticate,
  validateId,
  ordersController.finalize
);
router.put(
  "/:id/payment-method",
  authenticate,
  validateOrderPaymentMethodUpdate,
  ordersController.updatePaymentMethod,
);
router.post(
  "/:id/duplicate",
  authenticate,
  validateId,
  ordersController.duplicate,
);
router.put(
  "/:id/status",
  authenticate,
  validateId,
  ordersController.updateStatus
);
router.put("/:id", authenticate, validateId, ordersController.update);
router.delete(
  "/:id",
  authenticate,
  validateId,
  ordersController.delete
);

module.exports = router;
