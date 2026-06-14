import { requireAuth } from "@/lib/auth";
import { connectDB } from "@/lib/connectDB.js";

export async function GET() {
  await connectDB();

  const { account, error } = await requireAuth();
  if (error) return error;

  return Response.json({ success: true, account }, { status: 200 });
}
