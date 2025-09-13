const express = require("express");
const router = express.Router();
const brandController = require("../controllers/brandController"); // Verifique o caminho!

// Rotas para marcas
router.get("/", brandController.getBrands);
router.post("/", brandController.createBrand);
router.delete("/:name", brandController.deleteBrand); // ← Esta deve ser a linha problemática

module.exports = router;
