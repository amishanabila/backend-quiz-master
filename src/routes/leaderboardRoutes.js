const express = require('express');
const router = express.Router();
const leaderboardController = require('../controllers/leaderboardController');
const { authenticateToken, isKreator, isAdmin } = require('../middleware/auth');

// Get leaderboard with optional filters (kategori_id, materi_id)
router.get('/', leaderboardController.getLeaderboard);

// Get kategori list with stats
router.get('/kategori', leaderboardController.getKategoriWithStats);

// Get materi list by kategori with stats (kategori_id as query param)
router.get('/materi', leaderboardController.getMateriByKategori);

// Get quiz sessions (kreator & admin only)
router.get('/sessions', authenticateToken, leaderboardController.getQuizSessions);

// Reset leaderboard for specific kumpulan_soal (kreator only)
router.delete('/reset/:kumpulan_soal_id', authenticateToken, isKreator, leaderboardController.resetLeaderboardByKumpulanSoal);

// Reset all leaderboard (admin only)
router.delete('/reset', authenticateToken, isAdmin, leaderboardController.resetLeaderboard);

module.exports = router;

