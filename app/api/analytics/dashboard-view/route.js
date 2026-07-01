import { connectDB } from '@/lib/connectDB';
import { requireAuth } from '@/lib/auth';

/**
 * POST /api/analytics/dashboard-view
 *
 * Track when a user views the pre-subscription dashboard
 * Helps understand engagement metrics
 */
export async function POST(request) {
  try {
    await connectDB();
    const { account } = await requireAuth();

    const body = await request.json();
    const { sessionId, timestamp } = body;

    if (!sessionId) {
      return Response.json(
        { success: false, error: 'Missing sessionId' },
        { status: 400 }
      );
    }

    const analyticsLog = {
      accountId: account._id,
      eventType: 'dashboard_view',
      sessionId,
      timestamp: new Date(timestamp),
      createdAt: new Date(),
    };

    // In a production app, you would insert this into an AnalyticsLog model
    console.log('[Analytics Dashboard View]', analyticsLog);

    return Response.json(
      {
        success: true,
        message: 'Dashboard view tracked',
      },
      { status: 200 }
    );
  } catch (error) {
    console.error('Dashboard view tracking error:', error);
    return Response.json(
      {
        success: false,
        error: error.message || 'Failed to track dashboard view',
      },
      { status: 500 }
    );
  }
}
