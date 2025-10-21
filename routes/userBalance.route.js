import express from 'express';
import userBalanceController from '../controllers/userBalance.controller.js';
import auth from '../middleware/auth.js';

const router = express.Router();

router.get('/user', auth, userBalanceController.getCurrentUserBalance);
router.put('/user', auth, userBalanceController.createOrUpdateCurrentUserBalance);

router.get('/', auth, userBalanceController.getAllBalances);
router.get('/:userId', auth, userBalanceController.getBalanceByUser);
router.put('/:userId', auth, userBalanceController.createOrUpdateBalanceByUser);

export default router;