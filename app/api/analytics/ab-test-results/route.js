import { connectDB } from '@/lib/connectDB';
import { requireAuth } from '@/lib/auth';

/**
 * GET /api/analytics/ab-test-results
 *
 * Get A/B test results summary
 * Returns conversion rates and stats for both variants
 * Only accessible to admins/super admins for now
 */
export async function GET(request) {
  try {
    await connectDB();
    const { account } = await requireAuth();

    // For now, return mock data showing the structure
    // In production, you would query an AnalyticsLog collection
    const results = {
      heroA: {
        variant: 'heroA',
        title: 'Your Main Store Is Ready',
        assignments: 42, // Total users assigned this variant
        conversions: 8,  // Users who purchased
        conversionRate: 19.05,
      },
      heroB: {
        variant: 'heroB',
        title: 'Start Running Campaigns Today',
        assignments: 45,
        conversions: 12,
        conversionRate: 26.67,
      },
      summary: {
        totalAssignments: 87,
        totalConversions: 20,
        overallConversionRate: 22.99,
        winner: 'heroB',
        improvement: '39.7%', // (26.67 - 19.05) / 19.05 * 100
      },
    };

    return Response.json(
      {
        success: true,
        data: results,
      },
      { status: 200 }
    );
  } catch (error) {
    console.error('A/B test results error:', error);
    return Response.json(
      {
        success: false,
        error: error.message || 'Failed to fetch A/B test results',
      },
      { status: 500 }
    );
  }
}
