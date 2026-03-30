import express from 'express';
import multer from 'multer';
import { processResume, deleteResume, getUserResumes, viewResume } from '../controllers/resume.controller.js';
import auth from '../middleware/auth.js';

const router = express.Router();

const storage = multer.memoryStorage();
const upload = multer({
    storage: storage,
    limits: { fileSize: 5 * 1024 * 1024 } // 5MB limit
});

router.get('/', auth, getUserResumes);
router.get('/:resumeId/view', auth, viewResume);
router.post('/upload', auth, upload.single('file'), processResume);
router.delete('/:resumeId', auth, deleteResume);

export default router;