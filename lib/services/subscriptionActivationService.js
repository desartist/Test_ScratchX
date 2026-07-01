import mongoose from 'mongoose';
import { randomBytes } from 'crypto';
import Subscription from '@/models/subscriptionModel';
import SubscriptionPlan from '@/models/subscriptionPlanModel';
import Invoice from '@/models/invoiceModel';
import Payment from '@/models/paymentModel';
import Account from '@/models/accountModel';

/**
 * SubscriptionActivationService
 * Handles subscription activation, billing history, and account limit updates
 * Supports both merchant and distributor accounts
 */
class SubscriptionActivationService {
  /**
   * Activate a subscription plan for a user (merchant or distributor)
   * @param {string} userId - Account ID (merchant or distributor)
   * @param {string} planId - SubscriptionPlan ID
   * @param {string} userType - 'merchant' or 'distributor'
   * @param {string} billingCycle - 'monthly' or 'annual'
   * @param {Object} options - Optional: distributorId (for admin assignments), paymentMethod (default: 'direct')
   * @returns {Promise<{success: boolean, subscription, invoice, message}>}
   */
  async activateSubscription(userId, planId, userType = 'merchant', billingCycle = 'monthly', options = {}) {
    try {
      // Validate ObjectId format
      if (!mongoose.Types.ObjectId.isValid(userId)) {
        return { success: false, error: 'Invalid user ID format' };
      }
      if (!mongoose.Types.ObjectId.isValid(planId)) {
        return { success: false, error: 'Invalid plan ID format' };
      }

      // Step 1: Validate user exists
      const account = await Account.findById(userId);
      if (!account) {
        return { success: false, error: 'Account not found' };
      }

      // Validate role matches userType
      const validRoles = {
        merchant: ['Merchant', 'Manager'],
        distributor: ['Distributor'],
      };
      if (!validRoles[userType].includes(account.role)) {
        return { success: false, error: `Invalid userType "${userType}" for role ${account.role}` };
      }

      // Step 2: Fetch and validate plan
      const plan = await SubscriptionPlan.findById(planId);
      if (!plan || !plan.isActive) {
        return { success: false, error: 'Plan not found or inactive' };
      }

      // Validate plan has pricing
      if (!plan.price || !plan.price.monthly || !plan.price.annual) {
        return { success: false, error: 'Plan does not have valid pricing configured' };
      }

      // Step 3: Calculate billing period
      const now = new Date();
      const currentPeriodStart = now;
      const currentPeriodEnd = this.calculatePeriodEnd(now, billingCycle);

      // Step 4: Determine price based on cycle
      const price = billingCycle === 'annual' ? plan.price.annual : plan.price.monthly;
      const amount = price;
      const gst = Math.round(amount * 0.18); // 18% GST
      const totalAmount = amount + gst;

      // Step 5: Check for existing active subscription
      let subscription = await Subscription.findOne({
        ownerId: userId,
        ownerType: userType,
        status: { $in: ['trial', 'active', 'past_due'] },
      });

      if (subscription) {
        // Update existing subscription
        subscription.planId = planId;
        subscription.status = 'active';
        subscription.billingCycle = billingCycle;
        subscription.currentPeriodStart = currentPeriodStart;
        subscription.currentPeriodEnd = currentPeriodEnd;
        subscription.distributorId = options.distributorId || subscription.distributorId;
        // ✅ FIX #1: Activate unlimited scratches for 90 days
        subscription.unlimitedScratches = {
          isActive: true,
          grantedAt: currentPeriodStart,
          validUntil: currentPeriodEnd, // 90 days from subscription start
        };
      } else {
        // Create new subscription
        subscription = new Subscription({
          ownerId: userId,
          ownerType: userType,
          merchantId: userType === 'merchant' ? userId : null, // Backward compat
          planId,
          status: 'active',
          billingCycle,
          currentPeriodStart,
          currentPeriodEnd,
          distributorId: options.distributorId || null,
          paymentGateway: null, // Direct activation, no gateway
          gatewaySubscriptionId: null,
          // ✅ FIX #1: Activate unlimited scratches for 90 days from purchase
          unlimitedScratches: {
            isActive: true,
            grantedAt: currentPeriodStart,
            validUntil: currentPeriodEnd, // 90 days from subscription start
          },
        });
      }

      // Step 5: Create subscription and billing records (without transactions for standalone MongoDB)
      try {
        // Save subscription without transaction
        await subscription.save();

        // Update account limits (non-fatal if fails)
        try {
          await this.updateAccountLimits(userId, plan);
        } catch (error) {
          console.warn('[SubscriptionActivationService] Warning: Failed to update account limits:', error.message);
        }

        // Step 6: Create billing history (Invoice + Payment)
        // Important: Create Payment BEFORE Invoice so we have paymentId to reference
        const transactionId = `SUB-${this.formatDate(now)}-${this.generateShortId()}`;
        const paymentMethod = options.paymentMethod || 'direct';

        // Create Payment first with only supported fields
        const payment = new Payment({
          merchantId: userId,
          subscriptionId: subscription._id,
          distributorId: options.distributorId || null,
          amount,
          currency: 'INR',
          tax: gst,
          totalAmount,
          paymentGateway: 'direct',
          status: 'success',
          description: `Direct subscription activation - ${plan.name}`,
          transactionId, // Direct field for unique constraint
          paymentMethod: 'direct',
          planId,
          metadata: {
            transactionId,
            paymentMethod: 'direct',
            planId: planId.toString(),
            userType,
            billingCycle,
            planName: plan.name,
          },
        });

        await payment.save();

        // Now create Invoice with paymentId reference
        const invoice = new Invoice({
          invoiceNumber: `INV-${this.formatDate(now)}-${this.generateShortId()}`,
          merchantId: userId, // Works for both merchant and distributor (mapping to account)
          paymentId: payment._id, // Reference the saved Payment
          subscriptionId: subscription._id,
          planName: plan.name,
          amount,
          currency: 'INR',
          taxAmount: gst,
          totalAmount,
          billingPeriodStart: currentPeriodStart,
          billingPeriodEnd: currentPeriodEnd,
          issuedDate: now,
          dueDate: currentPeriodEnd,
          status: 'paid',
          paidDate: now,
          merchantEmail: account.email,
          merchantName: account.name || account.firstName,
          merchantPhone: account.phone,
          items: [
            {
              description: `${plan.name} Plan (${billingCycle})`,
              quantity: 1,
              unitPrice: amount,
              amount,
            },
          ],
          metadata: {
            transactionId,
            paymentMethod,
            planId: planId.toString(),
            userType,
          },
        });

        await invoice.save();

        // Step 7: Return success with subscription details
        return {
          success: true,
          subscription: subscription.toObject(),
          invoice: invoice.toObject(),
          payment: payment.toObject(),
          message: `${plan.name} plan activated successfully for ${billingCycle} billing`,
        };
      } catch (error) {
        console.error('[SubscriptionActivationService] Subscription activation failed:', error);
        return {
          success: false,
          error: error.message || 'Failed to activate subscription',
        };
      }
    } catch (error) {
      console.error('[SubscriptionActivationService] Error:', error);
      return {
        success: false,
        error: error.message || 'Failed to activate subscription',
      };
    }
  }

  /**
   * Update Account limits based on plan configuration
   * Synchronizes plan limits → Account subscription field
   * Non-fatal: logs warning but doesn't throw (subscription is already valid)
   */
  async updateAccountLimits(userId, plan) {
    try {
      // Store subscription info on Account for easy access
      // In future, this could be used for UI displays and enforcer logic
      await Account.findByIdAndUpdate(
        userId,
        {
          subscription: {
            planId: plan._id,
            planName: plan.name,
            maxStores: plan.limits.maxStores,
            maxCampaigns: plan.limits.maxCampaigns,
            maxScratchCards: plan.limits.maxScratchCardsPerMonth,
          },
        },
        { new: true }
      );
      return true;
    } catch (error) {
      console.warn('[SubscriptionActivationService] Warning: Failed to update account limits:', error.message);
      // Return false but don't throw - subscription is already valid
      return false;
    }
  }

  /**
   * Calculate period end date based on billing cycle
   */
  calculatePeriodEnd(startDate, billingCycle) {
    const end = new Date(startDate);
    if (billingCycle === 'annual') {
      end.setFullYear(end.getFullYear() + 1);
    } else {
      end.setMonth(end.getMonth() + 1);
    }
    return end;
  }

  /**
   * Format date as YYYYMMDD
   */
  formatDate(date) {
    return date.toISOString().split('T')[0].replace(/-/g, '');
  }

  /**
   * Generate short random ID (6 hex chars) using cryptographically secure random bytes
   */
  generateShortId() {
    return randomBytes(3).toString('hex').toUpperCase();
  }

  /**
   * Get active subscription for a user with plan details
   */
  async getActiveSubscription(userId, userType = 'merchant') {
    try {
      const subscription = await Subscription.findOne({
        ownerId: userId,
        ownerType: userType,
        status: { $in: ['trial', 'active', 'past_due'] },
      }).populate('planId');

      return subscription;
    } catch (error) {
      console.error('[SubscriptionActivationService] Error fetching subscription:', error);
      return null;
    }
  }
}

export default new SubscriptionActivationService();
