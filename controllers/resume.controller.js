import axios from 'axios';
import FormData from 'form-data';
import crypto from 'crypto'; // Used to generate a unique resume_id
import mongoose from 'mongoose';

export const processResume = async (req, res) => {
    try {
        const userId = req.user.id; 
        const file = req.file;

        if (!file) {
            return res.status(400).json({ 
                success: false,
                error: "No resume file provided." 
            });
        }

        // Generate a unique ID for this specific resume document
        const resumeId = crypto.randomUUID();

        // Prepare the multi-part form data for the Python FastAPI server
        const form = new FormData();
        form.append('user_id', userId.toString());
        form.append('resume_id', resumeId); // Pass the new ID to Python
        form.append('file', file.buffer, {
            filename: file.originalname,
            contentType: file.mimetype,
        });

        console.log(`🚀 Forwarding resume ${resumeId} for user ${userId} to AI microservice...`);

        const aiEndpoint = `${process.env.AI_SERVICE_URL}/api/agents/resume/process`;

        // Call your FastAPI endpoint
        const pythonResponse = await axios.post(
            aiEndpoint, 
            form, 
            {
                headers: {
                    ...form.getHeaders(),
                },
                maxContentLength: Infinity,
                maxBodyLength: Infinity
            }
        );

        // Success! Return the resumeId to the frontend so it can be tracked/deleted later
        return res.status(200).json({
            success: true,
            message: "Resume processed and RAG ingestion complete.",
            resumeId: resumeId, 
            data: pythonResponse.data
        });

    } catch (error) {
        console.error("❌ AI Microservice Error:", error.response?.data || error.message);
        return res.status(500).json({ 
            success: false,
            error: "AI Microservice failed to process resume.",
            details: error.response?.data || error.message
        });
    }
};

// New controller to handle resume deletion
export const deleteResume = async (req, res) => {
    try {
        const userId = req.user.id;
        const resumeId = req.params.resumeId;

        console.log(`🗑️ Requesting deletion of resume ${resumeId} for user ${userId}...`);

        // Forward DELETE request to Python microservice
        // Passing user_id as a query param ensures Python deletes the right data safely
        const aiEndpoint = `${process.env.AI_SERVICE_URL}/api/agents/resume/${resumeId}?user_id=${userId}`;
        
        const pythonResponse = await axios.delete(aiEndpoint);

        return res.status(200).json({
            success: true,
            message: "Resume successfully deleted from vector database.",
            data: pythonResponse.data
        });

    } catch (error) {
        console.error("❌ AI Microservice Delete Error:", error.response?.data || error.message);
        return res.status(500).json({
            success: false,
            error: "AI Microservice failed to delete resume.",
            details: error.response?.data || error.message
        });
    }
};

export const getUserResumes = async (req, res) => {
    try {
        const userId = req.user.id;
        
        // Find all resumes belonging to this user
        // We only return the resumeId, filename, and upload date for the list
        const resumes = await mongoose.connection.db
            .collection('freelancer_profiles')
            .find({ user_id: userId })
            .project({ resume_id: 1, "resume_data.name": 1, createdAt: 1 }) 
            .toArray();

        // Format for frontend
        const formattedResumes = resumes.map(r => ({
            resumeId: r.resume_id,
            filename: r.resume_data?.name || "Uploaded Resume",
            uploadedAt: r.createdAt || new Date()
        }));

        return res.status(200).json({
            success: true,
            resumes: formattedResumes
        });
    } catch (error) {
        console.error("❌ Error fetching resumes:", error);
        return res.status(500).json({ success: false, error: "Failed to fetch resumes." });
    }
};