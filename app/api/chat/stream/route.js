import ai from "@/geminiModel";
import { NextResponse } from "next/server";

export async function POST(req) {
  try {
    const { messages, query, thinkingLevel, model } = await req.json();

    const config = {
      tools: [
        {
          googleSearch: {}
        }
      ]
    };

    // Only apply thinking config if it's the Gemini 3 model that supports levels
    if (model === 'gemini-3-pro-preview') {
      config.thinkingConfig = {
        includeThoughts: true,
        thinkingLevel: thinkingLevel || "low", 
      };
    }

    const chat = ai.chats.create({
      history: messages,
      model: model || process.env.GEMINI_MODEL,
      config: config
    });

    const startTime = Date.now();
    const result = await chat.sendMessageStream({ message: query });

    const stream = new ReadableStream({
      async start(controller) {
        const encoder = new TextEncoder();
        let isFirstChunk = true;
        let lastUsage = null;
        try {
          for await (const chunk of result) {
            const text = chunk.text;
            if (chunk.usageMetadata) {
              lastUsage = chunk.usageMetadata;
            }
            if (text) {
               if (isFirstChunk) {
                  isFirstChunk = false;
               }
              controller.enqueue(encoder.encode(text));
            }
          }
          
          // Get usage metadata after stream is fully consumed
          try {
            const response = await result.response;
            const usage = response.usageMetadata || lastUsage;
            if (usage) {
              const metadataStr = `__METADATA__${JSON.stringify(usage)}`;
              controller.enqueue(encoder.encode(metadataStr));
            }
          } catch (usageError) {
            if (lastUsage) {
              controller.enqueue(encoder.encode(`__METADATA__${JSON.stringify(lastUsage)}`));
            }
          }

          controller.close();
        } catch (error) {
          console.error("Streaming error:", error);
          controller.error(error);
        }
      }
    });

    return new NextResponse(stream, {
      headers: {
        'Content-Type': 'text/plain; charset=utf-8',
        'Cache-Control': 'no-cache, no-transform',
        'X-Content-Type-Options': 'nosniff',
      },
    });

  } catch (error) {
    console.error("API Route Error:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
