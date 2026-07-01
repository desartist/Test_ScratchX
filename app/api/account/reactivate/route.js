import { connectDB } from "@/lib/connectDB";
import Account from "@/models/accountModel";
import PasswordService from "@/lib/passwordService";
import { logAction } from "@/lib/services/auditLogService";

export async function POST(req) {
  await connectDB();

  const body = await req.json();
  const { email, password } = body;

  if (!email || !password) {
    return Response.json(
      { success: false, error: "Email and password are required" },
      { status: 400 }
    );
  }

  const normalizedEmail = email.toLowerCase().trim();
  const account = await Account.findOne({ email: normalizedEmail }).select("+password");

  if (!account) {
    return Response.json(
      { success: false, error: "Account not found" },
      { status: 404 }
    );
  }

  // Check if account is actually deactivated
  if (account.status !== "deactivated") {
    return Response.json(
      { success: false, error: "This account is not deactivated" },
      { status: 400 }
    );
  }

  // Verify password
  if (!account.password) {
    return Response.json(
      { success: false, error: "Cannot reactivate account without password" },
      { status: 400 }
    );
  }

  const isPasswordCorrect = await PasswordService.comparePassword(password, account.password);
  if (!isPasswordCorrect) {
    return Response.json(
      { success: false, error: "Password is incorrect" },
      { status: 401 }
    );
  }

  // Reactivate account
  await Account.findByIdAndUpdate(
    account._id,
    {
      isDeleted: false,
      deletedAt: null,
      status: "active",
    }
  );

  // Log action
  const ip = req.headers.get("x-forwarded-for") || "unknown";
  await logAction(account._id, "ACCOUNT_REACTIVATE", {
    ip,
    metadata: { reactivated: true, timestamp: new Date() },
  });

  return Response.json({
    success: true,
    message: "Account reactivated successfully. You can now log in.",
  });
}
