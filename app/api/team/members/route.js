import { connectDB } from "@/lib/connectDB";
import { requireAuth } from "@/lib/auth";
import Account from "@/models/accountModel";
import crypto from "crypto";

/**
 * GET /api/team/members
 * Fetch all team members (managers) for the authenticated merchant
 */
export async function GET() {
  try {
    await connectDB();
    const { account, error } = await requireAuth();
    if (error) return error;

    // For merchants: fetch all managers where parentId === account._id
    // For managers: fetch team members at same level (store staff, etc.)
    let query = {};

    if (account.role === "Merchant") {
      // Fetch managers created by this merchant
      query = {
        parentId: account._id,
        role: "Manager",
      };
    } else if (account.role === "Manager") {
      // Fetch staff created by this manager
      query = {
        parentId: account._id,
        role: { $in: ["Store_Manager", "Store_Staff"] },
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

    // Only merchants can create managers
    if (account.role !== "Merchant") {
      return Response.json(
        { success: false, error: "Only merchants can create team members" },
        { status: 403 }
      );
    }

    const body = await request.json();
    const { name, email, phone, password } = body;

    if (!name || !email || !phone || !password) {
      return Response.json(
        { success: false, error: "Name, email, phone, and password are required" },
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
    const hashedPassword = crypto
      .createHash("sha256")
      .update(password)
      .digest("hex");

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

    // Verify the member belongs to this account
    const member = await Account.findOne({
      _id: memberId,
      parentId: account._id,
      role: "Manager",
    });

    if (!member) {
      return Response.json(
        { success: false, error: "Team member not found" },
        { status: 404 }
      );
    }

    // Check if new email already exists (if changing email)
    if (email && email.toLowerCase() !== member.email) {
      const existingEmail = await Account.findOne({ email: email.toLowerCase() });
      if (existingEmail) {
        return Response.json(
          { success: false, error: "Email already in use" },
          { status: 400 }
        );
      }
      member.email = email.toLowerCase();
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

    // Verify the member belongs to this account and is a manager
    const member = await Account.findOne({
      _id: memberId,
      parentId: account._id,
      role: "Manager",
    });

    if (!member) {
      return Response.json(
        { success: false, error: "Team member not found" },
        { status: 404 }
      );
    }

    // Delete the member
    await Account.deleteOne({ _id: memberId });

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
