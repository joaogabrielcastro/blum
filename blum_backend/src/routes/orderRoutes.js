const express = require("express");
const router = express.Router();
const ordersController = require("../controllers/orderController");

router.get("/", ordersController.getAll);
router.post("/", ordersController.create);
router.delete("/:id", ordersController.delete);
router.put("/:id/finalize", ordersController.finalize);

module.exports = router;
