import { NextResponse } from 'next/server';
import { connectDB } from '@/lib/connectDB';
import { requireAdmin } from '@/lib/adminAuth';
import {
  allocateScratchCardsToMerchant,
  getDistributorBalance,
} from '@/lib/services/distributorAllocationService';

/**
 * POST /api/admin/distributor/allocate-scratch
 * Allocate scratches from distributor to merchant
 * Admin-only endpoint
 *
 * @param {Request} request - Next.js request object
 * @returns {Response} - JSON response with allocation result
 */
export async function POST(request) {
  try {
    // Verify admin access (returns the authenticated admin account)
    const admin = await requireAdmin();
    await connectDB();

    // Parse request body
    const { distributorId, merchantId, merchantName, quantity } = await request.json();

    // Validate required fields
    if (!distributorId || !merchantId || !quantity) {
      return NextResponse.json(
        { success: false, error: 'Missing required fields' },
        { status: 400 }
      );
    }

    // Validate quantity
    if (quantity <= 0 || !Number.isInteger(quantity)) {
      return NextResponse.json(
        { success: false, error: 'Invalid quantity' },
        { status: 400 }
      );
    }

    // Admin id for the audit trail — taken from the verified session, not
    // from a client-supplied x-user-id header.
    const adminId = admin._id.toString();

    // Allocate scratches
    const result = await allocateScratchCardsToMerchant({
      distributorId,
      merchantId,
      merchantName,
      quantity,
      allocatedBy: adminId,
    });

    return NextResponse.json(
      {
        success: true,
        message: `${quantity} scratches allocated successfully`,
        allocation: result.allocation,
        newDistributorBalance: result.remaining,
        newMerchantBalance: result.allocation.quantity,
      },
      { status: 200 }
    );
  } catch (error) {
    console.error('Error allocating scratches:', error);

    // Determine appropriate status code
    const isUnauthorized = error.message?.includes('Unauthorized');
    const statusCode = isUnauthorized ? 403 : 400;

    return NextResponse.json(
      { success: false, error: error.message },
      { status: statusCode }
    );
  }
}

/**
 * GET /api/admin/distributor/allocate-scratch
 * Retrieve distributor balance and allocations
 * Admin-only endpoint
 *
 * @param {Request} request - Next.js request object
 * @returns {Response} - JSON response with balance and allocations
 */
export async function GET(request) {
  try {
    // Verify admin access (returns the authenticated admin account)
    const admin = await requireAdmin();
    await connectDB();

    // Parse query parameter
    const { searchParams } = new URL(request.url);
    const distributorId = searchParams.get('distributorId');

    // Validate required parameter
    if (!distributorId) {
      return NextResponse.json(
        { success: false, error: 'Missing distributorId' },
        { status: 400 }
      );
    }

    // Get distributor balance
    const balance = await getDistributorBalance(distributorId);

    return NextResponse.json(
      { success: true, distributorId, balance },
      { status: 200 }
    );
  } catch (error) {
    console.error('Error fetching balance:', error);

    // Determine appropriate status code
    const isUnauthorized = error.message?.includes('Unauthorized');
    const statusCode = isUnauthorized ? 403 : 500;

    return NextResponse.json(
      { success: false, error: error.message },
      { status: statusCode }
    );
  }
}
