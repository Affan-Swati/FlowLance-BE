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