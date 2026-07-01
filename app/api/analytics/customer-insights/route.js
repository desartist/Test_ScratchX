import { NextResponse } from 'next/server';
import connectDB from '@/lib/db';
import CustomerParticipation from '@/models/customerParticipationModel';
import { hasPermission } from '@/lib/permissions';

export async function GET(request) {
  try {
    await connectDB();

    const userRole = request.headers.get('x-user-role');
    const userId = request.headers.get('x-user-id');
    const merchantId = request.headers.get('x-merchant-id') || userId;

    // Authorization - check for analytics permission
    const hasAnalyticsPermission = hasPermission(userRole, 'analytics:own') ||
                                   hasPermission(userRole, 'analytics:read') ||
                                   hasPermission(userRole, 'analytics:own_merchants') ||
                                   hasPermission(userRole, 'analytics:own_store');

    if (!hasAnalyticsPermission) {
      return NextResponse.json(
        { success: false, error: 'Unauthorized', data: null },
        { status: 403 }
      );
    }

    // Get last 7 days of customer data
    const sevenDaysAgo = new Date();
    sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);

    // Fetch all participations for this merchant in last 7 days
    const recentParticipations = await CustomerParticipation.find({
      merchant_id: merchantId,
      createdAt: { $gte: sevenDaysAgo }
    }).lean();

    // Get all unique customers
    const allCustomers = await CustomerParticipation.find({
      merchant_id: merchantId
    }).lean();

    // Calculate metrics
    const totalCustomers = new Set(allCustomers.map(p => p.customer_mobile)).size;
    const newCustomersThisWeek = new Set(recentParticipations.map(p => p.customer_mobile)).size;
    const repeatedCustomersThisWeek = recentParticipations.filter(p => {
      const otherParticipations = allCustomers.filter(ap => ap.customer_mobile === p.customer_mobile);
      return otherParticipations.length > 1;
    }).length;

    const repeatedCustomerRate = totalCustomers > 0
      ? Math.round((repeatedCustomersThisWeek / totalCustomers) * 100)
      : 0;

    const growthPercentage = 12; // Mock growth for demo

    // Generate weekly trend
    const weeklyTrend = [];
    for (let i = 6; i >= 0; i--) {
      const date = new Date();
      date.setDate(date.getDate() - i);
      const dateStr = date.toLocaleDateString('en-US', { weekday: 'short' });

      const dayStart = new Date(date);
      dayStart.setHours(0, 0, 0, 0);
      const dayEnd = new Date(date);
      dayEnd.setHours(23, 59, 59, 999);

      const dayParticipations = allCustomers.filter(p => {
        const pDate = new Date(p.createdAt);
        return pDate >= dayStart && pDate <= dayEnd;
      });

      const newCustomers = new Set(dayParticipations.map(p => p.customer_mobile)).size;
      const repeatedCustomers = dayParticipations.filter(p => {
        const otherParticipations = allCustomers.filter(ap =>
          ap.customer_mobile === p.customer_mobile &&
          ap._id.toString() !== p._id.toString()
        );
        return otherParticipations.length > 0;
      }).length;

      weeklyTrend.push({
        day: dateStr,
        new: newCustomers,
        repeat: repeatedCustomers
      });
    }

    return NextResponse.json(
      {
        success: true,
        data: {
          totalCustomers,
          newCustomers: newCustomersThisWeek,
          repeatedCustomers: repeatedCustomersThisWeek,
          growthPercentage,
          repeatedCustomerRate,
          weeklyTrend
        },
        message: 'Customer insights retrieved successfully'
      },
      { status: 200 }
    );
  } catch (error) {
    console.error('Error fetching customer insights:', error);
    return NextResponse.json(
      { success: false, error: 'Internal server error', data: null },
      { status: 500 }
    );
  }
}
