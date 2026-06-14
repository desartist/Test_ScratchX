import { connectDB } from "@/lib/connectDB";
import Subscription from "@/models/subscriptionModel";
import ScratchPackOrder from "@/models/scratchPackOrderModel";
import scratchEntitlementService from "@/lib/scratchEntitlementService";
import Notification from "@/models/notificationModel";
import {
  sendExpiryWarningEmail,
  sendEntitlementExpiredEmail,
} from "@/lib/emailService";
import Account from "@/models/accountModel";

/**
 * Resolve a human-friendly name for email greetings.
 * Accounts created via signup populate firstName/lastName, not `name`.
 */
function resolveName(account) {
  if (account.name) return account.name;
  const full = [account.firstName, account.lastName].filter(Boolean).join(" ").trim();
  return full || "there";
}

/**
 * Scratch Expiry Cron Job
 *
 * Runs daily to:
 * 1. Deactivate unlimited scratches that have expired
 * 2. Send expiry warnings (15, 7, 3, 1 days before)
 * 3. Mark expired scratch packs as expired
 * 4. Create notifications for users
 */
export async function scratchExpiryCronJob() {
  try {
    await connectDB();

    console.log("[CRON] Starting scratch expiry job...");

    const now = new Date();

    // ========== HANDLE EXPIRED UNLIMITED SCRATCHES ==========
    const expiredUnlimitedCount = await handleExpiredUnlimitedScratches(now);
    console.log(
      `[CRON] Deactivated ${expiredUnlimitedCount} expired unlimited scratches`
    );

    // ========== SEND EXPIRY WARNINGS ==========
    const warningCount = await sendExpiryWarnings(now);
    console.log(`[CRON] Sent ${warningCount} expiry warnings`);

    // ========== MARK EXPIRED SCRATCH PACKS ==========
    const expiredPackCount = await markExpiredScratchPacks(now);
    console.log(`[CRON] Marked ${expiredPackCount} scratch packs as expired`);

    console.log("[CRON] Scratch expiry job completed successfully");

    return {
      success: true,
      expiredUnlimited: expiredUnlimitedCount,
      warnings: warningCount,
      expiredPacks: expiredPackCount,
    };
  } catch (error) {
    console.error("[CRON] Scratch expiry job failed:", error);
    throw error;
  }
}

/**
 * Deactivate unlimited scratches that have expired
 */
async function handleExpiredUnlimitedScratches(now) {
  const expired = await Subscription.find({
    status: { $in: ["active", "trial"] },
    "unlimitedScratches.isActive": true,
    "unlimitedScratches.validUntil": { $lt: now },
  });

  let count = 0;

  for (const subscription of expired) {
    // Deactivate
    await Subscription.updateOne(
      { _id: subscription._id },
      {
        $set: {
          "unlimitedScratches.isActive": false,
        },
      }
    );

    // Create notification
    try {
      await Notification.create({
        ownerType: subscription.ownerType,
        ownerId: subscription.ownerId,
        type: "scratch_expired",
        title: "Scratches Expired",
        message:
          "Your unlimited scratches have expired. Campaign operations are now restricted. Purchase a scratch pack to continue.",
        severity: "critical",
        actionUrl: "/billing/scratch-packs",
        actionText: "Buy Scratches",
        read: false,
      });
    } catch (notifError) {
      console.error("Error creating expiry notification:", notifError);
    }

    // Send expiry email
    try {
      const account = await Account.findById(subscription.ownerId).select(
        "email name firstName lastName"
      );
      if (account && account.email) {
        await sendEntitlementExpiredEmail(account.email, resolveName(account));
      }
    } catch (emailError) {
      console.error("Error sending expiry email:", emailError);
    }

    count++;
  }

  return count;
}

/**
 * Send expiry warnings
 */
async function sendExpiryWarnings(now) {
  const subscriptions = await Subscription.find({
    status: { $in: ["active", "trial"] },
    "unlimitedScratches.isActive": true,
    "unlimitedScratches.validUntil": { $gt: now },
  });

  let count = 0;

  for (const subscription of subscriptions) {
    const daysRemaining = Math.ceil(
      (subscription.unlimitedScratches.validUntil - now) / (1000 * 60 * 60 * 24)
    );

    let shouldNotify = false;
    let message = null;
    let severity = "info";

    // Determine warning level
    if (daysRemaining === 15) {
      shouldNotify = true;
      message =
        "Your unlimited scratches expire in 15 days. Renew now to avoid campaign interruption.";
      severity = "low";
    } else if (daysRemaining === 7) {
      shouldNotify = true;
      message = "Your unlimited scratches expire in 7 days.";
      severity = "medium";
    } else if (daysRemaining === 3) {
      shouldNotify = true;
      message = "Your unlimited scratches expire in 3 days.";
      severity = "high";
    } else if (daysRemaining === 1) {
      shouldNotify = true;
      message = "Your unlimited scratches expire tomorrow.";
      severity = "critical";
    }

    if (shouldNotify) {
      try {
        // Check if warning was already sent today
        const lastWarning = subscription.unlimitedScratches?.lastWarningAt;
        const isNewDay =
          !lastWarning ||
          new Date(lastWarning).getDate() !== new Date().getDate();

        if (isNewDay) {
          // Create notification
          await Notification.create({
            ownerType: subscription.ownerType,
            ownerId: subscription.ownerId,
            type: "scratch_expiry_warning",
            title: "Scratches Expiring Soon",
            message,
            severity,
            actionUrl: "/billing/scratch-packs",
            actionText: "Renew Now",
            read: false,
            metadata: {
              daysRemaining,
              validUntil: subscription.unlimitedScratches.validUntil,
            },
          });

          // Send warning email
          try {
            const account = await Account.findById(subscription.ownerId).select(
              "email name firstName lastName"
            );
            if (account && account.email) {
              await sendExpiryWarningEmail(
                account.email,
                resolveName(account),
                daysRemaining
              );
            }
          } catch (emailError) {
            console.error("Error sending warning email:", emailError);
          }

          // Mark warning sent
          await Subscription.updateOne(
            { _id: subscription._id },
            {
              $set: {
                "unlimitedScratches.lastWarningAt": now,
              },
            }
          );

          count++;
        }
      } catch (notifError) {
        console.error("Error creating warning notification:", notifError);
      }
    }
  }

  return count;
}

/**
 * Mark expired scratch packs
 */
async function markExpiredScratchPacks(now) {
  const result = await ScratchPackOrder.updateMany(
    {
      status: "active",
      validUntil: { $lt: now },
    },
    {
      $set: {
        status: "expired",
      },
    }
  );

  return result.modifiedCount;
}

/**
 * Scheduled execution (called by Next.js API route)
 */
export async function createScratchExpiryJob() {
  // This would typically be called by a cron service like Vercel Crons, AWS EventBridge, etc.
  return scratchExpiryCronJob();
}
