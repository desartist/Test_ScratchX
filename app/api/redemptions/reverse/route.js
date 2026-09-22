import { NextResponse } from 'next/server';
import connectDB from '@/lib/db';
import RedemptionService from '@/lib/redemptionService';
import { hasPermission } from '@/lib/permissions';
import { ValidationError, NotFoundError } from '@/lib/errors';
import { requireAuth } from '@/lib/auth';

export async function POST(request) {
  try {
    await connectDB();

    // Identity comes from the signed session cookie, never from
    // client-supplied x-user-* headers (those are trivially forged).
    const { account, error: authError } = await requireAuth();
    if (authError) return authError;
    const userRole = account.role;
    const userId = account._id.toString();

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
