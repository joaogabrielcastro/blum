const express = require("express");
const router = express.Router();
const productsController = require("../controllers/productController");

router.get("/", productsController.getAll);
router.post("/", productsController.create);
router.delete("/:id", productsController.delete);
router.put("/:id", productsController.update);



module.exports = router;
