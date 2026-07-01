import { connectDB } from '@/lib/connectDB';
import { requireAuth } from '@/lib/auth';

/**
 * POST /api/analytics/cta-click
 *
 * Track CTA button clicks on pre-subscription dashboard
 * Helps understand which upgrade buttons users interact with most
 *
 * Body:
 * {
 *   ctaName: string,     // "hero_view_plans", "hero_upgrade_now", "plan_select", etc.
 *   section: string,     // "hero", "plans", "benefits", etc.
 *   sessionId: string,   // Client-side session ID
 *   metadata: object,    // Additional data (plan ID, billing cycle, etc.)
 *   timestamp: ISO8601
 * }
 */
export async function POST(request) {
  try {
    await connectDB();
    const { account } = await requireAuth();

    const body = await request.json();
    const { ctaName, section, sessionId, metadata = {}, timestamp } = body;

    if (!ctaName || !section || !sessionId) {
      return Response.json(
        { success: false, error: 'Missing required fields: ctaName, section, sessionId' },
        { status: 400 }
      );
    }

    // Log to database (create a simple analytics log)
    // For now, we'll just log to console in development
    const analyticsLog = {
      accountId: account._id,
      ctaName,
      section,
      sessionId,
      metadata,
      timestamp: new Date(timestamp),
      createdAt: new Date(),
    };

    // In a production app, you would insert this into an AnalyticsLog model
    console.log('[Analytics CTA Click]', analyticsLog);

    return Response.json(
      {
        success: true,
        message: 'CTA click tracked',
      },
      { status: 200 }
    );
  } catch (error) {
    console.error('CTA click tracking error:', error);
    return Response.json(
      {
        success: false,
        error: error.message || 'Failed to track CTA click',
      },
      { status: 500 }
    );
  }
}
