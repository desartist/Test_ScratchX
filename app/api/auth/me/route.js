import { connectDB } from "@/lib/connectDB";
import { getLoginToken } from "@/lib/auth";

// Never cache — must always reflect the latest account data (e.g. after profile image upload)
export const dynamic = "force-dynamic";

/** Current user profile from session cookie (name, login dates, profile, role). */
export async function GET() {
  await connectDB();

  const account = await getLoginToken();
  console.log("Current user account:", account);

  if (!account) {
    return Response.json(
      { success: false, error: "Unauthorized" },
      { status: 401 },
    );
  }

  return Response.json(
    {
      success: true,
      account: {
        id: account._id,
        name: account.name,
        firstName: account.firstName,
        lastName: account.lastName,
        email: account.email,
        phone: account.phone,
        role: account.role,
        status: account.status,
        profile: account.profile,
        profileImage: account.profileImage || null,
        activePlan: account.activePlan || null,
        subscriptionId: account.subscriptionId || null,
        planPurchaseDate: account.planPurchaseDate || null,
        lastLoginAt: account.lastLoginAt,
        lastLoginIP: account.lastLoginIP,
        createdAt: account.createdAt,
        updatedAt: account.updatedAt,
      },
    },
    { status: 200 },
  );
}
