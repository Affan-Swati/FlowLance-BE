import UserBalance from '../models/userBalance.model.js';
import mongoose from 'mongoose';

export const getCurrentUserBalance = async (req, res) => {
  try {
    const userId = req.user.id;
    if (!userId || !mongoose.Types.ObjectId.isValid(userId)) {
      return res.status(400).json({ message: 'Invalid user ID' });
    }
    
    let userBalance = await UserBalance.findOne({ user: userId });
    
    if (!userBalance) {
      userBalance = await UserBalance.create({ user: userId, balance: 0 });
    }
    
    res.json(userBalance);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

export const createOrUpdateCurrentUserBalance = async (req, res) => {
  try {
    const { balance } = req.body;
    if (balance == null) {
      return res.status(400).json({ message: 'Balance is required' });
    }
    
    const userId = req.user.id;

    const userBalance = await UserBalance.findOneAndUpdate(
      { user: userId },
      { balance: parseFloat(balance) || 0 },
      { new: true, upsert: true, setDefaultsOnInsert: true }
    );
    
    res.json(userBalance);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

export const getAllBalances = async (req, res) => {
  try {
    const balances = await UserBalance.find().populate('user', 'email');
    res.json(balances);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

export const getBalanceByUser = async (req, res) => {
  try {
    const userBalance = await UserBalance.findOne({ user: req.params.userId });
    if (!userBalance) return res.status(404).json({ message: 'Balance not found' });
    res.json(userBalance);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

export const createOrUpdateBalanceByUser = async (req, res) => {
  try {
    const { balance } = req.body;
    if (balance == null) {
      return res.status(400).json({ message: 'Balance is required' });
    }

    const userId = req.params.userId;
    
    const userBalance = await UserBalance.findOneAndUpdate(
      { user: userId },
      { balance: parseFloat(balance) || 0 },
      { new: true, upsert: true, setDefaultsOnInsert: true }
    );

    res.json(userBalance);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};


export default {
  getCurrentUserBalance,
  createOrUpdateCurrentUserBalance,
  getAllBalances,
  getBalanceByUser,
  createOrUpdateBalanceByUser,
};