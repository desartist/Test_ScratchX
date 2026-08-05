import { connectDB } from "@/lib/connectDB";
import { requireAuth } from "@/lib/auth";
import InventoryService from "@/lib/inventoryService";
import { NotFoundError } from "@/lib/errors";

const STORE_TEAM_ROLES = ["Store_Manager", "Store_Staff"];

/**
 * GET /api/store-inventory
 * Read-only scratch-card inventory status for the authenticated
 * Store_Manager/Store_Staff's own store (allocated/used/redeemed/remaining,
 * per campaign). Both roles see the same data — inventory:allocate has no
 * store-level write semantics yet.
 */
export async function GET() {
  try {
    await connectDB();
    const { account, error } = await requireAuth();
    if (error) return error;

    if (!STORE_TEAM_ROLES.includes(account.role)) {
      return Response.json(
        { success: false, error: "This page is for store team accounts only" },
        { status: 403 }
      );
    }

    if (!account.storeId) {
      return Response.json(
        { success: false, error: "No store is assigned to this account. Contact your business owner." },
        { status: 404 }
      );
    }

    const status = await InventoryService.getStoreInventoryStatus(account.storeId);

    return Response.json({ success: true, ...status }, { status: 200 });
  } catch (err) {
    console.error("Error fetching store inventory:", err);
    if (err instanceof NotFoundError) {
      return Response.json({ success: false, error: err.message }, { status: 404 });
    }
    return Response.json(
      { success: false, error: "Failed to fetch inventory" },
      { status: 500 }
    );
  }
}
