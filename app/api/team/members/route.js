import { connectDB } from "@/lib/connectDB";
import { requireAuth } from "@/lib/auth";
import Account from "@/models/accountModel";

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
