import { connectDB } from "@/lib/connectDB";
import { getLoginToken } from "@/lib/auth";
import WhatsAppTemplate from "@/models/whatsappTemplateModel";

// PATCH /api/whatsapp/templates/:id — update a template (owner only)
export async function PATCH(request, { params }) {
  await connectDB();

  const account = await getLoginToken();
  if (!account) {
    return Response.json({ success: false, error: "Unauthorized" }, { status: 401 });
  }

  const { id } = await params;
  const { name, message, imageUrl } = await request.json();

  const update = {};
  if (name !== undefined) {
    if (!name.trim()) {
      return Response.json({ success: false, error: "Template name is required" }, { status: 400 });
    }
    update.name = name.trim();
  }
  if (message !== undefined) {
    if (!message.trim()) {
      return Response.json({ success: false, error: "Template message is required" }, { status: 400 });
    }
    update.message = message;
  }
  if (imageUrl !== undefined) {
    update.imageUrl = imageUrl || null;
  }

  const template = await WhatsAppTemplate.findOneAndUpdate(
    { _id: id, accountId: account._id },
    { $set: update },
    { new: true },
  );

  if (!template) {
    return Response.json({ success: false, error: "Template not found" }, { status: 404 });
  }

  return Response.json({ success: true, template }, { status: 200 });
}

// DELETE /api/whatsapp/templates/:id — delete a template (owner only)
export async function DELETE(request, { params }) {
  await connectDB();

  const account = await getLoginToken();
  if (!account) {
    return Response.json({ success: false, error: "Unauthorized" }, { status: 401 });
  }

  const { id } = await params;

  const result = await WhatsAppTemplate.deleteOne({ _id: id, accountId: account._id });
  if (result.deletedCount === 0) {
    return Response.json({ success: false, error: "Template not found" }, { status: 404 });
  }

  return Response.json({ success: true }, { status: 200 });
}
