import { connectDB } from '@/lib/connectDB';
import Campaign from '@/models/campaignModel';

/**
 * PUT /api/campaigns/update-status
 * Check all campaigns and update their status if ended
 * This endpoint checks if campaigns have reached their endDate and updates status to "ended"
 */
export async function PUT(request) {
  try {
    await connectDB();

    const now = new Date();

    // Single bulk update instead of a find-then-save-per-doc loop.
    const result = await Campaign.updateMany(
      {
        status: { $ne: 'ended' }, // Not already ended
        endDate: { $lt: now } // End date is in the past
      },
      { status: 'ended' }
    );

    return Response.json(
      {
        success: true,
        message: `Updated ${result.modifiedCount} campaign(s) to ended status`,
        updated: result.modifiedCount,
      },
      { status: 200 }
    );
  } catch (error) {
    console.error('Error updating campaign status:', error);
    return Response.json(
      { success: false, error: error.message },
      { status: 500 }
    );
  }
}
