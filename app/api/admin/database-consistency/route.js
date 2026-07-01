import { NextResponse } from 'next/server';
import { connectDB } from '@/lib/connectDB';
import DatabaseConsistencyService from '@/lib/databaseConsistencyService';
import { requireAuth } from '@/lib/auth';

/**
 * POST /api/admin/database-consistency
 *
 * Admin endpoint to check and repair campaign-store relationship inconsistencies
 * Includes three modes:
 * 1. check - Verify without making changes
 * 2. sync - Check and automatically repair (RECOMMENDED)
 * 3. audit - Get full relationship audit report
 *
 * Requires Super_Admin role
 */
export async function POST(request) {
  try {
    await connectDB();

    // Authenticate as Super_Admin
    const { account, error } = await requireAuth();
    if (error) return error;
    if (account.role !== 'Super_Admin') {
      return NextResponse.json(
        {
          success: false,
          error: 'Unauthorized - Super_Admin role required',
        },
        { status: 403 }
      );
    }

    const { mode = 'sync' } = await request.json();

    // Validate mode
    if (!['check', 'sync', 'audit'].includes(mode)) {
      return NextResponse.json(
        {
          success: false,
          error: 'Invalid mode. Use: check, sync, or audit',
        },
        { status: 400 }
      );
    }

    let report;

    if (mode === 'check') {
      // Check only, no repairs
      report = await DatabaseConsistencyService.checkConsistency();
    } else if (mode === 'sync') {
      // Check and repair (RECOMMENDED)
      report = await DatabaseConsistencyService.syncCampaignStoreRelationships();
    } else if (mode === 'audit') {
      // Full audit report
      report = await DatabaseConsistencyService.auditRelationships();
    }

    return NextResponse.json(
      {
        success: true,
        mode,
        data: report,
      },
      { status: 200 }
    );
  } catch (error) {
    console.error('Database consistency check error:', error);
    return NextResponse.json(
      {
        success: false,
        error: error.message || 'Internal server error',
      },
      { status: 500 }
    );
  }
}

/**
 * GET /api/admin/database-consistency
 *
 * Retrieve last consistency check report (read-only)
 * Requires Super_Admin role
 */
export async function GET(request) {
  try {
    await connectDB();

    // Authenticate as Super_Admin
    const user = await authenticate(request);
    if (!user || user.role !== 'Super_Admin') {
      return NextResponse.json(
        {
          success: false,
          error: 'Unauthorized - Super_Admin role required',
        },
        { status: 403 }
      );
    }

    // Get the mode from query params (default: check)
    const { searchParams } = new URL(request.url);
    const mode = searchParams.get('mode') || 'check';

    // Validate mode
    if (!['check', 'sync', 'audit'].includes(mode)) {
      return NextResponse.json(
        {
          success: false,
          error: 'Invalid mode. Use: check, sync, or audit',
        },
        { status: 400 }
      );
    }

    let report;

    if (mode === 'check') {
      report = await DatabaseConsistencyService.checkConsistency();
    } else if (mode === 'sync') {
      report = await DatabaseConsistencyService.syncCampaignStoreRelationships();
    } else if (mode === 'audit') {
      report = await DatabaseConsistencyService.auditRelationships();
    }

    return NextResponse.json(
      {
        success: true,
        mode,
        data: report,
      },
      { status: 200 }
    );
  } catch (error) {
    console.error('Database consistency check error:', error);
    return NextResponse.json(
      {
        success: false,
        error: error.message || 'Internal server error',
      },
      { status: 500 }
    );
  }
}
