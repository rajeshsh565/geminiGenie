"use server";
import connect from "./db";
import { auth } from "@clerk/nextjs/server";
import ChatModel from "@/models/Chat";
import MessageModel from "@/models/Message";
import { redirect } from "next/navigation";

export const createChat = async () => {
  try {
    await connect();
    const { userId } = await auth();
    const chat = await ChatModel.create({ userId });
    const chat_id = `${chat._id}`;
    return { success: true, data: { chat_id } };
  } catch (error) {
    console.error("Error in createChat:", error);
    return { success: false, error: "Failed to create a new chat." };
  }
};

export const getChatsList = async () => {
  try {
    await connect();
    const { userId } = await auth();
    const chats = await ChatModel.find({ userId })
      .sort({ updatedAt: -1 })
      .lean();
    return { success: true, data: JSON.parse(JSON.stringify(chats)) };
  } catch (error) {
    console.error("Error in getChatsList:", error);
    return { success: false, error: "Failed to retrieve chat list." };
  }
};

export const setChatTitle = async (chatId, title) => {
  try {
    await connect();
    const { userId } = await auth();
    const chat = await ChatModel.findOneAndUpdate(
      { _id: chatId, userId },
      { title },
      { new: true }
    );
    if (!chat) {
      return { success: false, error: "Chat not found or permission denied." };
    }
    return { success: true, data: JSON.parse(JSON.stringify(chat)) };
  } catch (error) {
    console.error("Error in setChatTitle:", error);
    return { success: false, error: "Failed to set chat title." };
  }
};

export const createMessage = async (chatId, message) => {
  try {
    await connect();
    const { userId } = await auth();
    const userChat = await ChatModel.findOne({ _id: chatId, userId });
    if (!userChat) {
      return { success: false, error: "Chat not found or permission denied." };
    }
    const new_msg = await MessageModel.create({ chatId, message, model: message.model });
    userChat.updatedAt = new Date();
    await userChat.save();
    const resp_msg_obj = {
      message: JSON.parse(JSON.stringify(new_msg.message)),
      model: new_msg.model,
      createdAt: new_msg.createdAt,
    };
    return { success: true, data: resp_msg_obj };
  } catch (error) {
    console.error("Error in createMessage:", error);
    return { success: false, error: "Failed to create message." };
  }
};

export const getMessageHistory = async (chatId) => {
  console.log('getting msg history->', );
  try {
    await connect();
    const { userId } = await auth();
    const isUserChat = await ChatModel.findOne({ _id: chatId, userId });
    if (!isUserChat) {
      console.log('user chat not found->', );
      return { success: false, error: "Chat not found or permission denied." };
    }
    const messages = await MessageModel.find({ chatId })
      .sort({ createdAt: 1 })
      .lean();
    return { success: true, data: JSON.parse(JSON.stringify(messages)) };
  } catch (error) {
    console.error("Error in getMessageHistory:", error);
    return { success: false, error: "Failed to retrieve message history." };
  }
};
