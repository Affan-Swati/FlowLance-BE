import axios from 'axios';
import MessagingThread from '../models/messaging.model.js';

const AI_SERVICE_URL = process.env.AI_SERVICE_URL || 'http://localhost:8000';

export const createChat = async (req, res) => {
  try {
    const { clientName, gigName, gigDescription } = req.body;
    const userId = req.user.id;

    const finalThreadId = `msg_${Date.now()}_${userId}`;

    const aiSimulate = await axios.post(`${AI_SERVICE_URL}/api/agents/messaging/simulate-client-message`, {
      client_name: clientName || 'Client',
      gig_context: gigDescription || '',
      conversation_history: []
    });

    const latestMessage = aiSimulate.data.latest_message;

    const thread = await MessagingThread.create({
      userId,
      threadId: finalThreadId,
      clientName: clientName || 'Client',
      gigName: gigName || 'New Chat',
      gigDescription: gigDescription || '',
      latestMessage,
      lastReply: '',
      conversationHistory: [{ sender: 'client', text: latestMessage }]
    });

    return res.status(201).json({ success: true, thread });
  } catch (error) {
    const pythonErrorMessage = error.response?.data?.detail || error.message;
    console.error('🚨 Create Chat ERROR:', pythonErrorMessage);
    return res.status(500).json({ error: 'Unable to create the chat. Please try again.' });
  }
};

export const generateMessageReply = async (req, res) => {
  try {
    const { clientName, gigName, gigDescription, latestMessage, conversationHistory, threadId } = req.body;
    const userId = req.user.id;

    const finalThreadId = threadId || `msg_${Date.now()}_${userId}`;

    const aiResponse = await axios.post(`${AI_SERVICE_URL}/api/agents/messaging/generate-reply`, {
      thread_id: finalThreadId,
      user_id: userId.toString(),
      client_name: clientName || 'Client',
      gig_context: gigDescription || '',
      latest_message: latestMessage,
      conversation_history: conversationHistory || []
    });

    const aiData = aiResponse.data;
    
    // Only add the new client message if it's not already in history
    const hasLatestMessage = conversationHistory && conversationHistory.some(msg => msg.text === latestMessage && msg.sender === 'client');
    const updateOps = {
      $set: {
        clientName: clientName || 'Client',
        gigName: gigName || 'New Chat',
        gigDescription: gigDescription || '',
        latestMessage,
        lastReply: aiData.reply,
        updatedAt: Date.now()
      }
    };

    if (!hasLatestMessage) {
      updateOps.$push = { conversationHistory: { sender: 'client', text: latestMessage } };
    }

    const thread = await MessagingThread.findOneAndUpdate(
      { threadId: finalThreadId, userId },
      updateOps,
      { upsert: true, new: true }
    );

    return res.status(200).json({
      success: true,
      threadId: finalThreadId,
      reply: aiData.reply,
      sentiment: aiData.sentiment || '',
      intent: aiData.intent || '',
      thread
    });
  } catch (error) {
    const pythonErrorMessage = error.response?.data?.detail || error.message;
    console.error('🚨 Messaging AI ERROR:', pythonErrorMessage);
    return res.status(500).json({ error: 'The AI messaging service is currently unavailable. Please try again in a moment.' });
  }
};

export const analyzeMessage = async (req, res) => {
  try {
    const { clientName, gigDescription, latestMessage } = req.body;
    const userId = req.user.id;

    const aiResponse = await axios.post(`${AI_SERVICE_URL}/api/agents/messaging/analyze-message`, {
      user_id: userId.toString(),
      client_name: clientName || 'Client',
      gig_context: gigDescription || '',
      latest_message: latestMessage
    });

    return res.status(200).json({
      success: true,
      sentiment: aiResponse.data.sentiment,
      intent: aiResponse.data.intent
    });
  } catch (error) {
    const pythonErrorMessage = error.response?.data?.detail || error.message;
    console.error('🚨 Analyze Message ERROR:', pythonErrorMessage);
    return res.status(500).json({ error: 'Unable to analyze the message at this time.' });
  }
};

export const sendReply = async (req, res) => {
  try {
    const { threadId, reply } = req.body;
    const userId = req.user.id;

    const thread = await MessagingThread.findOneAndUpdate(
      { threadId, userId },
      {
        $set: {
          lastReply: reply,
          updatedAt: Date.now()
        },
        $push: {
          conversationHistory: { sender: 'freelancer', text: reply }
        }
      },
      { new: true }
    );

    if (!thread) {
      return res.status(404).json({ error: 'Message thread not found.' });
    }

    return res.status(200).json({ success: true, thread });
  } catch (error) {
    console.error('🚨 Send Reply ERROR:', error.message);
    return res.status(500).json({ error: 'Unable to save the reply at this time.' });
  }
};

export const simulateClientMessage = async (req, res) => {
  try {
    const { clientName, gigContext, conversationHistory } = req.body;

    const aiResponse = await axios.post(`${AI_SERVICE_URL}/api/agents/messaging/simulate-client-message`, {
      client_name: clientName || 'Client',
      gig_context: gigContext || '',
      conversation_history: conversationHistory || []
    });

    return res.status(200).json({
      success: true,
      latestMessage: aiResponse.data.latest_message
    });
  } catch (error) {
    const pythonErrorMessage = error.response?.data?.detail || error.message;
    console.error('🚨 Messaging Simulation ERROR:', pythonErrorMessage);
    return res.status(500).json({ error: 'The client simulation service is unavailable. Please try again in a moment.' });
  }
};

export const getAllMessageThreads = async (req, res) => {
  try {
    const userId = req.user.id;
    const threads = await MessagingThread.find({ userId }).sort({ updatedAt: -1 }).lean();
    return res.status(200).json({ success: true, threads });
  } catch (error) {
    console.error('🚨 Messaging Thread List ERROR:', error.message);
    return res.status(500).json({ error: 'Unable to load messaging threads at this time.' });
  }
};

export const getMessageThread = async (req, res) => {
  try {
    const userId = req.user.id;
    const { threadId } = req.params;

    const thread = await MessagingThread.findOne({ userId, threadId }).lean();
    if (!thread) {
      return res.status(404).json({ error: 'Message thread not found.' });
    }

    return res.status(200).json({ success: true, thread });
  } catch (error) {
    console.error('🚨 Messaging Thread Fetch ERROR:', error.message);
    return res.status(500).json({ error: 'Unable to load the requested thread.' });
  }
};
