/**
 * POST /api/cron/email-reminders
 *
 * Cron job endpoint for sending automated email reminders
 * Can be triggered by: Vercel Cron, Zapier, or external scheduler
 *
 * Headers required:
 * - Authorization: Bearer CRON_SECRET_TOKEN (from env variable)
 */

import { NextResponse } from 'next/server';
import { runEmailRemindersCron } from '@/lib/crons/emailReminders';

export async function POST(request) {
  try {
    // Verify cron token for security
    const authHeader = request.headers.get('authorization');
    const cronSecret = process.env.CRON_SECRET_TOKEN;

    if (!cronSecret || !authHeader || !authHeader.includes(cronSecret)) {
      return NextResponse.json(
        { success: false, error: 'Unauthorized' },
        { status: 401 }
      );
    }

    // Run the cron job
    const result = await runEmailRemindersCron();

    return NextResponse.json(
      {
        success: result.success,
        message: result.success
          ? `Email reminders sent: ${result.totalSent} total (${result.trialReminders} trial, ${result.quotaWarnings} quota)`
          : 'Failed to run email reminders',
        data: result,
      },
      { status: result.success ? 200 : 500 }
    );
  } catch (error) {
    console.error('Cron endpoint error:', error);
    return NextResponse.json(
      {
        success: false,
        error: 'Cron job failed',
        details: error.message,
      },
      { status: 500 }
    );
  }
}

/**
 * GET /api/cron/email-reminders (for testing)
 */
export async function GET(request) {
  try {
    const cronSecret = process.env.CRON_SECRET_TOKEN;
    const token = request.nextUrl.searchParams.get('token');

    if (!cronSecret || token !== cronSecret) {
      return NextResponse.json(
        { success: false, error: 'Unauthorized' },
        { status: 401 }
      );
    }

    const result = await runEmailRemindersCron();

    return NextResponse.json({
      success: result.success,
      timestamp: new Date().toISOString(),
      data: result,
    });
  } catch (error) {
    return NextResponse.json(
      {
        success: false,
        error: error.message,
      },
      { status: 500 }
    );
  }
}
