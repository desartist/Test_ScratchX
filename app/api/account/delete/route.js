import { connectDB } from "@/lib/connectDB";
import { requireAuth } from "@/lib/auth";
import { cookies } from "next/headers";
import Account from "@/models/accountModel";
import PasswordService from "@/lib/passwordService";
import { logoutAllSessions } from "@/lib/services/sessionManagementService";
import { logAction } from "@/lib/services/auditLogService";

export async function POST(req) {
  await connectDB();

  const { account, error } = await requireAuth();
  if (error || !account) {
    return Response.json(
      { success: false, error: error || "Unauthorized" },
      { status: 401 }
    );
  }

  const body = await req.json();
  const { password } = body;

  if (!password) {
    return Response.json(
      { success: false, error: "Password required for account deactivation" },
      { status: 400 }
    );
  }

  // Verify password
  const fullAccount = await Account.findById(account._id).select("+password");
  if (!fullAccount.password) {
    return Response.json(
      { success: false, error: "Cannot deactivate account without password" },
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

  // Deactivate account (soft delete) — preserves all data
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
  await logAction(account._id, "ACCOUNT_DEACTIVATE", {
    ip,
    metadata: { deactivated: true, dataPreserved: true, timestamp: new Date() },
  });

  // Logout all sessions
  await logoutAllSessions(account._id);

  // Clear all auth cookies
  const cookieStore = await cookies();
  const cookiesToClear = [
    "authToken",
    "refreshToken",
    "sessionId",
    "accountId",
    "accountRole",
    "userEmail",
    "merchantHasStore",
  ];

  const response = Response.json({
    success: true,
    message: "Account deactivated successfully. Your data is preserved. You have been logged out.",
    redirect: "/auth/login",
  });

  // Delete each cookie
  cookiesToClear.forEach((cookieName) => {
    response.cookies.delete(cookieName);
  });

  return response;
}
