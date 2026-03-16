const express = require('express');
const router = express.Router();
const multer = require('multer');
const resumeController = require('../controllers/resume.controller');

// Store file in memory to pass it directly to Python
const storage = multer.memoryStorage();
const upload = multer({ 
    storage: storage,
    limits: { fileSize: 5 * 1024 * 1024 } // 5MB limit
});

// Endpoint: POST /api/resume/upload
router.post('/upload', upload.single('file'), resumeController.processResume);

module.exports = router;