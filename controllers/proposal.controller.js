import Proposal from '../models/proposal.model.js';
import axios from 'axios';

// TOGGLE THIS TO FALSE FOR PRODUCTION / REAL AI INFERENCE
// TODO: REMOVE LATER, ADDING THIS JUST FOR FRONT END DEV WORK TO BYPASS THE MODEL INFERENCE
const MOCK_AI_RESPONSE = false;

export const generateProposal = async (req, res) => {
  try {
    // 1. Added currentDraft here to catch the manual edits from the UI
    const { jobTitle, jobDescription, userPrompt, threadId, currentDraft } = req.body;
    
    const userId = req.user.id; 

    const finalThreadId = threadId || `flow_${Date.now()}_${userId}`;
    let generatedProposalText = "";

    if (MOCK_AI_RESPONSE) {
      console.log(`[MOCK] Generating proposal for thread: ${finalThreadId}`);
      
      // Simulate a 5-second AI thinking delay to test your React loading spinners
      await new Promise(resolve => setTimeout(resolve, 5000));
      
      // mock response
      generatedProposalText = `**Proposal Title:** Expert React Development Services for SaaS Dashboard\n\nDear [Client],\n\nWith extensive experience building scalable web applications, my skills align perfectly with your need for a Senior React Developer.\n\nI recently built FlowLance, an AI-powered productivity dashboard for freelancers. This required designing a complex centralized interface with gig management, AI-based transaction categorization, and smart analytics—directly translating to the SaaS dashboard requirements you mentioned.\n\nTo deliver a high-quality product, I leverage TypeScript, React, and Tailwind CSS, ensuring seamless REST API integration. Furthermore, my approach using Agile, CI/CD, and TDD guarantees controlled rollouts and zero-downtime releases.\n\nI would be delighted to discuss how my background fits your specific goals.\n\nBest regards,\n\n[Your Name]`;
      
    } else {
      // Real AI Logic
      const aiEndpoint = `${process.env.AI_SERVICE_URL}/api/agents/proposal/generate`;
      const pythonResponse = await axios.post(aiEndpoint, {
        thread_id: finalThreadId,
        user_id: userId.toString(),
        job_title: jobTitle,
        job_description: jobDescription,
        user_prompt: userPrompt || "",
        current_draft: currentDraft
      });
      generatedProposalText = pythonResponse.data.proposal;
    }

    // 3. Update Application DB (Metadata for the Dashboard)
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
    const pythonErrorMessage = error.response?.data?.detail || error.message;
    console.error("🚨 INTERNAL AI ERROR:", pythonErrorMessage);

    res.status(500).json({ 
      error: "The AI proposal engine is currently unavailable. Please try again in a moment." 
    });
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

export const saveDraft = async (req, res) => {
  try {
    const { threadId, draft } = req.body;
    if (!threadId) return res.status(400).json({ error: "Thread ID is required" });

    const updatedProposal = await Proposal.findOneAndUpdate(
      { threadId, userId: req.user.id },
      { lastDraft: draft, updatedAt: Date.now() },
      { new: true }
    );

    res.status(200).json({ success: true, proposal: updatedProposal });
  } catch (error) {
    console.error("Save Draft Error:", error);
    res.status(500).json({ error: "Failed to save draft manually" });
  }
};