const express = require("express");
const router = express.Router();
const { authenticate } = require("../middleware/authMiddleware");
const { requirePlatformAdmin } = require("../middleware/platformAdminMiddleware");
const platformAdminController = require("../controllers/platformAdminController");
const { validateTenantStatusUpdate } = require("../middleware/validation");

router.use(authenticate, requirePlatformAdmin);

router.get("/tenants", platformAdminController.listTenants);
router.get("/tenants/:tenantId", platformAdminController.getTenantDetail);
router.patch(
  "/tenants/:tenantId/status",
  validateTenantStatusUpdate,
  platformAdminController.updateTenantStatus,
);

module.exports = router;
