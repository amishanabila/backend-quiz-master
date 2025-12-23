const express = require('express');
const router = express.Router();
const adminController = require('../controllers/adminController');
const { authenticateToken, isAdmin } = require('../middleware/auth');

// All admin routes require authentication and admin role
router.use(authenticateToken);
router.use(isAdmin);

// Dashboard endpoints
router.get('/system-overview', adminController.getSystemOverview);
router.get('/health-check', adminController.getHealthCheck);
router.get('/quiz-activity', adminController.getQuizActivity);

// Export endpoints
router.get('/export/users', adminController.exportUsers);
router.get('/export/hasil-quiz', adminController.exportHasilQuiz);
router.get('/export/soal', adminController.exportSoal);

// Backup endpoint
router.get('/backup-info', adminController.getBackupInfo);

// User management endpoints
router.get('/users', adminController.getAllUsers);
router.put('/users/role', adminController.updateUserRole);
router.delete('/users/:userId', adminController.deleteUser);

// Data maintenance endpoints
router.post('/fix-missing-creators', adminController.fixMissingCreators);
router.get('/orphaned-data', adminController.getOrphanedData);

module.exports = router;
