import { NextResponse } from 'next/server';
import connectDB from '@/lib/db';
import Campaign from '@/models/campaignModel';
import CampaignStoreMapping from '@/models/campaignStoreMappingModel';
import Store from '@/models/storeModel';
import { hasPermission } from '@/lib/permissions';

export async function GET(request) {
  try {
    await connectDB();

    const userRole = request.headers.get('x-user-role');
    const userId = request.headers.get('x-user-id');
    const merchantId = request.headers.get('x-merchant-id') || userId;

    // Authorization
    if (!hasPermission(userRole, 'analytics:read')) {
      return NextResponse.json(
        { success: false, error: 'Unauthorized', data: null },
        { status: 403 }
      );
    }

    const { searchParams } = new URL(request.url);
    const type = searchParams.get('type'); // 'merchant', 'campaign', 'store'

    if (!type || !['merchant', 'campaign', 'store'].includes(type)) {
      return NextResponse.json(
        { success: false, error: 'type query parameter required: merchant, campaign, or store', data: null },
        { status: 400 }
      );
    }

    let data;

    if (type === 'merchant') {
      // Merchant-level inventory analytics
      const campaigns = await Campaign.find({ merchantId }).lean();
      const stores = await Store.find({ merchant_id: merchantId }).lean();

      const totalInventory = stores.reduce((sum, s) => sum + s.total_scratch_cards, 0);
      const usedInventory = stores.reduce((sum, s) => sum + s.used_scratch_cards, 0);
      const remainingInventory = totalInventory - usedInventory;

      data = {
        merchant: {
          id: merchantId,
          totalCampaigns: campaigns.length,
          totalStores: stores.length
        },
        inventory: {
          total: totalInventory,
          used: usedInventory,
          remaining: remainingInventory,
          utilizationPercentage: totalInventory > 0
            ? Math.round((usedInventory / totalInventory) * 100)
            : 0
        },
        campaignBreakdown: campaigns.map(c => ({
          id: c._id,
          name: c.campaignName,
          status: c.status,
          allocated: c.allocated_scratch_cards,
          used: c.used_scratch_cards,
          remaining: c.remaining_scratch_cards
        })),
        storeBreakdown: stores.map(s => ({
          id: s._id,
          name: s.store_name,
          total: s.total_scratch_cards,
          used: s.used_scratch_cards,
          remaining: s.remaining_scratch_cards
        }))
      };
    } else if (type === 'campaign') {
      const campaignId = searchParams.get('campaignId');
      if (!campaignId) {
        return NextResponse.json(
          { success: false, error: 'campaignId required for campaign analytics', data: null },
          { status: 400 }
        );
      }

      const campaign = await Campaign.findById(campaignId).lean();
      if (!campaign) {
        return NextResponse.json(
          { success: false, error: 'Campaign not found', data: null },
          { status: 404 }
        );
      }

      const allocations = await CampaignStoreMapping.find({
        campaign_id: campaignId
      })
        .populate('store_id', 'store_name store_code')
        .lean();

      data = {
        campaign: {
          id: campaign._id,
          name: campaign.campaignName,
          status: campaign.status,
          startDate: campaign.startDate,
          endDate: campaign.endDate
        },
        inventory: {
          allocated: campaign.allocated_scratch_cards,
          used: campaign.used_scratch_cards,
          redeemed: campaign.redeemed_scratch_cards,
          remaining: campaign.remaining_scratch_cards,
          utilizationPercentage: campaign.allocated_scratch_cards > 0
            ? Math.round((campaign.used_scratch_cards / campaign.allocated_scratch_cards) * 100)
            : 0,
          redemptionPercentage: campaign.allocated_scratch_cards > 0
            ? Math.round((campaign.redeemed_scratch_cards / campaign.allocated_scratch_cards) * 100)
            : 0
        },
        storeAllocations: allocations.map(a => ({
          storeId: a.store_id._id,
          storeName: a.store_id.store_name,
          storeCode: a.store_id.store_code,
          allocated: a.allocated_scratch_cards,
          used: a.used_scratch_cards,
          redeemed: a.redeemed_scratch_cards,
          remaining: a.remaining_scratch_cards,
          utilizationRate: a.allocated_scratch_cards > 0
            ? Math.round(((a.used_scratch_cards + a.redeemed_scratch_cards) / a.allocated_scratch_cards) * 100)
            : 0
        })),
        totalStores: allocations.length
      };
    } else if (type === 'store') {
      const storeId = searchParams.get('storeId');
      if (!storeId) {
        return NextResponse.json(
          { success: false, error: 'storeId required for store analytics', data: null },
          { status: 400 }
        );
      }

      const store = await Store.findById(storeId).lean();
      if (!store) {
        return NextResponse.json(
          { success: false, error: 'Store not found', data: null },
          { status: 404 }
        );
      }

      const allocations = await CampaignStoreMapping.find({
        store_id: storeId
      })
        .populate('campaign_id', 'campaignName campaign_code status')
        .lean();

      const totalAllocated = allocations.reduce((sum, a) => sum + a.allocated_scratch_cards, 0);
      const totalUsed = allocations.reduce((sum, a) => sum + a.used_scratch_cards, 0);
      const totalRedeemed = allocations.reduce((sum, a) => sum + a.redeemed_scratch_cards, 0);

      data = {
        store: {
          id: store._id,
          name: store.store_name,
          code: store.store_code,
          status: store.status
        },
        inventory: {
          total: store.total_scratch_cards,
          allocated: totalAllocated,
          used: totalUsed,
          redeemed: totalRedeemed,
          unallocated: store.total_scratch_cards - totalAllocated,
          utilizationPercentage: store.total_scratch_cards > 0
            ? Math.round(((totalUsed + totalRedeemed) / store.total_scratch_cards) * 100)
            : 0
        },
        campaignAllocations: allocations.map(a => ({
          campaignId: a.campaign_id._id,
          campaignName: a.campaign_id.campaignName,
          campaignCode: a.campaign_id.campaign_code,
          allocated: a.allocated_scratch_cards,
          used: a.used_scratch_cards,
          redeemed: a.redeemed_scratch_cards,
          remaining: a.remaining_scratch_cards,
          status: a.status
        })),
        totalCampaigns: allocations.length
      };
    }

    return NextResponse.json(
      {
        success: true,
        data,
        message: 'Inventory analytics retrieved successfully'
      },
      { status: 200 }
    );
  } catch (error) {
    console.error('Error fetching inventory analytics:', error);
    return NextResponse.json(
      { success: false, error: 'Internal server error', data: null },
      { status: 500 }
    );
  }
}
