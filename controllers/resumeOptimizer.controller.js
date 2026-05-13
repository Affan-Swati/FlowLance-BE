import axios from 'axios';

export const optimizeResume = async (req, res) => {
    try {
        const userId = req.user.id;
        const { resumeId } = req.params;

        if (!resumeId) {
            return res.status(400).json({ success: false, error: 'Resume ID is required.' });
        }

        const aiEndpoint = `${process.env.AI_SERVICE_URL}/api/agents/resume/optimize`;

        const pythonResponse = await axios.post(aiEndpoint, {
            user_id:   userId.toString(),
            resume_id: resumeId,
        });

        return res.status(200).json({
            success:  true,
            overall:  pythonResponse.data.overall,
            sections: pythonResponse.data.sections,
        });

    } catch (error) {
        const detail = error.response?.data?.detail || error.message;
        console.error('❌ Resume Review Error:', detail);

        const statusCode = error.response?.status === 404 ? 404
            : error.response?.status === 422 ? 422
            : 500;

        return res.status(statusCode).json({
            success: false,
            error: detail || 'The AI review engine is currently unavailable.',
        });
    }
};
