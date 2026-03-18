import mongoose from 'mongoose';

const proposalSchema = new mongoose.Schema({
  userId: { 
    type: mongoose.Schema.Types.ObjectId, 
    ref: 'User', 
    required: true 
  },
  jobTitle: { type: String, required: true },
  jobDescription: { type: String, required: true },
  // This is the key that links to LangGraph's persistent memory
  threadId: { type: String, required: true, unique: true }, 
  lastDraft: { type: String },
  createdAt: { type: Date, default: Date.now },
  updatedAt: { type: Date, default: Date.now }
});

const Proposal = mongoose.model('Proposal', proposalSchema);
export default Proposal;