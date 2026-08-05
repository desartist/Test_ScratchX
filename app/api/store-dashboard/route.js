import { connectDB } from "@/lib/connectDB";
import { requireAuth } from "@/lib/auth";
import Account from "@/models/accountModel";
import Store from "@/models/storeModel";
import { PERMISSIONS } from "@/lib/permissions";

const STORE_TEAM_ROLES = ["Store_Manager", "Store_Staff"];

/**
 * GET /api/store-dashboard
 * Landing-page data for a Store_Manager/Store_Staff account: the specific
 * store they're assigned to, their teammates at that store, and what their
 * role is actually permitted to do (lib/permissions.js).
 */
export async function GET() {
  try {
    await connectDB();
    const { account, error } = await requireAuth();
    if (error) return error;

    if (!STORE_TEAM_ROLES.includes(account.role)) {
      return Response.json(
        { success: false, error: "This dashboard is for store team accounts only" },
        { status: 403 }
      );
    }

    if (!account.storeId) {
      return Response.json(
        { success: false, error: "No store is assigned to this account. Contact your business owner." },
        { status: 404 }
      );
    }

    const store = await Store.findOne({ _id: account.storeId, isDeleted: false });
    if (!store) {
      return Response.json(
        { success: false, error: "Assigned store not found" },
        { status: 404 }
      );
    }

    const teammates = await Account.find({
      storeId: account.storeId,
      role: { $in: STORE_TEAM_ROLES },
      status: { $ne: "deactivated" },
    })
      .select("name email role status lastLoginAt")
      .sort({ role: 1, name: 1 });

    return Response.json(
      {
        success: true,
        role: account.role,
        permissions: PERMISSIONS[account.role] || [],
        store: {
          _id: store._id,
          name: store.store_name,
          address: store.address,
          city: store.city,
          state: store.state,
          pincode: store.pincode,
          contactPerson: store.contact_person,
          contactNumber: store.contact_number,
          status: store.status,
        },
        teammates: teammates
          .filter((t) => String(t._id) !== String(account._id))
          .map((t) => ({
            _id: t._id,
            name: t.name || t.email,
            email: t.email,
            role: t.role,
            status: t.status,
            lastLoginAt: t.lastLoginAt,
          })),
      },
      { status: 200 }
    );
  } catch (err) {
    console.error("Error fetching store dashboard:", err);
    return Response.json(
      { success: false, error: "Failed to load store dashboard" },
      { status: 500 }
    );
  }
}
