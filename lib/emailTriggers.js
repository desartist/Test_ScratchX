/**
 * Email Triggers
 *
 * Handles email sending for various subscription events
 */

import { sendEmail } from './emailService';
import Subscription from '@/models/subscriptionModel';
import Account from '@/models/accountModel';

/**
 * Send payment confirmation email
 */
export async function sendPaymentConfirmationEmail(paymentData, merchantId) {
  try {
    const account = await Account.findById(merchantId);
    if (!account) return;

    await sendEmail(account.email, 'paymentConfirmation', {
      merchantName: account.businessName || 'Valued Customer',
      planName: paymentData.planName,
      amount: paymentData.amount,
      transactionId: paymentData.transactionId || paymentData._id,
      date: new Date(),
    });
  } catch (error) {
    console.error('Error sending payment confirmation email:', error);
  }
}

/**
 * Send trial expiring email
 */
export async function sendTrialExpiringEmail(merchantId) {
  try {
    const subscription = await Subscription.findOne({ merchantId });
    const account = await Account.findById(merchantId);

    if (!subscription || !account || subscription.status !== 'trial') return;

    const daysRemaining = Math.ceil(
      (subscription.trialEndsAt - new Date()) / (1000 * 60 * 60 * 24)
    );

    if (daysRemaining > 3) return; // Only send if 3 days or less remaining

    await sendEmail(account.email, 'trialExpiring', {
      merchantName: account.businessName || 'Valued Customer',
      daysRemaining,
      expiryDate: subscription.trialEndsAt,
    });
  } catch (error) {
    console.error('Error sending trial expiring email:', error);
  }
}

/**
 * Send quota warning email
 */
export async function sendQuotaWarningEmail(merchantId, metric, current, limit, percentage) {
  try {
    const subscription = await Subscription.findOne({ merchantId });
    const account = await Account.findById(merchantId);

    if (!subscription || !account) return;

    await sendEmail(account.email, 'quotaWarning', {
      merchantName: account.businessName || 'Valued Customer',
      metric,
      current,
      limit,
      percentage,
      planName: subscription.planName,
    });
  } catch (error) {
    console.error('Error sending quota warning email:', error);
  }
}

/**
 * Send upgrade success email
 */
export async function sendUpgradeSuccessEmail(merchantId, oldPlan, newPlan, proratedAmount, expiryDate) {
  try {
    const account = await Account.findById(merchantId);
    if (!account) return;

    await sendEmail(account.email, 'upgradeSuccess', {
      merchantName: account.businessName || 'Valued Customer',
      oldPlanName: oldPlan,
      newPlanName: newPlan,
      proratedAmount,
      expiryDate,
    });
  } catch (error) {
    console.error('Error sending upgrade success email:', error);
  }
}

/**
 * Send cancellation confirmation email
 */
export async function sendCancellationConfirmEmail(merchantId, planName) {
  try {
    const account = await Account.findById(merchantId);
    if (!account) return;

    await sendEmail(account.email, 'cancellationConfirm', {
      merchantName: account.businessName || 'Valued Customer',
      planName,
      cancellationDate: new Date(),
    });
  } catch (error) {
    console.error('Error sending cancellation confirmation email:', error);
  }
}

/**
 * Send invoice email
 */
export async function sendInvoiceEmail(merchantId, invoiceData) {
  try {
    const account = await Account.findById(merchantId);
    if (!account) return;

    await sendEmail(account.email, 'invoiceEmail', {
      merchantName: account.businessName || 'Valued Customer',
      invoiceNumber: invoiceData.invoiceNumber,
      planName: invoiceData.planName,
      amount: invoiceData.totalAmount,
      date: invoiceData.issuedDate,
      dueDate: invoiceData.dueDate,
    });
  } catch (error) {
    console.error('Error sending invoice email:', error);
  }
}

export default {
  sendPaymentConfirmationEmail,
  sendTrialExpiringEmail,
  sendQuotaWarningEmail,
  sendUpgradeSuccessEmail,
  sendCancellationConfirmEmail,
  sendInvoiceEmail,
};
