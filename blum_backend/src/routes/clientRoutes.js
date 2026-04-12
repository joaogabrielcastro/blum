const express = require("express");
const router = express.Router();
const clientController = require("../controllers/clientController");
const { authenticate, authorize } = require("../middleware/authMiddleware");
const { validateClient, validateId } = require("../middleware/validation");
const { aliasClientPayload } = require("../middleware/clientBodyAliases");

// Todas as rotas requerem autenticação
router.get("/", authenticate, clientController.getAll);
router.get("/:id", authenticate, validateId, clientController.getClientById);
router.post("/", authenticate, aliasClientPayload, validateClient, clientController.create);
router.put(
  "/:id",
  authenticate,
  validateId,
  aliasClientPayload,
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
