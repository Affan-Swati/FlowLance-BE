import axios from 'axios';
import FormData from 'form-data';

export const processResume = async (req, res) => {
    try {
        // Now extracting id from the auth middleware (JWT payload)
        const userId = req.user.id; 
        const file = req.file;

        if (!file) {
            return res.status(400).json({ 
                success: false,
                error: "No resume file provided." 
            });
        }

        // Prepare the multi-part form data for the Python FastAPI server
        const form = new FormData();
        form.append('user_id', userId.toString());
        form.append('file', file.buffer, {
            filename: file.originalname,
            contentType: file.mimetype,
        });

        console.log(`🚀 Forwarding resume for user ${userId} to AI microservice...`);

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

        // Success! The RAG is now built in MongoDB via the Python service
        return res.status(200).json({
            success: true,
            message: "Resume processed and RAG ingestion complete.",
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