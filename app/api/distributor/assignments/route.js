/**
 * POST /api/distributor/assignments - Assign plan to retailer
 * GET /api/distributor/assignments - Get all assignments
 */

import { NextResponse } from 'next/server';
import { connectDB } from '@/lib/connectDB';
import { requireAuth } from '@/lib/auth';
import { assignmentService, notificationService } from '@/lib/services/distributor';
import Distributor from '@/models/distributorModel';

export async function POST(request) {
  try {
    await connectDB();
    const { account, error: authError } = await requireAuth();
    if (authError) return authError;

    if (account.role !== 'Distributor') {
      return NextResponse.json(
        { success: false, error: 'Only distributors can assign plans' },
        { status: 403 }
      );
    }

    const body = await request.json();
    const { retailerId, planType, planId, planMRP, notes } = body;

    // Validate required fields
    if (!retailerId || !planType) {
      return NextResponse.json(
        { success: false, error: 'retailerId and planType are required' },
        { status: 400 }
      );
    }

    // Validate planType
    if (!['CORE', 'SMART'].includes(planType)) {
      return NextResponse.json(
        { success: false, error: 'Invalid planType' },
        { status: 400 }
      );
    }

    // Get distributor's commission for pricing
    const distributor = await Distributor.findById(account._id).select(
      'commission.percentagePerSale'
    );
    const commission = distributor?.commission?.percentagePerSale || 0;

    // Calculate MRP based on plan type if not provided
    const defaultPrices = {
      CORE: 2477, // With GST
      SMART: 3539, // With GST
    };
    const finalMRP = planMRP || defaultPrices[planType];

    // Assign plan
    const { assignment, subscription, commission: commissionRecord } =
      await assignmentService.assignPlanToRetailer(
        {
          distributorId: account._id,
          retailerId,
          planType,
          planId,
          planMRP: finalMRP,
          notes,
        },
        account._id
      );

    // Send notifications
    await notificationService.notifyPlanAssigned(
      account._id,
      'Retailer', // TODO: Get retailer name
      planType
    );

    return NextResponse.json(
      {
        success: true,
        message: 'Plan assigned successfully',
        data: {
          assignmentId: assignment._id,
          assignmentNumber: assignment.assignmentNumber,
          subscriptionId: subscription._id,
          status: assignment.status,
          planType: assignment.planType,
          distributorProfit: assignment.distributorProfit,
        },
      },
      { status: 201 }
    );
  } catch (error) {
    console.error('[API] Error assigning plan:', error);
    return NextResponse.json(
      {
        success: false,
        error: error.message || 'Failed to assign plan',
      },
      { status: 400 }
    );
  }
}

export async function GET(request) {
  try {
    await connectDB();
    const { account, error: authError } = await requireAuth();
    if (authError) return authError;

    if (account.role !== 'Distributor') {
      return NextResponse.json(
        { success: false, error: 'Only distributors can view assignments' },
        { status: 403 }
      );
    }

    const url = new URL(request.url);
    const status = url.searchParams.get('status');
    const planType = url.searchParams.get('planType');
    const page = parseInt(url.searchParams.get('page') || '1');
    const limit = parseInt(url.searchParams.get('limit') || '20');

    const filters = {
      status: status || undefined,
      planType: planType || undefined,
      skip: (page - 1) * limit,
      limit,
    };

    const result = await assignmentService.getDistributorAssignments(
      account._id,
      filters
    );

    return NextResponse.json(
      {
        success: true,
        data: {
          assignments: result.assignments.map((a) => ({
            id: a._id,
            assignmentNumber: a.assignmentNumber,
            retailerId: a.retailerId._id,
            retailerName: a.retailerId.profile?.companyName || a.retailerId.name,
            retailerEmail: a.retailerId.email,
            planType: a.planType,
            status: a.status,
            assignmentValue: a.assignmentValue,
            distributorProfit: a.distributorProfit,
            assignedAt: a.assignedAt,
            retailerActivated: a.retailerActivated,
          })),
          pagination: {
            page,
            limit,
            total: result.total,
          },
        },
      },
      { status: 200 }
    );
  } catch (error) {
    console.error('[API] Error fetching assignments:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to fetch assignments' },
      { status: 500 }
    );
  }
}
