// routes/brandRoutes.js
const express = require('express');
const router = express.Router();
const brandController = require('../controllers/brandController');

router.get('/', brandController.getBrands);
router.post('/', brandController.createBrand);
router.put('/:oldName', brandController.updateBrand);
router.delete('/:name', brandController.deleteBrand);

module.exports = router;