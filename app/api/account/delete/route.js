import { connectDB } from "@/lib/connectDB";
import { getLoginToken } from "@/lib/auth";
import Account from "@/models/accountModel";
import PasswordService from "@/lib/passwordService";
import { logoutAllSessions } from "@/lib/services/sessionManagementService";
import { logAction } from "@/lib/services/auditLogService";

export async function POST(req) {
  await connectDB();

  const account = await getLoginToken();
  if (!account) {
    return Response.json(
      { success: false, error: "Unauthorized" },
      { status: 401 }
    );
  }

  const body = await req.json();
  const { password } = body;

  if (!password) {
    return Response.json(
      { success: false, error: "Password required for account deletion" },
      { status: 400 }
    );
  }

  // Verify password
  const fullAccount = await Account.findById(account._id).select("+password");
  if (!fullAccount.password) {
    return Response.json(
      { success: false, error: "Cannot delete account without password" },
      { status: 400 }
    );
  }

  const isPasswordCorrect = await PasswordService.comparePassword(password, fullAccount.password);
  if (!isPasswordCorrect) {
    return Response.json(
      { success: false, error: "Password is incorrect" },
      { status: 401 }
    );
  }

  // Soft delete account
  await Account.findByIdAndUpdate(
    account._id,
    {
      isDeleted: true,
      deletedAt: new Date(),
      status: "deactivated",
    }
  );

  // Log action
  const ip = req.headers.get("x-forwarded-for") || "unknown";
  await logAction(account._id, "ACCOUNT_DELETE", {
    ip,
    metadata: { softDelete: true, timestamp: new Date() },
  });

  // Logout all sessions
  await logoutAllSessions(account._id);

  return Response.json({
    success: true,
    message: "Account deleted successfully. You have been logged out.",
    redirect: "/auth/login",
  });
}
