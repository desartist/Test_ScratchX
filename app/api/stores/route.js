import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import mongoose from 'mongoose';
import connectDB from '@/lib/db';
import StoreService from '@/lib/storeService';
import Campaign from '@/models/campaignModel';
import CustomerParticipation from '@/models/customerParticipationModel';
import { hasPermission } from '@/lib/permissions';
import { ValidationError, NotFoundError, AuthorizationError } from '@/lib/errors';
import subscriptionValidationService from '@/lib/services/subscriptionValidationService';
import platformAccessService from '@/lib/services/platformAccessService';
import mainStoreService from '@/lib/mainStoreService';
import Account from '@/models/accountModel';
import Store from '@/models/storeModel';

function toObjId(id) {
  if (mongoose.Types.ObjectId.isValid(id) && !(id instanceof mongoose.Types.ObjectId)) {
    return new mongoose.Types.ObjectId(id);
  }
  return id;
}

/**
 * Enrich a list of stores with live metrics so the listing matches the detail
 * page. Runs two batch aggregations (one Campaign, one CustomerParticipation)
 * instead of N individual queries.
 */
async function enrichStoresWithLiveData(stores) {
  if (!stores.length) return stores;

  const storeObjIds = stores.map((s) => toObjId(s._id));

  // Batch 1: active campaign count + total/used allocation per store
  // (Campaign is the source of truth — not store.campaigns_count)
  const campaignRows = await Campaign.aggregate([
    {
      $match: {
        assignedStores: {
          $elemMatch: { storeId: { $in: storeObjIds }, status: 'active' },
        },
      },
    },
    { $unwind: '$assignedStores' },
    {
      $match: {
        'assignedStores.status': 'active',
        'assignedStores.storeId': { $in: storeObjIds },
      },
    },
    {
      $group: {
        _id: '$assignedStores.storeId',
        campaigns_count: { $sum: 1 },
        total_scratch_cards: { $sum: { $ifNull: ['$allocated_scratch_cards', 0] } },
        used_scratch_cards_campaigns: { $sum: { $ifNull: ['$used_scratch_cards', 0] } },
      },
    },
  ]);

  const campaignMap = {};
  for (const r of campaignRows) {
    campaignMap[String(r._id)] = {
      campaigns_count: r.campaigns_count,
      total_scratch_cards: r.total_scratch_cards,
      used_scratch_cards_campaigns: r.used_scratch_cards_campaigns,
    };
  }

  // Batch 2: per-store scan / conversion count from CustomerParticipation
  const metricsRows = await CustomerParticipation.aggregate([
    { $match: { store_id: { $in: storeObjIds } } },
    {
      $group: {
        _id: '$store_id',
        qr_scans: { $sum: 1 },
        conversions: {
          $sum: { $cond: [{ $eq: ['$status', 'redeemed'] }, 1, 0] },
        },
      },
    },
  ]);

  const metricsMap = {};
  for (const r of metricsRows) {
    metricsMap[String(r._id)] = { qr_scans: r.qr_scans, conversions: r.conversions };
  }

  return stores.map((store) => {
    const sid = String(store._id);
    const cm = campaignMap[sid] || { campaigns_count: 0, total_scratch_cards: 0, used_scratch_cards_campaigns: 0 };
    const mm = metricsMap[sid] || { qr_scans: 0, conversions: 0 };
    const totalAllocated = cm.total_scratch_cards;
    const usedFromCampaigns = cm.used_scratch_cards_campaigns;
    return {
      ...store,
      campaigns_count: cm.campaigns_count,
      qr_scans: mm.qr_scans,
      // For unlimited plans the "X Used" on the card is CustomerParticipation scans.
      // For capped plans the allocation totals come from the campaign side.
      used_scratch_cards: mm.qr_scans,
      total_scratch_cards: totalAllocated,
      remaining_scratch_cards: Math.max(totalAllocated - usedFromCampaigns, 0),
    };
  });
}

export async function POST(request) {
  try {
    await connectDB();

    // Get user info from headers
    const userRole = request.headers.get('x-user-role');
    const userId = request.headers.get('x-user-id');

    // Authorization: Only Merchant and Super_Admin can create stores
    if (!hasPermission(userRole, 'store:create')) {
      return NextResponse.json(
        { success: false, error: 'Unauthorized', data: null },
        { status: 403 }
      );
    }

    // Validate user account exists
    const account = await Account.findById(userId);
    if (!account) {
      return NextResponse.json(
        { success: false, error: 'User account not found', data: null },
        { status: 404 }
      );
    }

    // Count existing active stores (using same field name as platformAccessService)
    const existingStoreCount = await Store.countDocuments({
      merchant_id: userId,
      isDeleted: { $ne: true }
    });

    // FIRST STORE EXCEPTION: Always allowed
    let canCreate = { allowed: true, isFirstStore: true, message: 'First store creation allowed' };

    // SUBSEQUENT STORES: Require plan check
    if (existingStoreCount > 0) {
      canCreate = await platformAccessService.canCreateStore(userId);

      if (!canCreate.allowed) {
        return NextResponse.json(
          {
            success: false,
            error: canCreate.reason || canCreate.message,
            details: {
              existingStores: existingStoreCount,
              reason: canCreate.reason
            }
          },
          { status: 403 }
        );
      }
    } else {
      console.log(`[Store Create] First store for account ${userId} - always allowed`);
    }

    // Get request body
    const body = await request.json();
    const { store_name, address, city, state, pincode, contact_person, contact_number, latitude, longitude } = body;

    // Determine merchant ID (Super_Admin can specify, Merchant uses their own ID)
    let merchantId = userId;
    if (userRole === 'Super_Admin' && body.merchantId) {
      merchantId = body.merchantId;
    }

    // Validate required fields
    if (!store_name || !address || !city || !state || !pincode || !contact_person || !contact_number) {
      return NextResponse.json(
        { success: false, error: 'Missing required fields', data: null },
        { status: 400 }
      );
    }

    if (latitude === null || latitude === undefined || longitude === null || longitude === undefined) {
      return NextResponse.json(
        { success: false, error: 'Store location (latitude and longitude) is required', data: null },
        { status: 400 }
      );
    }

    // Validate coordinate ranges
    const lat = parseFloat(latitude);
    const lon = parseFloat(longitude);

    if (isNaN(lat) || isNaN(lon)) {
      return NextResponse.json(
        { success: false, error: 'Latitude and longitude must be valid numbers', data: null },
        { status: 400 }
      );
    }

    if (lat < -90 || lat > 90) {
      return NextResponse.json(
        { success: false, error: 'Latitude must be between -90 and 90', data: null },
        { status: 400 }
      );
    }

    if (lon < -180 || lon > 180) {
      return NextResponse.json(
        { success: false, error: 'Longitude must be between -180 and 180', data: null },
        { status: 400 }
      );
    }

    // Track if this is the first store
    const isFirstStore = existingStoreCount === 0;

    // ✅ FIX #3: Pass extra store information to StoreService
    // Create store
    const store = await StoreService.createStore(
      merchantId,
      {
        store_name,
        address,
        city,
        state,
        pincode,
        contact_person,
        contact_number,
        latitude,
        longitude,
        // Set isMainStore flag for first store
        is_main_store: isFirstStore,
        isMainStore: isFirstStore,
        isDefaultStore: isFirstStore,
        storeType: isFirstStore ? 'MAIN' : 'BRANCH',
        // ✅ FIX #3: Set extra store tracking
        isExtraStore: canCreate.isExtraStore || false,
        extraStoreFee: canCreate.extraStoreFee || 0,
      },
      userId
    );

    // If this is the first store, update Account with mainStoreId
    if (isFirstStore) {
      try {
        await Account.findByIdAndUpdate(
          userId,
          {
            mainStoreId: store._id,
            'onboarding.hasCompletedStoreCreation': true,
            'onboarding.firstStoreCreatedAt': new Date(),
          },
          { new: true }
        );
        console.log(`[Store Create] Set mainStoreId for account ${userId} to store ${store._id}`);
      } catch (updateError) {
        console.error('[Store Create] Error updating account mainStoreId:', updateError);
        // Don't fail the store creation, just log the error
      }
    }

    // ✅ PHASE 2: Charge for extra store if applicable
    if (canCreate.isExtraStore && canCreate.extraStoreFee > 0) {
      try {
        const extraStoreBillingService = require('@/lib/services/extraStoreBillingService').default;
        const billingResult = await extraStoreBillingService.chargeForExtraStore(
          store._id,
          merchantId,
          store_name
        );
        console.log('[Stores API] Extra store charged successfully:', billingResult);

        // Include billing info in response
        return NextResponse.json(
          {
            success: true,
            data: store,
            message: `Extra store created. Charge: ₹${canCreate.extraStoreFee}`,
            isMainStore: isFirstStore,
            isFirstStore: isFirstStore,
            isExtraStore: true,
            billing: billingResult,
          },
          { status: 201 }
        );
      } catch (billingError) {
        console.error('[Stores API] Billing error for extra store:', billingError);
        // Store was created successfully, don't fail the request
        // Log the error but let the user know store was created
        return NextResponse.json(
          {
            success: true,
            data: store,
            message: 'Store created (billing pending)',
            isMainStore: isFirstStore,
            isFirstStore: isFirstStore,
            isExtraStore: true,
            billingWarning: 'Extra store charge could not be processed immediately. Please check billing.',
          },
          { status: 201 }
        );
      }
    }

    // Mark that this merchant now has at least one store (used by middleware gate)
    try {
      const cookieStore = await cookies();
      const sameSiteValue = process.env.NODE_ENV === 'production' ? 'strict' : 'lax';
      cookieStore.set('merchantHasStore', '1', {
        httpOnly: false,
        secure: process.env.NODE_ENV === 'production',
        sameSite: sameSiteValue,
        maxAge: 60 * 60 * 24 * 7,
        path: '/',
      });
    } catch (_) {}

    return NextResponse.json(
      {
        success: true,
        data: store,
        message: isFirstStore
          ? 'Main store created successfully'
          : 'Store created successfully',
        isMainStore: isFirstStore,
        isFirstStore: isFirstStore,
      },
      { status: 201 }
    );
  } catch (error) {
    console.error('Error creating store:', error);

    if (error instanceof ValidationError) {
      return NextResponse.json(
        { success: false, error: error.message, data: null },
        { status: 400 }
      );
    }

    if (error instanceof NotFoundError) {
      return NextResponse.json(
        { success: false, error: error.message, data: null },
        { status: 404 }
      );
    }

    return NextResponse.json(
      { success: false, error: 'Internal server error', data: null },
      { status: 500 }
    );
  }
}

export async function GET(request) {
  try {
    await connectDB();

    // Get user info from headers
    const userRole = request.headers.get('x-user-role');
    const userId = request.headers.get('x-user-id');

    // Authorization: User must have store:read permission
    if (!hasPermission(userRole, 'store:read')) {
      return NextResponse.json(
        { success: false, error: 'Unauthorized', data: null },
        { status: 403 }
      );
    }

    // Get query parameters
    const { searchParams } = new URL(request.url);
    const page = parseInt(searchParams.get('page')) || 1;
    const limit = parseInt(searchParams.get('limit')) || 10;
    const status = searchParams.get('status');
    const searchTerm = searchParams.get('search') || '';

    // Determine which stores to fetch
    let merchantId = userId;
    if (userRole === 'Super_Admin' && searchParams.get('merchantId')) {
      merchantId = searchParams.get('merchantId');
    }

    // Get stores
    const result = await StoreService.getStoresByMerchant(
      merchantId,
      { page, limit, status, searchTerm }
    );

    // Enrich with live metrics (campaign count, scans, used cards) so that
    // the listing matches what the detail page shows.
    const enrichedStores = await enrichStoresWithLiveData(result.stores || []);

    return NextResponse.json(
      {
        success: true,
        data: enrichedStores,
        pagination: result.pagination,
        message: 'Stores retrieved successfully'
      },
      { status: 200 }
    );
  } catch (error) {
    console.error('Error fetching stores:', error);

    return NextResponse.json(
      { success: false, error: 'Internal server error', data: null },
      { status: 500 }
    );
  }
}
