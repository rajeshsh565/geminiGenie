"use server"
import mongoose from "mongoose";

const Message = new mongoose.Schema({
  chatId: {
    ref: 'Chat',
    type: mongoose.Schema.Types.ObjectId,
    required: true
  },
  message: {
    role: {
      type: String,
      required: true
    },
    parts: {
      type: Array,
    }
  },
  model: {
    type: String,
  },
  usageMetadata: {
    promptTokenCount: Number,
    candidatesTokenCount: Number,
    thoughtTokenCount: Number,
    totalTokenCount: Number,
  },
  createdAt: {
    type: Date,
    default: Date.now
  }
})

Message.index({ chatId: 1 });

const MessageModel = mongoose.models.Message || mongoose.model("Message", Message);

export default MessageModel;