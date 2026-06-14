import { NextResponse } from 'next/server';
import connectDB from '@/lib/db';
import ScratchCardTransaction from '@/models/scratchCardTransactionModel';
import Campaign from '@/models/campaignModel';
import Store from '@/models/storeModel';
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

    const { searchParams } = new URL(request.url);
    const type = searchParams.get('type'); // 'merchant', 'campaign', 'store', 'daily'
    const campaignId = searchParams.get('campaignId');
    const storeId = searchParams.get('storeId');
    const startDate = searchParams.get('startDate');
    const endDate = searchParams.get('endDate');

    const dateFilter = {};
    if (startDate) dateFilter.$gte = new Date(startDate);
    if (endDate) dateFilter.$lte = new Date(endDate);

    let data;

    if (type === 'merchant') {
      // Merchant-level redemption analytics
      const query = {
        merchant_id: merchantId,
        action_type: 'redeemed'
      };
      if (Object.keys(dateFilter).length > 0) {
        query.createdAt = dateFilter;
      }

      const totalRedemptions = await ScratchCardTransaction.countDocuments(query);

      const byStatus = await ScratchCardTransaction.aggregate([
        { $match: query },
        { $group: { _id: '$status', count: { $sum: 1 } } }
      ]);

      const byCampaign = await ScratchCardTransaction.aggregate([
        { $match: query },
        { $group: { _id: '$campaign_id', count: { $sum: 1 } } },
        { $sort: { count: -1 } },
        { $limit: 10 },
        {
          $lookup: {
            from: 'campaigns',
            localField: '_id',
            foreignField: '_id',
            as: 'campaign'
          }
        },
        { $unwind: { path: '$campaign', preserveNullAndEmptyArrays: true } },
        { $project: { campaignId: '$_id', campaignName: '$campaign.campaignName', count: 1, _id: 0 } }
      ]);

      const byStore = await ScratchCardTransaction.aggregate([
        { $match: query },
        { $group: { _id: '$store_id', count: { $sum: 1 } } },
        { $sort: { count: -1 } },
        { $limit: 10 },
        {
          $lookup: {
            from: 'stores',
            localField: '_id',
            foreignField: '_id',
            as: 'store'
          }
        },
        { $unwind: { path: '$store', preserveNullAndEmptyArrays: true } },
        { $project: { storeId: '$_id', storeName: '$store.store_name', count: 1, _id: 0 } }
      ]);

      data = {
        merchant: {
          id: merchantId,
          totalRedemptions
        },
        period: {
          startDate: startDate || 'all-time',
          endDate: endDate || 'all-time'
        },
        byStatus: byStatus.reduce((acc, s) => ({ ...acc, [s._id]: s.count }), {}),
        topCampaigns: byCampaign,
        topStores: byStore
      };
    } else if (type === 'campaign') {
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

      const query = {
        campaign_id: campaignId,
        action_type: 'redeemed'
      };
      if (Object.keys(dateFilter).length > 0) {
        query.createdAt = dateFilter;
      }

      const totalRedemptions = await ScratchCardTransaction.countDocuments(query);

      const byStore = await ScratchCardTransaction.aggregate([
        { $match: query },
        { $group: { _id: '$store_id', count: { $sum: 1 } } },
        { $sort: { count: -1 } },
        {
          $lookup: {
            from: 'stores',
            localField: '_id',
            foreignField: '_id',
            as: 'store'
          }
        },
        { $unwind: '$store' },
        { $project: { storeId: '$_id', storeName: '$store.store_name', count: 1, _id: 0 } }
      ]);

      const dailyTrend = await ScratchCardTransaction.aggregate([
        { $match: query },
        {
          $group: {
            _id: {
              $dateToString: { format: '%Y-%m-%d', date: '$createdAt' }
            },
            count: { $sum: 1 }
          }
        },
        { $sort: { _id: 1 } }
      ]);

      data = {
        campaign: {
          id: campaign._id,
          name: campaign.campaignName,
          status: campaign.status
        },
        period: {
          startDate: startDate || 'all-time',
          endDate: endDate || 'all-time'
        },
        totalRedemptions,
        redemptionRate: campaign.allocated_scratch_cards > 0
          ? Math.round((totalRedemptions / campaign.allocated_scratch_cards) * 100)
          : 0,
        byStore,
        dailyTrend
      };
    } else if (type === 'store') {
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

      const query = {
        store_id: storeId,
        action_type: 'redeemed'
      };
      if (Object.keys(dateFilter).length > 0) {
        query.createdAt = dateFilter;
      }

      const totalRedemptions = await ScratchCardTransaction.countDocuments(query);

      const byCampaign = await ScratchCardTransaction.aggregate([
        { $match: query },
        { $group: { _id: '$campaign_id', count: { $sum: 1 } } },
        { $sort: { count: -1 } },
        {
          $lookup: {
            from: 'campaigns',
            localField: '_id',
            foreignField: '_id',
            as: 'campaign'
          }
        },
        { $unwind: '$campaign' },
        { $project: { campaignId: '$_id', campaignName: '$campaign.campaignName', count: 1, _id: 0 } }
      ]);

      const hourlyTrend = await ScratchCardTransaction.aggregate([
        { $match: query },
        {
          $group: {
            _id: {
              $dateToString: { format: '%Y-%m-%d %H:00', date: '$createdAt' }
            },
            count: { $sum: 1 }
          }
        },
        { $sort: { _id: 1 } }
      ]);

      data = {
        store: {
          id: store._id,
          name: store.store_name,
          code: store.store_code
        },
        period: {
          startDate: startDate || 'all-time',
          endDate: endDate || 'all-time'
        },
        totalRedemptions,
        redemptionRate: store.total_scratch_cards > 0
          ? Math.round((totalRedemptions / store.total_scratch_cards) * 100)
          : 0,
        byCampaign,
        hourlyTrend
      };
    }

    return NextResponse.json(
      {
        success: true,
        data,
        message: 'Redemption analytics retrieved successfully'
      },
      { status: 200 }
    );
  } catch (error) {
    console.error('Error fetching redemption analytics:', error);
    return NextResponse.json(
      { success: false, error: 'Internal server error', data: null },
      { status: 500 }
    );
  }
}
