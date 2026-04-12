const express = require("express");
const router = express.Router();
const ordersController = require("../controllers/orderController");
const { authenticate, authorize } = require("../middleware/authMiddleware");
const { validateOrder, validateId } = require("../middleware/validation");

// Todas as rotas requerem autenticação
router.get("/", authenticate, ordersController.getAll);
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
  "/:id/finalize",
  authenticate,
  validateId,
  ordersController.finalize
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
  authorize("admin"),
  validateId,
  ordersController.delete
);

module.exports = router;
