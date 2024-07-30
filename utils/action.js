"use server";
import { model } from "@/geminiModel";

export const generateResponse = async ({messages, query}) => {
  let aiResponse = "";
  let res = false;
  const chat = model.startChat({
    history: messages,
    generationConfig: {
      temperature: 0
    },
  });
  while(res==false){
    const { response } = await chat.sendMessage(query);
    aiResponse = response.text();
    if(aiResponse){
      res = true;
    }
  }
  return aiResponse;
};