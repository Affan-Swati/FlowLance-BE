import express from 'express';
import { getAIGeneratedInsights } from '../controllers/analytics.controller.js';
import auth from '../middleware/auth.js';

const router = express.Router();

router.get('/insights', auth, getAIGeneratedInsights);

export default router;