const express = require('express');
const router = express.Router();
const auth = require('../middleware/auth');
const materiController = require('../controllers/materiController');

// Get all materi or filter by kategori
router.get('/', materiController.getMateri);

// Get materi by id
router.get('/:id', materiController.getMateriById);

// Create new materi (protected)
router.post('/', auth, materiController.createMateri);

// Update materi (protected)
router.put('/:id', auth, materiController.updateMateri);

// Delete materi (protected)
router.delete('/:id', auth, materiController.deleteMateri);

module.exports = router;