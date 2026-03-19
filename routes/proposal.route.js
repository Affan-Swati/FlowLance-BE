import express from 'express';
import { generateProposal, getAllUserProposals, saveDraft } from '../controllers/proposal.controller.js';
import auth from '../middleware/auth.js';

const router = express.Router();

router.post('/generate', auth, generateProposal);
router.get('/', auth, getAllUserProposals);
router.put('/save', auth, saveDraft);

export default router;