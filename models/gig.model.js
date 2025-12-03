import mongoose from 'mongoose';

const gigSchema = new mongoose.Schema(
    {
        user: {
            // The freelancer who owns this gig
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
        // Total agreed-upon value for the entire gig
        totalValue: {
            type: Number,
            required: true,
            default: 0
        },
        startDate: {
            type: Date,
            required: false,
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