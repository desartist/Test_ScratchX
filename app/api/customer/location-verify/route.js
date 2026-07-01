import { NextResponse } from "next/server";
import { connectDB } from "@/lib/connectDB";
import Store from "@/models/storeModel";
import { validateCoordinates } from "@/lib/utils/geoUtils";
import { validateCustomerLocation } from "@/lib/utils/distanceCalculator";

/**
 * POST /api/customer/location-verify
 *
 * Verify customer location against assigned stores
 * Uses storesList from payload (no database queries)
 *
 * Request body:
 * {
 *   campaignId: string,
 *   customerLatitude: number,
 *   customerLongitude: number,
 *   storesList: Array<{ storeId, storeName, latitude, longitude, ... }>
 * }
 *
 * Response:
 * {
 *   success: boolean,
 *   data: {
 *     isValid: boolean,
 *     matchedStore: { storeId, storeName, latitude, longitude },
 *     distance: number (in meters),
 *     allowedRadius: 250,
 *     message: string
 *   }
 * }
 */
export async function POST(request) {
  try {
    await connectDB();
    const body = await request.json();
    const { campaignId, customerLatitude, customerLongitude, storesList } =
      body;

    // CRITICAL: Validate coordinates are provided
    if (customerLatitude === undefined || customerLatitude === null) {
      return NextResponse.json(
        {
          success: false,
          error: "Location permission is required.",
          data: null,
        },
        { status: 400 },
      );
    }

    if (customerLongitude === undefined || customerLongitude === null) {
      return NextResponse.json(
        {
          success: false,
          error: "Location permission is required.",
          data: null,
        },
        { status: 400 },
      );
    }

    // Validation: Data types
    if (
      typeof customerLatitude !== "number" ||
      typeof customerLongitude !== "number"
    ) {
      return NextResponse.json(
        {
          success: false,
          error: "customerLatitude and customerLongitude must be numbers",
          data: null,
        },
        { status: 400 },
      );
    }

    // Validation: Coordinate ranges
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

    // Validation: Stores list
    if (!Array.isArray(storesList) || storesList.length === 0) {
      return NextResponse.json(
        {
          success: false,
          error: "No stores provided for validation",
          data: null,
        },
        { status: 400 },
      );
    }

    // CRITICAL FIX: Fetch fresh store coordinates from database
    // This ensures we use the latest store location even if the campaign snapshot is old
    const storeIds = storesList.map((s) => s.storeId);
    const freshStores = await Store.find({ _id: { $in: storeIds } }).lean();

    console.log("🔄 Fresh stores from DB:", freshStores.map(s => ({
      storeId: s._id.toString(),
      latitude: s.latitude,
      longitude: s.longitude
    })));

    const storesMap = new Map(freshStores.map((s) => [s._id.toString(), s]));

    // Merge fresh coordinates with provided store data
    const updatedStoresList = storesList.map((store) => {
      const freshStore = storesMap.get(store.storeId.toString());
      if (freshStore && (freshStore.latitude || freshStore.longitude)) {
        console.log(`✅ Updated store ${store.storeName} with fresh coordinates:`, {
          lat: freshStore.latitude,
          lng: freshStore.longitude
        });
        return {
          ...store,
          latitude: freshStore.latitude,
          longitude: freshStore.longitude,
        };
      }
      console.log(`⚠️ No fresh coordinates found for store ${store.storeName}, using provided:`, {
        lat: store.latitude,
        lng: store.longitude
      });
      return store;
    });

    console.log("📍 Location Verification Request:", {
      campaignId,
      customerLatitude,
      customerLongitude,
      storeCount: updatedStoresList.length,
      stores: updatedStoresList.map((s) => ({
        storeId: s.storeId,
        storeName: s.storeName,
        hasCoordinates: !!(s.latitude && s.longitude),
        latitude: s.latitude,
        longitude: s.longitude,
      })),
    });

    // CRITICAL FIX: Use fresh store coordinates from database
    // Allowed radius: 250 meters
    const ALLOWED_RADIUS_METERS = 250;

    // Validate customer location against all stores (with fresh coordinates)
    const validationResult = validateCustomerLocation(
      customerLatitude,
      customerLongitude,
      updatedStoresList,
      ALLOWED_RADIUS_METERS,
    );

    console.log("🔍 Validation Result:", {
      isValid: validationResult.isValid,
      matchedStore: validationResult.matchedStore?.storeName,
      distance: validationResult.distance,
      allowedRadius: validationResult.allowedRadius,
      error: validationResult.error,
    });

    // If no valid store found
    if (!validationResult.isValid) {
      // Build detailed error message with all store distances
      let detailedMessage = `You must be within ${ALLOWED_RADIUS_METERS} meters of an assigned store.`;

      if (validationResult.allDistances && validationResult.allDistances.length > 0) {
        const distances = validationResult.allDistances
          .map((d) => `${d.storeName}: ${d.distance || "N/A"}m`)
          .join(", ");
        detailedMessage = `Nearest store is ${validationResult.distance || "unknown"}m away. ${distances}`;
      }

      return NextResponse.json(
        {
          success: false,
          error:
            validationResult.error ||
            detailedMessage ||
            `You must be within ${ALLOWED_RADIUS_METERS} meters of an assigned store.`,
          data: {
            isValid: false,
            matchedStore: null,
            distance: validationResult.distance,
            allowedRadius: ALLOWED_RADIUS_METERS,
            message: detailedMessage,
            allStoreDistances: validationResult.allDistances,
            debugInfo: validationResult.debugInfo,
          },
        },
        { status: 400 },
      );
    }

    // Success: Location is valid
    console.log("✅ Location validation successful");

    return NextResponse.json(
      {
        success: true,
        data: {
          isValid: true,
          matchedStore: {
            storeId: validationResult.matchedStore.storeId,
            storeName: validationResult.matchedStore.storeName,
            latitude: validationResult.matchedStore.latitude,
            longitude: validationResult.matchedStore.longitude,
            city: validationResult.matchedStore.city,
            pincode: validationResult.matchedStore.pincode,
          },
          distance: validationResult.distance,
          allowedRadius: validationResult.allowedRadius,
          message: `Location verified! You are ${validationResult.distance}m away from ${validationResult.matchedStore.storeName}`,
        },
      },
      { status: 200 },
    );
  } catch (error) {
    console.error("❌ Error verifying location:", error);

    // Handle JSON parsing errors
    if (error instanceof SyntaxError) {
      return NextResponse.json(
        {
          success: false,
          error: "Invalid JSON in request body",
          data: null,
        },
        { status: 400 },
      );
    }

    return NextResponse.json(
      {
        success: false,
        error: "Internal server error",
        data: null,
      },
      { status: 500 },
    );
  }
}
