import Gig from '../models/gig.model.js';
import Milestone from '../models/milestone.model.js';
import mongoose from 'mongoose';

// Utility function to check ownership for a resource
const checkOwnership = (resource, userId) => {
    return resource.user.toString() === userId.toString();
};

const updateTotalValue = async (gigId) => {
    // Aggregation to sum the paymentAmount of all milestones for the gig
    const result = await Milestone.aggregate([
        { $match: { gig: new mongoose.Types.ObjectId(gigId) } },
        { $group: { _id: '$gig', total: { $sum: '$paymentAmount' } } }
    ]);
    
    const newTotalValue = result.length > 0 ? result[0].total : 0;
    
    // Update the Gig's totalValue
    await Gig.findByIdAndUpdate(gigId, { totalValue: newTotalValue });
};

const updateGigDueDate = async (gigId) => {
    const gig = await Gig.findById(gigId);
    if (!gig) return;

    const latestMilestone = await Milestone.findOne({ gig: gigId })
        .sort({ dueDate: -1 })
        .limit(1);

    let newDueDate;
    if (latestMilestone) {
        // Due date is the last milestone's due date
        newDueDate = latestMilestone.dueDate;
    } else {
        // If no milestones, due date is the gig's start date
        newDueDate = gig.startDate;
    }
    
    if (newDueDate && newDueDate.getTime() !== (gig.dueDate ? gig.dueDate.getTime() : null)) {
        await Gig.findByIdAndUpdate(gigId, { dueDate: newDueDate });
    }
};


export const createGig = async (req, res) => {
    try {
        // --- NEW LOGIC: Prevent totalValue/dueDate from being passed in & enforce startDate
        delete req.body.totalValue; // Ignore value from frontend
        delete req.body.dueDate; // Ignore value from frontend
        
        if (!req.body.startDate) {
            return res.status(400).json({ message: 'Gig startDate is required.' });
        }
        // --- END NEW LOGIC
        
        const gig = await Gig.create({
            ...req.body,
            user: req.user.id // Associate gig with the authenticated user
        });

        await updateGigDueDate(gig._id);
        
        const updatedGig = await Gig.findById(gig._id); // Fetch the gig again to get the computed dueDate
        res.status(201).json(updatedGig);
    } catch (err) {
        res.status(500).json({ message: err.message });
    }
};

export const getUserGigs = async (req, res) => {
    try {
        const gigs = await Gig.find({ user: req.user.id }).sort({ createdAt: -1 });
        res.json(gigs);
    } catch (err) {
        res.status(500).json({ message: err.message });
    }
};


export const getGigById = async (req, res) => {
    try {
        const gig = await Gig.findById(req.params.id);
        if (!gig) return res.status(404).json({ message: 'Gig not found' });

        // Check for ownership or admin role
        if (!checkOwnership(gig, req.user.id) && req.user.role !== 'admin') {
            return res.status(403).json({ message: 'Not authorized to view this gig' });
        }

        res.json(gig);
    } catch (err) {
        res.status(500).json({ message: err.message });
    }
};

export const updateGig = async (req, res) => {
    try {
        let gig = await Gig.findById(req.params.id);
        if (!gig) return res.status(404).json({ message: 'Gig not found' });

        if (!checkOwnership(gig, req.user.id) && req.user.role !== 'admin') {
            return res.status(403).json({ message: 'Not authorized to update this gig' });
        }
        
        // Prevent user from changing the owner, totalValue, or dueDate
        delete req.body.user; 
        delete req.body.totalValue; 
        delete req.body.dueDate;

        gig = await Gig.findByIdAndUpdate(req.params.id, req.body, { new: true });

        // --- NEW LOGIC: Recompute dueDate if startDate was changed
        if (req.body.startDate) {
            await updateGigDueDate(req.params.id);
            gig = await Gig.findById(req.params.id); // Fetch again to get new computed dueDate
        }
        // --- END NEW LOGIC
        
        res.json(gig);
    } catch (err) {
        res.status(500).json({ message: err.message });
    }
};

export const deleteGig = async (req, res) => {
    try {
        const gig = await Gig.findById(req.params.id);
        if (!gig) return res.status(404).json({ message: 'Gig not found' });

        if (!checkOwnership(gig, req.user.id) && req.user.role !== 'admin') {
            return res.status(403).json({ message: 'Not authorized to delete this gig' });
        }

        // Delete associated milestones (soft cascade)
        await Milestone.deleteMany({ gig: req.params.id });

        await Gig.deleteOne({ _id: req.params.id });
        res.json({ message: 'Gig and all associated milestones deleted' });
    } catch (err) {
        res.status(500).json({ message: err.message });
    }
};


export const getAllGigs = async (req, res) => {
    try {
        const gigs = await Gig.find().populate('user', 'username email').sort({ createdAt: -1 });
        res.json(gigs);
    } catch (err) {
        res.status(500).json({ message: err.message });
    }
};