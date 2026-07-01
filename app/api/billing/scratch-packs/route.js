import { requireAuth } from "@/lib/auth";
import { connectDB } from "@/lib/connectDB";
import ScratchPack from "@/models/scratchPackModel";

/**
 * GET /api/billing/scratch-packs
 *
 * Get all available scratch packs for purchase.
 * Packs are sorted by sortOrder and isPopular.
 *
 * Response:
 * {
 *   success: true,
 *   packs: [
 *     {
 *       _id: "...",
 *       name: "5K",
 *       quantity: 5000,
 *       price: { amount: 49999, currency: "INR" },
 *       discount: { percentage: 10, amountSaved: 5000 },
 *       isPopular: true,
 *       isBestValue: false,
 *       costPerUnit: 10,
 *       validityDays: 365
 *     },
 *     ...
 *   ]
 * }
 */
export async function GET(request) {
  try {
    await connectDB();
    const { account, error } = await requireAuth();
    if (error) return error;

    // ========== FETCH ACTIVE PACKS ==========
    const packs = await ScratchPack.find({ isActive: true })
      .select(
        "name quantity price discount isPopular isBestValue costPerUnit validityDays sortOrder"
      )
      .sort({ isPopular: -1, sortOrder: 1 });

    return Response.json(
      {
        success: true,
        packs: packs.map((pack) => ({
          _id: pack._id,
          name: pack.name,
          quantity: pack.quantity,
          price: pack.price,
          discount: pack.discount,
          isPopular: pack.isPopular,
          isBestValue: pack.isBestValue,
          costPerUnit: pack.costPerUnit,
          validityDays: pack.validityDays,
        })),
      },
      { status: 200 }
    );
  } catch (error) {
    console.error("Fetch scratch packs error:", error);
    return Response.json(
      {
        success: false,
        error: error.message || "Failed to fetch scratch packs",
      },
      { status: 500 }
    );
  }
}
