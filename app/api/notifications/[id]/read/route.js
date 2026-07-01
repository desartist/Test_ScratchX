import { NextResponse } from "next/server";
import { connectDB } from "@/lib/connectDB";
import Notification from "@/models/notificationModel";

export async function POST(request, { params }) {
  await connectDB();
  const { id } = await params;
  try {
    await Notification.findByIdAndUpdate(id, { read: true, readAt: new Date() });
    return NextResponse.json({ success: true });
  } catch {
    return NextResponse.json({ success: false }, { status: 500 });
  }
}
