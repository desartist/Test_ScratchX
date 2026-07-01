import { requireAuth } from "@/lib/auth";
import { connectDB } from "@/lib/connectDB";
import Subscription from "@/models/subscriptionModel";
import SubscriptionPlan from "@/models/subscriptionPlanModel";
import Notification from "@/models/notificationModel";
import scratchEntitlementService from "@/lib/scratchEntitlementService";
import { sendPlanPurchaseEmail } from "@/lib/emailService";

/**
 * POST /api/billing/activate-plan
 *
 * Activate a subscription plan for a merchant/distributor.
 * On first purchase, automatically grant unlimited scratches for 90 days.
 *
 * Request body:
 * {
 *   planId: "507f1f77bcf86cd799439011",
 *   billingCycle: "monthly" | "annual"
 * }
 *
 * Response:
 * {
 *   success: true,
 *   subscriptionId: "...",
 *   planName: "ScratchX Smart",
 *   unlimitedScratches: {
 *     isActive: true,
 *     validUntil: "2026-08-09",
 *     daysRemaining: 90
 *   },
 *   message: "Plan activated successfully. Unlimited scratches active for 90 days."
 * }
 */
export async function POST(request) {
  try {
    await connectDB();
    const { account, error } = await requireAuth();
    if (error) return error;

    const { planId, billingCycle = "monthly" } = await request.json();

    // ========== VALIDATION ==========
    if (!planId) {
      return Response.json(
        {
          success: false,
          error: "planId is required",
        },
        { status: 400 }
      );
    }

    if (!["monthly", "annual"].includes(billingCycle)) {
      return Response.json(
        {
          success: false,
          error: "billingCycle must be 'monthly' or 'annual'",
        },
        { status: 400 }
      );
    }

    // ========== GET PLAN ==========
    const plan = await SubscriptionPlan.findById(planId);
    if (!plan) {
      return Response.json(
        {
          success: false,
          error: "Plan not found",
        },
        { status: 404 }
      );
    }

    if (!plan.isActive) {
      return Response.json(
        {
          success: false,
          error: "This plan is no longer available",
        },
        { status: 400 }
      );
    }

    // ========== DETERMINE OWNER TYPE ==========
    const ownerType = account.role === "Distributor" ? "distributor" : "merchant";

    // ========== CHECK EXISTING SUBSCRIPTION ==========
    const existingSubscription = await Subscription.findOne({
      ownerId: account._id,
      ownerType,
    });

    const now = new Date();
    let isFirstPurchase = false;
    let subscription;

    if (existingSubscription) {
      // UPDATE EXISTING SUBSCRIPTION
      subscription = await Subscription.findByIdAndUpdate(
        existingSubscription._id,
        {
          $set: {
            planId: plan._id,
            status: "active",
            billingCycle,
            currentPeriodStart: now,
            currentPeriodEnd: new Date(
              now.getTime() +
                (billingCycle === "annual"
                  ? 365 * 24 * 60 * 60 * 1000
                  : 30 * 24 * 60 * 60 * 1000)
            ),
          },
        },
        { new: true }
      );
    } else {
      // CREATE NEW SUBSCRIPTION
      isFirstPurchase = true;
      subscription = new Subscription({
        ownerId: account._id,
        ownerType,
        planId: plan._id,
        status: "active",
        billingCycle,
        currentPeriodStart: now,
        currentPeriodEnd: new Date(
          now.getTime() +
            (billingCycle === "annual"
              ? 365 * 24 * 60 * 60 * 1000
              : 30 * 24 * 60 * 60 * 1000)
        ),
      });
      await subscription.save();
    }

    // ========== ACTIVATE UNLIMITED SCRATCHES (FIRST PURCHASE ONLY) ==========
    let unlimitedStatus = null;
    if (isFirstPurchase) {
      unlimitedStatus = await scratchEntitlementService.activateUnlimitedScratches(
        subscription._id
      );

      // Create notification for plan purchase
      try {
        await Notification.create({
          ownerType,
          ownerId: account._id,
          type: "plan_purchased",
          title: "Plan Activated",
          message: `${plan.displayName} activated successfully. Unlimited scratches active for 90 days.`,
          severity: "info",
          actionUrl: "/dashboard",
          actionText: "Go to Dashboard",
          read: false,
        });
      } catch (notifError) {
        console.error("Error creating notification:", notifError);
      }

      // Send plan purchase email
      try {
        await sendPlanPurchaseEmail(
          account.email,
          account.name,
          plan.displayName,
          90
        );
      } catch (emailError) {
        console.error("Error sending plan purchase email:", emailError);
        // Don't fail the purchase if email fails
      }
    }

    // ========== RESPONSE ==========
    return Response.json(
      {
        success: true,
        subscriptionId: subscription._id,
        planName: plan.name,
        planDisplayName: plan.displayName,
        billingCycle,
        currentPeriodStart: subscription.currentPeriodStart,
        currentPeriodEnd: subscription.currentPeriodEnd,
        isFirstPurchase,
        unlimitedScratches: isFirstPurchase
          ? {
              isActive: true,
              validUntil: unlimitedStatus.validUntil,
              daysRemaining: unlimitedStatus.daysRemaining,
            }
          : null,
        message: isFirstPurchase
          ? `${plan.displayName} activated successfully. Unlimited scratches active for 90 days.`
          : `Plan updated to ${plan.displayName}`,
      },
      { status: 201 }
    );
  } catch (error) {
    console.error("Plan activation error:", error);
    return Response.json(
      {
        success: false,
        error: error.message || "Failed to activate plan",
      },
      { status: 500 }
    );
  }
}
