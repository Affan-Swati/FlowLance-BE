import express from 'express';
import axios from 'axios';

const router = express.Router();

// Route is just '/' because it is mounted at '/api/rates' in server.js
router.get('/', async (req, res) => {
  try {
    const response = await axios.get('https://api.exchangerate-api.com/v4/latest/USD');
    res.json(response.data);
  } catch (error) {
    console.error('Error fetching rates:', error.message);
    res.status(500).json({ message: 'Failed to fetch exchange rates' });
  }
});

export default router;