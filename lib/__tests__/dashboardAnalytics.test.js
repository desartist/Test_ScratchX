/**
 * Tests for the dashboard analytics aggregation methods on dashboardService.
 * Focus: RETURN SHAPE of each method (lengths, keys, value types).
 * DB connection is provided by the global mongodb-memory-server setup
 * (__tests__/setup.js), which also clears collections after each test.
 */

import mongoose from "mongoose";
import dashboardService from "@/lib/dashboardService";
import Campaign from "@/models/campaignModel";
import Store from "@/models/storeModel";
import CustomerParticipation from "@/models/customerParticipationModel";
import CampaignStoreMapping from "@/models/campaignStoreMappingModel";
import ScratchCardTransaction from "@/models/scratchCardTransactionModel";
import { Scan } from "@/models/scanModel";

const merchantId = new mongoose.Types.ObjectId();
const storeId = new mongoose.Types.ObjectId();
const campaignId = new mongoose.Types.ObjectId();

const YYYY_MM_DD = /^\d{4}-\d{2}-\d{2}$/;

beforeEach(async () => {
  const now = new Date();

  await Store.create({
    _id: storeId,
    merchant_id: merchantId,
    store_name: "Test Store",
    address: "123 Main St",
    city: "Mumbai",
    state: "Maharashtra",
    pincode: "400001",
    latitude: 19.076,
    longitude: 72.8479,
    contact_person: "Manager",
    contact_number: "9876543210",
    status: "active",
  });

  await Campaign.create({
    _id: campaignId,
    merchantId,
    campaignName: "Summer Sale",
    startDate: new Date(now.getTime() - 24 * 60 * 60 * 1000),
    endDate: new Date(now.getTime() + 3 * 24 * 60 * 60 * 1000), // ends in 3 days
    status: "active",
    allocated_scratch_cards: 100,
    used_scratch_cards: 10,
    redeemed_scratch_cards: 5,
    assignedStores: [
      {
        storeId,
        storeName: "Test Store",
        storeCode: "TS001",
        address: "123 Main St",
        city: "Mumbai",
        state: "Maharashtra",
        pincode: "400001",
        contactPerson: "Manager",
        contactNumber: "9876543210",
        latitude: 19.076,
        longitude: 72.8479,
        allocated_scratch_cards: 100,
        assignedBy: merchantId,
        status: "active",
      },
    ],
  });

  await CampaignStoreMapping.create({
    campaign_id: campaignId,
    store_id: storeId,
    merchant_id: merchantId,
    allocated_scratch_cards: 100,
    used_scratch_cards: 8,
    redeemed_scratch_cards: 4,
    allocation_by: merchantId,
  });

  await ScratchCardTransaction.create([
    {
      merchant_id: merchantId,
      campaign_id: campaignId,
      store_id: storeId,
      action_type: "allocated_to_store",
      quantity: 50,
      created_by: merchantId,
    },
    {
      merchant_id: merchantId,
      campaign_id: campaignId,
      store_id: storeId,
      action_type: "redeemed",
      quantity: 3,
      created_by: merchantId,
    },
  ]);

  await CustomerParticipation.create([
    {
      campaign_id: campaignId,
      merchant_id: merchantId,
      store_id: storeId,
      range_id: new mongoose.Types.ObjectId(),
      customer_name: "Alice",
      customer_mobile: "9000000001",
      customer_consent: true,
      bill_amount: 500,
      customer_latitude: 19.076,
      customer_longitude: 72.8479,
    },
    {
      campaign_id: campaignId,
      merchant_id: merchantId,
      store_id: storeId,
      range_id: new mongoose.Types.ObjectId(),
      customer_name: "Bob",
      customer_mobile: "9000000002",
      customer_consent: true,
      bill_amount: 700,
      customer_latitude: 19.076,
      customer_longitude: 72.8479,
    },
  ]);

  await Scan.create([
    { merchantId, campaignId },
    { merchantId, campaignId },
  ]);
});

describe("dashboardService analytics methods", () => {
  test("getDailyScratchUsage returns `days` buckets of {date, used}", async () => {
    const result = await dashboardService.getDailyScratchUsage(merchantId, {
      days: 7,
    });
    expect(Array.isArray(result)).toBe(true);
    expect(result).toHaveLength(7);
    for (const row of result) {
      expect(Object.keys(row).sort()).toEqual(["date", "used"]);
      expect(row.date).toMatch(YYYY_MM_DD);
      expect(typeof row.used).toBe("number");
    }
    // ascending order
    const dates = result.map((r) => r.date);
    expect([...dates].sort()).toEqual(dates);
    // today's bucket should reflect allocated_to_store (50) + redeemed (3) = 53
    expect(result[result.length - 1].used).toBe(53);
  });

  test("getDailyScratchUsage honors custom days and zero-fills empties", async () => {
    const result = await dashboardService.getDailyScratchUsage(merchantId, {
      days: 3,
    });
    expect(result).toHaveLength(3);
    expect(result[0].used).toBe(0); // 3 days ago, no data
  });

  test("getCustomerGrowthSeries returns `days` buckets of {date, new, repeat}", async () => {
    const result = await dashboardService.getCustomerGrowthSeries(merchantId, {
      days: 7,
    });
    expect(Array.isArray(result)).toBe(true);
    expect(result).toHaveLength(7);
    for (const row of result) {
      expect(Object.keys(row).sort()).toEqual(["date", "new", "repeat"]);
      expect(row.date).toMatch(YYYY_MM_DD);
      expect(typeof row.new).toBe("number");
      expect(typeof row.repeat).toBe("number");
    }
    // both customers are first-seen today => 2 new, 0 repeat
    const today = result[result.length - 1];
    expect(today.new).toBe(2);
    expect(today.repeat).toBe(0);
  });

  test("getCampaignConsumption returns sorted {campaignId, name, used} array", async () => {
    const result = await dashboardService.getCampaignConsumption(merchantId);
    expect(Array.isArray(result)).toBe(true);
    expect(result.length).toBeGreaterThan(0);
    const row = result[0];
    expect(Object.keys(row).sort()).toEqual(["campaignId", "name", "used"]);
    expect(row.name).toBe("Summer Sale");
    expect(row.used).toBe(15); // used 10 + redeemed 5
    expect(typeof row.used).toBe("number");
  });

  test("getStoreWisePerformance returns {storeId, name, used} array", async () => {
    const result = await dashboardService.getStoreWisePerformance(merchantId);
    expect(Array.isArray(result)).toBe(true);
    expect(result.length).toBeGreaterThan(0);
    const row = result[0];
    expect(Object.keys(row).sort()).toEqual(["name", "storeId", "used"]);
    expect(row.name).toBe("Test Store");
    expect(row.used).toBe(12); // 8 used + 4 redeemed
  });

  test("getPerStoreStats returns object keyed by storeId -> {customers, scans}", async () => {
    const result = await dashboardService.getPerStoreStats(merchantId);
    expect(typeof result).toBe("object");
    expect(Array.isArray(result)).toBe(false);
    const entry = result[storeId.toString()];
    expect(entry).toBeDefined();
    expect(Object.keys(entry).sort()).toEqual(["customers", "scans"]);
    expect(entry.customers).toBe(2);
    expect(entry.scans).toBe(2);
  });

  test("getKpiSummary returns the 5 numeric summary keys", async () => {
    const result = await dashboardService.getKpiSummary(merchantId);
    expect(Object.keys(result).sort()).toEqual([
      "activeCampaigns",
      "activeStores",
      "endingSoon",
      "totalCampaigns",
      "totalStores",
    ]);
    for (const key of Object.keys(result)) {
      expect(typeof result[key]).toBe("number");
    }
    expect(result.totalStores).toBe(1);
    expect(result.activeStores).toBe(1);
    expect(result.totalCampaigns).toBe(1);
    expect(result.activeCampaigns).toBe(1);
    expect(result.endingSoon).toBe(1); // ends in 3 days
  });

  test("methods guard against empty results for unknown merchant", async () => {
    const unknown = new mongoose.Types.ObjectId();
    expect(await dashboardService.getDailyScratchUsage(unknown)).toHaveLength(7);
    expect(await dashboardService.getCustomerGrowthSeries(unknown)).toHaveLength(7);
    expect(await dashboardService.getCampaignConsumption(unknown)).toEqual([]);
    expect(await dashboardService.getStoreWisePerformance(unknown)).toEqual([]);
    expect(await dashboardService.getPerStoreStats(unknown)).toEqual({});
    const kpi = await dashboardService.getKpiSummary(unknown);
    expect(kpi.totalStores).toBe(0);
    expect(kpi.endingSoon).toBe(0);
  });
});
