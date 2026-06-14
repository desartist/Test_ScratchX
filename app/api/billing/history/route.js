/**
 * GET /api/billing/history
 *
 * Get billing history and invoices for merchant
 */

import { NextResponse } from 'next/server';
import { connectDB } from '@/lib/connectDB';
import { getLoginToken } from '@/lib/auth';
import Invoice from '@/models/invoiceModel';
import Payment from '@/models/paymentModel';

export async function GET(request) {
  try {
    await connectDB();

    // Authenticate
    const authToken = await getLoginToken();
    if (!authToken || !authToken.accountId) {
      return NextResponse.json(
        { success: false, error: 'Unauthorized' },
        { status: 401 }
      );
    }

    const merchantId = authToken.accountId.toString();

    // Get query params
    const { searchParams } = new URL(request.url);
    const page = parseInt(searchParams.get('page')) || 1;
    const limit = parseInt(searchParams.get('limit')) || 10;
    const skip = (page - 1) * limit;

    // Get invoices
    const invoices = await Invoice.find({ merchantId })
      .sort({ issuedDate: -1 })
      .skip(skip)
      .limit(limit)
      .lean();

    // Get total count
    const total = await Invoice.countDocuments({ merchantId });

    // Get recent payments
    const payments = await Payment.find({ merchantId: authToken.accountId })
      .sort({ createdAt: -1 })
      .limit(5)
      .lean();

    // Calculate summary
    const summary = {
      totalPaid: invoices
        .filter(i => i.status === 'paid')
        .reduce((sum, i) => sum + i.totalAmount, 0),
      totalOutstanding: invoices
        .filter(i => i.status === 'overdue')
        .reduce((sum, i) => sum + i.totalAmount, 0),
      totalInvoices: total,
    };

    return NextResponse.json(
      {
        success: true,
        data: {
          invoices,
          payments,
          summary,
          pagination: {
            page,
            limit,
            total,
            pages: Math.ceil(total / limit),
          },
        },
      },
      { status: 200 }
    );
  } catch (error) {
    console.error('Error fetching billing history:', error);
    return NextResponse.json(
      {
        success: false,
        error: 'Error fetching billing history',
        details: error.message,
      },
      { status: 500 }
    );
  }
}
