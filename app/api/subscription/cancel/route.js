/**
 * POST /api/subscription/cancel
 *
 * Cancel an active subscription
 * Immediately revokes access to plan features
 */

import { NextResponse } from 'next/server';
import { connectDB } from '@/lib/connectDB';
import { getLoginToken } from '@/lib/auth';
import Subscription from '@/models/subscriptionModel';
import SubscriptionUsage from '@/models/subscriptionUsageModel';

export async function POST(request) {
  try {
    await connectDB();

    // Authenticate
    const authToken = await getLoginToken();
    if (!authToken || !authToken.accountId) {
      return NextResponse.json(
        { success: false, error: 'Unauthorized' },
        { status: 401 }
      );
    }

    const merchantId = authToken.accountId;

    // Parse request
    const body = await request.json();
    const { reason = 'Not provided' } = body;

    // Get current subscription
    const subscription = await Subscription.findOne({
      merchantId,
      status: { $in: ['active', 'trial'] },
    });

    if (!subscription) {
      return NextResponse.json(
        { success: false, error: 'No active subscription found' },
        { status: 404 }
      );
    }

    // Update subscription
    subscription.status = 'cancelled';
    subscription.cancelledAt = new Date();
    subscription.cancellationReason = reason;
    await subscription.save();

    // Mark usage as inactive
    await SubscriptionUsage.updateMany(
      { merchantId, isActive: true },
      { isActive: false, cancelledAt: new Date() }
    );

    // Return confirmation
    return NextResponse.json(
      {
        success: true,
        data: {
          message: 'Subscription cancelled successfully',
          subscription: {
            id: subscription._id,
            status: subscription.status,
            planName: subscription.planName,
            cancelledAt: subscription.cancelledAt,
          },
          note: 'Your access to premium features will be revoked immediately. You can reactivate your subscription anytime.',
        },
      },
      { status: 200 }
    );
  } catch (error) {
    console.error('Error cancelling subscription:', error);
    return NextResponse.json(
      {
        success: false,
        error: 'Error cancelling subscription',
        details: error.message,
      },
      { status: 500 }
    );
  }
}

/**
 * GET /api/subscription/cancel
 *
 * Get cancellation confirmation details
 */
export async function GET(request) {
  try {
    await connectDB();

    // Authenticate
    const authToken = await getLoginToken();
    if (!authToken || !authToken.accountId) {
      return NextResponse.json(
        { success: false, error: 'Unauthorized' },
        { status: 401 }
      );
    }

    const merchantId = authToken.accountId;

    // Get subscription details
    const subscription = await Subscription.findOne({
      merchantId,
      status: { $in: ['active', 'trial'] },
    }).lean();

    if (!subscription) {
      return NextResponse.json(
        { success: false, error: 'No active subscription found' },
        { status: 404 }
      );
    }

    // Get usage data
    const usage = await SubscriptionUsage.findOne({
      merchantId,
      isActive: true,
    }).lean();

    return NextResponse.json(
      {
        success: true,
        data: {
          subscription: {
            planName: subscription.planName,
            currentPeriodEnd: subscription.currentPeriodEnd,
            status: subscription.status,
            billingCycle: subscription.billingCycle,
          },
          usage: {
            campaigns: usage?.metrics?.activeCampaigns || 0,
            scratchCards: usage?.metrics?.scratchCardsGenerated || 0,
            stores: usage?.metrics?.totalStoresCreated || 0,
          },
          cancellationWarnings: [
            'Your campaigns will become inactive',
            'Customers won\'t be able to access your QR codes',
            'Your data will be retained for 30 days',
            'You can reactivate anytime within 30 days',
          ],
        },
      },
      { status: 200 }
    );
  } catch (error) {
    console.error('Error fetching cancellation details:', error);
    return NextResponse.json(
      {
        success: false,
        error: 'Error fetching cancellation details',
        details: error.message,
      },
      { status: 500 }
    );
  }
}
