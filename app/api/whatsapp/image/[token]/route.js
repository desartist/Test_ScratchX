import { connectDB } from "@/lib/connectDB";
import WhatsAppImage from "@/models/whatsappImageModel";

/**
 * GET /api/whatsapp/image/:token
 * Public (no auth) — the recipient's browser/WhatsApp fetches this link
 * directly, so it must serve raw image bytes, not JSON.
 */
export async function GET(request, { params }) {
  await connectDB();

  const { token } = await params;
  const record = await WhatsAppImage.findOne({ token }).lean();

  if (!record) {
    return new Response("Image not found", { status: 404 });
  }

  const base64Data = record.imageData.split(",")[1];
  const buffer = Buffer.from(base64Data, "base64");

  return new Response(buffer, {
    status: 200,
    headers: {
      "Content-Type": record.mimeType,
      "Content-Disposition": "inline",
      "Cache-Control": "public, max-age=2592000, immutable", // 30 days, matches TTL
    },
  });
}
