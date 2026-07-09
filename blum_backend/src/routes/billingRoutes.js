const express = require("express");
const router = express.Router();
const billingController = require("../controllers/billingController");
const { authenticate, authorize } = require("../middleware/authMiddleware");

router.get(
  "/plans",
  authenticate,
  authorize("admin"),
  billingController.getPlans,
);

router.get(
  "/subscription",
  authenticate,
  authorize("admin"),
  billingController.getSubscription,
);

router.post(
  "/checkout",
  authenticate,
  authorize("admin"),
  billingController.createCheckout,
);

router.post(
  "/portal",
  authenticate,
  authorize("admin"),
  billingController.createPortal,
);

router.post(
  "/change-plan",
  authenticate,
  authorize("admin"),
  billingController.changePlan,
);

router.post(
  "/cancel",
  authenticate,
  authorize("admin"),
  billingController.cancelSubscription,
);

router.post(
  "/reactivate",
  authenticate,
  authorize("admin"),
  billingController.reactivateSubscription,
);

module.exports = router;
