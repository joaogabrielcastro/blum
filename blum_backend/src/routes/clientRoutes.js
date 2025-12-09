const express = require("express");
const router = express.Router();
const clientController = require("../controllers/clientController");
const { authenticate, authorize } = require("../middleware/authMiddleware");
const { validateClient, validateId } = require("../middleware/validation");

// Todas as rotas requerem autenticação
router.get("/", authenticate, clientController.getAll);
router.get("/:id", authenticate, validateId, clientController.getClientById);
router.post("/", authenticate, validateClient, clientController.create);
router.put(
  "/:id",
  authenticate,
  validateId,
  validateClient,
  clientController.update
);
router.delete(
  "/:id",
  authenticate,
  authorize("admin"),
  validateId,
  clientController.delete
);

module.exports = router;
