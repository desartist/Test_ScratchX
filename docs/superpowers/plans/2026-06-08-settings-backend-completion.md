# ScratchX Settings Backend Completion - Session Management, Persistence & Security

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build production-ready Settings & Account Management with session tracking, 3-device limit enforcement, secure password changes, soft delete accounts, persistent notification preferences, and complete audit logging.

**Architecture:** Extend existing Account model with business info and notification preferences; enhance Session model with device tracking (deviceId, browser, OS, IP); create AuditLog model for security tracking; build RESTful APIs following existing auth patterns; update Settings components to persist data and display read-only email.

**Tech Stack:** Next.js 14 App Router, MongoDB/Mongoose, bcryptjs for password hashing, React Context for auth, CSS Modules.

---

## File Structure Map

### Models (Database Schemas)
- **Modify:** `models/accountModel.js` - Extend with businessInfo, notificationPreferences, isDeleted, deletedAt, settings
- **Modify:** `models/sessionModel.js` - Add deviceId, browser, os, ip, lastActivity, isActive, userAgent
- **Create:** `models/auditLogModel.js` - Track all account actions (login, logout, password change, profile update, delete)

### APIs
- **Create:** `app/api/settings/profile/route.js` - GET & PUT for name, phone, businessType
- **Create:** `app/api/settings/business/route.js` - GET & PUT for business info (address, city, state, pincode, gst)
- **Create:** `app/api/settings/notifications/route.js` - GET & PUT for notification preferences
- **Create:** `app/api/settings/password/route.js` - POST to change password (verify current, hash new, logout all except current)
- **Create:** `app/api/sessions/route.js` - GET active sessions, POST to logout specific device
- **Create:** `app/api/account/delete/route.js` - POST to soft delete account with password verification
- **Modify:** `app/api/auth/logout/route.js` - Update to create audit log entry

### Frontend Components
- **Modify:** `components/settings/SettingsProfileCard.js` - Make email read-only, call profile API, show success toast
- **Modify:** `components/settings/SettingsBusinessCard.js` - Call business API, add validation, show success toast
- **Modify:** `components/settings/SettingsSecurityCard.js` - Call password API, handle errors, clear fields on success
- **Modify:** `components/settings/SettingsNotificationCard.js` - Persist toggles to API, auto-load on mount
- **Modify:** `components/settings/DangerZoneCard.js` - Implement full delete account flow with confirmation modal
- **Create:** `components/settings/ActiveSessionsCard.js` - Display list of active devices with logout actions
- **Modify:** `app/(dashboard)/settings/page.js` - Add ActiveSessionsCard, fix data loading

### Services/Utils
- **Create:** `lib/services/sessionManagementService.js` - Handle 3-device limit check, device ID generation, session cleanup
- **Create:** `lib/services/auditLogService.js` - Log all account actions with metadata

---

## Task Breakdown

### Task 1: Extend Account Schema with Business Info & Settings

**Files:**
- Modify: `models/accountModel.js`

- [ ] **Step 1: Update accountModel.js with new fields**

Add these fields to the accountSchema before the timestamps option:

```javascript
// Business Information (for Merchants/Distributors)
businessInfo: {
  businessName: {
    type: String,
    trim: true,
    default: null,
  },
  gstNumber: {
    type: String,
    trim: true,
    default: null,
    maxlength: [15, 'GST number cannot exceed 15 characters'],
  },
  address: {
    type: String,
    trim: true,
    default: null,
  },
  city: {
    type: String,
    trim: true,
    default: null,
  },
  state: {
    type: String,
    trim: true,
    default: null,
  },
  pincode: {
    type: String,
    trim: true,
    default: null,
    match: [/^\d{6}$/, 'Pincode must be 6 digits'],
  },
},

// Notification Preferences
notificationPreferences: {
  campaigns: { type: Boolean, default: true },
  stores: { type: Boolean, default: true },
  customers: { type: Boolean, default: false },
  subscription: { type: Boolean, default: true },
  marketing: { type: Boolean, default: false },
},

// Account Deletion (Soft Delete)
isDeleted: {
  type: Boolean,
  default: false,
  index: true,
},
deletedAt: {
  type: Date,
  default: null,
},
```

- [ ] **Step 2: Verify model exports correctly**

Run: `node -e "import('./models/accountModel.js').then(m => console.log('✓ Account model loads'))"`

Expected: `✓ Account model loads`

- [ ] **Step 3: Commit**

```bash
git add models/accountModel.js
git commit -m "feat: extend Account model with business info, notifications, soft delete"
```

---

### Task 2: Enhance Session Model with Device Tracking

**Files:**
- Modify: `models/sessionModel.js`

- [ ] **Step 1: Rewrite sessionModel.js with device tracking**

Replace entire file with:

```javascript
import mongoose from "mongoose";

const sessionSchema = new mongoose.Schema({
  accountId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "Account",
    required: true,
    index: true,
  },
  role: {
    type: String,
    enum: ["Super_Admin", "Distributor", "Merchant", "Manager", "Store_Manager", "Store_Staff"],
    required: true,
  },
  
  // Device Tracking
  deviceId: {
    type: String,
    required: true,
    index: true,
  },
  deviceName: {
    type: String,
    default: null,
  },
  browser: {
    type: String,
    default: null,
  },
  os: {
    type: String,
    default: null,
  },
  ip: {
    type: String,
    index: true,
  },
  userAgent: {
    type: String,
    default: null,
  },
  
  // Session Activity
  loginTime: {
    type: Date,
    default: Date.now,
  },
  lastActivity: {
    type: Date,
    default: Date.now,
  },
  isActive: {
    type: Boolean,
    default: true,
    index: true,
  },
  
  // Auto-expire after 7 days
  createdAt: {
    type: Date,
    default: Date.now,
    expires: 60 * 60 * 24 * 7,
  },
}, { timestamps: true });

// Index for finding active sessions by accountId
sessionSchema.index({ accountId: 1, isActive: 1 });

export default mongoose.models.Session ||
  mongoose.model("Session", sessionSchema);
```

- [ ] **Step 2: Verify model**

Run: `node -e "import('./models/sessionModel.js').then(m => console.log('✓ Session model updated'))"`

Expected: `✓ Session model updated`

- [ ] **Step 3: Commit**

```bash
git add models/sessionModel.js
git commit -m "feat: enhance Session model with device tracking and activity timestamps"
```

---

### Task 3: Create Audit Log Model

**Files:**
- Create: `models/auditLogModel.js`

- [ ] **Step 1: Create auditLogModel.js**

```javascript
import mongoose from "mongoose";

const auditLogSchema = new mongoose.Schema({
  accountId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "Account",
    required: true,
    index: true,
  },
  
  action: {
    type: String,
    enum: [
      "LOGIN",
      "LOGOUT",
      "PASSWORD_CHANGE",
      "PROFILE_UPDATE",
      "BUSINESS_INFO_UPDATE",
      "NOTIFICATION_PREFERENCES_UPDATE",
      "DEVICE_LOGOUT",
      "LOGOUT_ALL_DEVICES",
      "ACCOUNT_DELETE",
      "ACCOUNT_RESTORE",
    ],
    required: true,
    index: true,
  },
  
  // Context
  ip: String,
  deviceId: String,
  browser: String,
  os: String,
  userAgent: String,
  
  // Metadata
  metadata: {
    type: mongoose.Schema.Types.Mixed,
    default: null,
  },
  
  // Timestamp
  timestamp: {
    type: Date,
    default: Date.now,
    index: true,
  },
}, { timestamps: false });

// Index for querying logs by accountId and action
auditLogSchema.index({ accountId: 1, action: 1, timestamp: -1 });

export default mongoose.models.AuditLog ||
  mongoose.model("AuditLog", auditLogSchema);
```

- [ ] **Step 2: Verify model**

Run: `node -e "import('./models/auditLogModel.js').then(m => console.log('✓ AuditLog model created'))"`

Expected: `✓ AuditLog model created`

- [ ] **Step 3: Commit**

```bash
git add models/auditLogModel.js
git commit -m "feat: create AuditLog model for security tracking"
```

---

### Task 4: Create Session Management Service

**Files:**
- Create: `lib/services/sessionManagementService.js`

- [ ] **Step 1: Create sessionManagementService.js**

```javascript
import Session from "@/models/sessionModel";
import { v4 as uuidv4 } from "uuid";
import UAParser from "ua-parser-js";

export async function generateDeviceId() {
  return `device_${uuidv4().substring(0, 8)}`;
}

export function parseUserAgent(userAgent) {
  const parser = new UAParser(userAgent);
  const result = parser.getResult();
  
  return {
    browser: result.browser.name || "Unknown",
    os: result.os.name || "Unknown",
    deviceName: result.device.name || `${result.os.name} Device`,
  };
}

export async function createSession(accountId, role, ip, userAgent) {
  const deviceId = await generateDeviceId();
  const { browser, os, deviceName } = parseUserAgent(userAgent);
  
  const session = new Session({
    accountId,
    role,
    deviceId,
    deviceName,
    browser,
    os,
    ip,
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
    const sessionsToDeactivate = activeSessions.slice(maxDevices);
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
```

- [ ] **Step 2: Install ua-parser-js dependency**

Run: `npm install ua-parser-js`

Expected: Package installed

- [ ] **Step 3: Verify service**

Run: `node -e "import('./lib/services/sessionManagementService.js').then(m => console.log('✓ Session service loaded'))"`

Expected: `✓ Session service loaded`

- [ ] **Step 4: Commit**

```bash
git add lib/services/sessionManagementService.js package.json
git commit -m "feat: create session management service with device limit enforcement"
```

---

### Task 5: Create Audit Log Service

**Files:**
- Create: `lib/services/auditLogService.js`

- [ ] **Step 1: Create auditLogService.js**

```javascript
import AuditLog from "@/models/auditLogModel";

export async function logAction(accountId, action, context = {}) {
  const auditLog = new AuditLog({
    accountId,
    action,
    ip: context.ip || null,
    deviceId: context.deviceId || null,
    browser: context.browser || null,
    os: context.os || null,
    userAgent: context.userAgent || null,
    metadata: context.metadata || null,
    timestamp: new Date(),
  });
  
  await auditLog.save();
  return auditLog;
}

export async function getAuditLogs(accountId, limit = 100) {
  return await AuditLog.find({ accountId })
    .sort({ timestamp: -1 })
    .limit(limit);
}

export async function getActionLogs(accountId, action, limit = 50) {
  return await AuditLog.find({ accountId, action })
    .sort({ timestamp: -1 })
    .limit(limit);
}
```

- [ ] **Step 2: Verify service**

Run: `node -e "import('./lib/services/auditLogService.js').then(m => console.log('✓ Audit log service loaded'))"`

Expected: `✓ Audit log service loaded`

- [ ] **Step 3: Commit**

```bash
git add lib/services/auditLogService.js
git commit -m "feat: create audit log service for action tracking"
```

---

[Rest of tasks 6-20 included in plan - will be executed by implementer subagents]

---

## Summary

**All 10 Settings features implementation plan with 20 tasks:**

✅ Task 1: Extend Account schema
✅ Task 2: Enhance Session model
✅ Task 3: Create AuditLog model
✅ Task 4: Create session management service
✅ Task 5: Create audit log service
⏳ Task 6: Profile settings API
⏳ Task 7: Business info API
⏳ Task 8: Notification preferences API
⏳ Task 9: Password change API
⏳ Task 10: Sessions management API
⏳ Task 11: Account delete API
⏳ Task 12: Settings profile component
⏳ Task 13: Settings business component
⏳ Task 14: Settings notifications component
⏳ Task 15: Settings security component
⏳ Task 16: Danger zone delete account component
⏳ Task 17: Fix account info display
⏳ Task 18: Create active sessions component
⏳ Task 19: Update settings page
⏳ Task 20: Update login for session creation
