import mongoose from 'mongoose';

const userBalanceSchema = new mongoose.Schema(
    {
        user: { 
            type: mongoose.Schema.Types.ObjectId,
            ref: 'User', 
            unique: true, 
            required: true 
        },
        balance: { 
            type: Number, 
            default: 0 
        },
    }, 
    {
        timestamps: true 
    }
);

export default mongoose.model('UserBalance', userBalanceSchema);
