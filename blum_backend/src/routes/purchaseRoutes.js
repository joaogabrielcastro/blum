const express = require("express");
const router = express.Router();
const invoiceController = require("../controllers/purchaseInvoiceController");
const { authenticate, authorize } = require("../middleware/authMiddleware");
const { requirePlanFeature } = require("../middleware/planFeatureMiddleware");
const { validateId } = require("../middleware/validation");

// Compras são exclusivas do admin (contêm custo).
const adminOnly = [authenticate, authorize("admin")];
const purchaseImport = [...adminOnly, requirePlanFeature("purchase-import")];

// Compras por XML de NF-e
router.post("/invoices/preview", ...purchaseImport, invoiceController.preview);
router.post("/invoices", ...purchaseImport, invoiceController.confirm);
router.get("/invoices", ...adminOnly, invoiceController.list);
router.get("/invoices/:id", ...adminOnly, validateId, invoiceController.getById);
router.post(
  "/invoices/:id/reverse",
  ...purchaseImport,
  validateId,
  invoiceController.reverse,
);

module.exports = router;
