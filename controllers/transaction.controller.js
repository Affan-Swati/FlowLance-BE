import Transaction from '../models/transaction.model.js';
import UserBalance from '../models/userBalance.model.js';
import { Readable } from 'stream';
import csvParser from 'csv-parser';
import PDFDocument from 'pdfkit';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

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
    const userId = req.user && req.user.id;
    const { start_date, end_date } = req.query;
    
    // 2. Initialize the query object with the current user's ID
    const query = { user: userId };
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

export const uploadTransactionsCSV = async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ message: 'No file uploaded' });
    }

    const userId = req.user.id;
    const results = [];

    // 1. Create a stream from the uploaded file buffer
    const stream = Readable.from(req.file.buffer.toString());

    // 2. Parse the CSV
    stream
      .pipe(csvParser())
      .on('data', (data) => results.push(data))
      .on('end', async () => {
        try {
          if (results.length === 0) {
            return res.status(400).json({ message: 'CSV is empty' });
          }

          // 3. Fetch current user balance once
          let userBalance = await UserBalance.findOne({ user: userId });
          if (!userBalance) userBalance = await UserBalance.create({ user: userId, balance: 0 });

          const validTransactions = [];
          let runningBalance = userBalance.balance;

          // 4. Process each row
          for (const row of results) {
            // Ensure field names match your CSV headers (case-sensitive usually, but we handle standard names)
            const amount = parseFloat(row.amount);
            const type = row.type ? row.type.toLowerCase().trim() : null;
            const taxPercentage = parseFloat(row.taxPercentage || 0);
            const description = row.description || 'CSV Import';

            // Basic validation per row
            if (isNaN(amount) || !['credit', 'debit'].includes(type)) {
              console.warn(`Skipping invalid row: ${JSON.stringify(row)}`);
              continue; 
            }

            // Reuse your existing tax logic
            const calculatedTax = calculateTax(amount, taxPercentage);

            // Calculate impact on balance
            const transactionTotal = type === 'credit' 
              ? (amount - calculatedTax) 
              : (amount + calculatedTax);

            // Update running balance simulation
            if (type === 'credit') {
              runningBalance += transactionTotal;
            } else {
              runningBalance -= transactionTotal;
            }

            // Check for insufficient balance (if it drops below zero)
            if (runningBalance < 0) {
              return res.status(400).json({ 
                message: `Import failed: Transaction for ${amount} would result in negative balance.` 
              });
            }

            // Prepare object for Bulk Insert
            validTransactions.push({
              user: userId,
              amount,
              type,
              tax: calculatedTax,
              taxPercentage,
              description
            });
          }

          // 5. Save to Database
          if (validTransactions.length > 0) {
            // Bulk insert all transactions
            await Transaction.insertMany(validTransactions);

            // Update the user's balance permanently
            userBalance.balance = Math.round(runningBalance * 100) / 100;
            await userBalance.save();

            return res.status(201).json({
              message: `Successfully imported ${validTransactions.length} transactions`,
              updatedBalance: userBalance.balance
            });
          } else {
            return res.status(400).json({ message: 'No valid transactions found in CSV' });
          }

        } catch (err) {
          return res.status(500).json({ message: 'Error saving CSV data', error: err.message });
        }
      });

  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

export const generateTransactionReport = async (req, res) => {
    try {
        const userId = req.user.id;
        const { startDate, endDate } = req.query;

        // 1. Build Query for Filtering
        let query = { user: userId };
        
        if (startDate || endDate) {
            query.createdAt = {};
            if (startDate) {
                query.createdAt.$gte = new Date(startDate);
            }
            if (endDate) {
                // Set end date to end of the day
                const end = new Date(endDate);
                end.setHours(23, 59, 59, 999);
                query.createdAt.$lte = end;
            }
        }

        // 2. Fetch Data
        // Sort by date descending (newest first)
        const transactions = await Transaction.find(query).sort({ createdAt: -1 });
        const userBalanceObj = await UserBalance.findOne({ user: userId });
        const currentBalance = userBalanceObj ? userBalanceObj.balance : 0;

        // 3. Calculate Report Totals (for the filtered period)
        let totalCredit = 0;
        let totalDebit = 0;
        let totalTax = 0;

        transactions.forEach(tx => {
            if (tx.type === 'credit') totalCredit += tx.amount;
            if (tx.type === 'debit') totalDebit += tx.amount;
            totalTax += (tx.tax || 0);
        });

        // 4. Setup PDF
        const filename = `history-${userId}-${Date.now()}.pdf`;
        res.setHeader('Content-Type', 'application/pdf');
        res.setHeader('Content-Disposition', `inline; filename="${filename}"`);

        const doc = new PDFDocument({ margin: 50, size: 'A4' });
        doc.pipe(res);

        // =======================
        // DESIGN & LAYOUT
        // =======================

        // --- HEADER (Consistent with Invoice) ---
        // Dark Blue-Grey background
        doc.rect(0, 0, doc.page.width, 140).fill('#2c3e50'); 

        // Logo
        const logoPath = path.join(__dirname, '..', 'assets', 'logo.png');
        if (fs.existsSync(logoPath)) {
            // Centered: (595 - 150) / 2 = 222.5 => ~222
            doc.image(logoPath, 222, 25, { width: 150 });
        }

        // Title
        doc.fillColor('#FFFFFF')
           .fontSize(20)
           .text('TRANSACTION HISTORY', 0, 95, { width: doc.page.width, align: 'center', letterSpacing: 2 });
        
        // Date Range Subtitle
        let dateRangeText = 'All Time';
        if (startDate && endDate) dateRangeText = `${new Date(startDate).toLocaleDateString()} - ${new Date(endDate).toLocaleDateString()}`;
        else if (startDate) dateRangeText = `Since ${new Date(startDate).toLocaleDateString()}`;
        
        doc.fontSize(10).fillColor('#E0E0E0')
           .text(dateRangeText, 0, 120, { width: doc.page.width, align: 'center' });

        // --- RESET CURSOR ---
        doc.fillColor('#000000');
        let currentY = 180; // Start below header

        // --- SUMMARY CARDS (Top of Report) ---
        // We'll draw 3 mini boxes for quick stats
        const drawCard = (x, label, value, color) => {
            doc.roundedRect(x, currentY, 150, 50, 5).fillAndStroke('#f8f9fa', '#e9ecef');
            doc.fillColor('#666666').fontSize(10).text(label, x + 10, currentY + 10);
            doc.fillColor(color).fontSize(16).font('Helvetica-Bold').text(value, x + 10, currentY + 28);
        };

        drawCard(50, 'Total Credit', `+$${totalCredit.toFixed(2)}`, '#27ae60'); // Green
        drawCard(220, 'Total Debit', `-$${totalDebit.toFixed(2)}`, '#c0392b'); // Red
        drawCard(390, 'Current Balance', `$${currentBalance.toFixed(2)}`, '#2c3e50'); // Dark

        currentY += 80; // Move down past cards

        // --- TRANSACTION TABLE HEADER ---
        const drawTableHeader = (y) => {
            doc.rect(50, y, 495, 25).fill('#2c3e50'); // Header Bar
            doc.fillColor('#FFFFFF').fontSize(10).font('Helvetica-Bold');
            doc.text('Date', 60, y + 8);
            doc.text('Description', 150, y + 8);
            doc.text('Type', 380, y + 8);
            doc.text('Amount', 450, y + 8, { width: 90, align: 'right' });
        };

        drawTableHeader(currentY);
        currentY += 25;

        // --- TABLE ROWS ---
        doc.fillColor('#000000').font('Helvetica').fontSize(9);
        
        transactions.forEach((tx, index) => {
            // Check for Page Break
            if (currentY > 750) {
                doc.addPage();
                currentY = 50; // Reset to top
                drawTableHeader(currentY); // Redraw header on new page
                currentY += 25;
                doc.fillColor('#000000').font('Helvetica').fontSize(9);
            }

            // Alternating Row Background
            if (index % 2 === 0) {
                doc.rect(50, currentY, 495, 20).fill('#f8f9fa');
                doc.fillColor('#000000'); // Reset fill after rect
            }

            const dateStr = new Date(tx.createdAt).toLocaleDateString();
            const typeStr = tx.type.charAt(0).toUpperCase() + tx.type.slice(1); // Capitalize
            const amountStr = `$${tx.amount.toFixed(2)}`;
            const descStr = tx.description || 'N/A';
            const typeColor = tx.type === 'credit' ? '#27ae60' : '#c0392b';

            // Draw Text
            doc.text(dateStr, 60, currentY + 6);
            doc.text(descStr, 150, currentY + 6, { width: 220, lineBreak: false, ellipsis: true }); // Truncate long desc
            
            doc.fillColor(typeColor).text(typeStr, 380, currentY + 6); // Colored Type
            
            doc.fillColor('#000000').text(amountStr, 450, currentY + 6, { width: 90, align: 'right' });

            currentY += 20;
        });

        // --- FOOTER SUMMARY ---
        currentY += 20;
        // Check if footer fits, else new page
        if (currentY > 700) {
            doc.addPage();
            currentY = 50;
        }

        doc.moveTo(50, currentY).lineTo(545, currentY).strokeColor('#aaaaaa').stroke();
        currentY += 15;

        doc.fontSize(10).font('Helvetica-Bold');
        doc.text(`Report Generated: ${new Date().toLocaleString()}`, 50, currentY, { color: '#666666' });
        
        doc.text('Net Tax Paid:', 350, currentY);
        doc.text(`$${totalTax.toFixed(2)}`, 450, currentY, { width: 90, align: 'right' });

        doc.end();

    } catch (err) {
        console.error("Report Generation Error:", err);
        if (!res.headersSent) {
            res.status(500).json({ message: err.message });
        }
    }
};

export default {
  createTransaction,
  getTransactions,
  getTransactionById,
  updateTransaction,
  deleteTransaction,
  getAllTransactions,
  uploadTransactionsCSV,
  generateTransactionReport
};