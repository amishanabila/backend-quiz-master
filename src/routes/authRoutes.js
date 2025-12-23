const express = require('express');
const router = express.Router();
const authController = require('../controllers/authController');

// Public auth routes (no auth middleware needed)
router.post('/register', authController.register);
router.post('/login', authController.login);
router.get('/verify-email/:token', authController.verifyEmail);
router.post('/reset-password-request', authController.resetPasswordRequest);
router.post('/reset-password', authController.resetPassword);

// Helper endpoint untuk create admin (development only)
router.post('/create-admin', authController.createAdmin);

module.exports = router;