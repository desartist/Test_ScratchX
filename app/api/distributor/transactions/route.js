/**
 * GET /api/distributor/transactions - Get transaction history
 * GET /api/distributor/transactions/balance - Get current balance
 * GET /api/distributor/transactions/summary - Get period summary
 */

import { NextResponse } from 'next/server';
import { connectDB } from '@/lib/connectDB';
import { requireAuth } from '@/lib/auth';
import { transactionService } from '@/lib/services/distributor';

export async function GET(request) {
  try {
    await connectDB();
    const { account, error: authError } = await requireAuth();
    if (authError) return authError;

    if (account.role !== 'Distributor') {
      return NextResponse.json(
        { success: false, error: 'Only distributors can view transactions' },
        { status: 403 }
      );
    }

    const url = new URL(request.url);
    const endpoint = url.pathname.split('/').pop();
    const type = url.searchParams.get('type');
    const direction = url.searchParams.get('direction');
    const startDate = url.searchParams.get('startDate');
    const endDate = url.searchParams.get('endDate');
    const page = parseInt(url.searchParams.get('page') || '1');
    const limit = parseInt(url.searchParams.get('limit') || '50');

    // Handle balance endpoint
    if (endpoint === 'balance') {
      const balance = await transactionService.getCurrentBalance(account._id);
      return NextResponse.json(
        {
          success: true,
          data: balance,
        },
        { status: 200 }
      );
    }

    // Handle summary endpoint
    if (endpoint === 'summary') {
      if (!startDate || !endDate) {
        return NextResponse.json(
          { success: false, error: 'startDate and endDate are required' },
          { status: 400 }
        );
      }

      const summary = await transactionService.getTransactionSummary(
        account._id,
        startDate,
        endDate
      );

      return NextResponse.json(
        {
          success: true,
          data: summary,
        },
        { status: 200 }
      );
    }

    // Handle history endpoint (default)
    const filters = {
      transactionType: type || undefined,
      direction: direction || undefined,
      startDate: startDate || undefined,
      endDate: endDate || undefined,
      skip: (page - 1) * limit,
      limit,
    };

    const result = await transactionService.getTransactionHistory(
      account._id,
      filters
    );

    return NextResponse.json(
      {
        success: true,
        data: {
          transactions: result.transactions.map((t) => ({
            id: t._id,
            transactionId: t.transactionId,
            type: t.transactionType,
            amount: t.amount,
            direction: t.transactionDirection,
            balanceBefore: t.balanceBefore,
            balanceAfter: t.balanceAfter,
            status: t.status,
            description: t.description,
            createdAt: t.createdAt,
          })),
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
    console.error('[API] Error fetching transactions:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to fetch transactions' },
      { status: 500 }
    );
  }
}
