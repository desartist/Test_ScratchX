import { connectDB } from "@/lib/connectDB";
import { requireAuth } from "@/lib/auth";
import Account from "@/models/accountModel";
import Store from "@/models/storeModel";
import { getStoreTeamLimitStatus, assertCanAddTeamMember } from "@/lib/services/teamLimitService";
import passwordService from "@/lib/passwordService";
import { sendTeamMemberInviteEmail } from "@/lib/emailService";

const STORE_TEAM_ROLES = ["Store_Manager", "Store_Staff"];
const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

/**
 * GET /api/team/members
 * Fetch all team members (managers) for the authenticated merchant
 */
export async function GET(request) {
  try {
    await connectDB();
    const { account, error } = await requireAuth();
    if (error) return error;

    const url = new URL(request.url);
    const storeId = url.searchParams.get("storeId");

    // Per-store Store_Manager/Store_Staff listing (business-model/plan-gated team)
    if (storeId) {
      if (account.role !== "Merchant") {
        return Response.json(
          { success: false, error: "Not authorized to manage store team" },
          { status: 403 }
        );
      }

      const store = await Store.findOne({
        _id: storeId,
        merchant_id: account._id,
        isDeleted: false,
      });
      if (!store) {
        return Response.json(
          { success: false, error: "Store not found" },
          { status: 404 }
        );
      }

      const [members, limitStatus] = await Promise.all([
        Account.find({
          storeId: store._id,
          role: { $in: STORE_TEAM_ROLES },
          status: { $ne: "deactivated" },
        })
          .select("name email phone role status createdAt lastLoginAt")
          .sort({ createdAt: -1 }),
        getStoreTeamLimitStatus(account, store),
      ]);

      return Response.json(
        {
          success: true,
          members: members.map((m) => ({
            _id: m._id,
            name: m.name || m.email,
            email: m.email,
            phone: m.phone,
            role: m.role,
            status: m.status,
            createdAt: m.createdAt,
            lastLoginAt: m.lastLoginAt,
          })),
          count: members.length,
          limitStatus,
        },
        { status: 200 }
      );
    }

    // For merchants: fetch all managers where parentId === account._id
    // For managers: fetch team members at same level (store staff, etc.)
    let query = {};

    if (account.role === "Merchant") {
      // Fetch managers created by this merchant
      query = {
        parentId: account._id,
        role: "Manager",
        status: { $ne: "deactivated" },
      };
    } else if (account.role === "Manager") {
      // Fetch staff created by this manager
      query = {
        parentId: account._id,
        role: { $in: ["Store_Manager", "Store_Staff"] },
        status: { $ne: "deactivated" },
      };
    } else {
      // Not authorized to manage team
      return Response.json(
        { success: false, error: "Not authorized to manage team" },
        { status: 403 }
      );
    }

    // Fetch team members
    const members = await Account.find(query)
      .select(
        "name email phone role status createdAt lastLoginAt profile.storeName"
      )
      .sort({ createdAt: -1 });

    return Response.json(
      {
        success: true,
        members: members.map((m) => ({
          _id: m._id,
          name: m.name || m.email,
          email: m.email,
          phone: m.phone,
          role: m.role,
          status: m.status,
          createdAt: m.createdAt,
          lastLoginAt: m.lastLoginAt,
          storeName: m.profile?.storeName,
        })),
        count: members.length,
      },
      { status: 200 }
    );
  } catch (err) {
    console.error("Error fetching team members:", err);
    return Response.json(
      {
        success: false,
        error: "Failed to fetch team members",
      },
      { status: 500 }
    );
  }
}

/**
 * POST /api/team/members
 * Create a new team member (Manager) with parentId set to the authenticated user
 */
export async function POST(request) {
  try {
    await connectDB();
    const { account, error } = await requireAuth();
    if (error) return error;

    const body = await request.json();

    // Per-store Store_Manager/Store_Staff creation (business-model/plan-gated team)
    if (body.role) {
      if (account.role !== "Merchant") {
        return Response.json(
          { success: false, error: "Only business owners can create store team members" },
          { status: 403 }
        );
      }

      const { name, email, phone, password, role, storeId } = body;

      if (!STORE_TEAM_ROLES.includes(role)) {
        return Response.json(
          { success: false, error: "Role must be Store_Manager or Store_Staff" },
          { status: 400 }
        );
      }

      if (!name || !email || !phone || !password || !storeId) {
        return Response.json(
          { success: false, error: "Name, email, phone, password, and storeId are required" },
          { status: 400 }
        );
      }

      if (!EMAIL_PATTERN.test(email)) {
        return Response.json(
          { success: false, error: "Please enter a valid email address" },
          { status: 400 }
        );
      }

      if (!/^\d{10}$/.test(phone)) {
        return Response.json(
          { success: false, error: "Phone number must be exactly 10 digits" },
          { status: 400 }
        );
      }

      const store = await Store.findOne({
        _id: storeId,
        merchant_id: account._id,
        isDeleted: false,
      });
      if (!store) {
        return Response.json(
          { success: false, error: "Store not found" },
          { status: 404 }
        );
      }

      const existingAccount = await Account.findOne({ email: email.toLowerCase() });
      if (existingAccount) {
        return Response.json(
          { success: false, error: "Email already exists" },
          { status: 400 }
        );
      }

      try {
        await assertCanAddTeamMember(account, store, role);
      } catch (limitErr) {
        if (limitErr.code === "TEAM_LIMIT_REACHED") {
          return Response.json(
            { success: false, error: limitErr.message, limitStatus: limitErr.limitStatus },
            { status: 403 }
          );
        }
        throw limitErr;
      }

      const hashedPassword = await passwordService.hashPassword(password);

      const newMember = new Account({
        name,
        email: email.toLowerCase(),
        phone,
        password: hashedPassword,
        role,
        parentId: account._id,
        storeId: store._id,
        status: "active",
        profile: {},
      });

      await newMember.save();

      try {
        await sendTeamMemberInviteEmail(newMember.email, newMember.name, newMember.role, store.store_name);
      } catch (emailError) {
        console.error("Error sending team member invite email:", emailError);
        // Don't fail account creation if the email fails
      }

      return Response.json(
        {
          success: true,
          message: "Team member created successfully",
          member: {
            _id: newMember._id,
            name: newMember.name,
            email: newMember.email,
            phone: newMember.phone,
            role: newMember.role,
            status: newMember.status,
            createdAt: newMember.createdAt,
          },
        },
        { status: 201 }
      );
    }

    // Legacy flow: Merchant creates the account-wide Manager role (unscoped, unchanged)
    // Only merchants can create managers
    if (account.role !== "Merchant") {
      return Response.json(
        { success: false, error: "Only merchants can create team members" },
        { status: 403 }
      );
    }

    const { name, email, phone, password } = body;

    if (!name || !email || !phone || !password) {
      return Response.json(
        { success: false, error: "Name, email, phone, and password are required" },
        { status: 400 }
      );
    }

    if (!EMAIL_PATTERN.test(email)) {
      return Response.json(
        { success: false, error: "Please enter a valid email address" },
        { status: 400 }
      );
    }

    // Check if email already exists
    const existingAccount = await Account.findOne({ email: email.toLowerCase() });
    if (existingAccount) {
      return Response.json(
        { success: false, error: "Email already exists" },
        { status: 400 }
      );
    }

    // Hash password
    const hashedPassword = await passwordService.hashPassword(password);

    // Create new team member
    const newTeamMember = new Account({
      name,
      email: email.toLowerCase(),
      phone,
      password: hashedPassword,
      role: "Manager",
      parentId: account._id,
      status: "active",
      profile: {},
    });

    await newTeamMember.save();

    return Response.json(
      {
        success: true,
        message: "Team member created successfully",
        member: {
          _id: newTeamMember._id,
          name: newTeamMember.name,
          email: newTeamMember.email,
          phone: newTeamMember.phone,
          role: newTeamMember.role,
          status: newTeamMember.status,
          createdAt: newTeamMember.createdAt,
        },
      },
      { status: 201 }
    );
  } catch (err) {
    console.error("Error creating team member:", err);
    return Response.json(
      {
        success: false,
        error: err.message || "Failed to create team member",
      },
      { status: 500 }
    );
  }
}

/**
 * PUT /api/team/members/[memberId]
 * Update a team member's details
 */
export async function PUT(request) {
  try {
    await connectDB();
    const { account, error } = await requireAuth();
    if (error) return error;

    const body = await request.json();
    const { memberId, name, email, phone } = body;

    if (!memberId) {
      return Response.json(
        { success: false, error: "Member ID is required" },
        { status: 400 }
      );
    }

    // Verify the member belongs to this account (global Manager or per-store team)
    const member = await Account.findOne({
      _id: memberId,
      parentId: account._id,
      role: { $in: ["Manager", ...STORE_TEAM_ROLES] },
    });

    if (!member) {
      return Response.json(
        { success: false, error: "Team member not found" },
        { status: 404 }
      );
    }

    // Check if new email already exists (if changing email)
    if (email && email.toLowerCase() !== member.email) {
      if (!EMAIL_PATTERN.test(email)) {
        return Response.json(
          { success: false, error: "Please enter a valid email address" },
          { status: 400 }
        );
      }
      const existingEmail = await Account.findOne({ email: email.toLowerCase() });
      if (existingEmail) {
        return Response.json(
          { success: false, error: "Email already in use" },
          { status: 400 }
        );
      }
      member.email = email.toLowerCase();
    }

    if (phone && !/^\d{10}$/.test(phone)) {
      return Response.json(
        { success: false, error: "Phone number must be exactly 10 digits" },
        { status: 400 }
      );
    }

    if (name) member.name = name;
    if (phone) member.phone = phone;

    await member.save();

    return Response.json(
      {
        success: true,
        message: "Team member updated successfully",
        member: {
          _id: member._id,
          name: member.name,
          email: member.email,
          phone: member.phone,
          role: member.role,
          status: member.status,
        },
      },
      { status: 200 }
    );
  } catch (err) {
    console.error("Error updating team member:", err);
    return Response.json(
      {
        success: false,
        error: err.message || "Failed to update team member",
      },
      { status: 500 }
    );
  }
}

/**
 * DELETE /api/team/members/[memberId]
 * Delete a team member
 */
export async function DELETE(request) {
  try {
    await connectDB();
    const { account, error } = await requireAuth();
    if (error) return error;

    const url = new URL(request.url);
    const memberId = url.searchParams.get("memberId");

    if (!memberId) {
      return Response.json(
        { success: false, error: "Member ID is required" },
        { status: 400 }
      );
    }

    // Verify the member belongs to this account (global Manager or per-store team)
    const member = await Account.findOne({
      _id: memberId,
      parentId: account._id,
      role: { $in: ["Manager", ...STORE_TEAM_ROLES] },
    });

    if (!member) {
      return Response.json(
        { success: false, error: "Team member not found" },
        { status: 404 }
      );
    }

    // Soft-delete: deactivate rather than hard-delete. Hard-deleting would
    // orphan every reference to this account (any staff created under it
    // via parentId, campaign assignedStores[].assignedBy/lastModifiedBy,
    // sessions, notifications, audit log entries). Deactivated accounts
    // are blocked from logging in (lib/auth.js requires status "active")
    // and are excluded from the team listing below.
    await Account.updateOne(
      { _id: memberId },
      { status: "deactivated" }
    );

    return Response.json(
      {
        success: true,
        message: "Team member deleted successfully",
      },
      { status: 200 }
    );
  } catch (err) {
    console.error("Error deleting team member:", err);
    return Response.json(
      {
        success: false,
        error: err.message || "Failed to delete team member",
      },
      { status: 500 }
    );
  }
}
