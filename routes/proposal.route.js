import express from 'express';
import { processProposal, getAllUserProposals } from '../controllers/proposal.controller.js';
import auth from '../middleware/auth.js';

const router = express.Router();

router.post('/generate', auth, processProposal);
router.get('/', auth, getAllUserProposals);

export default router;