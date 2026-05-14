"use server";
import ai from "@/geminiModel";

export const generateResponse = async ({ messages=[], query }) => {
  console.log('msgs, query->', { messages, query });
  const start_time = Date.now();
  const chat = ai.chats.create({
    history: messages,
    model: process.env.GEMINI_MODEL,
    config: {
      tools: [
        {
          googleSearch: {}
        },
        // {
        //   functionDeclarations: [
        //     {
        //       name: "create_file",
        //       description: "Creates a new file with the specified content. verifying the directory exists first.",
        //       parameters: {
        //         type: "OBJECT",
        //         properties: {
        //           filename: { type: "STRING", description: "The name of the file (e.g., test.txt, utils.js)" },
        //           content: { type: "STRING", description: "The code or text to put inside the file" },
        //         },
        //         required: ["filename", "content"],
        //       },
        //     },
        //   ],
        // }
      ],
      // thinkingConfig: {
      //   thinkingLevel: "low"
      // },
    }
  });
  const response = await chat.sendMessage({ message: query });
  console.log({ response });
  const call = response?.functionCalls;
  console.debug({ call });
  console.log(`total time for response: ${(Date.now() - start_time) / 1000}s`);
  return response?.text;
};

export const generateTitle = async (messages = []) => {
  try {
    const chat = ai.chats.create({
      model: 'gemini-3-flash-preview',
      history: messages,
      config: {
        responseMimeType: "application/json"
      }
    });
    
    const text = `Generate a title for this chat (excluding this message). Respond ONLY in JSON. Keep the title short and concise but descriptive. Do not include any markdown formatting. Example: {"chat_title": "Greetings"}`;
    
    let retry_counter = 0;
    let title = null;
    
    while (!title && retry_counter < 3) {
      try {
        const ai_response = await chat.sendMessage({ message: text });
        const match = ai_response.text.match(/{[\s\S]*}/);
        const cleaned_text = match ? match[0] : ai_response.text;
        const parsed = JSON.parse(cleaned_text);
        
        if (parsed && (parsed.chat_title || parsed.title)) {
          title = parsed.chat_title || parsed.title;
          break;
        }
      } catch (error) {
        console.error("Title generation API/parsing error:", error.message);
      }
      retry_counter++;
      if (!title) await new Promise(resolve => setTimeout(resolve, 1500)); // Delay to prevent 429
    }
    
    return title || "Untitled Chat";
  } catch (error) {
    console.error("Failed to initialize generateTitle:", error.message);
    return "Untitled Chat";
  }
}