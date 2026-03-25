import mongoose from 'mongoose';
import Gig from '../models/gig.model.js';
import Milestone from '../models/milestone.model.js';
import UserBalance from '../models/userBalance.model.js';
import User from '../models/user.model.js';

export const getAIGeneratedInsights = async (req, res) => {
    try {
        const userId = req.user.id;
        
        // --- 1. COMPILE DATA ---
        const user = await User.findById(userId).select('username email role');
        const balanceRecord = await UserBalance.findOne({ user: userId });
        const currentBalance = balanceRecord ? balanceRecord.balance : 0;

        const gigs = await Gig.find({ user: userId })
            .select('title description clientName totalValue startDate dueDate status createdAt')
            .lean(); 

        const milestones = await Milestone.find({ user: userId })
            .select('gig title description startDate dueDate status paymentAmount paymentLogged')
            .lean();

        const formattedGigs = gigs.map(gig => {
            const gigMilestones = milestones.filter(m => m.gig.toString() === gig._id.toString());
            return {
                gigTitle: gig.title,
                status: gig.status,
                totalValue: gig.totalValue,
                timeline: {
                    start: gig.startDate ? gig.startDate.toISOString().split('T')[0] : null,
                    due: gig.dueDate ? gig.dueDate.toISOString().split('T')[0] : null,
                },
                milestones: gigMilestones.map(m => ({
                    title: m.title,
                    status: m.status,
                    paymentAmount: m.paymentAmount,
                }))
            };
        });

        const profileDoc = await mongoose.connection.db
            .collection('freelancer_profiles')
            .findOne({ user_id: userId.toString() });

        const resumeData = profileDoc ? profileDoc.resume_data : null;

        const aiPayload = {
            freelancerProfile: {
                username: user.username,
                currentBalance: currentBalance,
                totalGigs: formattedGigs.length,
            },
            portfolioHistory: formattedGigs,
            resumeData: resumeData
        };

        // --- 2. COMMUNICATE WITH FASTAPI MICROSERVICE ---
        const AI_SERVICE_URL = process.env.AI_SERVICE_URL || 'http://localhost:8000';
        const aiResponse = await fetch(`${AI_SERVICE_URL}/api/analyze-portfolio`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify(aiPayload)
        });

        if (!aiResponse.ok) {
            let errorDetail = "Unknown AI Error";
            try {
                const errorData = await aiResponse.json();
                errorDetail = errorData.detail || errorDetail;
            } catch (parseErr) {}
            
            throw new Error(errorDetail); 
        }

        const aiData = await aiResponse.json();

        delete aiPayload.resumeData;

        res.status(200).json({
            success: true,
            data: {
                rawStats: aiPayload,
                aiInsights: aiData
            }
        });

    } catch (err) {
        console.error("🚨 INTERNAL ANALYTICS AI ERROR:", err.message);

        res.status(500).json({ 
            error: "The AI Analytics engine is currently not available. Please try again in a moment." 
        });
    }
};