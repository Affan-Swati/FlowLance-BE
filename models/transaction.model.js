import mongoose from 'mongoose';

const transactionSchema = new mongoose.Schema({
    user: { 
        type: mongoose.Schema.Types.ObjectId, 
        ref: 'User', 
        required: true 
    },
    amount: { 
        type: Number, 
        required: true 
    },
    type: { 
        type: String, 
        enum: ['credit', 'debit'], 
        required: true 
    },
    // Updated enum with Income AND Expense categories
    category: {
        type: String,
        default: 'Uncategorized',
        enum: [
            // --- Expense Categories ---
            'Software & Subscriptions', 
            'Internet & Utilities', 
            'Hardware & Equipment', 
            'Marketing & Advertising', 
            'Office Supplies', 
            'Education & Training', 
            'Legal & Professional Fees', 
            'Travel',
            'Meals & Entertainment',
            'Rent or Lease',
            'Personal / Non-Deductible',
            
            // --- Income Categories ---
            'Freelance Project',
            'Hourly Wage',
            'Retainer Fee',
            'Refund / Reimbursement',
            'Passive Income',
            'Other Income',

            'Uncategorized'
        ]
    },
    tax: { 
        type: Number, 
        required: true
    },
    taxPercentage: {
        type: Number,
        required: true,
        default: 0
    },
    description: { type: String },
    }, 
    { 
        timestamps: true 
    }
);

export default mongoose.model('Transaction', transactionSchema);