import { connectDB } from '@/lib/connectDB';
import { requireAuth } from '@/lib/auth';

/**
 * POST /api/analytics/ab-test-conversion
 *
 * Track A/B test conversions
 * Records when a user who was assigned variant A or B converts (purchases a plan)
 */
export async function POST(request) {
  try {
    await connectDB();
    const { account } = await requireAuth();

    const body = await request.json();
    const { variant, planId, planName, billingCycle, timestamp } = body;

    if (!variant || !planId || !planName) {
      return Response.json(
        { success: false, error: 'Missing required fields' },
        { status: 400 }
      );
    }

    const analyticsLog = {
      accountId: account._id,
      eventType: 'ab_test_conversion',
      variant,
      planId,
      planName,
      billingCycle,
      timestamp: new Date(timestamp),
      createdAt: new Date(),
    };

    console.log('[Analytics A/B Test Conversion]', analyticsLog);

    return Response.json(
      {
        success: true,
        message: 'A/B test conversion tracked',
      },
      { status: 200 }
    );
  } catch (error) {
    console.error('A/B test conversion tracking error:', error);
    return Response.json(
      {
        success: false,
        error: error.message || 'Failed to track A/B test conversion',
      },
      { status: 500 }
    );
  }
}
