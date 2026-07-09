const express = require("express");
const router = express.Router();
const productsController = require("../controllers/productController");
const productImportController = require("../controllers/productImportController");
const { authenticate, authorize } = require("../middleware/authMiddleware");
const { uploadSpreadsheet } = require("../middleware/upload");
const {
  validateProduct,
  validateProductUpdate,
  validateId,
} = require("../middleware/validation");

router.post(
  "/import/preview",
  authenticate,
  authorize("admin"),
  uploadSpreadsheet,
  productImportController.previewImport,
);

router.post(
  "/import/finalize",
  authenticate,
  authorize("admin"),
  productImportController.finalizeImport,
);

router.get(
  "/export.csv",
  authenticate,
  authorize("admin"),
  productImportController.exportCsv,
);

router.get(
  "/export.xlsx",
  authenticate,
  authorize("admin"),
  productImportController.exportExcel,
);

// Rotas públicas (com autenticação mas sem restrição de role)
router.get("/", authenticate, productsController.getAll);
router.get("/search", authenticate, productsController.search);
router.get("/by-code", authenticate, productsController.lookupByCode);
router.post("/lookup-by-codes", authenticate, productsController.lookupByCodes);

router.post(
  "/bulk-price-adjust",
  authenticate,
  authorize("admin"),
  productsController.bulkAdjustPrices,
);

// Rotas que requerem autenticação (qualquer usuário autenticado)
router.get("/:id", authenticate, validateId, productsController.getById);

// Rotas apenas para admin
router.post(
  "/",
  authenticate,
  authorize("admin"),
  validateProduct,
  productsController.create
);
router.put(
  "/:id",
  authenticate,
  authorize("admin"),
  validateProductUpdate,
  productsController.update
);
router.delete(
  "/:id",
  authenticate,
  authorize("admin"),
  validateId,
  productsController.delete
);

module.exports = router;
