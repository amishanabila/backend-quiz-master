const express = require('express');
const router = express.Router();
const auth = require('../middleware/auth');
const soalController = require('../controllers/soalController');

// Create kumpulan soal (protected)
router.post('/kumpulan', auth, soalController.createKumpulanSoal);

// Get kumpulan soal by id
router.get('/kumpulan/:id', soalController.getKumpulanSoal);

// Get all kumpulan soal created by current user (dashboard) - PROTECTED
router.get('/my-kumpulan/all', auth, soalController.getKumpulanSoalByCreator);

// Update kumpulan soal (protected)
router.put('/kumpulan/:id', auth, soalController.updateKumpulanSoal);

// Delete kumpulan soal (protected)
router.delete('/kumpulan/:id', auth, soalController.deleteKumpulanSoal);

// Get soal by kategori
router.get('/kategori/:kategoriId', soalController.getSoalByKategori);

// Get soal by materi
router.get('/materi/:materiId', soalController.getSoalByMateri);

// Get soal by kumpulan_soal_id (for quiz with PIN)
router.get('/kumpulan-soal/:kumpulanSoalId', soalController.getSoalByKumpulanSoal);

// Export data for Kreator (protected)
router.get('/export/my-data', auth, soalController.exportKreatorData);

// Export specific quiz detail (protected)
router.get('/export/quiz/:kumpulanSoalId', auth, soalController.exportQuizDetail);

module.exports = router;