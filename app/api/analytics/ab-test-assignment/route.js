import { connectDB } from '@/lib/connectDB';
import { requireAuth } from '@/lib/auth';

/**
 * POST /api/analytics/ab-test-assignment
 *
 * Track A/B test variant assignment
 * Records which variant (heroA or heroB) was assigned to the user
 */
export async function POST(request) {
  try {
    await connectDB();
    const { account } = await requireAuth();

    const body = await request.json();
    const { variant, timestamp } = body;

    if (!variant) {
      return Response.json(
        { success: false, error: 'Missing variant' },
        { status: 400 }
      );
    }

    const analyticsLog = {
      accountId: account._id,
      eventType: 'ab_test_assignment',
      variant,
      timestamp: new Date(timestamp),
      createdAt: new Date(),
    };

    console.log('[Analytics A/B Test Assignment]', analyticsLog);

    return Response.json(
      {
        success: true,
        message: 'A/B test assignment tracked',
      },
      { status: 200 }
    );
  } catch (error) {
    console.error('A/B test assignment tracking error:', error);
    return Response.json(
      {
        success: false,
        error: error.message || 'Failed to track A/B test assignment',
      },
      { status: 500 }
    );
  }
}
