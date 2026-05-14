import { Storage } from "@google-cloud/storage";
import { NextResponse } from "next/server";

export async function GET(req) {
  try {
    const { searchParams } = new URL(req.url);
    const uri = searchParams.get("uri");
    if (!uri || !uri.startsWith("gs://")) {
      return new NextResponse("Invalid URI", { status: 400 });
    }

    const bucketName = uri.split("/")[2];
    const fileName = uri.split("/").slice(3).join("/");

    const storage = new Storage();
    const bucket = storage.bucket(bucketName);
    const file = bucket.file(fileName);

    const [exists] = await file.exists();
    if (!exists) {
      return new NextResponse("File not found", { status: 404 });
    }

    const [metadata] = await file.getMetadata();
    const stream = file.createReadStream();

    return new NextResponse(stream, {
      headers: {
        "Content-Type": metadata.contentType || "application/octet-stream",
        "Cache-Control": "public, max-age=31536000",
      },
    });
  } catch (error) {
    console.error("Image fetch error:", error);
    return new NextResponse(error.message, { status: 500 });
  }
}
