import { Storage } from "@google-cloud/storage";
import { NextResponse } from "next/server";
import crypto from "crypto";

export async function POST(req) {
  try {
    const { contentType, extension } = await req.json();

    const storage = new Storage();
    const bucketName = process.env.GCP_PROJECT_ID + "-gemini-bucket";
    const bucket = storage.bucket(bucketName);

    // Ensure bucket exists with proper CORS for client-side upload
    const [exists] = await bucket.exists();
    if (!exists) {
      await storage.createBucket(bucketName, {
        location: "us-central1",
        cors: [
          {
            origin: ["*"],
            method: ["GET", "PUT", "POST", "OPTIONS"],
            responseHeader: ["Content-Type"],
            maxAgeSeconds: 3600,
          },
        ],
      });
    } else {
        // Just in case CORS is missing on an existing bucket
        await bucket.setCorsConfiguration([
          {
            origin: ["*"],
            method: ["GET", "PUT", "POST", "OPTIONS"],
            responseHeader: ["Content-Type"],
            maxAgeSeconds: 3600,
          },
        ]);
    }

    const uniqueId = crypto.randomUUID();
    const fileName = `uploads/${Date.now()}-${uniqueId}.${extension}`;
    const file = bucket.file(fileName);

    const [signedUrl] = await file.getSignedUrl({
      version: "v4",
      action: "write",
      expires: Date.now() + 15 * 60 * 1000, // 15 minutes
      contentType: contentType,
    });

    const fileUri = `gs://${bucketName}/${fileName}`;

    return NextResponse.json({ signedUrl, fileUri });
  } catch (error) {
    console.error("Upload Error:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
