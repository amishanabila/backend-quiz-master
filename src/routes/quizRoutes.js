const express = require('express');
const router = express.Router();
const quizController = require('../controllers/quizController');

// Generate PIN for new quiz
router.post('/generate-pin', quizController.generatePin);

// Validate PIN
router.post('/validate-pin', quizController.validatePin);

// Start a new quiz (with session tracking)
router.post('/start', quizController.startQuiz);

// Get remaining time for session
router.get('/session/:session_id/remaining-time', quizController.getRemainingTime);

// Update progress
router.post('/session/:session_id/progress', quizController.updateProgress);

// Submit quiz answers
router.post('/submit/:hasilId', quizController.submitQuiz);

// Submit quiz result directly (with session validation)
router.post('/submit-result', quizController.submitQuizResult);

// Get quiz results
router.get('/results/:hasilId', quizController.getQuizResults);

module.exports = router;