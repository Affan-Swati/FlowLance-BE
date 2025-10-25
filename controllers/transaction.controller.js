import Transaction from '../models/transaction.model.js';
import UserBalance from '../models/userBalance.model.js';
import mongoose from 'mongoose';

const calculateTax = (amount, percentage) => {
  if (typeof amount !== 'number' || typeof percentage !== 'number' || amount < 0 || percentage < 0) {
    return 0;
  }
  const taxRate = percentage / 100;
  return Math.round((amount * taxRate) * 100) / 100;
};

const formatTransaction = (tx) => {
  const tax = typeof tx.tax === 'number' ? tx.tax : 0;
  const taxPercentage = typeof tx.taxPercentage === 'number' ? tx.taxPercentage : 0;
  
  const creditedAmount = tx.type === 'credit' ? tx.amount : 0;
  const debitedAmount = tx.type === 'debit' ? tx.amount : 0;
  
  const netAmount = tx.type === 'credit' ? +(tx.amount - tax).toFixed(2) : -(+(tx.amount + tax).toFixed(2));

  return {
    id: tx._id || tx.id,
    user: tx.user,
    amount: tx.amount,
    type: tx.type,
    description: tx.description,
    tax,
    taxPercentage,
    creditedAmount,
    debitedAmount,
    netAmount,
    createdAt: tx.createdAt,
    updatedAt: tx.updatedAt
  };
};

export const createTransaction = async (req, res) => {
  try {
    const { amount, type, description, taxPercentage } = req.body;
    const userId = req.user && req.user.id;
    if (!userId) return res.status(401).json({ message: 'Unauthorized' });

    if (!amount || !type || taxPercentage == null) {
      return res.status(400).json({ message: 'amount, type, and taxPercentage are required' });
    }
    
    const parsedPercentage = parseFloat(taxPercentage);
    if (isNaN(parsedPercentage) || parsedPercentage < 0) {
      return res.status(400).json({ message: 'Invalid taxPercentage. Must be a positive number.' });
    }

    const calculatedTax = calculateTax(amount, parsedPercentage);

    const transaction = await Transaction.create({ 
      user: userId, 
      amount, 
      type, 
      tax: calculatedTax,
      taxPercentage: parsedPercentage,
      description 
    });

    let userBalance = await UserBalance.findOne({ user: userId });
    if (!userBalance) userBalance = await UserBalance.create({ user: userId, balance: 0 });

    const transactionAmount = type === 'credit' ? (amount - calculatedTax) : (amount + calculatedTax);
    if (type === 'debit' && userBalance.balance < transactionAmount) {
        return res.status(400).json({ message: 'Insufficient balance for this transaction.' });
    }

    if (type === 'credit') userBalance.balance += transactionAmount;
    else userBalance.balance -= transactionAmount;

    userBalance.balance = Math.round(userBalance.balance * 100) / 100;

    await userBalance.save();

    res.status(201).json({
      transaction: formatTransaction(transaction),
      updatedBalance: userBalance.balance
    });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

export const getTransactions = async (req, res) => {
  try {
    const { start_date, end_date } = req.query;
    
    const query = {};
    const dateQuery = {};

    if (start_date && end_date) {
      const startDate = new Date(start_date);
      startDate.setUTCHours(0, 0, 0, 0);
      dateQuery.$gte = startDate;

      const endDate = new Date(end_date);
      endDate.setUTCHours(23, 59, 59, 999);
      dateQuery.$lte = endDate;

    } else if (start_date) {
      const startDate = new Date(start_date);
      startDate.setUTCHours(0, 0, 0, 0);
      dateQuery.$gte = startDate;

      const today = new Date();
      today.setUTCHours(23, 59, 59, 999);
      dateQuery.$lte = today;

    } else if (end_date) {
      const endDate = new Date(end_date);
      endDate.setUTCHours(23, 59, 59, 999);
      dateQuery.$lte = endDate;
    }

    if (Object.keys(dateQuery).length > 0) {
      query.createdAt = dateQuery;
    }

    const transactions = await Transaction.find(query).sort({ createdAt: -1 });
    res.json(transactions.map(formatTransaction));

  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

export const getTransactionById = async (req, res) => {
  try {
    const { id: userId, role } = req.user;
    const { id: transactionId } = req.params;

    // It must match the transactionId
    const query = { _id: transactionId };
    
    // IF the user is NOT an admin, it must ALSO match their userId
    if (role !== 'admin') {
      query.user = userId;
    }

    const transaction = await Transaction.findOne(query);

    if (!transaction) {
      return res.status(404).json({ message: 'Transaction not found or you do not have permission' });
    }
    
    res.json(formatTransaction(transaction));
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

export const updateTransaction = async (req, res) => {
  try {
    const { id: userId, role } = req.user;
    const { id: transactionId } = req.params;

    // Build the query to find the transaction
    const query = { _id: transactionId };
    if (role !== 'admin') {
      query.user = userId;
    }

    const transaction = await Transaction.findOne(query);
    if (!transaction) {
      return res.status(404).json({ message: 'Transaction not found or you do not have permission' });
    }

    const transactionOwnerId = transaction.user;

    const { amount, type, description, taxPercentage } = req.body;
    
    if (amount == null || !type || taxPercentage == null) {
      return res.status(400).json({ message: 'amount, type, and taxPercentage are required' });
    }
    const newPercentage = parseFloat(taxPercentage);
    if (isNaN(newPercentage) || newPercentage < 0) {
      return res.status(400).json({ message: 'Invalid taxPercentage. Must be a positive number.' });
    }

    const newTax = calculateTax(amount, newPercentage);

    let userBalance = await UserBalance.findOne({ user: transactionOwnerId });
    if (!userBalance) userBalance = await UserBalance.create({ user: transactionOwnerId, balance: 0 });

    let tempBalance = userBalance.balance;
    if (transaction.type === 'credit') {
      tempBalance -= (transaction.amount - transaction.tax);
    } else {
      tempBalance += (transaction.amount + transaction.tax);
    }

    const newTransactionAmount = (type === 'credit') 
      ? (amount - newTax) 
      : (amount + newTax);

    if (type === 'debit' && tempBalance < newTransactionAmount) {
      return res.status(400).json({ message: 'Insufficient balance for this update.' });
    }

    if (type === 'credit') {
      tempBalance += (amount - newTax);
    } else {
      tempBalance -= (amount + newTax);
    }

    userBalance.balance = Math.round(tempBalance * 100) / 100;

    transaction.amount = amount;
    transaction.type = type;
    transaction.tax = newTax;
    transaction.taxPercentage = newPercentage;
    transaction.description = description;
    await transaction.save();

    await userBalance.save();
    
    res.json({
      transaction: formatTransaction(transaction),
      updatedBalance: userBalance.balance
    });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

export const deleteTransaction = async (req, res) => {
  try {
    const { id: userId, role } = req.user;
    const { id: transactionId } = req.params;

    // Build the query to find the transaction
    const query = { _id: transactionId };
    if (role !== 'admin') {
      query.user = userId;
    }

    const transaction = await Transaction.findOne(query);
    if (!transaction) {
      return res.status(404).json({ message: 'Transaction not found or you do not have permission' });
    }
    
    const transactionOwnerId = transaction.user;

    let userBalance = await UserBalance.findOne({ user: transactionOwnerId });
    if (!userBalance) userBalance = await UserBalance.create({ user: transactionOwnerId, balance: 0 });

    if (transaction.type === 'credit') userBalance.balance -= (transaction.amount - transaction.tax);
    else userBalance.balance += (transaction.amount + transaction.tax);

    userBalance.balance = Math.round(userBalance.balance * 100) / 100;

    await userBalance.save();
    await transaction.deleteOne();

    res.json({ 
      message: 'Transaction deleted',
      updatedBalance: userBalance.balance 
    });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

export const getAllTransactions = async (req, res) => {
  try {
    const { start_date, end_date } = req.query;
  
    const query = { user: req.user.id };
    const dateQuery = {};

    if (start_date && end_date) {
      const startDate = new Date(start_date);
      startDate.setUTCHours(0, 0, 0, 0);
      dateQuery.$gte = startDate;

      const endDate = new Date(end_date);
      endDate.setUTCHours(23, 59, 59, 999);
      dateQuery.$lte = endDate;

    } else if (start_date) {
      const startDate = new Date(start_date);
      startDate.setUTCHours(0, 0, 0, 0);
      dateQuery.$gte = startDate;

      const today = new Date();
      today.setUTCHours(23, 59, 59, 999);
      dateQuery.$lte = today;

    } else if (end_date) {
      const endDate = new Date(end_date);
      endDate.setUTCHours(23, 59, 59, 999);
      dateQuery.$lte = endDate;
    }

    if (Object.keys(dateQuery).length > 0) {
      query.createdAt = dateQuery;
    }

    const transactions = await Transaction.find(query).sort({ createdAt: -1 });
    res.status(200).json(transactions.map(formatTransaction));

  } catch (error) {
    res.status(500).json({ message: 'Error retrieving transactions', error });
  }
};

export default {
  createTransaction,
  getTransactions,
  getTransactionById,
  updateTransaction,
  deleteTransaction,
  getAllTransactions
};