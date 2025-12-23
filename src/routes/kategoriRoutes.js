const express = require('express');
const router = express.Router();
const KategoriController = require('../controllers/kategoriController');
const auth = require('../middleware/auth');

router.get('/', KategoriController.getAll);
router.get('/:id', KategoriController.getById);
router.post('/', auth, KategoriController.create);
router.put('/:id', auth, KategoriController.update);
router.delete('/:id', auth, KategoriController.delete);

module.exports = router;