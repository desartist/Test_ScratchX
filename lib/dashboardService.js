import mongoose from "mongoose";
import Account from "@/models/accountModel";
import Subscription from "@/models/subscriptionModel";
import "@/models/subscriptionPlanModel";
import DistributorBalance from "@/models/distributorBalanceModel";
import MerchantAllocation from "@/models/merchantAllocationModel";
import Campaign from "@/models/campaignModel";
import Store from "@/models/storeModel";
import CustomerParticipation from "@/models/customerParticipationModel";
import ScratchCardRecord from "@/models/scratchCardRecordModel";
import ScratchCardTransaction from "@/models/scratchCardTransactionModel";
import CampaignStoreMapping from "@/models/campaignStoreMappingModel";
import { Scan } from "@/models/scanModel";
import scratchEntitlementService from "@/lib/scratchEntitlementService";

/**
 * Cast a value to a mongoose ObjectId when it is a valid id string and not
 * already an ObjectId. Otherwise return the value unchanged.
 */
function toObjId(id) {
  if (
    mongoose.Types.ObjectId.isValid(id) &&
    !(id instanceof mongoose.Types.ObjectId)
  ) {
    return new mongoose.Types.ObjectId(id);
  }
  return id;
}

/**
 * Format a Date as a UTC YYYY-MM-DD string (matches $dateToString with
 * timezone 'UTC' used in the aggregations below).
 */
function toUtcDateString(date) {
  return date.toISOString().slice(0, 10);
}

/**
 * Expand aggregation rows ([{ _id: 'YYYY-MM-DD', [key]: n }]) into exactly
 * `days` buckets starting at `since` (UTC), ascending, zero-filling gaps.
 * Returns [{ date: 'YYYY-MM-DD', [key]: number }].
 */
function fillDateBuckets(since, days, rows, key) {
  const byDate = new Map();
  for (const row of rows || []) {
    if (row && row._id != null) {
      byDate.set(String(row._id), Number(row[key]) || 0);
    }
  }

  const result = [];
  const base = new Date(since);
  for (let i = 0; i < days; i++) {
    const d = new Date(base);
    d.setUTCDate(d.getUTCDate() + i);
    const dateStr = toUtcDateString(d);
    result.push({ date: dateStr, [key]: byDate.get(dateStr) || 0 });
  }
  return result;
}

/**
 * Merge per-store customer and scan rows into a plain object keyed by
 * storeId string -> { customers, scans } (defaulting missing values to 0).
 */
function mergeByStore(custRows, scanRows) {
  const out = {};
  const ensure = (storeId) => {
    const key = String(storeId);
    if (!out[key]) out[key] = { customers: 0, scans: 0 };
    return out[key];
  };

  for (const row of custRows || []) {
    if (row && row.storeId != null) {
      ensure(row.storeId).customers = Number(row.customers) || 0;
    }
  }
  for (const row of scanRows || []) {
    if (row && row.storeId != null) {
      ensure(row.storeId).scans = Number(row.scans) || 0;
    }
  }
  return out;
}

/**
 * Compute the UTC start-of-day Date that is (days - 1) days before today.
 */
function startOfWindow(days) {
  const since = new Date();
  since.setUTCHours(0, 0, 0, 0);
  since.setUTCDate(since.getUTCDate() - (days - 1));
  return since;
}

class DashboardService {
  /**
   * Get Super Admin dashboard data
   * Shows: total users, merchants, distributors, system metrics
   */
  async getSuperAdminDashboard() {
    try {
      const totalUsers = await Account.countDocuments();
      const totalDistributors = await Account.countDocuments({
        role: "Distributor",
      });
      const totalMerchants = await Account.countDocuments({ role: "Merchant" });
      const totalManagers = await Account.countDocuments({ role: "Manager" });

      const activeUsers = await Account.countDocuments({ status: "active" });
      const pendingUsers = await Account.countDocuments({ status: "pending" });

      // Recent registrations
      const recentUsers = await Account.find()
        .select("email firstName lastName role status createdAt")
        .sort({ createdAt: -1 })
        .limit(10);

      return {
        totalUsers,
        activeUsers,
        pendingUsers,
        roleCounts: {
          distributors: totalDistributors,
          merchants: totalMerchants,
          managers: totalManagers,
        },
        recentUsers,
        timestamp: new Date(),
      };
    } catch (error) {
      throw new Error(`Failed to get Super Admin dashboard: ${error.message}`);
    }
  }

  /**
   * Get Admin (Distributor) dashboard data
   * Shows: their merchants, sales, commission metrics
   */
  async getAdminDashboard(adminId) {
    try {
      const admin = await Account.findById(adminId);
      if (!admin || admin.role !== "Distributor") {
        throw new Error("Unauthorized: Not a distributor");
      }

      // Get merchants under this distributor
      const merchants = await Account.find({ createdBy: adminId }).select(
        "email firstName lastName phone status createdAt",
      );

      const merchantCount = merchants.length;
      const activeMerchants = merchants.filter(
        (m) => m.status === "active",
      ).length;

      return {
        distributorName: `${admin.firstName} ${admin.lastName}`,
        merchantCount,
        activeMerchants,
        pendingMerchants: merchantCount - activeMerchants,
        merchants,
        commissionRate: admin.profile?.commissionRate || 0,
        timestamp: new Date(),
      };
    } catch (error) {
      throw new Error(`Failed to get Admin dashboard: ${error.message}`);
    }
  }

  /**
   * Get Retailer (Merchant) dashboard data
   * Shows: campaigns, stores, customers, scratch cards, analytics
   * Returns comprehensive data for single and multi-store dashboards
   */
  async getRetailerDashboard(merchantId) {
    try {
      const merchant = await Account.findById(merchantId);
      if (!merchant || merchant.role !== "Merchant") {
        throw new Error("Unauthorized: Not a merchant");
      }

      // Fetch subscription with plan details
      const subscription = await Subscription.findOne({
        ownerId: merchantId,
        ownerType: "merchant",
        status: { $in: ["trial", "active", "past_due"] },
      }).populate("planId");

      // Fetch all stores for this merchant
      const stores = await Store.find({ merchant_id: merchantId }).select(
        "store_name address city state latitude longitude scratchCards createdAt contact_person status"
      );

      // Fetch all campaigns for this merchant
      const campaigns = await Campaign.find({ merchantId });

      // Calculate campaign metrics
      const activeCampaigns = campaigns.filter((c) => c.status === "active").length;
      const totalCampaigns = campaigns.length;
      const activeStores = stores.filter((s) => s.status === "active").length;
      const totalStores = stores.length;

      // Fetch customer participation data — field is merchant_id (snake_case)
      const merchantObjId = toObjId(merchantId);
      const totalParticipants = await CustomerParticipation.countDocuments({
        merchant_id: merchantObjId,
      });
      const newParticipants = await CustomerParticipation.countDocuments({
        merchant_id: merchantObjId,
        createdAt: {
          $gte: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000),
        },
      });

      // QR scans for this month = participations created this month
      const startOfMonth = new Date();
      startOfMonth.setDate(1);
      startOfMonth.setHours(0, 0, 0, 0);
      const qrScans = await CustomerParticipation.countDocuments({
        merchant_id: merchantObjId,
        createdAt: { $gte: startOfMonth },
      });

      // Scratch card totals from campaign-level fields (the source of truth)
      const totalScratchAllocated = campaigns.reduce(
        (sum, c) => sum + (c.allocated_scratch_cards || 0),
        0,
      );

      // Scratches used = participations that have been scratched/revealed/redeemed
      const scratchesUsed = await CustomerParticipation.countDocuments({
        merchant_id: merchantObjId,
        status: { $in: ["scratched", "revealed", "redeemed"] },
      });

      // Conversion rate: revealed or redeemed / total
      const participants = totalParticipants;
      const coupons = await CustomerParticipation.countDocuments({
        merchant_id: merchantObjId,
        status: { $in: ["revealed", "redeemed"] },
      });
      const conversionRate =
        participants > 0 ? Math.round((coupons / participants) * 100) : 0;

      // Get campaign performance details
      const campaignPerformance = campaigns.map((campaign) => {
        const allocatedCards = campaign.allocated_scratch_cards || 0;
        const usedCards = campaign.used_scratch_cards || 0;
        const redeemedCards = campaign.redeemed_scratch_cards || 0;

        // Calculate conversion rate based on redemptions
        const totalCards = allocatedCards;
        const conversionRate =
          totalCards > 0 ? Math.round((redeemedCards / totalCards) * 100) : 0;

        return {
          _id: campaign._id,
          name: campaign.campaignName,
          status: campaign.status,
          billingRange: "₹0", // placeholder
          startDate: campaign.startDate,
          endDate: campaign.endDate,
          allocatedCards,
          remainingCards: totalCards - usedCards,
          totalScans: campaign.tracking?.qrCodesScanned || 0,
          participants: campaign.tracking?.uniqueCustomers || 0,
          claimedCoupons: redeemedCards,
          conversionRate,
        };
      });

      // Build per-store allocation map from campaign assignedStores (source of truth)
      const allocationByStore = {};
      for (const campaign of campaigns) {
        for (const assign of campaign.assignedStores || []) {
          if (assign.status === "removed") continue;
          const key = assign.storeId?.toString();
          if (!key) continue;
          if (!allocationByStore[key]) allocationByStore[key] = { allocated: 0, used: 0 };
          allocationByStore[key].allocated += assign.allocated_scratch_cards || 0;
          allocationByStore[key].used +=
            (assign.used_scratch_cards || 0) + (assign.redeemed_scratch_cards || 0);
        }
      }

      // Get store performance details
      const storePerformance = stores.map((store) => {
        const storeAlloc = allocationByStore[store._id.toString()] || { allocated: 0, used: 0 };
        const storeCampaigns = campaigns.filter((c) =>
          c.assignedStores?.some(
            (s) => s.storeId?.toString() === store._id.toString()
          )
        );

        return {
          _id: store._id,
          name: store.store_name || store.name,
          address: store.address,
          city: store.city,
          campaignCount: storeCampaigns.length,
          scratchAllocated: storeAlloc.allocated,
          scratchRemaining: storeAlloc.allocated - storeAlloc.used,
        };
      });

      // Get subscription status
      const planLimits = subscription?.planId?.limits || {};
      const now = new Date();
      const daysRemaining = subscription
        ? Math.ceil(
            (subscription.currentPeriodEnd - now) / (1000 * 60 * 60 * 24)
          )
        : 0;

      // ✅ PHASE 2: Add expiry warning for dashboard display
      let expiryWarning = null;
      if (subscription && daysRemaining <= 15) {
        if (daysRemaining <= 0) {
          expiryWarning = {
            type: 'critical',
            message: '🔴 Your subscription has expired. Renew immediately.',
            action: 'Renew Plan',
          };
        } else if (daysRemaining === 1) {
          expiryWarning = {
            type: 'critical',
            message: '⚠️ Your subscription expires today.',
            action: 'Renew Now',
          };
        } else if (daysRemaining <= 3) {
          expiryWarning = {
            type: 'urgent',
            message: `⚠️ Your subscription expires in ${daysRemaining} day${daysRemaining > 1 ? 's' : ''}.`,
            action: 'Renew Plan',
          };
        } else if (daysRemaining <= 7) {
          expiryWarning = {
            type: 'warning',
            message: `📢 Your subscription expires in ${daysRemaining} days.`,
            action: 'Renew Plan',
          };
        } else if (daysRemaining <= 15) {
          expiryWarning = {
            type: 'info',
            message: `ℹ️ Your subscription expires in ${daysRemaining} days.`,
            action: null,
          };
        }
      }

      const subscriptionStatus = subscription
        ? {
            planName: subscription.planId?.name || (subscription.planType
              ? subscription.planType.charAt(0).toUpperCase() + subscription.planType.slice(1).toLowerCase()
              : null),
            displayName: subscription.planId?.displayName || (subscription.planType
              ? `ScratchX ${subscription.planType.charAt(0).toUpperCase()}${subscription.planType.slice(1).toLowerCase()}`
              : null),
            status: subscription.status,
            currentPeriodStart: subscription.currentPeriodStart,
            currentPeriodEnd: subscription.currentPeriodEnd,
            daysRemaining: daysRemaining,
            isExpired: daysRemaining <= 0,
            expiryWarning,
            scratchEntitlement: subscription.unlimitedScratches
              ? {
                  isActive: subscription.unlimitedScratches.isActive,
                  grantedAt: subscription.unlimitedScratches.grantedAt,
                  validUntil: subscription.unlimitedScratches.validUntil,
                  daysRemaining: subscription.unlimitedScratches.validUntil
                    ? Math.ceil(
                        (subscription.unlimitedScratches.validUntil - now) /
                          (1000 * 60 * 60 * 24)
                      )
                    : 0,
                }
              : null,
            limits: {
              campaigns: planLimits.maxCampaigns || 0,
              stores: planLimits.maxStores || 0,
              scratchCards: planLimits.maxScratchCardsPerMonth || 0,
            },
            usage: {
              campaigns: activeCampaigns,
              stores: activeStores,
              scratchCards: scratchesUsed,
            },
          }
        : null;

      // Determine if single or multi-store
      const isSingleStore = totalStores <= 1;

      // Get scratch entitlement status
      const scratchStatus = await scratchEntitlementService.getDashboardStatus(
        merchantId,
        "merchant"
      );

      return {
        success: true,
        account: {
          _id: merchant._id,
          name: merchant.name || merchant.firstName,
          email: merchant.email,
          onboarding: merchant.onboarding || {},
          createdAt: merchant.createdAt,
        },
        merchant: {
          _id: merchant._id,
          name: merchant.name || merchant.firstName,
          email: merchant.email,
        },
        stores: stores.map(s => ({
          _id: s._id,
          store_name: s.store_name,
          name: s.store_name, // Also include as 'name' for component compatibility
          address: `${s.city}, ${s.state}`, // Construct address from city/state
          contact_person: s.contact_person,
          city: s.city,
          state: s.state,
          status: s.status,
          createdAt: s.createdAt,
          scratchCards: s.scratchCards || {}, // Include scratch card data
        })),
        subscription: subscriptionStatus,
        isSingleStore,
        metrics: {
          totalCampaigns,
          activeCampaigns,
          totalStores,
          activeStores,
          qrScans,
          customersParticipated: totalParticipants,
          couponsClaimed: coupons,
          conversionRate,
          newParticipants,
        },
        scratch: {
          totalAllocated: totalScratchAllocated,
          distributed: scratchesUsed,
          claimed: scratchesUsed,
          remaining: totalScratchAllocated - scratchesUsed,
          unused: totalScratchAllocated - scratchesUsed,
        },
        // NEW: Scratch Entitlement Status
        scratchEntitlement: scratchStatus,
        campaigns: campaignPerformance,
        storePerformance: storePerformance,
        timestamp: new Date(),
      };
    } catch (error) {
      console.error("Failed to get Retailer dashboard:", error);
      throw new Error(`Failed to get Retailer dashboard: ${error.message}`);
    }
  }

  /**
   * Get Manager dashboard data
   * Shows: operations, staff performance, transactions
   */
  async getManagerDashboard(managerId) {
    try {
      const manager = await Account.findById(managerId);
      if (!manager || manager.role !== "Manager") {
        throw new Error("Unauthorized: Not a manager");
      }

      // Get the merchant this manager works under
      const merchant = await Account.findById(manager.createdBy);

      // Get other staff under same merchant
      const staff = await Account.find({ createdBy: manager.createdBy }).select(
        "email firstName lastName phone role status createdAt",
      );

      return {
        managerName: `${manager.firstName} ${manager.lastName}`,
        merchantName: merchant?.profile?.storeName || "Store",
        staffCount: staff.length,
        staff,
        timestamp: new Date(),
      };
    } catch (error) {
      throw new Error(`Failed to get Manager dashboard: ${error.message}`);
    }
  }

  /**
   * Get Distributor dashboard data with subscription and allocation info
   * Shows: subscription, plan limits, balance, recent allocations to merchants
   */
  async getDistributorDashboard(distributorId) {
    try {
      // Get active subscription for distributor
      const subscription = await Subscription.findOne({
        ownerType: "distributor",
        ownerId: distributorId,
        status: "active",
      }).populate("planId");

      if (!subscription) {
        return {
          success: false,
          error: "No active subscription found",
        };
      }

      // Get distributor balance information
      const balance = await DistributorBalance.findOne({ distributorId });

      // Get recent allocations to merchants
      const allocations = await MerchantAllocation.find({
        distributorId,
        transactionType: "allocation",
      })
        .populate("merchantId", "email firstName lastName profile")
        .sort({ createdAt: -1 })
        .limit(10);

      // Get count of merchants allocated to
      const merchantCount = await Account.countDocuments({
        _id: { $in: allocations.map((a) => a.merchantId._id) },
      });

      return {
        success: true,
        subscription: {
          planName: subscription.planId?.name,
          status: subscription.status,
          startDate: subscription.currentPeriodStart,
          endDate: subscription.currentPeriodEnd,
          billingCycle: subscription.billingCycle,
        },
        balance: {
          totalAllocated: balance?.totalAllocated || 0,
          usedBalance: balance
            ? balance.totalAllocated - balance.getRemainingBalance()
            : 0,
          remainingBalance: balance?.getRemainingBalance() || 0,
          allocationCount: balance?.allocations?.length || 0,
        },
        recentAllocations: allocations.map((allocation) => ({
          merchantId: allocation.merchantId._id,
          merchantName:
            allocation.merchantId.profile?.storeName ||
            `${allocation.merchantId.firstName} ${allocation.merchantId.lastName}`,
          quantity: allocation.quantity,
          transactionType: allocation.transactionType,
          status: allocation.status,
          allocatedAt: allocation.createdAt,
        })),
        plan: {
          maxMerchants: subscription.planId?.limits?.maxStores || "Unlimited",
          maxStores: subscription.planId?.limits?.maxStores || "Unlimited",
          features: subscription.planId?.features || {},
          tier: subscription.planId?.tier || 0,
        },
        merchantCount,
        timestamp: new Date(),
      };
    } catch (error) {
      console.error("Error getting distributor dashboard:", error);
      return {
        success: false,
        error: error.message,
      };
    }
  }

  /**
   * Daily scratch card usage time-series for a merchant.
   * @returns {Promise<Array<{date:string, used:number}>>} exactly `days` buckets
   */
  async getDailyScratchUsage(merchantId, { days = 7 } = {}) {
    const since = startOfWindow(days);
    const rows = await ScratchCardTransaction.aggregate([
      {
        $match: {
          merchant_id: toObjId(merchantId),
          action_type: { $in: ["redeemed", "allocated_to_store"] },
          createdAt: { $gte: since },
        },
      },
      {
        $group: {
          _id: {
            $dateToString: {
              format: "%Y-%m-%d",
              date: "$createdAt",
              timezone: "UTC",
            },
          },
          used: { $sum: "$quantity" },
        },
      },
    ]);
    return fillDateBuckets(since, days, rows, "used");
  }

  /**
   * New vs repeat customer growth time-series for a merchant.
   * A participation counts as `new` when its day equals the customer's
   * all-time first-seen day, otherwise `repeat`.
   * @returns {Promise<Array<{date:string, new:number, repeat:number}>>}
   */
  async getCustomerGrowthSeries(merchantId, { days = 7 } = {}) {
    const merchantObjId = toObjId(merchantId);
    const since = startOfWindow(days);

    // All-time first-seen date per customer_mobile (as UTC YYYY-MM-DD string).
    const firstSeenRows = await CustomerParticipation.aggregate([
      { $match: { merchant_id: toObjId(merchantId) } },
      {
        $group: {
          _id: "$customer_mobile",
          firstSeen: { $min: "$createdAt" },
        },
      },
    ]);

    const firstSeenByMobile = new Map();
    for (const row of firstSeenRows || []) {
      if (row && row._id != null && row.firstSeen) {
        firstSeenByMobile.set(
          String(row._id),
          toUtcDateString(new Date(row.firstSeen))
        );
      }
    }

    // Participations inside the window.
    const participations = await CustomerParticipation.find({
      merchant_id: merchantObjId,
      createdAt: { $gte: since },
    })
      .select("customer_mobile createdAt")
      .lean();

    // Bucket scaffold keyed by date string.
    const buckets = new Map();
    const base = new Date(since);
    const order = [];
    for (let i = 0; i < days; i++) {
      const d = new Date(base);
      d.setUTCDate(d.getUTCDate() + i);
      const dateStr = toUtcDateString(d);
      buckets.set(dateStr, { date: dateStr, new: 0, repeat: 0 });
      order.push(dateStr);
    }

    for (const p of participations || []) {
      if (!p || !p.createdAt) continue;
      const dateStr = toUtcDateString(new Date(p.createdAt));
      const bucket = buckets.get(dateStr);
      if (!bucket) continue;
      const firstSeen = firstSeenByMobile.get(String(p.customer_mobile));
      if (firstSeen && firstSeen === dateStr) {
        bucket.new += 1;
      } else {
        bucket.repeat += 1;
      }
    }

    return order.map((dateStr) => buckets.get(dateStr));
  }

  /**
   * Per-campaign scratch consumption (used + redeemed), filtered to > 0,
   * sorted descending by usage.
   * @returns {Promise<Array<{campaignId:any, name:string, used:number}>>}
   */
  async getCampaignConsumption(merchantId) {
    const campaigns = await Campaign.find({ merchantId: toObjId(merchantId) })
      .select("campaignName used_scratch_cards redeemed_scratch_cards")
      .lean();

    return (campaigns || [])
      .map((c) => ({
        campaignId: c._id,
        name: c.campaignName,
        used: (c.used_scratch_cards || 0) + (c.redeemed_scratch_cards || 0),
      }))
      .filter((c) => c.used > 0)
      .sort((a, b) => b.used - a.used);
  }

  /**
   * Per-store scratch consumption from campaign-store mappings, sorted desc.
   * @returns {Promise<Array<{storeId:any, name:string, used:number}>>}
   */
  async getStoreWisePerformance(merchantId) {
    const rows = await CampaignStoreMapping.aggregate([
      { $match: { merchant_id: toObjId(merchantId) } },
      {
        $group: {
          _id: "$store_id",
          used: {
            $sum: {
              $add: [
                { $ifNull: ["$used_scratch_cards", 0] },
                { $ifNull: ["$redeemed_scratch_cards", 0] },
              ],
            },
          },
        },
      },
      {
        $lookup: {
          from: "stores",
          localField: "_id",
          foreignField: "_id",
          as: "store",
        },
      },
      { $unwind: "$store" },
      {
        $project: {
          _id: 0,
          storeId: "$_id",
          name: "$store.store_name",
          used: 1,
        },
      },
      { $sort: { used: -1 } },
    ]);
    return rows || [];
  }

  /**
   * Customers and scans per store, merged into a single keyed object.
   * @returns {Promise<Object<string,{customers:number, scans:number}>>}
   */
  async getPerStoreStats(merchantId) {
    const merchantObjId = toObjId(merchantId);

    // Single aggregate: unique customers + total participations (= scans) per store
    const rows = await CustomerParticipation.aggregate([
      { $match: { merchant_id: merchantObjId } },
      {
        $group: {
          _id: "$store_id",
          mobiles: { $addToSet: "$customer_mobile" },
          scans: { $sum: 1 },
        },
      },
      {
        $project: {
          _id: 0,
          storeId: "$_id",
          customers: { $size: "$mobiles" },
          scans: 1,
        },
      },
    ]);

    const out = {};
    for (const row of rows || []) {
      if (row?.storeId != null) {
        out[String(row.storeId)] = {
          customers: row.customers || 0,
          scans: row.scans || 0,
        };
      }
    }
    return out;
  }

  /**
   * Headline KPI counts for a merchant.
   * @returns {Promise<{totalStores:number, activeStores:number, totalCampaigns:number, activeCampaigns:number, endingSoon:number}>}
   */
  async getKpiSummary(merchantId) {
    const [stores, campaigns] = await Promise.all([
      Store.find({ merchant_id: toObjId(merchantId) }).select("status").lean(),
      Campaign.find({ merchantId: toObjId(merchantId) })
        .select("status endDate")
        .lean(),
    ]);

    const now = new Date();
    const weekAhead = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000);

    const storeList = stores || [];
    const campaignList = campaigns || [];

    return {
      totalStores: storeList.length,
      activeStores: storeList.filter((s) => s.status === "active").length,
      totalCampaigns: campaignList.length,
      activeCampaigns: campaignList.filter((c) => c.status === "active").length,
      endingSoon: campaignList.filter((c) => {
        if (!c.endDate) return false;
        const end = new Date(c.endDate);
        return end > now && end <= weekAhead;
      }).length,
    };
  }
}

export default new DashboardService();
