/**
 * GET /api/distributor/notifications - Get notifications
 */

import { NextResponse } from 'next/server';
import { connectDB } from '@/lib/connectDB';
import { requireAuth } from '@/lib/auth';
import { notificationService } from '@/lib/services/distributor';

export async function GET(request) {
  try {
    await connectDB();
    const { account, error: authError } = await requireAuth();
    if (authError) return authError;

    if (account.role !== 'Distributor') {
      return NextResponse.json(
        { success: false, error: 'Only distributors can view notifications' },
        { status: 403 }
      );
    }

    const url = new URL(request.url);
    const type = url.searchParams.get('type');
    const read = url.searchParams.get('read');
    const page = parseInt(url.searchParams.get('page') || '1');
    const limit = parseInt(url.searchParams.get('limit') || '20');

    const filters = {
      type: type || undefined,
      read: read === 'true' ? true : read === 'false' ? false : undefined,
      skip: (page - 1) * limit,
      limit,
    };

    const result = await notificationService.getNotifications(account._id, filters);

    return NextResponse.json(
      {
        success: true,
        data: {
          notifications: result.notifications.map((n) => ({
            id: n._id,
            type: n.type,
            title: n.title,
            message: n.message,
            read: n.read,
            data: n.data,
            createdAt: n.createdAt,
            readAt: n.readAt,
          })),
          unread: result.unread,
          pagination: {
            page,
            limit,
            total: result.total,
          },
        },
      },
      { status: 200 }
    );
  } catch (error) {
    console.error('[API] Error fetching notifications:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to fetch notifications' },
      { status: 500 }
    );
  }
}
