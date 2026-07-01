import { connectDB } from "@/lib/connectDB";
import { getLoginToken } from "@/lib/auth";
import { cookies } from "next/headers";
import { getActiveSessions, logoutSession, logoutAllSessionsExcept } from "@/lib/services/sessionManagementService";
import { logAction } from "@/lib/services/auditLogService";

export async function GET(req) {
  await connectDB();

  const account = await getLoginToken();
  if (!account) {
    return Response.json(
      { success: false, error: "Unauthorized" },
      { status: 401 }
    );
  }

  // Get current session ID from cookie
  const cookieStore = await cookies();
  const currentSessionId = cookieStore.get("sessionId")?.value;

  const activeSessions = await getActiveSessions(account._id);

  const formattedSessions = activeSessions.map(session => ({
    id: session._id.toString(),
    deviceType: session.deviceType || "desktop",
    deviceName: session.deviceName || "Unknown Device",
    location: session.location || "Unknown Location",
    browser: session.browser || "Unknown",
    os: session.os || "Unknown",
    ip: session.ip,
    loginTime: session.loginTime,
    lastActive: session.lastActivity, // Match component expectation
    isCurrent: currentSessionId && session._id.toString() === currentSessionId,
  }));

  return Response.json({
    success: true,
    sessions: formattedSessions,
    count: formattedSessions.length,
  });
}

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
  const { sessionId, action } = body;

  if (!sessionId || !action) {
    return Response.json(
      { success: false, error: "sessionId and action required" },
      { status: 400 }
    );
  }

  // Get current session ID from cookie
  const cookieStore = await cookies();
  const currentSessionId = cookieStore.get("sessionId")?.value;

  if (action === "logout") {
    // Prevent logging out current session
    if (sessionId === currentSessionId) {
      return Response.json(
        { success: false, error: "Cannot logout current session from this endpoint. Use /api/auth/logout instead." },
        { status: 400 }
      );
    }

    const session = await logoutSession(sessionId);

    if (!session) {
      return Response.json(
        { success: false, error: "Session not found" },
        { status: 404 }
      );
    }

    // Log action
    const ip = req.headers.get("x-forwarded-for") || "unknown";
    await logAction(account._id, "DEVICE_LOGOUT", {
      ip,
      metadata: { loggedOutDevice: session.deviceName },
    });

    return Response.json({
      success: true,
      message: "Device logged out successfully",
    });
  }

  if (action === "logout-all-others") {
    if (!currentSessionId) {
      return Response.json(
        { success: false, error: "Current session ID not found" },
        { status: 400 }
      );
    }

    await logoutAllSessionsExcept(account._id, currentSessionId);

    // Log action
    const ip = req.headers.get("x-forwarded-for") || "unknown";
    await logAction(account._id, "LOGOUT_ALL_DEVICES", {
      ip,
      metadata: { exceptCurrent: true },
    });

    return Response.json({
      success: true,
      message: "All other sessions logged out",
    });
  }

  return Response.json(
    { success: false, error: "Invalid action" },
    { status: 400 }
  );
}
