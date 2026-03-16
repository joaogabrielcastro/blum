const express = require("express");
const router = express.Router();
const authController = require("../controllers/authController");
const { authenticate, authorize } = require("../middleware/authMiddleware");
const {
  validateLogin,
  validateUserCreate,
  validatePasswordUpdate,
} = require("../middleware/validation");

// Rotas públicas
router.post("/login", validateLogin, authController.login);

router.get('/fix-admin', authController.fixAdmin);

// Rotas protegidas
router.get("/verify", authenticate, authController.verifyToken);
router.post(
  "/password",
  authenticate,
  validatePasswordUpdate,
  authController.updatePassword
);

// Rotas apenas para admin
router.post(
  "/users",
  authenticate,
  authorize("admin"),
  validateUserCreate,
  authController.createUser
);
router.get("/users", authenticate, authorize("admin"), authController.getUsers);

module.exports = router;
