import { requireAuth } from '@/lib/auth';
import dashboardService from '@/lib/dashboardService';

export async function GET() {
  try {
    const { account, error } = await requireAuth();
    if (error) return error;

    if (account.role !== 'Distributor') {
      return Response.json(
        { success: false, error: 'Unauthorized: Distributor access required' },
        { status: 403 }
      );
    }

    const dashboardData = await dashboardService.getDistributorDashboard(account._id);

    if (!dashboardData.success) {
      return Response.json(
        {
          success: false,
          error: dashboardData.error,
        },
        { status: 400 }
      );
    }

    return Response.json(
      {
        success: true,
        data: dashboardData,
      },
      { status: 200 }
    );
  } catch (err) {
    console.error('Distributor dashboard error:', err);
    return Response.json(
      {
        success: false,
        error: err.message || 'Failed to fetch dashboard',
      },
      { status: 500 }
    );
  }
}
