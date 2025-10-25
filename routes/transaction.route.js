import express from 'express';
import transactionController from '../controllers/transaction.controller.js';
import auth from '../middleware/auth.js';
import adminAuth from '../middleware/adminAuth.js';

const router = express.Router();

// === USER ROUTES ===
router.get('/user', auth, transactionController.getTransactions);
router.post('/', auth, transactionController.createTransaction);

// The controller will handle the logic to check if they are an admin OR the owner of trasaction.
router.get('/:id', auth, transactionController.getTransactionById);
router.put('/:id', auth, transactionController.updateTransaction);
router.delete('/:id', auth, transactionController.deleteTransaction);

// Get all transactions for all users (Admin Only Access)
router.get('/', auth, adminAuth, transactionController.getAllTransactions);

export default router;