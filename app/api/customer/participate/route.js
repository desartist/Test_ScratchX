import { NextResponse } from "next/server";
import mongoose from "mongoose";
import { connectDB } from "@/lib/connectDB";
import Campaign from "@/models/campaignModel";
import Range from "@/models/rangeModel";
import CustomerParticipation from "@/models/customerParticipationModel";
import ScratchCardRecord from "@/models/scratchCardRecordModel";
import { consumeInventory } from "@/lib/services/inventoryManagementService";
import { validateCoordinates } from "@/lib/utils/geoUtils";

/**
 * POST /api/customer/participate
 * Submit customer details and create participation record
 * NOTE: This version does NOT use MongoDB transactions (for development without replica set)
 */
export async function POST(request) {
  try {
    await connectDB();

    const body = await request.json();
    console.log("📤 Incoming Request Body:", {
      campaignId: body.campaignId,
      customerName: body.customerName,
      customerMobile: body.customerMobile,
      rangeId: body.rangeId,
      verifiedStore: body.verifiedStore
        ? {
            storeId: body.verifiedStore.storeId,
            storeName: body.verifiedStore.storeName,
          }
        : null,
    });

    const {
      campaignId,
      rangeId,
      customerName,
      customerMobile,
      customerEmail,
      billAmount,
      customerLatitude,
      customerLongitude,
      customerConsent,
      verifiedStore,
    } = body;

    // ===== VALIDATION =====
    if (!campaignId) {
      return NextResponse.json(
        { success: false, error: "campaignId is required", data: null },
        { status: 400 },
      );
    }

    if (!rangeId) {
      return NextResponse.json(
        { success: false, error: "rangeId is required", data: null },
        { status: 400 },
      );
    }

    if (!customerName || typeof customerName !== "string") {
      return NextResponse.json(
        {
          success: false,
          error: "customerName is required and must be a string",
          data: null,
        },
        { status: 400 },
      );
    }

    if (!customerMobile || typeof customerMobile !== "string") {
      return NextResponse.json(
        {
          success: false,
          error: "customerMobile is required and must be a string",
          data: null,
        },
        { status: 400 },
      );
    }

    if (!/^[0-9]{10}$/.test(customerMobile)) {
      return NextResponse.json(
        {
          success: false,
          error: "customerMobile must be exactly 10 digits",
          data: null,
        },
        { status: 400 },
      );
    }

    if (
      billAmount === undefined ||
      billAmount === null ||
      typeof billAmount !== "number" ||
      billAmount < 0
    ) {
      return NextResponse.json(
        {
          success: false,
          error: "billAmount must be a non-negative number",
          data: null,
        },
        { status: 400 },
      );
    }

    if (
      customerLatitude === undefined ||
      customerLatitude === null ||
      typeof customerLatitude !== "number"
    ) {
      return NextResponse.json(
        {
          success: false,
          error: "customerLatitude is required and must be a number",
          data: null,
        },
        { status: 400 },
      );
    }

    if (
      customerLongitude === undefined ||
      customerLongitude === null ||
      typeof customerLongitude !== "number"
    ) {
      return NextResponse.json(
        {
          success: false,
          error: "customerLongitude is required and must be a number",
          data: null,
        },
        { status: 400 },
      );
    }

    if (!validateCoordinates(customerLatitude, customerLongitude)) {
      return NextResponse.json(
        {
          success: false,
          error:
            "Invalid coordinate ranges. Latitude: -90 to 90, Longitude: -180 to 180",
          data: null,
        },
        { status: 400 },
      );
    }

    if (typeof customerConsent !== "boolean") {
      return NextResponse.json(
        {
          success: false,
          error: "customerConsent must be a boolean",
          data: null,
        },
        { status: 400 },
      );
    }

    // Validate verified store
    if (
      !verifiedStore ||
      !verifiedStore.storeId ||
      verifiedStore.latitude === undefined ||
      verifiedStore.longitude === undefined
    ) {
      return NextResponse.json(
        {
          success: false,
          error: "Store location verification failed",
          data: null,
        },
        { status: 400 },
      );
    }

    console.log("📍 Verified Store:", {
      storeId: verifiedStore.storeId,
      storeName: verifiedStore.storeName,
      latitude: verifiedStore.latitude,
      longitude: verifiedStore.longitude,
    });

    // ===== FETCH & VALIDATE CAMPAIGN =====
    const campaign = await Campaign.findById(campaignId);
    if (!campaign) {
      return NextResponse.json(
        { success: false, error: "Campaign not found", data: null },
        { status: 404 },
      );
    }

    if (campaign.status !== "active") {
      return NextResponse.json(
        { success: false, error: "Campaign is not active", data: null },
        { status: 400 },
      );
    }

    console.log("📦 Checking inventory:", {
      remainingCards: campaign.remaining_scratch_cards,
    });

    if (
      !campaign.remaining_scratch_cards ||
      campaign.remaining_scratch_cards <= 0
    ) {
      return NextResponse.json(
        {
          success: false,
          error: "All scratch cards for this campaign have been used",
          data: null,
        },
        { status: 400 },
      );
    }

    // ===== RE-VALIDATE LOCATION =====
    const ALLOWED_RADIUS_METERS = 2200;
    const { calculateDistance } = require("@/lib/utils/distanceCalculator");

    console.log("🔍 Re-validating location with verified store:", {
      customerLat: customerLatitude,
      customerLon: customerLongitude,
      storeLat: verifiedStore.latitude,
      storeLon: verifiedStore.longitude,
    });

    let distanceFromStore;
    try {
      if (
        typeof verifiedStore.latitude !== "number" ||
        typeof verifiedStore.longitude !== "number"
      ) {
        throw new Error(
          `Invalid store coordinates: lat=${verifiedStore.latitude}, lon=${verifiedStore.longitude}`,
        );
      }

      distanceFromStore = Math.round(
        calculateDistance(
          customerLatitude,
          customerLongitude,
          verifiedStore.latitude,
          verifiedStore.longitude,
        ),
      );
    } catch (err) {
      console.error("❌ Distance calculation error:", err.message);
      return NextResponse.json(
        {
          success: false,
          error: "Location validation failed: " + err.message,
          data: null,
        },
        { status: 400 },
      );
    }

    console.log("📏 Distance calculated:", {
      distance: distanceFromStore,
      allowedRadius: ALLOWED_RADIUS_METERS,
      isValid: distanceFromStore <= ALLOWED_RADIUS_METERS,
    });

    if (distanceFromStore > ALLOWED_RADIUS_METERS) {
      return NextResponse.json(
        {
          success: false,
          error: `You must be within ${ALLOWED_RADIUS_METERS}m of the store. You are ${distanceFromStore}m away.`,
          data: null,
        },
        { status: 400 },
      );
    }

    const matchedStoreId = verifiedStore.storeId;
    const matchedStoreName = verifiedStore.storeName;

    console.log("✅ Location re-validated. Matched store:", {
      storeId: matchedStoreId,
      storeName: matchedStoreName,
      distance: distanceFromStore,
    });

    // ===== FETCH & VALIDATE RANGE =====
    const range = await Range.findById(rangeId);
    if (!range) {
      return NextResponse.json(
        { success: false, error: "Range not found", data: null },
        { status: 404 },
      );
    }

    if (range.campaignId.toString() !== campaignId) {
      return NextResponse.json(
        {
          success: false,
          error: "Range does not belong to this campaign",
          data: null,
        },
        { status: 400 },
      );
    }

    console.log("🎁 Loading rewards for range:", rangeId);

    if (!range.rewards || range.rewards.length === 0) {
      return NextResponse.json(
        {
          success: false,
          error: "No rewards configured for this range",
          data: null,
        },
        { status: 400 },
      );
    }

    // Select random reward from the range
    const selectedRewardRaw =
      range.rewards[Math.floor(Math.random() * range.rewards.length)];

    // Map reward type to valid enum: 'discount', 'freeItem', 'cashback', 'voucher'
    const mapRewardType = (type) => {
      const typeMap = {
        'flat': 'discount',
        'percentage': 'cashback',
        'gift': 'freeItem',
        'Fixed Amount': 'discount',
        'Percentage': 'cashback',
        'Gift': 'freeItem',
      };
      return typeMap[type] || 'discount';
    };

    const rawType = selectedRewardRaw.type || '';
    const isGift = rawType === 'gift' || rawType === 'Gift';
    const rawValue = selectedRewardRaw.value;
    const giftImage = isGift && typeof rawValue === 'string' && rawValue.startsWith('data:image/') ? rawValue : null;

    const selectedReward = {
      reward_type: mapRewardType(rawType),
      reward_value: isGift ? 0 : (parseFloat(rawValue) || 0),
      reward_image: giftImage,
      reward_description: selectedRewardRaw.description || (isGift ? 'Gift' : `${rawType}: ${rawValue}`)
    };

    console.log("🎲 Random reward selected:", {
      type: selectedReward.reward_type,
      value: selectedReward.reward_value,
      description: selectedReward.reward_description,
    });

    // ===== CONSUME INVENTORY =====
    // Use 'mobile_app' for QR code customer scans (valid enum value)
    const inventoryResult = await consumeInventory(
      campaignId,
      campaign.merchantId.toString(),
      campaign.merchantId.toString(),
      request.headers.get("x-forwarded-for") || "unknown",
      "mobile_app",
    );

    if (!inventoryResult.success) {
      return NextResponse.json(
        { success: false, error: inventoryResult.error, data: null },
        { status: 400 },
      );
    }

    // ===== CREATE PARTICIPATION FIRST =====
    // Create participation record first so we have an ID for the scratch card
    const participation = new CustomerParticipation({
      campaign_id: campaignId,
      merchant_id: campaign.merchantId,
      store_id: matchedStoreId,
      matched_store_id: matchedStoreId,
      matched_store_name: matchedStoreName,
      distance_from_store: distanceFromStore,
      range_id: rangeId,
      customer_name: customerName,
      customer_mobile: customerMobile,
      customer_email: customerEmail || "",
      customer_consent: customerConsent,
      bill_amount: billAmount,
      customer_latitude: customerLatitude,
      customer_longitude: customerLongitude,
      status: "verified",
      expires_at: new Date(Date.now() + 5 * 60 * 1000),
    });

    const savedParticipation = await participation.save();

    // ===== CREATE SCRATCH CARD WITH PARTICIPATION ID =====
    // Now create scratch card with the participation ID
    const scratchCard = new ScratchCardRecord({
      campaign_id: campaignId,
      merchant_id: campaign.merchantId,
      store_id: matchedStoreId,
      range_id: rangeId,
      customer_participation_id: savedParticipation._id,  // REQUIRED - set during creation
      reward_type: selectedReward.reward_type,
      reward_value: selectedReward.reward_value,
      reward_image: selectedReward.reward_image || null,
      reward_description: selectedReward.reward_description,
      status: "generated",
      expires_at: new Date(Date.now() + 5 * 60 * 1000),
    });

    const savedScratchCard = await scratchCard.save();

    // Update participation with scratch card ID
    savedParticipation.scratch_card_id = savedScratchCard._id;
    await savedParticipation.save();

    console.log("✅ Participation created successfully:", {
      participationId: savedParticipation._id,
      campaignId: savedParticipation.campaign_id,
      customerName: savedParticipation.customer_name,
      matchedStore: matchedStoreName,
      distance: distanceFromStore,
    });

    // ===== RESPONSE =====
    const participationIdString = savedParticipation._id.toString();
    const scratchCardIdString = savedScratchCard._id.toString();

    console.log("📤 Response being sent:", {
      participationId: participationIdString,
      scratchCardId: scratchCardIdString,
      participationExists: !!savedParticipation._id,
      participationDBId: savedParticipation._id,
    });

    const response = {
      participation: {
        _id: savedParticipation._id,
        campaignId: savedParticipation.campaign_id,
        storeId: savedParticipation.store_id,
        matchedStoreId: savedParticipation.matched_store_id,
        matchedStoreName: savedParticipation.matched_store_name,
        distanceFromStore: savedParticipation.distance_from_store,
        customerName: savedParticipation.customer_name,
        customerMobile: savedParticipation.customer_mobile,
        customerEmail: savedParticipation.customer_email,
        billAmount: savedParticipation.bill_amount,
        status: savedParticipation.status,
        createdAt: savedParticipation.createdAt,
      },
      scratchCardId: scratchCardIdString,
      participationId: participationIdString,
      expiresAt: savedParticipation.expires_at,
      reward: {
        rewardId: selectedReward._id?.toString() || '',
        rewardName: selectedReward.reward_name || 'Special Offer',
        couponCode: selectedReward.coupon_code || '',
        description: selectedReward.reward_description || '',
        expiryDate: selectedReward.expiry_date || new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
        type: selectedReward.reward_type || 'coupon',
        value: selectedReward.reward_value || 0,
      },
      rewardScreenUrl: `/customer/campaign/${campaign._id}/scratch/${participationIdString}`,
    };

    console.log("✅ Successfully created participation:", {
      participationId: participationIdString,
      status: savedParticipation.status,
      customerName: customerName,
    });

    return NextResponse.json(
      { success: true, data: response },
      { status: 201 },
    );
  } catch (error) {
    console.error("❌ Error in participate endpoint:", {
      message: error.message,
      stack: error.stack,
      name: error.name,
    });

    if (error instanceof SyntaxError) {
      return NextResponse.json(
        { success: false, error: "Invalid JSON in request body", data: null },
        { status: 400 },
      );
    }

    return NextResponse.json(
      {
        success: false,
        error: error.message || "Internal server error",
        data: null,
      },
      { status: 500 },
    );
  }
}
