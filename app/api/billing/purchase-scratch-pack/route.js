import { requireAuth } from "@/lib/auth";
import { connectDB } from "@/lib/connectDB";
import Subscription from "@/models/subscriptionModel";
import ScratchPack from "@/models/scratchPackModel";
import ScratchPackOrder from "@/models/scratchPackOrderModel";
import scratchEntitlementService from "@/lib/scratchEntitlementService";
import { sendScratchPackPurchaseEmail } from "@/lib/emailService";

/**
 * POST /api/billing/purchase-scratch-pack
 *
 * Temporary scratch pack purchase endpoint (direct bypass without Razorpay)
 *
 * Request body:
 * {
 *   packId: "507f1f77bcf86cd799439011",
 *   quantity: 5000
 * }
 *
 * Response:
 * {
 *   success: true,
 *   orderId: "...",
 *   message: "5000 scratches added successfully",
 *   scratchStatus: { ... }
 * }
 */
export async function POST(request) {
  try {
    await connectDB();
    const { account, error } = await requireAuth();
    if (error) return error;

    const { packId, quantity } = await request.json();

    // ========== VALIDATION ==========
    if (!packId || !quantity) {
      return Response.json(
        {
          success: false,
          error: "packId and quantity are required",
        },
        { status: 400 }
      );
    }

    // ========== GET PACK DETAILS ==========
    const scratchPack = await ScratchPack.findById(packId);
    if (!scratchPack) {
      return Response.json(
        {
          success: false,
          error: "Scratch pack not found",
        },
        { status: 404 }
      );
    }

    if (!scratchPack.isActive) {
      return Response.json(
        {
          success: false,
          error: "This scratch pack is no longer available",
        },
        { status: 400 }
      );
    }

    if (scratchPack.quantity !== quantity) {
      return Response.json(
        {
          success: false,
          error: `Invalid quantity. Pack contains ${scratchPack.quantity} scratches`,
        },
        { status: 400 }
      );
    }

    // ========== GET SUBSCRIPTION ==========
    const ownerType = account.role === "Distributor" ? "distributor" : "merchant";
    const subscription = await Subscription.findOne({
      ownerId: account._id,
      ownerType,
      status: { $in: ["trial", "active"] },
    });

    if (!subscription) {
      return Response.json(
        {
          success: false,
          error: "No active subscription found",
        },
        { status: 400 }
      );
    }

    // ========== CREATE ORDER ==========
    const now = new Date();
    const validityDays = scratchPack.validityDays || 365;
    const validUntil = new Date(now.getTime() + validityDays * 24 * 60 * 60 * 1000);

    // Calculate price with discount if applicable
    let finalAmount = scratchPack.price.amount;
    let discountPercentage = 0;
    let discountAmount = 0;

    if (
      scratchPack.discount?.percentage > 0 &&
      (!scratchPack.discount.validUntil ||
        scratchPack.discount.validUntil > now)
    ) {
      discountPercentage = scratchPack.discount.percentage;
      discountAmount = Math.round(
        (scratchPack.price.amount * discountPercentage) / 100
      );
      finalAmount = scratchPack.price.amount - discountAmount;
    }

    // Create order record
    const order = new ScratchPackOrder({
      ownerType,
      ownerId: account._id,
      subscriptionId: subscription._id,
      packId: scratchPack._id,
      scratchQuantity: quantity,
      price: {
        amount: scratchPack.price.amount,
        currency: scratchPack.price.currency,
      },
      discount: {
        percentage: discountPercentage,
        amountSaved: discountAmount,
      },
      finalAmount,
      paymentStatus: "success", // TEMPORARY BYPASS - Mark as success immediately
      paymentMethod: "direct", // Using direct method (will be razorpay)
      transactionId: `DIRECT-${Date.now()}`,
      paidAt: now,
      validFrom: now,
      validUntil,
      daysValid: validityDays,
      remaining: quantity,
      status: "active",
    });

    await order.save();

    // ========== ADD SCRATCHES TO SUBSCRIPTION ==========
    await scratchEntitlementService.addScratchPack(
      subscription._id,
      scratchPack._id,
      quantity,
      order._id,
      validityDays
    );

    // Update pack sales stats
    await ScratchPack.updateOne(
      { _id: scratchPack._id },
      {
        $inc: {
          totalPurchases: 1,
          totalQuantitySold: quantity,
        },
      }
    );

    // ========== GET UPDATED SCRATCH STATUS ==========
    const scratchStatus = await scratchEntitlementService.getDashboardStatus(
      account._id,
      ownerType
    );

    // ========== SEND CONFIRMATION EMAIL ==========
    try {
      const priceInRupees = (finalAmount / 100).toFixed(2);
      await sendScratchPackPurchaseEmail(
        account.email,
        account.name,
        quantity,
        priceInRupees
      );
    } catch (emailError) {
      console.error("Error sending purchase confirmation email:", emailError);
      // Don't fail the purchase if email fails
    }

    // ========== RESPONSE ==========
    return Response.json(
      {
        success: true,
        message: `${quantity.toLocaleString()} scratches added successfully`,
        orderId: order._id,
        orderDetails: {
          amount: finalAmount,
          currency: scratchPack.price.currency,
          scratches: quantity,
          validUntil: validUntil.toISOString(),
          daysValid: validityDays,
        },
        scratchStatus,
      },
      { status: 200 }
    );
  } catch (error) {
    console.error("Scratch pack purchase error:", error);
    return Response.json(
      {
        success: false,
        error: error.message || "Failed to purchase scratch pack",
      },
      { status: 500 }
    );
  }
}
