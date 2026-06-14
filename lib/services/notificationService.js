/**
 * Notification Service (PHASE 3)
 * Full implementation with email and in-app notifications
 * Handles: plan purchase, scratch pack purchase, expiry warnings, expiry notifications
 */

import Notification from "@/models/notificationModel";
import Account from "@/models/accountModel";
import Subscription from "@/models/subscriptionModel";
import {
  sendPlanPurchaseEmail,
  sendScratchPackPurchaseEmail,
  sendExpiryWarningEmail,
  sendEntitlementExpiredEmail,
} from "@/lib/emailService";

class NotificationService {
  /**
   * Send notification for plan purchase
   * Called from: POST /api/subscription/activate
   */
  async sendPlanPurchaseNotification(ownerId, ownerType, planData) {
    try {
      const account = await Account.findById(ownerId);
      if (!account) {
        console.warn(`[NotificationService] Account not found: ${ownerId}`);
        return;
      }

      // Send email
      await sendPlanPurchaseEmail(
        account.email,
        account.name || account.email,
        planData.planType,
        90 // 90-day unlimited scratches
      );

      // Create in-app notification
      await Notification.create({
        ownerId: ownerId,
        ownerType: ownerType,
        type: "plan_purchased",
        title: `${planData.planType} Plan Activated`,
        message: `Your ${planData.planType} plan is now active with unlimited scratches for 90 days.`,
        actionUrl: "/dashboard",
        severity: "info",
        read: false,
      });

      console.log(`✓ [NotificationService] Plan purchase notification sent to ${account.email}`);
    } catch (error) {
      console.error("[NotificationService] Error sending plan purchase notification:", error);
      // Don't throw - failure to send notification shouldn't block the flow
    }
  }

  /**
   * Send notification for scratch pack purchase
   * Called from: POST /api/scratches/purchase-pack
   */
  async sendScratchPackPurchaseNotification(ownerId, ownerType, packData) {
    try {
      const account = await Account.findById(ownerId);
      if (!account) {
        console.warn(`[NotificationService] Account not found: ${ownerId}`);
        return;
      }

      // Send email
      await sendScratchPackPurchaseEmail(
        account.email,
        account.name || account.email,
        packData.quantity,
        packData.totalPrice
      );

      // Create in-app notification
      await Notification.create({
        ownerId: ownerId,
        ownerType: ownerType,
        type: "scratch_pack_purchased",
        title: "Scratch Pack Purchased",
        message: `${packData.quantity.toLocaleString()} scratches added to your account (₹${packData.totalPrice})`,
        actionUrl: "/dashboard",
        severity: "medium",
        read: false,
      });

      console.log(`✓ [NotificationService] Scratch pack purchase notification sent to ${account.email}`);
    } catch (error) {
      console.error("[NotificationService] Error sending pack purchase notification:", error);
      // Don't throw - failure to send notification shouldn't block the flow
    }
  }

  /**
   * Send expiry warning notification (15, 7, 3, 1 days before)
   * Called from: Cron job - daily expiry checker
   */
  async sendScratchExpiryWarning(ownerId, ownerType, daysRemaining) {
    try {
      const account = await Account.findById(ownerId);
      if (!account) {
        console.warn(`[NotificationService] Account not found: ${ownerId}`);
        return;
      }

      // Send email
      await sendExpiryWarningEmail(
        account.email,
        account.name || account.email,
        daysRemaining
      );

      // Create in-app notification
      let severity = "warning";
      let message = `Your unlimited scratches will expire in ${daysRemaining} day${daysRemaining !== 1 ? 's' : ''}.`;

      if (daysRemaining <= 1) {
        severity = "critical";
        message = "⚠️ URGENT: Your unlimited scratches expire tomorrow!";
      } else if (daysRemaining <= 3) {
        severity = "urgent";
        message = `Your unlimited scratches will expire in ${daysRemaining} days.`;
      }

      await Notification.create({
        ownerId: ownerId,
        ownerType: ownerType,
        type: "scratch_expiry_warning",
        title: `Scratches Expiring in ${daysRemaining} Days`,
        message,
        actionUrl: "/billing/scratch-packs",
        severity,
        read: false,
      });

      console.log(`✓ [NotificationService] Expiry warning sent to ${account.email} (${daysRemaining} days)`);
    } catch (error) {
      console.error("[NotificationService] Error sending expiry warning:", error);
      // Don't throw - failure to send notification shouldn't block the flow
    }
  }

  /**
   * Send expiry notification (scratches have expired)
   * Called from: Cron job - when expiry date is reached
   */
  async sendScratchExpiredNotification(ownerId, ownerType) {
    try {
      const account = await Account.findById(ownerId);
      if (!account) {
        console.warn(`[NotificationService] Account not found: ${ownerId}`);
        return;
      }

      // Send email
      await sendEntitlementExpiredEmail(
        account.email,
        account.name || account.email
      );

      // Create in-app notification
      await Notification.create({
        ownerId: ownerId,
        ownerType: ownerType,
        type: "scratch_expired",
        title: "🚨 Scratch Entitlement Expired",
        message: "Your unlimited scratches have expired. Purchase a scratch pack to continue.",
        actionUrl: "/billing/scratch-packs",
        severity: "critical",
        read: false,
      });

      console.log(`✓ [NotificationService] Expiry notification sent to ${account.email}`);
    } catch (error) {
      console.error("[NotificationService] Error sending expiry notification:", error);
      // Don't throw - failure to send notification shouldn't block the flow
    }
  }

  /**
   * Get all notifications for a user
   * Called from: GET /api/notifications
   */
  async getNotifications(ownerId, ownerType, limit = 20) {
    try {
      const notifications = await Notification.find({
        ownerId: ownerId,
        ownerType: ownerType,
      })
        .sort({ createdAt: -1 })
        .limit(limit);

      return notifications;
    } catch (error) {
      console.error("[NotificationService] Error getting notifications:", error);
      throw error;
    }
  }

  /**
   * Mark notification as read
   * Called from: POST /api/notifications/:id/read
   */
  async markAsRead(notificationId) {
    try {
      await Notification.findByIdAndUpdate(
        notificationId,
        { read: true },
        { new: true }
      );
      console.log(`✓ [NotificationService] Notification marked as read: ${notificationId}`);
    } catch (error) {
      console.error("[NotificationService] Error marking notification as read:", error);
      throw error;
    }
  }

  /**
   * Mark all notifications as read for a user
   * Called from: POST /api/notifications/mark-all-read
   */
  async markAllAsRead(ownerId, ownerType) {
    try {
      await Notification.updateMany(
        { ownerId, ownerType, read: false },
        { read: true }
      );
      console.log(`✓ [NotificationService] All notifications marked as read for ${ownerId}`);
    } catch (error) {
      console.error("[NotificationService] Error marking all notifications as read:", error);
      throw error;
    }
  }
}

export default new NotificationService();
