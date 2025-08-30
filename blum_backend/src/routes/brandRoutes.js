const express = require('express');
const brandController = require('../controllers/brandController');

const router = express.Router();

router.get('/', brandController.getBrands);
router.post('/', brandController.createBrand);

module.exports = router;