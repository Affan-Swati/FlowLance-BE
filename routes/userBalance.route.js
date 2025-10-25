import express from 'express';
import userBalanceController from '../controllers/userBalance.controller.js';
import auth from '../middleware/auth.js';
import adminAuth from '../middleware/adminAuth.js';

const router = express.Router();

// User routes
router.get('/user', auth, userBalanceController.getCurrentUserBalance);
router.put('/user', auth, userBalanceController.createOrUpdateCurrentUserBalance);

// Admin routes
router.get('/', auth, adminAuth, userBalanceController.getAllBalances);
router.get('/:userId', auth, adminAuth, userBalanceController.getBalanceByUser);
router.put('/:userId', auth, adminAuth, userBalanceController.createOrUpdateBalanceByUser);

export default router;