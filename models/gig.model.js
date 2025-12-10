import mongoose from 'mongoose';

const gigSchema = new mongoose.Schema(
    {
        user: {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'User',
            required: true
        },
        title: {
            type: String,
            required: true,
            trim: true
        },
        description: {
            type: String,
            required: false,
            trim: true
        },
        clientName: {
            type: String,
            required: false,
            trim: true
        },
        totalValue: {
            type: Number,
            default: 0
        },
        startDate: {
            type: Date,
            required: true,
        },
        dueDate: {
            type: Date,
            required: false,
        },
        status: {
            type: String,
            enum: ['Open', 'In Progress', 'Completed', 'Archived'],
            default: 'Open'
        }
    },
    {
        timestamps: true
    }
);

export default mongoose.model('Gig', gigSchema);