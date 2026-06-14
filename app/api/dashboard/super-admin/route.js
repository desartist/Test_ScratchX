import { requireAuth } from '@/lib/auth';
import dashboardService from '@/lib/dashboardService';

export async function GET() {
  try {
    const { account, error } = await requireAuth();
    if (error) return error;

    if (account.role !== 'Super_Admin') {
      return Response.json(
        { success: false, error: 'Unauthorized: Super Admin access required' },
        { status: 403 }
      );
    }

    const dashboardData = await dashboardService.getSuperAdminDashboard();

    return Response.json(
      {
        success: true,
        data: dashboardData,
      },
      { status: 200 }
    );
  } catch (err) {
    console.error('Super Admin dashboard error:', err);
    return Response.json(
      {
        success: false,
        error: err.message || 'Failed to fetch dashboard',
      },
      { status: 500 }
    );
  }
}
