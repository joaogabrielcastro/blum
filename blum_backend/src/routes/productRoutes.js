const express = require("express");
const router = express.Router();
const productsController = require("../controllers/productController");
const { authenticate, authorize } = require("../middleware/authMiddleware");
const { validateProduct, validateProductUpdate, validateId } = require("../middleware/validation");

// Rotas públicas (com autenticação mas sem restrição de role)
router.get("/", authenticate, productsController.getAll);
router.get("/search", authenticate, productsController.search);

// Rotas que requerem autenticação (qualquer usuário autenticado)
router.get("/:id", authenticate, validateId, productsController.getById);

// Rotas apenas para admin
router.post("/", authenticate, authorize('admin'), validateProduct, productsController.create);
router.put("/:id", authenticate, authorize('admin'), validateProductUpdate, productsController.update);
router.delete("/:id", authenticate, authorize('admin'), validateId, productsController.delete);

module.exports = router;
