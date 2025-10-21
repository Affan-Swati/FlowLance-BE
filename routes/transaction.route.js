import express from 'express';
import transactionController from '../controllers/transaction.controller.js';
import auth from '../middleware/auth.js';

const router = express.Router();

router.get('/user', auth, transactionController.getAllTransactions);
router.post('/', auth, transactionController.createTransaction);
router.get('/', auth, transactionController.getTransactions);
router.get('/:id', auth, transactionController.getTransactionById);
router.put('/:id', auth, transactionController.updateTransaction);
router.delete('/:id', auth, transactionController.deleteTransaction);

export default router;
