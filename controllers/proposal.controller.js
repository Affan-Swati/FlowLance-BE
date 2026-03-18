import Proposal from '../models/proposal.model.js';
import axios from 'axios';

export const processProposal = async (req, res) => {
  try {
    const { jobTitle, jobDescription, userPrompt, threadId } = req.body;
    
    // Extracting ID from your specific JWT middleware payload
    const userId = req.user.id; 

    // Generate threadId if new, otherwise reuse for persistence
    const finalThreadId = threadId || `flow_${Date.now()}_${userId}`;

    const aiEndpoint = `${process.env.AI_SERVICE_URL}/api/agents/proposal/generate`;

    // 1. Send to Python FastAPI Agent
    const pythonResponse = await axios.post(aiEndpoint, {
      thread_id: finalThreadId,
      user_id: userId.toString(),
      job_title: jobTitle,
      job_description: jobDescription,
      user_prompt: userPrompt || ""
    });

    const generatedProposalText = pythonResponse.data.proposal;

    // 2. Update Application DB (Metadata for the Dashboard)
    const updatedProposal = await Proposal.findOneAndUpdate(
      { threadId: finalThreadId },
      { 
        userId, 
        jobTitle, 
        jobDescription, 
        lastDraft: generatedProposalText,
        updatedAt: Date.now()
      },
      { upsert: true, new: true }
    );

    res.status(200).json({
      success: true,
      proposal: updatedProposal,
      isNew: !threadId
    });

  } catch (error) {
    console.error("AI Bridge Error:", error.response?.data || error.message);
    res.status(500).json({ error: "Failed to sync with AI service" });
  }
};

export const getAllUserProposals = async (req, res) => {
  try {
    const proposals = await Proposal.find({ userId: req.user.id }).sort({ updatedAt: -1 });
    res.status(200).json({ success: true, proposals });
  } catch (error) {
    res.status(500).json({ error: "Error fetching proposals" });
  }
};