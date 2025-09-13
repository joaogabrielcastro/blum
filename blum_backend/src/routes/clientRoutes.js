// clientRoutes.js - Deve ter esta estrutura
const express = require("express");
const router = express.Router();
const clientController = require("../controllers/clientController");

// CERTIFIQUE-SE DE QUE ESTAS ROTAS EXISTEM:
router.get("/", clientController.getAll);
router.post("/", clientController.create);
router.get("/:id", clientController.getClientById); 
router.put("/:id", clientController.update);
router.delete("/:id", clientController.delete);

module.exports = router;