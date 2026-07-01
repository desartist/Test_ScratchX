/**
 * POST /api/distributor/orders - Create new order
 * GET /api/distributor/orders - Get order history
 */

import { NextResponse } from 'next/server';
import { connectDB } from '@/lib/connectDB';
import { requireAuth } from '@/lib/auth';
import { purchaseService, notificationService } from '@/lib/services/distributor';

export async function POST(request) {
  try {
    await connectDB();
    const { account, error: authError } = await requireAuth();
    if (authError) return authError;

    // Only distributors can create orders
    if (account.role !== 'Distributor') {
      return NextResponse.json(
        { success: false, error: 'Only distributors can create orders' },
        { status: 403 }
      );
    }

    const body = await request.json();
    const { items } = body;

    if (!items || !Array.isArray(items) || items.length === 0) {
      return NextResponse.json(
        { success: false, error: 'Items array is required' },
        { status: 400 }
      );
    }

    // Create draft order
    const { order, pricing } = await purchaseService.createDraftOrder(
      account._id,
      items,
      account._id
    );

    console.log(`[API] Created order: ${order.orderNumber}`);

    return NextResponse.json(
      {
        success: true,
        data: {
          orderId: order._id,
          orderNumber: order.orderNumber,
          pricing,
          status: order.orderStatus,
        },
      },
      { status: 201 }
    );
  } catch (error) {
    console.error('[API] Error creating order:', error);
    return NextResponse.json(
      { success: false, error: error.message || 'Failed to create order' },
      { status: 500 }
    );
  }
}

export async function GET(request) {
  try {
    await connectDB();
    const { account, error: authError } = await requireAuth();
    if (authError) return authError;

    // Only distributors can view their orders
    if (account.role !== 'Distributor') {
      return NextResponse.json(
        { success: false, error: 'Only distributors can view orders' },
        { status: 403 }
      );
    }

    const url = new URL(request.url);
    const status = url.searchParams.get('status');
    const page = parseInt(url.searchParams.get('page') || '1');
    const limit = parseInt(url.searchParams.get('limit') || '20');

    const filters = {
      status: status || undefined,
      skip: (page - 1) * limit,
      limit,
    };

    const result = await purchaseService.getOrderHistory(account._id, filters);

    return NextResponse.json(
      {
        success: true,
        data: {
          orders: result.orders.map((o) => ({
            id: o._id,
            orderNumber: o.orderNumber,
            status: o.orderStatus,
            paymentStatus: o.paymentStatus,
            total: o.pricing.grandTotal,
            items: o.items.length,
            createdAt: o.createdAt,
          })),
          pagination: {
            page,
            limit,
            total: result.total,
            pages: result.pages,
          },
        },
      },
      { status: 200 }
    );
  } catch (error) {
    console.error('[API] Error fetching orders:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to fetch orders' },
      { status: 500 }
    );
  }
}
