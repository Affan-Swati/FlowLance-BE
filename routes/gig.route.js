import express from 'express';
import { 
    createGig, 
    getUserGigs, 
    getGigById, 
    updateGig, 
    deleteGig,
    getAllGigs
} from '../controllers/gig.controller.js';
import auth from '../middleware/auth.js'; 
import adminAuth from '../middleware/adminAuth.js';

const router = express.Router();

// --- USER ROUTES (Focusing on the authenticated user's Gigs) ---

// POST /api/gigs: Create a new gig
router.post('/', auth, createGig); 
router.get('/user', auth, getUserGigs);

// GET, PUT, DELETE /api/gigs/:id: Operate on a specific gig
router.route('/:id')
    .get(auth, getGigById)
    .put(auth, updateGig)
    .delete(auth, deleteGig);

// --- ADMIN ROUTES ---
// GET /api/gigs: Get all gigs for ALL users (Admin Only)
router.get('/', auth, adminAuth, getAllGigs);

export default router;