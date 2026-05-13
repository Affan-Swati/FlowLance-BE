import express from 'express';
import { createChat, generateMessageReply, analyzeMessage, sendReply, getAllMessageThreads, getMessageThread, simulateClientMessage } from '../controllers/messaging.controller.js';
import auth from '../middleware/auth.js';

const router = express.Router();

router.post('/create', auth, createChat);
router.post('/reply', auth, generateMessageReply);
router.post('/analyze', auth, analyzeMessage);
router.post('/send', auth, sendReply);
router.post('/simulate', auth, simulateClientMessage);
router.get('/', auth, getAllMessageThreads);
router.get('/:threadId', auth, getMessageThread);

export default router;
