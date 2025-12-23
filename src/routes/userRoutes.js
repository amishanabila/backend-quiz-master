const express = require('express');
const multer = require('multer');
const router = express.Router();
const UserController = require('../controllers/userController');
const auth = require('../middleware/auth');

// Configure multer for photo uploads
const storage = multer.memoryStorage(); // Store in memory as binary
const upload = multer({
    storage,
    limits: { fileSize: 5 * 1024 * 1024 }, // 5MB limit
    fileFilter: (req, file, cb) => {
        if (file.mimetype.startsWith('image/')) {
            cb(null, true);
        } else {
            cb(new Error('Only image files are allowed'));
        }
    }
});

// Protected user routes (require auth middleware)
router.get('/me', auth, UserController.getProfile);
router.put('/me', auth, upload.single('photo'), UserController.updateProfile);
router.delete('/delete-account', auth, UserController.deleteAccount);

module.exports = router;