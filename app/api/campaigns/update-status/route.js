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

    // Find all active campaigns that have passed their end date
    const endedCampaigns = await Campaign.find({
      status: { $ne: 'ended' }, // Not already ended
      endDate: { $lt: now } // End date is in the past
    });

    if (endedCampaigns.length === 0) {
      return Response.json(
        {
          success: true,
          message: 'No campaigns to update',
          updated: 0,
          campaigns: []
        },
        { status: 200 }
      );
    }

    // Update all ended campaigns
    const updatedCampaigns = [];
    for (const campaign of endedCampaigns) {
      campaign.status = 'ended';
      await campaign.save();
      updatedCampaigns.push({
        _id: campaign._id,
        campaignName: campaign.campaignName,
        endDate: campaign.endDate,
        previousStatus: campaign.status,
        newStatus: 'ended'
      });
    }

    console.log(`✅ Updated ${updatedCampaigns.length} campaign(s) to ended status`);

    return Response.json(
      {
        success: true,
        message: `Updated ${updatedCampaigns.length} campaign(s) to ended status`,
        updated: updatedCampaigns.length,
        campaigns: updatedCampaigns
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
