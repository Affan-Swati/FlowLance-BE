import Gig from '../models/gig.model.js';
import Milestone from '../models/milestone.model.js';
import mongoose from 'mongoose';

// Utility function to check ownership for a resource
const checkOwnership = (resource, userId) => {
    return resource.user.toString() === userId.toString();
};


export const createGig = async (req, res) => {
    try {
        const gig = await Gig.create({
            ...req.body,
            user: req.user.id // Associate gig with the authenticated user
        });
        res.status(201).json(gig);
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
        
        // Prevent user from changing the owner
        delete req.body.user; 

        gig = await Gig.findByIdAndUpdate(req.params.id, req.body, { new: true });
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