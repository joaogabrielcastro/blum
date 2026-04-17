const express = require("express");
const router = express.Router();
const authController = require("../controllers/authController");
const userBrandController = require("../controllers/userBrandController");
const { authenticate, authorize } = require("../middleware/authMiddleware");
const {
  validateLogin,
  validateUserCreate,
  validatePasswordUpdate,
  validateUserIdParam,
  validateUserAllowedBrandsBody,
  validateAdminResetUserPassword,
} = require("../middleware/validation");

// Rotas públicas
router.post("/login", validateLogin, authController.login);

// Rotas protegidas
router.get("/verify", authenticate, authController.verifyToken);
router.post(
  "/password",
  authenticate,
  validatePasswordUpdate,
  authController.updatePassword
);

// Rotas apenas para admin (rotas com :userId antes de /users genérico)
router.get(
  "/users/:userId/allowed-brands",
  authenticate,
  authorize("admin"),
  validateUserIdParam,
  userBrandController.getUserAllowedBrands
);
router.put(
  "/users/:userId/allowed-brands",
  authenticate,
  authorize("admin"),
  validateUserAllowedBrandsBody,
  userBrandController.putUserAllowedBrands
);
router.put(
  "/users/:userId/password",
  authenticate,
  authorize("admin"),
  validateAdminResetUserPassword,
  authController.adminResetUserPassword
);

router.post(
  "/users",
  authenticate,
  authorize("admin"),
  validateUserCreate,
  authController.createUser
);
router.get("/users", authenticate, authorize("admin"), authController.getUsers);

module.exports = router;
