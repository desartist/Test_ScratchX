import { connectDB } from '@/lib/connectDB';
import { requireAuth } from '@/lib/auth';

/**
 * POST /api/analytics/subscription-purchase
 *
 * Track successful subscription purchases
 * Helps understand conversion funnel and plan popularity
 */
export async function POST(request) {
  try {
    await connectDB();
    const { account } = await requireAuth();

    const body = await request.json();
    const { planId, planName, billingCycle, amount, sessionId, timestamp } = body;

    if (!planId || !planName || !billingCycle) {
      return Response.json(
        { success: false, error: 'Missing required fields' },
        { status: 400 }
      );
    }

    const analyticsLog = {
      accountId: account._id,
      eventType: 'subscription_purchase',
      planId,
      planName,
      billingCycle,
      amount,
      sessionId,
      timestamp: new Date(timestamp),
      createdAt: new Date(),
    };

    console.log('[Analytics Subscription Purchase]', analyticsLog);

    return Response.json(
      {
        success: true,
        message: 'Subscription purchase tracked',
      },
      { status: 200 }
    );
  } catch (error) {
    console.error('Subscription purchase tracking error:', error);
    return Response.json(
      {
        success: false,
        error: error.message || 'Failed to track subscription purchase',
      },
      { status: 500 }
    );
  }
}
