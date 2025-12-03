import Milestone from '../models/milestone.model.js';
import Gig from '../models/gig.model.js';
import mongoose from 'mongoose';

// Utility function to check milestone ownership
const checkMilestoneOwnership = async (milestoneId, userId) => {
    const milestone = await Milestone.findById(milestoneId);
    if (!milestone) return false;
    return milestone.user.toString() === userId.toString();
};

export const getMilestoneById = async (req, res) => {
    try {
        const milestone = await Milestone.findById(req.params.id);
        if (!milestone) return res.status(404).json({ message: 'Milestone not found' });

        // Check for ownership or admin role
        if (milestone.user.toString() !== req.user.id.toString() && req.user.role !== 'admin') {
            return res.status(403).json({ message: 'Not authorized to view this milestone' });
        }

        res.json(milestone);
    } catch (err) {
        res.status(500).json({ message: err.message });
    }
};

export const createMilestone = async (req, res) => {
    try {
        const { gigId } = req.params;
        const gig = await Gig.findById(gigId);
        if (!gig) return res.status(404).json({ message: 'Gig not found' });
        
        // Ensure the current user owns the gig
        if (gig.user.toString() !== req.user.id.toString() && req.user.role !== 'admin') {
            return res.status(403).json({ message: 'Not authorized to add milestones to this gig' });
        }

        const milestone = await Milestone.create({
            ...req.body,
            gig: gigId,
            user: req.user.id // Link milestone to the gig owner
        });
        res.status(201).json(milestone);
    } catch (err) {
        res.status(500).json({ message: err.message });
    }
};

export const getMilestonesByGig = async (req, res) => {
    try {
        const { gigId } = req.params;
        const gig = await Gig.findById(gigId);
        if (!gig) return res.status(404).json({ message: 'Gig not found' });
        
        // Check for ownership or admin role
        if (gig.user.toString() !== req.user.id.toString() && req.user.role !== 'admin') {
            return res.status(403).json({ message: 'Not authorized to view milestones for this gig' });
        }

        const milestones = await Milestone.find({ gig: gigId }).sort('createdAt');
        res.json(milestones);
    } catch (err) {
        res.status(500).json({ message: err.message });
    }
};

export const updateMilestone = async (req, res) => {
    try {
        let milestone = await Milestone.findById(req.params.id);
        if (!milestone) return res.status(404).json({ message: 'Milestone not found' });

        if (!await checkMilestoneOwnership(req.params.id, req.user.id) && req.user.role !== 'admin') {
            return res.status(403).json({ message: 'Not authorized to update this milestone' });
        }

        milestone = await Milestone.findByIdAndUpdate(req.params.id, req.body, { new: true });
        res.json(milestone);
    } catch (err) {
        res.status(500).json({ message: err.message });
    }
};

export const deleteMilestone = async (req, res) => {
    try {
        const milestone = await Milestone.findById(req.params.id);
        if (!milestone) return res.status(404).json({ message: 'Milestone not found' });

        if (!await checkMilestoneOwnership(req.params.id, req.user.id) && req.user.role !== 'admin') {
            return res.status(403).json({ message: 'Not authorized to delete this milestone' });
        }

        await Milestone.deleteOne({ _id: req.params.id });
        res.json({ message: 'Milestone deleted successfully' });
    } catch (err) {
        res.status(500).json({ message: err.message });
    }
};