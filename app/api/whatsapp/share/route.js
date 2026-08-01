import { connectDB } from "@/lib/connectDB";
import { getLoginToken } from "@/lib/auth";
import WhatsAppShare from "@/models/whatsappShareModel";

/**
 * POST /api/whatsapp/share
 * Fire-and-forget analytics record — written right before the client opens
 * the wa.me link. Does not affect whether the WhatsApp redirect happens.
 */
export async function POST(req) {
  await connectDB();

  const account = await getLoginToken();
  if (!account) {
    return Response.json({ success: false, error: "Unauthorized" }, { status: 401 });
  }

  const body = await req.json();
  const { recipientType, customerId, businessId, campaignId, phone, message, imageUrl } = body;

  if (!recipientType || !["customer", "business"].includes(recipientType)) {
    return Response.json(
      { success: false, error: "recipientType must be 'customer' or 'business'" },
      { status: 400 }
    );
  }
  if (!phone || !message) {
    return Response.json(
      { success: false, error: "phone and message are required" },
      { status: 400 }
    );
  }

  const share = await WhatsAppShare.create({
    accountId: account._id,
    recipientType,
    customerId: customerId || null,
    businessId: businessId || null,
    campaignId: campaignId || null,
    phone,
    message,
    imageUrl: imageUrl || null,
  });

  return Response.json({ success: true, id: share._id }, { status: 201 });
}
