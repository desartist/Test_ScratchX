import { connectDB } from '@/lib/connectDB';
import { requireAuth } from '@/lib/auth';

/**
 * POST /api/analytics/plan-selection
 *
 * Track when a user selects a plan (before purchase)
 * Helps understand which plans are most popular
 */
export async function POST(request) {
  try {
    await connectDB();
    const { account } = await requireAuth();

    const body = await request.json();
    const { planId, planName, billingCycle, sessionId, timestamp } = body;

    if (!planId || !planName || !billingCycle) {
      return Response.json(
        { success: false, error: 'Missing required fields' },
        { status: 400 }
      );
    }

    const analyticsLog = {
      accountId: account._id,
      eventType: 'plan_selection',
      planId,
      planName,
      billingCycle,
      sessionId,
      timestamp: new Date(timestamp),
      createdAt: new Date(),
    };

    console.log('[Analytics Plan Selection]', analyticsLog);

    return Response.json(
      {
        success: true,
        message: 'Plan selection tracked',
      },
      { status: 200 }
    );
  } catch (error) {
    console.error('Plan selection tracking error:', error);
    return Response.json(
      {
        success: false,
        error: error.message || 'Failed to track plan selection',
      },
      { status: 500 }
    );
  }
}
