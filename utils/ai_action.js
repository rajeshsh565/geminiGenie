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
  const chat = ai.chats.create({
    model: 'gemini-2.5-flash-lite',
    history: messages
  });
  const text = `Generate a title for this chat (excluding this message), respond only in JSON so it could be directly extract using JSON.parse(). Keep the title short and concise but descriptive. Do not include any markup or any other text.
  Example:
  {
    chat_title: "Greetings"
  } // ACCEPTED
  `;
  let retry_counter = 0;
  let ai_response;
  let title;
  while (!title) {
    ai_response = await chat.sendMessage({ message: text });
    const match = ai_response.text.match(/{[\s\S]*}/);
    const cleaned_text = match ? match[0] : ai_response.text;
    try {
      const { chat_title } = JSON.parse(cleaned_text);
      title = chat_title;
      break;
    } catch (error) {
      retry_counter++;
      if (retry_counter > 3) {
        break;
      }
    }
  }
  return title;
}