import crypto from "crypto";
import { connectDB } from "@/lib/connectDB";
import { getLoginToken } from "@/lib/auth";
import WhatsAppImage from "@/models/whatsappImageModel";

const MAX_SIZE_BYTES = 500 * 1024; // 500 KB base64 string limit — same cap as profile images
const EXPIRY_DAYS = 30;

export async function POST(req) {
  await connectDB();

  const account = await getLoginToken();
  if (!account) {
    return Response.json({ success: false, error: "Unauthorized" }, { status: 401 });
  }

  const body = await req.json();
  const { imageData } = body;

  if (!imageData) {
    return Response.json({ success: false, error: "No image data provided" }, { status: 400 });
  }

  if (!imageData.startsWith("data:image/")) {
    return Response.json({ success: false, error: "Invalid image format" }, { status: 400 });
  }

  const mimeMatch = imageData.match(/^data:(image\/(?:jpeg|png|webp|gif));base64,/);
  if (!mimeMatch) {
    return Response.json(
      { success: false, error: "Only JPEG, PNG, WebP, and GIF are allowed" },
      { status: 400 }
    );
  }

  const base64Data = imageData.split(",")[1];
  const sizeBytes = Math.ceil((base64Data.length * 3) / 4);
  if (sizeBytes > MAX_SIZE_BYTES) {
    return Response.json(
      { success: false, error: "Image too large. Maximum size is 500 KB." },
      { status: 400 }
    );
  }

  const token = crypto.randomBytes(24).toString("hex");
  const expiresAt = new Date(Date.now() + EXPIRY_DAYS * 24 * 60 * 60 * 1000);

  await WhatsAppImage.create({
    token,
    imageData,
    mimeType: mimeMatch[1],
    createdBy: account._id,
    expiresAt,
  });

  const baseUrl = process.env.APP_URL || "http://localhost:3000";
  return Response.json({
    success: true,
    url: `${baseUrl}/api/whatsapp/image/${token}`,
  });
}
