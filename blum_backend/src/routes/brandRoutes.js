const express = require("express");
const router = express.Router();
const brandController = require("../controllers/brandController");

// Rotas para marcas
router.get("/", brandController.getBrands);
router.post("/", brandController.createBrand);
router.delete("/:name", brandController.deleteBrand);
router.put("/:oldName", brandController.updateBrand);

module.exports = router;
