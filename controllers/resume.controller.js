const axios = require('axios');
const FormData = require('form-data');

exports.processResume = async (req, res) => {
    try {
        const { user_id } = req.body;
        const file = req.file;

        if (!file || !user_id) {
            return res.status(400).json({ 
                error: "Missing file or user_id. Please provide both." 
            });
        }

        // Prepare the payload for the Python FastAPI server
        const form = new FormData();
        form.append('user_id', user_id);
        form.append('file', file.buffer, {
            filename: file.originalname,
            contentType: file.mimetype,
        });

        console.log(`Forwarding resume for user ${user_id} to AI microservice...`);

        // Call your FastAPI endpoint (running on port 8000)
        const pythonResponse = await axios.post(
            'http://localhost:8000/api/agents/resume/process', 
            form, 
            {
                headers: {
                    ...form.getHeaders(),
                },
                // Increase timeout for AI processing
                maxContentLength: Infinity,
                maxBodyLength: Infinity
            }
        );

        // Success! The RAG is now built in MongoDB
        return res.status(200).json({
            message: "Resume processed and RAG ingestion complete.",
            data: pythonResponse.data
        });

    } catch (error) {
        console.error("Error calling AI microservice:", error.response?.data || error.message);
        return res.status(500).json({ 
            error: "AI Microservice failed to process resume.",
            details: error.response?.data || error.message
        });
    }
};