import { connectDB } from "@/lib/connectDB";
import { getLoginToken } from "@/lib/auth";
import Account from "@/models/accountModel";
import PasswordService from "@/lib/passwordService";
import { logoutAllSessionsExcept } from "@/lib/services/sessionManagementService";
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
  const { currentPassword, newPassword, confirmPassword } = body;

  // Validate input
  if (!currentPassword || !newPassword || !confirmPassword) {
    return Response.json(
      { success: false, error: "All fields are required" },
      { status: 400 }
    );
  }

  if (newPassword !== confirmPassword) {
    return Response.json(
      { success: false, error: "New passwords do not match" },
      { status: 400 }
    );
  }

  if (newPassword.length < 8) {
    return Response.json(
      { success: false, error: "New password must be at least 8 characters" },
      { status: 400 }
    );
  }

  // Get account with password field
  const fullAccount = await Account.findById(account._id).select("+password");
  if (!fullAccount.password) {
    return Response.json(
      { success: false, error: "Account password not set" },
      { status: 400 }
    );
  }

  // Verify current password
  const isPasswordCorrect = await PasswordService.comparePassword(
    currentPassword,
    fullAccount.password
  );
  if (!isPasswordCorrect) {
    return Response.json(
      { success: false, error: "Current password is incorrect" },
      { status: 401 }
    );
  }

  // Hash new password
  const hashedPassword = await PasswordService.hashPassword(newPassword);

  // Update password and history
  const passwordHistory = fullAccount.passwordHistory || [];
  passwordHistory.push({
    hash: fullAccount.password,
    changedAt: new Date(),
  });

  // Keep only last 5 passwords in history
  if (passwordHistory.length > 5) {
    passwordHistory.shift();
  }

  await Account.findByIdAndUpdate(
    account._id,
    {
      password: hashedPassword,
      passwordHistory,
      passwordChangedAt: new Date(),
    }
  );

  // Get current session ID from cookie/header if available
  const currentSessionId = req.headers.get("x-session-id");
  if (currentSessionId) {
    await logoutAllSessionsExcept(account._id, currentSessionId);
  }

  // Log action
  const ip = req.headers.get("x-forwarded-for") || "unknown";
  await logAction(account._id, "PASSWORD_CHANGE", {
    ip,
    metadata: { loggedOutOtherDevices: true },
  });

  return Response.json({
    success: true,
    message: "Password changed successfully. All other sessions have been logged out.",
  });
}
