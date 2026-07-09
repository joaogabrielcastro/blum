const express = require("express");
const router = express.Router();
const tenantController = require("../controllers/tenantController");
const { authenticate } = require("../middleware/authMiddleware");
const {
  validateTenantSignup,
  validateSlugParam,
} = require("../middleware/validation");

router.get("/check-slug/:slug", validateSlugParam, tenantController.checkSlug);
router.get("/preview-slug", tenantController.previewSlug);
router.post("/signup", validateTenantSignup, tenantController.signup);
router.get("/current", authenticate, tenantController.getCurrent);

module.exports = router;
