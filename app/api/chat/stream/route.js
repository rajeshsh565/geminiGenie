import ai from "@/geminiModel";
import { NextResponse } from "next/server";
import { Storage } from "@google-cloud/storage";
import crypto from "crypto";
import fs from "fs";

async function uploadBase64ToGCS(base64Data, mimeType) {
    const storage = new Storage();
    const bucketName = process.env.GCP_PROJECT_ID + "-gemini-bucket";
    const bucket = storage.bucket(bucketName);
    const uniqueId = crypto.randomUUID();
    const ext = mimeType.split('/')[1] || 'png';
    const fileName = `generated/${Date.now()}-${uniqueId}.${ext}`;
    const file = bucket.file(fileName);
    
    const buffer = Buffer.from(base64Data, 'base64');
    await file.save(buffer, { contentType: mimeType });
    return `gs://${bucketName}/${fileName}`;
}

export async function POST(req) {
  try {
    const { messages, query, thinkingLevel, model, imageConfig } = await req.json();

    const config = {
      tools: [
        {
          googleSearch: {}
        }
      ],
      safetySettings: [
        { category: "HARM_CATEGORY_SEXUALLY_EXPLICIT", threshold: "BLOCK_NONE" },
        { category: "HARM_CATEGORY_HATE_SPEECH", threshold: "BLOCK_NONE" },
        { category: "HARM_CATEGORY_HARASSMENT", threshold: "BLOCK_NONE" },
        { category: "HARM_CATEGORY_DANGEROUS_CONTENT", threshold: "BLOCK_NONE" }
      ]
    };

    if (model && (model.includes('image'))) {
      config.responseModalities = ["TEXT", "IMAGE"];
    }

    if (imageConfig) {
      Object.assign(config, imageConfig);
    }

    if (model === 'imagen-3.0-generate-002') {
       const res = await ai.models.generateImages({
           model: 'imagen-3.0-generate-002',
           prompt: query.find(q => q.text)?.text || "generate image",
           config: {
              numberOfImages: 1,
              outputMimeType: 'image/jpeg',
              aspectRatio: imageConfig?.aspectRatio || '1:1',
              safetySettings: [{ category: 'HARM_CATEGORY_SEXUALLY_EXPLICIT', threshold: 'BLOCK_NONE' }]
           }
       });
       
       const stream = new ReadableStream({
         async start(controller) {
           const encoder = new TextEncoder();
           if (res && res.generatedImages && res.generatedImages.length > 0) {
             const img = res.generatedImages[0];
             try {
                const gcsUri = await uploadBase64ToGCS(img.image.imageBytes, img.image.mimeType);
                const md = `\n![Generated Image](/api/image?uri=${encodeURIComponent(gcsUri)})\n`;
                controller.enqueue(encoder.encode(md));
             } catch(e) {
                console.error("GCS Upload Error:", e);
                controller.enqueue(encoder.encode("Error uploading generated image to storage."));
             }
           } else {
             controller.enqueue(encoder.encode("Failed to generate image."));
           }
           controller.close();
         }
       });
       return new NextResponse(stream, { headers: { 'Content-Type': 'text/plain; charset=utf-8' } });
    }

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
          // Initialize log file
          fs.writeFileSync("gemini_raw_log.txt", `\n--- NEW REQUEST AT ${new Date().toISOString()} ---\n`);
          for await (const chunk of result) {
            // DUMP RAW CHUNK TO FILE FOR DEBUGGING
            try {
               fs.appendFileSync("gemini_raw_log.txt", JSON.stringify(chunk, null, 2) + "\n\n");
            } catch(err) {
               console.error("File write error:", err);
            }

            if (chunk.usageMetadata) {
              lastUsage = chunk.usageMetadata;
            }
            
            let chunkOutput = "";
            const candidate = chunk.candidates?.[0];
            
            if (candidate?.finishReason && candidate.finishReason !== "STOP") {
               chunkOutput += `\n\n> ⚠️ **Generation Stopped (${candidate.finishReason})**: ${candidate.finishMessage || "The model refused to generate the output due to safety filters."}\n\n`;
            }

            const parts = candidate?.content?.parts || [];
            if (parts.length > 0) {
              for (const part of parts) {
                if (part.text) {
                  chunkOutput += part.text;
                } else if (part.inlineData) {
                  console.log("Intercepted inlineData image, uploading to GCS...");
                  try {
                    const gcsUri = await uploadBase64ToGCS(part.inlineData.data, part.inlineData.mimeType);
                    console.log("Successfully uploaded to:", gcsUri);
                    chunkOutput += `\n\n![Generated Image](/api/image?uri=${encodeURIComponent(gcsUri)})\n\n`;
                  } catch(e) {
                    console.error("GCS Upload Error:", e);
                    chunkOutput += "\n\n[Error uploading generated image to storage]\n\n";
                  }
                } else {
                  // Fallback for unknown part types (fileData, executableCode, etc)
                  console.log("Unknown part type:", Object.keys(part));
                  chunkOutput += `\n\n[Raw Model Part: ${JSON.stringify(part)}]\n\n`;
                }
              }
            } else if (chunk.text) {
              chunkOutput += chunk.text;
            }

            if (chunkOutput) {
               if (isFirstChunk) {
                  isFirstChunk = false;
               }
              controller.enqueue(encoder.encode(chunkOutput));
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
