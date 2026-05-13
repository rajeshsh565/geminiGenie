"use server"
import mongoose from "mongoose";

const Chat = new mongoose.Schema({
  userId: {
    type: String,
    required: true
  },
  title: {
    type: String,
    default: 'Untitled Chat',
    required: true
  }
}, { timestamps: true });

Chat.index({ userId: 1, createdAt: 1 });

const ChatModel = mongoose.models.Chat || mongoose.model("Chat", Chat);

export default ChatModel;