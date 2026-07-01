/**
 * POST /api/scratches/purchase-pack
 * Purchase a scratch pack (direct DB activation - Razorpay bypass)
 * Body: { packQuantity: 1000|5000|10000|50000 }
 */

import { NextResponse } from "next/server";
import { connectDB } from "@/lib/connectDB";
import { requireAuth } from "@/lib/auth";
import Subscription from "@/models/subscriptionModel";
import ScratchPackOrder from "@/models/scratchPackOrderModel";
import scratchEntitlementService from "@/lib/scratchEntitlementService";
import notificationService from "@/lib/services/notificationService";

// Scratch pack pricing
const SCRATCH_PACK_PRICING = {
  1000: 499,
  5000: 2499,
  10000: 4999,
  50000: 24999,
};
const GST_PERCENTAGE = 18;

export async function POST(request) {
  await connectDB();
  const { account, error: authError } = await requireAuth();
  if (authError) return authError;

  try {
    const body = await request.json();
    const { packQuantity } = body;

    if (!packQuantity || !SCRATCH_PACK_PRICING[packQuantity]) {
      return NextResponse.json(
        { success: false, error: `Invalid pack quantity. Valid options: 1000, 5000, 10000, 50000` },
        { status: 400 }
      );
    }

    const ownerId = account._id;
    const ownerType = account.role?.toLowerCase().includes("distributor") ? "distributor" : "merchant";

    // Get active subscription
    const subscription = await Subscription.findOne({
      ownerId,
      ownerType,
      status: "active"
    });

    if (!subscription) {
      return NextResponse.json(
        { success: false, error: "No active subscription found" },
        { status: 404 }
      );
    }

    // Calculate pricing
    const basePrice = SCRATCH_PACK_PRICING[packQuantity];
    const gstAmount = Math.round((basePrice * GST_PERCENTAGE) / 100);
    const totalPrice = basePrice + gstAmount;

    // Create order (TEMPORARY: Direct activation - Razorpay bypass)
    const packOrder = new ScratchPackOrder({
      ownerId,
      ownerType,
      quantity: packQuantity,
      basePrice,
      gstAmount,
      totalPrice,
      paymentStatus: "completed", // TEMP: Direct activation
      transactionId: `SCRATCH-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      remaining: packQuantity,
      consumed: 0,
      purchasedAt: new Date()
    });

    await packOrder.save();

    // Add to subscription using existing service
    await scratchEntitlementService.addScratchPack(
      subscription._id,
      null, // packId - not used yet
      packQuantity,
      packOrder._id,
      365 // validity in days
    );

    // Send scratch pack purchase notification (email + in-app)
    // Non-blocking - don't throw if notification fails
    notificationService.sendScratchPackPurchaseNotification(
      ownerId,
      ownerType,
      { quantity: packQuantity, totalPrice }
    ).catch((error) => console.error("[Pack Purchase] Notification error:", error));

    console.log(`✓ [Scratches Purchase] ${packQuantity} scratches purchased by ${ownerId}`);

    return NextResponse.json(
      {
        success: true,
        data: {
          orderId: packOrder._id,
          quantity: packQuantity,
          basePrice,
          gstAmount,
          totalPrice,
          transactionId: packOrder.transactionId,
          message: `Successfully purchased ${packQuantity} scratches for ₹${totalPrice}`
        },
      },
      { status: 201 }
    );
  } catch (error) {
    console.error("[Scratches Purchase Pack] Error:", error);
    return NextResponse.json(
      {
        success: false,
        error: error.message || "Failed to purchase scratch pack",
      },
      { status: error.statusCode || 500 }
    );
  }
}
