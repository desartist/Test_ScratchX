import { connectDB } from "@/lib/connectDB";
import { getLoginToken } from "@/lib/auth";
import Account from "@/models/accountModel";

const MAX_SIZE_BYTES = 500 * 1024; // 500 KB base64 string limit

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

  // Validate data URL format
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

  // Check size of the base64 payload (everything after the comma)
  const base64Data = imageData.split(",")[1];
  const sizeBytes = Math.ceil((base64Data.length * 3) / 4);
  if (sizeBytes > MAX_SIZE_BYTES) {
    return Response.json(
      { success: false, error: "Image too large. Maximum size is 500 KB." },
      { status: 400 }
    );
  }

  await Account.findByIdAndUpdate(account._id, { $set: { profileImage: imageData } });

  return Response.json({ success: true, profileImage: imageData });
}

export async function DELETE(req) {
  await connectDB();

  const account = await getLoginToken();
  if (!account) {
    return Response.json({ success: false, error: "Unauthorized" }, { status: 401 });
  }

  await Account.findByIdAndUpdate(account._id, { $set: { profileImage: null } });

  return Response.json({ success: true });
}
