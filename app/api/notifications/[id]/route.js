import { NextResponse } from "next/server";
import { connectDB } from "@/lib/connectDB";
import Notification from "@/models/notificationModel";

export async function DELETE(request, { params }) {
  await connectDB();
  const { id } = await params;
  try {
    await Notification.findByIdAndDelete(id);
    return NextResponse.json({ success: true });
  } catch {
    return NextResponse.json({ success: false }, { status: 500 });
  }
}
