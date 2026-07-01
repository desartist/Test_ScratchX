/**
 * GET /api/distributor/inventory - Get inventory summary
 * GET /api/distributor/inventory/alerts - Get low inventory alerts
 */

import { NextResponse } from 'next/server';
import { connectDB } from '@/lib/connectDB';
import { requireAuth } from '@/lib/auth';
import { inventoryService } from '@/lib/services/distributor';

export async function GET(request) {
  try {
    await connectDB();
    const { account, error: authError } = await requireAuth();
    if (authError) return authError;

    if (account.role !== 'Distributor') {
      return NextResponse.json(
        { success: false, error: 'Only distributors can view inventory' },
        { status: 403 }
      );
    }

    const url = new URL(request.url);
    const planType = url.searchParams.get('planType');

    let data;

    if (planType) {
      // Get specific plan inventory
      data = await inventoryService.getPlanInventory(account._id, planType);

      if (!data) {
        return NextResponse.json(
          {
            success: true,
            data: {
              planType,
              totalPurchased: 0,
              totalAssigned: 0,
              totalRemaining: 0,
              utilizationPercentage: 0,
              message: 'No inventory for this plan type yet',
            },
          },
          { status: 200 }
        );
      }
    } else {
      // Get all inventory
      data = await inventoryService.getDistributorInventory(account._id);
    }

    return NextResponse.json(
      {
        success: true,
        data,
      },
      { status: 200 }
    );
  } catch (error) {
    console.error('[API] Error fetching inventory:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to fetch inventory' },
      { status: 500 }
    );
  }
}
