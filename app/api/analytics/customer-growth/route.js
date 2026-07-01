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

    // Get all participations for this merchant
    const allParticipations = await CustomerParticipation.find({
      merchant_id: merchantId
    }).lean();

    // Generate weekly trend (last 7 days)
    const weeklyTrend = [];
    for (let i = 6; i >= 0; i--) {
      const date = new Date();
      date.setDate(date.getDate() - i);
      const dateStr = date.toLocaleDateString('en-US', { weekday: 'short' });

      const dayStart = new Date(date);
      dayStart.setHours(0, 0, 0, 0);
      const dayEnd = new Date(date);
      dayEnd.setHours(23, 59, 59, 999);

      // Get participations for this day
      const dayParticipations = allParticipations.filter(p => {
        const pDate = new Date(p.createdAt);
        return pDate >= dayStart && pDate <= dayEnd;
      });

      // Count new customers (first participation)
      const customerFirstParticipations = new Map();
      allParticipations.forEach(p => {
        const pDate = new Date(p.createdAt);
        if (!customerFirstParticipations.has(p.customer_mobile) || pDate < customerFirstParticipations.get(p.customer_mobile)) {
          customerFirstParticipations.set(p.customer_mobile, pDate);
        }
      });

      let newCustomers = 0;
      let repeatedCustomers = 0;

      dayParticipations.forEach(p => {
        const firstParticipationDate = customerFirstParticipations.get(p.customer_mobile);
        if (firstParticipationDate >= dayStart && firstParticipationDate <= dayEnd) {
          newCustomers++;
        } else {
          repeatedCustomers++;
        }
      });

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
          weeklyTrend
        },
        message: 'Customer growth data retrieved successfully'
      },
      { status: 200 }
    );
  } catch (error) {
    console.error('Error fetching customer growth:', error);
    return NextResponse.json(
      { success: false, error: 'Internal server error', data: null },
      { status: 500 }
    );
  }
}
