import mongoose from 'mongoose';

const milestoneSchema = new mongoose.Schema(
    {
        gig: {
            // Links the milestone back to its parent Gig
            type: mongoose.Schema.Types.ObjectId,
            ref: 'Gig',
            required: true
        },
        user: {
            // Redundant link, but useful for access checks without populating Gig
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
        startDate: {
            type: Date,
            required: false,
        },
        dueDate: {
            type: Date,
            required: false,
        },
        // The project management column states
        status: {
            type: String,
            enum: ['To Do', 'In Progress', 'Blocked', 'Done'],
            default: 'To Do'
        },
        // The specific payment amount associated with this deliverable
        paymentAmount: {
            type: Number,
            required: true,
            default: 0
        },
        // Flag to indicate if payment for this milestone has been received and logged as a Transaction
        paymentLogged: {
            type: Boolean,
            default: false
        }
    },
    {
        timestamps: true
    }
);

export default mongoose.model('Milestone', milestoneSchema);