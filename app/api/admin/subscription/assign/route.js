import { NextResponse } from 'next/server';
import { connectDB } from '@/lib/connectDB';
import { requireAdmin } from '@/lib/adminAuth';
import { assignPlanToOwner, getPlanForOwner } from '@/lib/services/planAssignmentService';

/**
 * POST /api/admin/subscription/assign
 * Admin-only endpoint for assigning plans to merchants or distributors
 *
 * Request body:
 * {
 *   ownerType: 'merchant' | 'distributor',
 *   ownerId: ObjectId,
 *   planId: ObjectId,
 *   planCode: string (plan name)
 * }
 *
 * Response:
 * {
 *   success: boolean,
 *   message: string,
 *   subscription: object,
 *   plan: object,
 *   usage: object,
 *   balance?: object (for distributors)
 * }
 */
export async function POST(request) {
  try {
    // Verify admin access
    await requireAdmin();
    await connectDB();

    const body = await request.json();
    const { ownerType, ownerId, planId, planCode } = body;

    // Validation
    if (!ownerType) {
      return NextResponse.json(
        { success: false, error: 'ownerType is required' },
        { status: 400 }
      );
    }

    if (!['merchant', 'distributor'].includes(ownerType)) {
      return NextResponse.json(
        { success: false, error: 'Invalid ownerType. Must be merchant or distributor' },
        { status: 400 }
      );
    }

    if (!ownerId) {
      return NextResponse.json(
        { success: false, error: 'ownerId is required' },
        { status: 400 }
      );
    }

    if (!planId) {
      return NextResponse.json(
        { success: false, error: 'planId is required' },
        { status: 400 }
      );
    }

    if (!planCode) {
      return NextResponse.json(
        { success: false, error: 'planCode is required' },
        { status: 400 }
      );
    }

    // Assign the plan
    const result = await assignPlanToOwner({
      ownerType,
      ownerId,
      planId,
      planCode
    });

    // Handle service errors
    if (!result.success) {
      return NextResponse.json(
        { success: false, error: result.error },
        { status: 400 }
      );
    }

    // Return success response
    return NextResponse.json(
      {
        success: true,
        message: `Plan assigned to ${ownerType} successfully`,
        subscription: result.subscription,
        plan: result.plan,
        usage: result.usage,
        ...(result.balance && { balance: result.balance })
      },
      { status: 200 }
    );
  } catch (error) {
    console.error('Error in POST /api/admin/subscription/assign:', error);

    const statusCode = error.message?.includes('Unauthorized') ? 403 : 500;
    const errorMessage = error.message?.includes('Unauthorized')
      ? 'Unauthorized: Admin access required'
      : error.message || 'Internal server error';

    return NextResponse.json(
      { success: false, error: errorMessage },
      { status: statusCode }
    );
  }
}

/**
 * GET /api/admin/subscription/assign?ownerType=merchant&ownerId=XXX
 * Admin-only endpoint for retrieving current plan for an owner
 *
 * Query parameters:
 *   ownerType: 'merchant' | 'distributor'
 *   ownerId: ObjectId
 *
 * Response:
 * {
 *   success: boolean,
 *   subscription: object | null,
 *   plan: object | null,
 *   usage: object | null
 * }
 */
export async function GET(request) {
  try {
    // Verify admin access
    await requireAdmin();
    await connectDB();

    const { searchParams } = new URL(request.url);
    const ownerType = searchParams.get('ownerType');
    const ownerId = searchParams.get('ownerId');

    // Validation
    if (!ownerType) {
      return NextResponse.json(
        { success: false, error: 'ownerType query parameter is required' },
        { status: 400 }
      );
    }

    if (!ownerId) {
      return NextResponse.json(
        { success: false, error: 'ownerId query parameter is required' },
        { status: 400 }
      );
    }

    if (!['merchant', 'distributor'].includes(ownerType)) {
      return NextResponse.json(
        { success: false, error: 'Invalid ownerType. Must be merchant or distributor' },
        { status: 400 }
      );
    }

    // Get the plan for the owner
    const result = await getPlanForOwner(ownerType, ownerId);

    return NextResponse.json(
      {
        success: true,
        subscription: result.subscription,
        plan: result.plan,
        usage: result.usage
      },
      { status: 200 }
    );
  } catch (error) {
    console.error('Error in GET /api/admin/subscription/assign:', error);

    const statusCode = error.message?.includes('Unauthorized') ? 403 : 500;
    const errorMessage = error.message?.includes('Unauthorized')
      ? 'Unauthorized: Admin access required'
      : error.message || 'Internal server error';

    return NextResponse.json(
      { success: false, error: errorMessage },
      { status: statusCode }
    );
  }
}
