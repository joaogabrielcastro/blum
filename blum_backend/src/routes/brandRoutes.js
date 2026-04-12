const express = require("express");
const router = express.Router();
const brandController = require("../controllers/brandController");
const { authenticate, authorize } = require("../middleware/authMiddleware");
const { validateBrand } = require("../middleware/validation");

// Listar marcas (todos os usuários autenticados)
router.get("/", authenticate, brandController.getBrands);

// Criar, atualizar e deletar (apenas admin)
router.post(
  "/",
  authenticate,
  authorize("admin"),
  validateBrand,
  brandController.createBrand
);
router.put(
  "/:oldName",
  authenticate,
  authorize("admin"),
  validateBrand,
  brandController.updateBrand
);
router.delete(
  "/:id",
  authenticate,
  authorize("admin"),
  brandController.deleteBrand
);

module.exports = router;
