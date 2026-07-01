import { NextResponse } from 'next/server';
import connectDB from '@/lib/db';
import RedemptionService from '@/lib/redemptionService';
import { hasPermission } from '@/lib/permissions';
import { ValidationError, NotFoundError } from '@/lib/errors';

export async function POST(request) {
  try {
    await connectDB();

    // Get user info from headers
    const userRole = request.headers.get('x-user-role');
    const userId = request.headers.get('x-user-id');
    const merchantId = request.headers.get('x-merchant-id') || userId;

    // Authorization: Only Store_Staff, Manager, and Super_Admin can redeem
    if (!hasPermission(userRole, 'scan:redeem')) {
      return NextResponse.json(
        { success: false, error: 'Unauthorized', data: null },
        { status: 403 }
      );
    }

    // Get request body
    const body = await request.json();
    const { redemptions } = body;

    // Check if bulk or single redemption
    if (!redemptions) {
      return NextResponse.json(
        { success: false, error: 'redemptions array is required', data: null },
        { status: 400 }
      );
    }

    let result;

    if (Array.isArray(redemptions) && redemptions.length > 1) {
      // Bulk redemption
      result = await RedemptionService.bulkRedeemScratchCards(
        merchantId,
        redemptions,
        userId
      );

      return NextResponse.json(
        {
          success: result.summary.failed === 0,
          data: result,
          message: `Bulk redemption completed: ${result.summary.success} successful, ${result.summary.failed} failed`
        },
        { status: result.summary.failed === 0 ? 200 : 207 }
      );
    } else if (Array.isArray(redemptions) && redemptions.length === 1) {
      // Single redemption
      const redemption = redemptions[0];
      result = await RedemptionService.redeemScratchCard(
        merchantId,
        redemption.campaignId,
        redemption.storeId,
        redemption.scratchCardId,
        userId,
        redemption.remarks || ''
      );

      return NextResponse.json(
        {
          success: true,
          data: result,
          message: 'Scratch card redeemed successfully'
        },
        { status: 200 }
      );
    } else {
      return NextResponse.json(
        { success: false, error: 'redemptions must be a non-empty array', data: null },
        { status: 400 }
      );
    }
  } catch (error) {
    console.error('Error redeeming scratch card:', error);

    if (error instanceof ValidationError) {
      return NextResponse.json(
        { success: false, error: error.message, data: null },
        { status: 400 }
      );
    }

    if (error instanceof NotFoundError) {
      return NextResponse.json(
        { success: false, error: error.message, data: null },
        { status: 404 }
      );
    }

    return NextResponse.json(
      { success: false, error: 'Internal server error', data: null },
      { status: 500 }
    );
  }
}
