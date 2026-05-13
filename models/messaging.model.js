import mongoose from 'mongoose';

const messageEntrySchema = new mongoose.Schema(
  {
    sender: { type: String, enum: ['client', 'freelancer'], required: true },
    text: { type: String, required: true },
    createdAt: { type: Date, default: Date.now }
  },
  { _id: false }
);

const messagingSchema = new mongoose.Schema({
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  threadId: {
    type: String,
    required: true,
    unique: true
  },
  clientName: { type: String },
  gigName: { type: String },
  gigDescription: { type: String },
  gigContext: { type: String },
  latestMessage: { type: String },
  lastReply: { type: String },
  conversationHistory: { type: [messageEntrySchema], default: [] },
  createdAt: { type: Date, default: Date.now },
  updatedAt: { type: Date, default: Date.now }
});

const MessagingThread = mongoose.model('MessagingThread', messagingSchema);
export default MessagingThread;
