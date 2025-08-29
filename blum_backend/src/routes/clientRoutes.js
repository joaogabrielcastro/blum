const express = require("express");
const router = express.Router();
const clientsController = require("../controllers/clientController");

router.get("/", clientsController.getAll);
router.post("/", clientsController.create);

module.exports = router;
