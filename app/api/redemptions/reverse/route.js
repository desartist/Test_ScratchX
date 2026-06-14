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

    // Authorization: Only Manager, Merchant, and Super_Admin can reverse redemptions
    if (!hasPermission(userRole, 'scan:redeem')) {
      return NextResponse.json(
        { success: false, error: 'Unauthorized', data: null },
        { status: 403 }
      );
    }

    // Get request body
    const body = await request.json();
    const { transactionId, reason } = body;

    if (!transactionId) {
      return NextResponse.json(
        { success: false, error: 'transactionId is required', data: null },
        { status: 400 }
      );
    }

    // Reverse redemption
    const result = await RedemptionService.reverseRedemption(
      transactionId,
      userId,
      reason || ''
    );

    return NextResponse.json(
      {
        success: true,
        data: result,
        message: 'Redemption reversed successfully'
      },
      { status: 200 }
    );
  } catch (error) {
    console.error('Error reversing redemption:', error);

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
