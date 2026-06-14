/**
 * Extra Store Billing Service
 *
 * Handles billing for extra stores in SMART plan
 * SMART plan: 1 main store free + up to 4 extra stores @ ₹199 each
 *
 * Creates Invoice and Payment records for extra store charges
 */

import { connectDB } from '@/lib/connectDB';
import Invoice from '@/models/invoiceModel';
import Payment from '@/models/paymentModel';
import Store from '@/models/storeModel';
import Subscription from '@/models/subscriptionModel';
import '@/models/subscriptionPlanModel';

const EXTRA_STORE_FEE = 199; // ₹199 per extra store

class ExtraStoreBillingService {
  /**
   * Create billing records for an extra store
   *
   * Called when: Store is created with isExtraStore = true
   */
  async chargeForExtraStore(storeId, merchantId, storeName) {
    try {
      await connectDB();

      // Get the store to verify it's an extra store
      const store = await Store.findById(storeId);
      if (!store || !store.isExtraStore) {
        throw new Error('Store is not marked as extra store');
      }

      // Get active subscription
      const subscription = await Subscription.findOne({
        ownerId: merchantId,
        ownerType: 'merchant',
        status: { $in: ['active', 'trial'] },
      }).populate('planId');

      if (!subscription) {
        throw new Error('No active subscription found');
      }

      // Verify it's a SMART plan
      const planName = subscription.planId?.name || '';
      if (!planName.toLowerCase().includes('smart')) {
        throw new Error('Extra store billing only applies to SMART plan');
      }

      const now = new Date();
      const invoiceNumber = this.generateInvoiceNumber();

      // Create Invoice
      const invoice = new Invoice({
        invoiceNumber,
        accountId: merchantId,
        subscriptionId: subscription._id,
        type: 'extra_store_charge',
        description: `Extra Store: ${storeName}`,
        storeId,
        items: [
          {
            description: `Additional Store Fee - ${storeName}`,
            quantity: 1,
            unitPrice: EXTRA_STORE_FEE,
            amount: EXTRA_STORE_FEE,
            category: 'extra_store',
            storeId,
          },
        ],
        subtotal: EXTRA_STORE_FEE,
        taxRate: 18, // 18% GST
        taxAmount: Math.round((EXTRA_STORE_FEE * 18) / 100),
        total: EXTRA_STORE_FEE + Math.round((EXTRA_STORE_FEE * 18) / 100),
        currency: 'INR',
        status: 'paid', // Immediately mark as paid (direct activation)
        dueDate: new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000), // 30 days from now
        issuedDate: now,
        paidDate: now,
      });

      await invoice.save();

      // Create Payment record
      const payment = new Payment({
        invoiceId: invoice._id,
        accountId: merchantId,
        subscriptionId: subscription._id,
        amount: invoice.total,
        taxAmount: invoice.taxAmount,
        subtotal: invoice.subtotal,
        currency: 'INR',
        status: 'completed',
        method: 'direct_activation', // Direct activation (no Razorpay)
        description: `Extra Store Charge: ${storeName}`,
        transactionId: `EXTRA-STORE-${invoiceNumber}`,
        processedAt: now,
      });

      await payment.save();

      // Update store to link to invoice
      store.invoiceId = invoice._id;
      store.billingStatus = 'active';
      store.chargedAt = now;
      await store.save();

      console.log('[ExtraStoreBillingService] Extra store charged:', {
        storeId,
        storeName,
        invoiceId: invoice._id,
        paymentId: payment._id,
        amount: invoice.total,
      });

      return {
        success: true,
        invoice: {
          _id: invoice._id,
          invoiceNumber: invoice.invoiceNumber,
          amount: invoice.subtotal,
          taxAmount: invoice.taxAmount,
          total: invoice.total,
        },
        payment: {
          _id: payment._id,
          transactionId: payment.transactionId,
        },
      };
    } catch (error) {
      console.error('[ExtraStoreBillingService] Error charging for extra store:', error);
      throw error;
    }
  }

  /**
   * Get billing summary for a merchant
   * Shows invoices and payments for extra stores
   */
  async getBillingSummary(merchantId, limit = 10) {
    try {
      await connectDB();

      const invoices = await Invoice.find({
        accountId: merchantId,
        type: 'extra_store_charge',
      })
        .sort({ issuedDate: -1 })
        .limit(limit);

      const totalCharges = invoices.reduce((sum, inv) => sum + inv.total, 0);
      const paidAmount = invoices
        .filter((inv) => inv.status === 'paid')
        .reduce((sum, inv) => sum + inv.total, 0);

      return {
        invoices: invoices.map((inv) => ({
          _id: inv._id,
          invoiceNumber: inv.invoiceNumber,
          description: inv.description,
          amount: inv.subtotal,
          taxAmount: inv.taxAmount,
          total: inv.total,
          status: inv.status,
          issuedDate: inv.issuedDate,
          dueDate: inv.dueDate,
          paidDate: inv.paidDate,
        })),
        summary: {
          totalCharges,
          paidAmount,
          pendingAmount: totalCharges - paidAmount,
          invoiceCount: invoices.length,
        },
      };
    } catch (error) {
      console.error('[ExtraStoreBillingService] Error getting billing summary:', error);
      throw error;
    }
  }

  /**
   * Generate unique invoice number
   * Format: EXTRA-[YearMonthDay]-[RandomString]
   */
  generateInvoiceNumber() {
    const now = new Date();
    const dateStr = now
      .toISOString()
      .slice(0, 10)
      .replace(/-/g, '');
    const randomStr = Math.random().toString(36).substring(2, 8).toUpperCase();
    return `EXTRA-${dateStr}-${randomStr}`;
  }

  /**
   * Get cost breakdown for creating additional stores in SMART plan
   */
  getExtraStoreCostBreakdown() {
    const subtotal = EXTRA_STORE_FEE;
    const taxRate = 18; // 18% GST
    const taxAmount = Math.round((subtotal * taxRate) / 100);
    const total = subtotal + taxAmount;

    return {
      basePrice: subtotal,
      taxRate,
      taxAmount,
      total,
      formattedBasePrice: `₹${subtotal.toLocaleString('en-IN')}`,
      formattedTaxAmount: `₹${taxAmount.toLocaleString('en-IN')}`,
      formattedTotal: `₹${total.toLocaleString('en-IN')}`,
      description: '₹199 + 18% GST for each additional store beyond the first',
    };
  }
}

export default new ExtraStoreBillingService();
