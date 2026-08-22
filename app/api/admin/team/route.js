import { connectDB } from "@/lib/connectDB";
import { requireAuth } from "@/lib/auth";
import Account from "@/models/accountModel";
import { ADMIN_ROLES } from "@/lib/adminPermissions";
import { logAdminAction } from "@/lib/services/platformAuditService";
import bcrypt from "bcrypt";

// Only Super_Admin manages the internal team — an Admin account can never
// invite/deactivate another Admin account, regardless of adminRole.
function superAdminOnly(account) {
  if (account.role !== "Super_Admin") {
    return Response.json({ success: false, error: "Forbidden" }, { status: 403 });
  }
  return null;
}

// GET /api/admin/team — list internal Admin team members
export async function GET(request) {
  await connectDB();
  const { account, error } = await requireAuth();
  if (error) return error;
  const denied = superAdminOnly(account);
  if (denied) return denied;

  const members = await Account.find({ role: "Admin" })
    .select("-password -__v")
    .sort({ createdAt: -1 });

  return Response.json({ success: true, members }, { status: 200 });
}

// POST /api/admin/team — invite a new internal Admin team member
export async function POST(request) {
  await connectDB();
  const { account, error } = await requireAuth();
  if (error) return error;
  const denied = superAdminOnly(account);
  if (denied) return denied;

  const { name, email, phone, password, adminRole } = await request.json();

  if (!name || !email || !password) {
    return Response.json({ success: false, error: "name, email and password are required" }, { status: 400 });
  }
  if (!ADMIN_ROLES.includes(adminRole)) {
    return Response.json(
      { success: false, error: `adminRole must be one of: ${ADMIN_ROLES.join(", ")}` },
      { status: 400 },
    );
  }

  try {
    const hashed = await bcrypt.hash(password, 10);
    const member = await Account.create({
      name,
      email,
      phone,
      password: hashed,
      role: "Admin",
      status: "active",
      createdBy: account._id,
      parentId: account._id,
      isEmailVerified: true,
      emailVerifiedAt: new Date(),
      profile: { adminRole },
    });

    await logAdminAction({
      account,
      module: "Team",
      action: `Invited internal team member (${adminRole})`,
      request,
      targetType: "Account",
      targetId: member._id,
      targetLabel: member.name,
      after: { role: "Admin", adminRole },
    });

    return Response.json(
      {
        success: true,
        member: { _id: member._id, name: member.name, email: member.email, role: member.role, profile: member.profile, status: member.status },
      },
      { status: 201 },
    );
  } catch (err) {
    if (err.code === 11000) {
      return Response.json({ success: false, error: "Email already exists" }, { status: 409 });
    }
    console.error(err);
    return Response.json({ success: false, error: "Internal server error" }, { status: 500 });
  }
}

// PATCH /api/admin/team — deactivate/reactivate a team member, or change
// their adminRole
export async function PATCH(request) {
  await connectDB();
  const { account, error } = await requireAuth();
  if (error) return error;
  const denied = superAdminOnly(account);
  if (denied) return denied;

  const { id, status, adminRole } = await request.json();
  if (!id) {
    return Response.json({ success: false, error: "id is required" }, { status: 400 });
  }

  const previous = await Account.findOne({ _id: id, role: "Admin" }).select("status profile.adminRole name");
  if (!previous) {
    return Response.json({ success: false, error: "Team member not found" }, { status: 404 });
  }

  const updates = {};
  if (status) {
    if (!["active", "inactive", "suspended"].includes(status)) {
      return Response.json({ success: false, error: "Invalid status" }, { status: 400 });
    }
    updates.status = status;
  }
  if (adminRole) {
    if (!ADMIN_ROLES.includes(adminRole)) {
      return Response.json({ success: false, error: "Invalid adminRole" }, { status: 400 });
    }
    updates["profile.adminRole"] = adminRole;
  }

  const member = await Account.findByIdAndUpdate(id, updates, { new: true, select: "-password -__v" });

  await logAdminAction({
    account,
    module: "Team",
    action: "Updated internal team member",
    request,
    targetType: "Account",
    targetId: member._id,
    targetLabel: member.name,
    before: { status: previous.status, adminRole: previous.profile?.adminRole },
    after: { status: member.status, adminRole: member.profile?.adminRole },
  });

  return Response.json({ success: true, member }, { status: 200 });
}
