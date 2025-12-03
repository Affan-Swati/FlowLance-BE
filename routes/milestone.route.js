import express from 'express';
import {
    createMilestone,
    getMilestonesByGig,
    getMilestoneById, 
    updateMilestone,
    deleteMilestone,
} from '../controllers/milestone.controller.js';
import auth from '../middleware/auth.js';

const router = express.Router();

// --- GIG-SPECIFIC MILESTONE ROUTES (Using the parent ID for association) ---
// POST /api/milestones/gig/:gigId: Create a new milestone associated with a specific gig
// GET /api/milestones/gig/:gigId: Get all milestones for that specific gig
router.route('/gig/:gigId')
    .post(auth, createMilestone)  
    .get(auth, getMilestonesByGig); 

// --- INDIVIDUAL MILESTONE ROUTES ---
// GET /api/milestones/:id: Retrieve a specific milestone
// PUT /api/milestones/:id: Update status, amount, etc.
// DELETE /api/milestones/:id: Delete a specific milestone
router.route('/:id')
    .get(auth, getMilestoneById)
    .put(auth, updateMilestone) 
    .delete(auth, deleteMilestone);

export default router;