import { connectDB } from "@/lib/connectDB";
import { getLoginToken } from "@/lib/auth";
import WhatsAppTemplate from "@/models/whatsappTemplateModel";

// GET /api/whatsapp/templates — list the logged-in account's own templates
export async function GET() {
  await connectDB();

  const account = await getLoginToken();
  if (!account) {
    return Response.json({ success: false, error: "Unauthorized" }, { status: 401 });
  }

  const templates = await WhatsAppTemplate.find({ accountId: account._id })
    .sort({ createdAt: -1 })
    .lean();

  return Response.json({ success: true, templates }, { status: 200 });
}

// POST /api/whatsapp/templates — create a template
export async function POST(request) {
  await connectDB();

  const account = await getLoginToken();
  if (!account) {
    return Response.json({ success: false, error: "Unauthorized" }, { status: 401 });
  }

  const { name, message, imageUrl } = await request.json();

  if (!name || !name.trim()) {
    return Response.json({ success: false, error: "Template name is required" }, { status: 400 });
  }
  if (!message || !message.trim()) {
    return Response.json({ success: false, error: "Template message is required" }, { status: 400 });
  }

  const template = await WhatsAppTemplate.create({
    accountId: account._id,
    name: name.trim(),
    message,
    imageUrl: imageUrl || null,
  });

  return Response.json({ success: true, template }, { status: 201 });
}
