/**
 * Distributor Notification Service
 *
 * Sends notifications for distributor events
 * - Order confirmations
 * - Payment alerts
 * - Inventory warnings
 * - Commission updates
 */

import Notification from '@/models/notificationModel';

class DistributorNotificationService {
  /**
   * Send purchase confirmation notification
   */
  async notifyPurchaseSuccess(distributorId, orderData) {
    try {
      const notification = new Notification({
        userId: distributorId,
        userRole: 'distributor',
        type: 'order_confirmed',
        title: 'Purchase Order Confirmed',
        message: `Your order #${orderData.orderNumber} for ₹${orderData.totalAmount} has been confirmed. Plans will be added to your inventory shortly.`,
        data: {
          orderNumber: orderData.orderNumber,
          amount: orderData.totalAmount,
          orderId: orderData.orderId,
        },
        read: false,
      });

      await notification.save();
      console.log(`[NotificationService] Sent purchase confirmation to ${distributorId}`);
      return notification;
    } catch (error) {
      console.error('[NotificationService] Error sending purchase notification:', error);
    }
  }

  /**
   * Send inventory low warning
   */
  async notifyLowInventory(distributorId, planType, remaining) {
    try {
      const notification = new Notification({
        userId: distributorId,
        userRole: 'distributor',
        type: 'inventory_low',
        title: `Low ${planType} Plan Inventory`,
        message: `You have only ${remaining} ${planType} plans remaining. Consider purchasing more.`,
        data: {
          planType,
          remaining,
        },
        read: false,
      });

      await notification.save();
      console.log(`[NotificationService] Sent low inventory alert to ${distributorId}`);
      return notification;
    } catch (error) {
      console.error('[NotificationService] Error sending low inventory notification:', error);
    }
  }

  /**
   * Send plan assigned notification
   */
  async notifyPlanAssigned(distributorId, retailerName, planType) {
    try {
      const notification = new Notification({
        userId: distributorId,
        userRole: 'distributor',
        type: 'plan_assigned',
        title: 'Plan Assigned Successfully',
        message: `${planType} plan has been assigned to retailer ${retailerName}. They can now start using the platform.`,
        data: {
          retailerName,
          planType,
        },
        read: false,
      });

      await notification.save();
      console.log(`[NotificationService] Sent plan assignment notification to ${distributorId}`);
      return notification;
    } catch (error) {
      console.error('[NotificationService] Error sending plan assignment notification:', error);
    }
  }

  /**
   * Send payment failure notification
   */
  async notifyPaymentFailed(distributorId, orderNumber, reason) {
    try {
      const notification = new Notification({
        userId: distributorId,
        userRole: 'distributor',
        type: 'payment_failed',
        title: 'Payment Failed',
        message: `Payment for order #${orderNumber} failed. Reason: ${reason}. Please retry or contact support.`,
        data: {
          orderNumber,
          reason,
        },
        read: false,
      });

      await notification.save();
      console.log(`[NotificationService] Sent payment failure notification to ${distributorId}`);
      return notification;
    } catch (error) {
      console.error('[NotificationService] Error sending payment failure notification:', error);
    }
  }

  /**
   * Send commission earned notification
   */
  async notifyCommissionEarned(distributorId, commissionAmount, planType) {
    try {
      const notification = new Notification({
        userId: distributorId,
        userRole: 'distributor',
        type: 'commission_earned',
        title: 'Commission Earned',
        message: `You earned ₹${commissionAmount} commission from a ${planType} plan assignment. Check your commission dashboard.`,
        data: {
          amount: commissionAmount,
          planType,
        },
        read: false,
      });

      await notification.save();
      console.log(`[NotificationService] Sent commission notification to ${distributorId}`);
      return notification;
    } catch (error) {
      console.error('[NotificationService] Error sending commission notification:', error);
    }
  }

  /**
   * Send payout processed notification
   */
  async notifyPayoutProcessed(distributorId, payoutAmount, payoutDate) {
    try {
      const notification = new Notification({
        userId: distributorId,
        userRole: 'distributor',
        type: 'payout_processed',
        title: 'Payout Processed',
        message: `Your payout of ₹${payoutAmount} has been processed. It will reach your bank account within 2-3 business days.`,
        data: {
          amount: payoutAmount,
          processedDate: payoutDate,
        },
        read: false,
      });

      await notification.save();
      console.log(`[NotificationService] Sent payout notification to ${distributorId}`);
      return notification;
    } catch (error) {
      console.error('[NotificationService] Error sending payout notification:', error);
    }
  }

  /**
   * Send retailer activated notification
   */
  async notifyRetailerActivated(distributorId, retailerName) {
    try {
      const notification = new Notification({
        userId: distributorId,
        userRole: 'distributor',
        type: 'retailer_activated',
        title: 'Retailer Account Activated',
        message: `${retailerName} has activated their account and can now access the ScratchX platform.`,
        data: {
          retailerName,
        },
        read: false,
      });

      await notification.save();
      console.log(`[NotificationService] Sent retailer activation notification to ${distributorId}`);
      return notification;
    } catch (error) {
      console.error('[NotificationService] Error sending retailer activation notification:', error);
    }
  }

  /**
   * Get notifications for distributor
   */
  async getNotifications(distributorId, filters = {}) {
    try {
      const query = {
        userId: distributorId,
        userRole: 'distributor',
      };

      if (filters.type) query.type = filters.type;
      if (filters.read !== undefined) query.read = filters.read;

      const notifications = await Notification.find(query)
        .sort({ createdAt: -1 })
        .limit(filters.limit || 50)
        .skip(filters.skip || 0);

      const total = await Notification.countDocuments(query);
      const unread = await Notification.countDocuments({ ...query, read: false });

      return {
        notifications,
        total,
        unread,
      };
    } catch (error) {
      console.error('[NotificationService] Error getting notifications:', error);
      throw error;
    }
  }

  /**
   * Mark notification as read
   */
  async markAsRead(notificationId) {
    try {
      const notification = await Notification.findByIdAndUpdate(
        notificationId,
        { read: true, readAt: new Date() },
        { new: true }
      );

      return notification;
    } catch (error) {
      console.error('[NotificationService] Error marking notification as read:', error);
      throw error;
    }
  }

  /**
   * Mark all notifications as read
   */
  async markAllAsRead(distributorId) {
    try {
      const result = await Notification.updateMany(
        { userId: distributorId, userRole: 'distributor', read: false },
        { read: true, readAt: new Date() }
      );

      return result;
    } catch (error) {
      console.error('[NotificationService] Error marking all notifications as read:', error);
      throw error;
    }
  }

  /**
   * Delete notification
   */
  async deleteNotification(notificationId) {
    try {
      await Notification.findByIdAndDelete(notificationId);
      return { success: true };
    } catch (error) {
      console.error('[NotificationService] Error deleting notification:', error);
      throw error;
    }
  }
}

export default new DistributorNotificationService();
