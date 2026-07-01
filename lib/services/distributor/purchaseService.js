/**
 * Purchase Workflow Service
 *
 * Handles the complete purchase flow for distributors buying plans
 * - Create purchase orders
 * - Process payments
 * - Update inventory
 * - Create audit logs
 */

import DistributorOrder from '@/models/distributorOrderModel';
import DistributorTransaction from '@/models/distributorTransactionModel';
import inventoryService from './inventoryService';
import transactionService from './transactionService';
import commissionService from './commissionService';

class PurchaseService {
  /**
   * Create a draft purchase order
   */
  async createDraftOrder(distributorId, items, userId) {
    try {
      // Generate unique order number
      const orderNumber = `ORD-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;

      // Get commission percentage
      const commissionPercentage = await commissionService.getCommissionPercentage(
        distributorId
      );

      // Calculate pricing
      const pricing = commissionService.calculateBatchPricing(items, commissionPercentage);

      // Create order document
      const order = new DistributorOrder({
        orderNumber,
        distributorId,
        items: pricing.items.map((item) => ({
          planType: item.planType,
          planName: item.planName,
          quantity: item.quantity,
          unitMRP: item.unitMRP,
          commissionPercentage,
          discountAmount: item.itemDiscount,
          unitCostPrice: item.unitMRP - item.itemDiscount / item.quantity,
          lineTotal: item.itemCostPrice,
        })),
        pricing: {
          subtotalMRP: pricing.subtotalMRP,
          totalDiscount: pricing.totalDiscount,
          subtotal: pricing.subtotal,
          gst: pricing.gst,
          grandTotal: pricing.grandTotal,
        },
        paymentStatus: 'pending',
        orderStatus: 'draft',
        createdBy: userId,
      });

      await order.save();

      console.log(`[PurchaseService] Created draft order: ${orderNumber}`);

      return {
        order,
        pricing,
      };
    } catch (error) {
      console.error('[PurchaseService] Error creating draft order:', error);
      throw error;
    }
  }

  /**
   * Confirm and submit order for payment
   */
  async submitOrder(orderId, distributorId, paymentMethod) {
    try {
      const order = await DistributorOrder.findById(orderId);

      if (!order) {
        throw new Error('Order not found');
      }

      if (order.distributorId.toString() !== distributorId.toString()) {
        throw new Error('Unauthorized: Order does not belong to this distributor');
      }

      if (order.orderStatus !== 'draft') {
        throw new Error('Order must be in draft status to submit');
      }

      // Update order status
      order.orderStatus = 'submitted';
      order.paymentMethod = paymentMethod;
      order.submittedAt = new Date();

      await order.save();

      console.log(`[PurchaseService] Submitted order: ${order.orderNumber}`);

      return order;
    } catch (error) {
      console.error('[PurchaseService] Error submitting order:', error);
      throw error;
    }
  }

  /**
   * Confirm payment and update inventory
   * Called after successful payment from Razorpay/Gateway
   */
  async confirmPayment(orderId, paymentReference, paidBy) {
    try {
      const order = await DistributorOrder.findById(orderId);

      if (!order) {
        throw new Error('Order not found');
      }

      if (order.paymentStatus !== 'pending') {
        throw new Error('Payment already processed for this order');
      }

      // Update payment status
      order.paymentStatus = 'completed';
      order.paymentGatewayReference = paymentReference;
      order.transactionId = paymentReference;
      order.paymentDate = new Date();
      order.orderStatus = 'confirmed';
      order.confirmedAt = new Date();

      await order.save();

      // Now update inventory for each item
      await this.updateInventoryFromOrder(order);

      // Create transaction record
      await transactionService.recordTransaction({
        distributorId: order.distributorId,
        transactionType: 'purchase',
        amount: order.pricing.grandTotal,
        transactionDirection: 'debit',
        referenceType: 'order',
        referenceId: orderId,
        orderId,
        paymentMethod: order.paymentMethod,
        paymentReference,
        status: 'completed',
        createdBy: paidBy,
      });

      console.log(`[PurchaseService] Payment confirmed for order: ${order.orderNumber}`);

      return order;
    } catch (error) {
      console.error('[PurchaseService] Error confirming payment:', error);
      throw error;
    }
  }

  /**
   * Internal: Update inventory after payment confirmation
   */
  async updateInventoryFromOrder(order) {
    try {
      for (const item of order.items) {
        await inventoryService.addToInventory(
          order.distributorId,
          item.planType,
          item.quantity,
          item.unitCostPrice,
          order._id
        );
      }

      // Mark inventory as updated
      order.inventoryUpdated = true;
      order.inventoryUpdatedAt = new Date();
      await order.save();

      console.log(`[PurchaseService] Inventory updated for order: ${order.orderNumber}`);
    } catch (error) {
      console.error('[PurchaseService] Error updating inventory:', error);
      throw error;
    }
  }

  /**
   * Handle failed payment
   */
  async handlePaymentFailure(orderId, failureReason) {
    try {
      const order = await DistributorOrder.findById(orderId);

      if (!order) {
        throw new Error('Order not found');
      }

      order.paymentStatus = 'failed';
      order.orderStatus = 'cancelled';
      order.cancelledAt = new Date();
      order.cancellationReason = failureReason;

      await order.save();

      console.log(`[PurchaseService] Payment failed for order: ${order.orderNumber}`);

      return order;
    } catch (error) {
      console.error('[PurchaseService] Error handling payment failure:', error);
      throw error;
    }
  }

  /**
   * Get order details
   */
  async getOrderDetails(orderId, distributorId) {
    try {
      const order = await DistributorOrder.findById(orderId);

      if (!order) {
        throw new Error('Order not found');
      }

      if (order.distributorId.toString() !== distributorId.toString()) {
        throw new Error('Unauthorized');
      }

      return order;
    } catch (error) {
      console.error('[PurchaseService] Error getting order details:', error);
      throw error;
    }
  }

  /**
   * Get distributor's order history
   */
  async getOrderHistory(distributorId, filters = {}) {
    try {
      const query = { distributorId };

      if (filters.status) query.orderStatus = filters.status;
      if (filters.paymentStatus) query.paymentStatus = filters.paymentStatus;

      const orders = await DistributorOrder.find(query)
        .sort({ createdAt: -1 })
        .limit(filters.limit || 50)
        .skip(filters.skip || 0);

      const total = await DistributorOrder.countDocuments(query);

      return {
        orders,
        total,
        page: Math.floor((filters.skip || 0) / (filters.limit || 50)) + 1,
        pages: Math.ceil(total / (filters.limit || 50)),
      };
    } catch (error) {
      console.error('[PurchaseService] Error getting order history:', error);
      throw error;
    }
  }

  /**
   * Cancel an order (only if not confirmed)
   */
  async cancelOrder(orderId, distributorId, reason) {
    try {
      const order = await DistributorOrder.findById(orderId);

      if (!order) {
        throw new Error('Order not found');
      }

      if (order.distributorId.toString() !== distributorId.toString()) {
        throw new Error('Unauthorized');
      }

      if (order.paymentStatus === 'completed') {
        throw new Error('Cannot cancel order after payment is completed');
      }

      order.orderStatus = 'cancelled';
      order.cancelledAt = new Date();
      order.cancellationReason = reason;
      order.paymentStatus = 'cancelled';

      await order.save();

      console.log(`[PurchaseService] Cancelled order: ${order.orderNumber}`);

      return order;
    } catch (error) {
      console.error('[PurchaseService] Error cancelling order:', error);
      throw error;
    }
  }

  /**
   * Generate invoice for an order
   */
  async generateInvoice(orderId) {
    try {
      const order = await DistributorOrder.findById(orderId);

      if (!order) {
        throw new Error('Order not found');
      }

      // Generate invoice number
      const invoiceNumber = `INV-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;

      order.invoiceNumber = invoiceNumber;
      await order.save();

      console.log(`[PurchaseService] Generated invoice: ${invoiceNumber}`);

      return {
        invoiceNumber,
        order,
      };
    } catch (error) {
      console.error('[PurchaseService] Error generating invoice:', error);
      throw error;
    }
  }

  /**
   * Get order summary statistics
   */
  async getOrderStats(distributorId, startDate, endDate) {
    try {
      const query = { distributorId };

      if (startDate && endDate) {
        query.createdAt = {
          $gte: new Date(startDate),
          $lte: new Date(endDate),
        };
      }

      const orders = await DistributorOrder.find(query);

      const stats = {
        totalOrders: orders.length,
        completedOrders: orders.filter((o) => o.paymentStatus === 'completed').length,
        pendingOrders: orders.filter((o) => o.paymentStatus === 'pending').length,
        failedOrders: orders.filter((o) => o.paymentStatus === 'failed').length,
        totalSpent: orders
          .filter((o) => o.paymentStatus === 'completed')
          .reduce((sum, o) => sum + o.pricing.grandTotal, 0),
        totalPlans: orders
          .filter((o) => o.paymentStatus === 'completed')
          .reduce((sum, o) => sum + o.items.reduce((s, i) => s + i.quantity, 0), 0),
      };

      return stats;
    } catch (error) {
      console.error('[PurchaseService] Error getting order stats:', error);
      throw error;
    }
  }
}

export default new PurchaseService();
