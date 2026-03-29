import express from 'express';
import multer from 'multer';
import { processResume, deleteResume, getUserResumes } from '../controllers/resume.controller.js';
import auth from '../middleware/auth.js';

const router = express.Router();

// Store file in memory to pass it directly to Python service
const storage = multer.memoryStorage();
const upload = multer({ 
    storage: storage,
    limits: { fileSize: 5 * 1024 * 1024 } // 5MB limit
});

router.get('/', auth, getUserResumes);

// Upload a new resume
router.post('/upload', auth, upload.single('file'), processResume);

// Delete a specific resume
router.delete('/:resumeId', auth, deleteResume);

export default router;