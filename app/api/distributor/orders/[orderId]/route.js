/**
 * GET /api/distributor/orders/[orderId] - Get order details
 * POST /api/distributor/orders/[orderId]/confirm - Confirm payment
 * POST /api/distributor/orders/[orderId]/cancel - Cancel order
 */

import { NextResponse } from 'next/server';
import { connectDB } from '@/lib/connectDB';
import { requireAuth } from '@/lib/auth';
import { purchaseService, notificationService } from '@/lib/services/distributor';

export async function GET(request, { params }) {
  try {
    await connectDB();
    const { account, error: authError } = await requireAuth();
    if (authError) return authError;

    if (account.role !== 'Distributor') {
      return NextResponse.json(
        { success: false, error: 'Only distributors can view orders' },
        { status: 403 }
      );
    }

    const order = await purchaseService.getOrderDetails(params.orderId, account._id);

    return NextResponse.json(
      {
        success: true,
        data: {
          id: order._id,
          orderNumber: order.orderNumber,
          invoiceNumber: order.invoiceNumber,
          status: order.orderStatus,
          paymentStatus: order.paymentStatus,
          items: order.items,
          pricing: order.pricing,
          paymentMethod: order.paymentMethod,
          createdAt: order.createdAt,
          submittedAt: order.submittedAt,
          confirmedAt: order.confirmedAt,
        },
      },
      { status: 200 }
    );
  } catch (error) {
    console.error('[API] Error fetching order:', error);
    return NextResponse.json(
      { success: false, error: error.message || 'Failed to fetch order' },
      { status: error.message?.includes('Unauthorized') ? 403 : 500 }
    );
  }
}

export async function POST(request, { params }) {
  try {
    await connectDB();
    const { account, error: authError } = await requireAuth();
    if (authError) return authError;

    if (account.role !== 'Distributor') {
      return NextResponse.json(
        { success: false, error: 'Only distributors can manage orders' },
        { status: 403 }
      );
    }

    const body = await request.json();
    const action = body.action;

    if (action === 'confirm') {
      // Confirm payment
      const order = await purchaseService.confirmPayment(
        params.orderId,
        body.paymentReference,
        account._id
      );

      // Send notification
      await notificationService.notifyPurchaseSuccess(account._id, {
        orderNumber: order.orderNumber,
        totalAmount: order.pricing.grandTotal,
        orderId: order._id,
      });

      return NextResponse.json(
        {
          success: true,
          message: 'Payment confirmed and inventory updated',
          data: {
            orderId: order._id,
            status: order.orderStatus,
          },
        },
        { status: 200 }
      );
    } else if (action === 'cancel') {
      // Cancel order
      const order = await purchaseService.cancelOrder(
        params.orderId,
        account._id,
        body.reason
      );

      return NextResponse.json(
        {
          success: true,
          message: 'Order cancelled',
          data: {
            orderId: order._id,
            status: order.orderStatus,
          },
        },
        { status: 200 }
      );
    } else {
      return NextResponse.json(
        { success: false, error: 'Invalid action' },
        { status: 400 }
      );
    }
  } catch (error) {
    console.error('[API] Error processing order action:', error);
    return NextResponse.json(
      { success: false, error: error.message || 'Failed to process order' },
      { status: 500 }
    );
  }
}
