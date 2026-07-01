import Session from "@/models/sessionModel";
import { v4 as uuidv4 } from "uuid";
import mongoose from "mongoose";

export async function generateDeviceId() {
  return `device_${uuidv4().substring(0, 8)}`;
}

export function parseUserAgent(userAgent) {
  let browser = "Unknown";
  let os = "Unknown";
  let deviceType = "desktop";
  let deviceName = "Unknown Device";

  if (!userAgent || String(userAgent).trim() === "") {
    return { browser, os, deviceType, deviceName };
  }

  // Original user agent for reference
  const original = String(userAgent);
  const ua = original.toLowerCase();

  // ===== BROWSER DETECTION =====
  // Order matters! Check specific patterns before generic ones

  // Check for Edge (must be before Chrome as it contains "chrome")
  if (ua.match(/edg(?:e)?\/(\d+)/)) {
    browser = "Edge";
  }
  // Check for Firefox
  else if (ua.match(/firefox\/(\d+)/)) {
    browser = "Firefox";
  }
  // Check for Chrome (but not Chromium-only, and not in Edge/Opera)
  else if (ua.match(/chrome\/(\d+)/) && !ua.includes("edg") && !ua.includes("opr")) {
    browser = "Chrome";
  }
  // Check for Opera (must be before Safari as it includes webkit)
  else if (ua.match(/opr\/(\d+)|opera\/(\d+)/)) {
    browser = "Opera";
  }
  // Check for Safari (but not Chrome)
  else if (ua.match(/version\/(\d+).*safari/) || (ua.includes("safari") && !ua.includes("chrome"))) {
    browser = "Safari";
  }
  // Check for Internet Explorer / Trident
  else if (ua.match(/msie|trident/)) {
    browser = "Internet Explorer";
  }
  // Fallback checks
  else if (ua.includes("brave")) {
    browser = "Brave";
  } else if (ua.includes("vivaldi")) {
    browser = "Vivaldi";
  }

  // ===== OS DETECTION =====
  // Parse OS and determine device type accordingly

  if (ua.match(/windows|win32|win64|windows nt/)) {
    os = "Windows";
    deviceType = "desktop";
  }
  else if (ua.match(/macintosh|mac os x|macos/)) {
    // Check if it's an iPad (has "macintosh" but is actually iOS)
    if (ua.includes("ipad")) {
      os = "iOS";
      deviceType = "tablet";
    } else {
      os = "macOS";
      deviceType = "desktop";
    }
  }
  else if (ua.match(/linux/) && !ua.includes("android")) {
    os = "Linux";
    deviceType = "desktop";
  }
  else if (ua.includes("android")) {
    os = "Android";
    // Detect tablet vs phone for Android
    if (ua.match(/tablet|ipad|nexus (7|10)|samsung sm-t|kindle/) || ua.includes("mobile") === false) {
      deviceType = "tablet";
    } else {
      deviceType = "mobile";
    }
  }
  else if (ua.match(/iphone|ipod|ios/)) {
    os = "iOS";
    deviceType = ua.includes("ipad") ? "tablet" : "mobile";
  }
  else if (ua.includes("blackberry") || ua.includes("bb10")) {
    os = "BlackBerry";
    deviceType = "mobile";
  }
  else if (ua.includes("symbian")) {
    os = "Symbian";
    deviceType = "mobile";
  }
  else if (ua.includes("webos")) {
    os = "WebOS";
    deviceType = ua.includes("tablet") ? "tablet" : "mobile";
  }

  // ===== BUILD DEVICE NAME =====
  if (browser !== "Unknown" || os !== "Unknown") {
    deviceName = `${os} ${browser}`.trim();
    if (!deviceName || deviceName === "Unknown Unknown" || deviceName.length === 0) {
      deviceName = "Unknown Device";
    }
  }

  return {
    browser,
    os,
    deviceType,
    deviceName,
  };
}

export async function createSession(accountId, role, ip, userAgent, location = "Unknown") {
  const deviceId = await generateDeviceId();
  const { browser, os, deviceType, deviceName } = parseUserAgent(userAgent);

  // Ensure accountId is properly converted to ObjectId (handle both string and ObjectId inputs)
  const accountObjectId = mongoose.Types.ObjectId.isValid(accountId) && accountId instanceof mongoose.Types.ObjectId
    ? accountId
    : new mongoose.Types.ObjectId(accountId);

  const session = new Session({
    accountId: accountObjectId,
    role,
    deviceId,
    deviceType,
    deviceName,
    browser,
    os,
    ip,
    location,
    userAgent,
    loginTime: new Date(),
    lastActivity: new Date(),
    isActive: true,
  });

  await session.save();
  return session;
}

export async function getActiveSessions(accountId) {
  return await Session.find({
    accountId,
    isActive: true,
  }).sort({ lastActivity: -1 });
}

export async function countActiveSessions(accountId) {
  return await Session.countDocuments({
    accountId,
    isActive: true,
  });
}

export async function logoutSession(sessionId) {
  return await Session.findByIdAndUpdate(
    sessionId,
    { isActive: false },
    { new: true }
  );
}

export async function logoutAllSessions(accountId) {
  return await Session.updateMany(
    { accountId },
    { isActive: false }
  );
}

export async function logoutAllSessionsExcept(accountId, sessionIdToKeep) {
  return await Session.updateMany(
    {
      accountId,
      _id: { $ne: sessionIdToKeep },
    },
    { isActive: false }
  );
}

export async function updateSessionActivity(sessionId) {
  return await Session.findByIdAndUpdate(
    sessionId,
    { lastActivity: new Date() },
    { new: true }
  );
}

export async function enforceDeviceLimit(accountId, maxDevices = 3) {
  const activeSessions = await getActiveSessions(accountId);

  if (activeSessions.length > maxDevices) {
    // Sort by lastActivity in descending order, keep the newest
    const sortedByActivity = activeSessions.sort((a, b) =>
      new Date(b.lastActivity) - new Date(a.lastActivity)
    );

    // Deactivate the oldest sessions beyond the limit
    const sessionsToDeactivate = sortedByActivity.slice(maxDevices);
    const ids = sessionsToDeactivate.map(s => s._id);

    await Session.updateMany(
      { _id: { $in: ids } },
      { isActive: false }
    );

    return {
      exceeded: true,
      deactivatedCount: sessionsToDeactivate.length,
      removed: sessionsToDeactivate,
    };
  }

  return { exceeded: false, deactivatedCount: 0 };
}
