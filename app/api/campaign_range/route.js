import mongoose from "mongoose";
import { connectDB } from "@/lib/connectDB.js";
import { requireAuth } from "@/lib/auth.js";
import { enforceFeatureLimit } from "@/lib/subscriptionGuard.js";
import Range from "@/models/rangeModel.js";
import Campaign from "@/models/campaignModel.js";
import ScratchCardRecord from "@/models/scratchCardRecordModel.js";
import CustomerParticipation from "@/models/customerParticipationModel.js";
import { ValidationError } from "@/lib/errors";
import { normalizeRewardsForSave } from "@/lib/services/rewardInventoryService";

// How many times a save retries when a redemption changed the stock between
// reading the range and writing it back (see rewardsVersion in rangeModel).
const SAVE_ATTEMPTS = 5;

const isId = (v) => typeof v === "string" && mongoose.Types.ObjectId.isValid(v);

/** The merchant whose data this account acts on. */
function ownerIdOf(account) {
  return String(account.role === "Manager" ? account.parentId : account._id);
}

/**
 * Read access: the owning merchant (or their Manager), or store team members
 * whose store the campaign is assigned to. Ranges previously had no
 * ownership check at all — any account could read or edit any campaign's
 * rewards.
 */
function canReadCampaign(account, campaign) {
  if (!campaign) return false;
  const merchantId = String(campaign.merchantId);
  if (merchantId === String(account._id) || merchantId === String(account.parentId)) return true;
  if (account.storeId) {
    return (campaign.assignedStores || []).some(
      (s) => String(s.storeId) === String(account.storeId) && s.status !== "removed",
    );
  }
  return false;
}

/** Write access: only the merchant who owns the campaign. */
function canWriteCampaign(account, campaign) {
  return Boolean(campaign) && String(campaign.merchantId) === ownerIdOf(account);
}

const json = (body, status) => Response.json(body, { status });

export async function GET(request) {
  try {
    await connectDB();
    const { account, error } = await requireAuth("range:read");
    if (error) return error;

    const { searchParams } = new URL(request.url);
    const campaignId = searchParams.get("id");
    const rangeId = searchParams.get("rangeId");

    if (rangeId) {
      if (!isId(rangeId)) return json({ success: false, error: "Invalid range ID" }, 400);
      const range = await Range.findById(rangeId);
      if (!range) return json({ success: false, error: "Range not found" }, 404);
      const campaign = await Campaign.findById(range.campaignId).lean();
      if (!canReadCampaign(account, campaign)) {
        return json({ success: false, error: "Access denied" }, 403);
      }
      return json({ success: true, ranges: range }, 200);
    }

    if (!isId(campaignId)) return json({ success: false, error: "Invalid campaign ID" }, 400);
    const campaign = await Campaign.findById(campaignId).lean();
    if (!campaign) {
      return json({ success: false, error: "Campaign not found" }, 404);
    }
    if (!canReadCampaign(account, campaign)) {
      return json({ success: false, error: "Access denied" }, 403);
    }

    const ranges = await Range.find({ campaignId: campaign._id });
    return json({ success: true, ranges }, 200);
  } catch (error) {
    console.error("Error fetching ranges:", error);
    return json({ success: false, error: "Failed to fetch ranges" }, 500);
  }
}

/**
 * POST /api/campaign_range — create a range, or update one (with rangeId).
 *
 * Reward activation and stock are merged server-side by
 * normalizeRewardsForSave: counters (redeemed / remaining) are owned by the
 * server and never taken from the request, quantities are validated, and a
 * reward can't be saved active with zero stock.
 *
 * Updates use optimistic concurrency on `rewardsVersion`: the merged rewards
 * are written only if no redemption touched the range since it was read;
 * otherwise the save re-reads and re-merges. So a merchant edit can never
 * overwrite a concurrent stock decrement.
 */
export async function POST(request) {
  try {
    await connectDB();
    const { account, error } = await requireAuth("range:create");
    if (error) return error;

    const merchantId = ownerIdOf(account);

    const body = await request.json().catch(() => null);
    if (!body || typeof body !== "object") {
      return json({ success: false, error: "Invalid request body" }, 400);
    }
    const { minAmount, maxAmount, rewards, campaignId, rangeId } = body;

    if (!isId(campaignId)) return json({ success: false, error: "Invalid campaign ID" }, 400);
    if (rangeId != null && !isId(rangeId)) return json({ success: false, error: "Invalid range ID" }, 400);

    // Archived campaigns are hidden by the model middleware → not found.
    const campaign = await Campaign.findById(campaignId).lean();
    if (!campaign) return json({ success: false, error: "Campaign not found" }, 404);
    if (!canWriteCampaign(account, campaign)) {
      return json({ success: false, error: "Access denied" }, 403);
    }

    const min = Number(minAmount);
    const max = Number(maxAmount);
    if (!Number.isFinite(min) || min <= 0 || !Number.isFinite(max) || max < min) {
      return json({ success: false, error: "Enter a valid amount range (max must be at least min)." }, 400);
    }

    if (rangeId) {
      for (let attempt = 0; attempt < SAVE_ATTEMPTS; attempt++) {
        const existing = await Range.findById(rangeId).lean();
        if (!existing || String(existing.campaignId) !== String(campaign._id)) {
          return json({ success: false, error: "Range not found for this campaign" }, 404);
        }

        const merged = normalizeRewardsForSave(rewards, existing.rewards);
        const version = existing.rewardsVersion;
        // Legacy ranges have no rewardsVersion yet — match "missing" too.
        const versionFilter = version == null ? { rewardsVersion: null } : { rewardsVersion: version };

        const range = await Range.findOneAndUpdate(
          { _id: rangeId, ...versionFilter },
          {
            $set: {
              minAmount: min,
              maxAmount: max,
              label: `₹${min} - ₹${max}`,
              rewards: merged,
            },
            $inc: { rewardsVersion: 1 },
          },
          { new: true },
        );
        if (range) return json({ success: true, range }, 200);
        // A redemption changed this range's stock in between — re-read and retry.
      }
      return json(
        { success: false, error: "Rewards were being updated at the same moment. Please try saving again." },
        409,
      );
    }

    // Enforce plan limit on ranges per campaign (creates only)
    const existingRangeCount = await Range.countDocuments({ campaignId: campaign._id });
    const limitError = await enforceFeatureLimit(
      merchantId,
      "maxRangesPerCampaign",
      existingRangeCount,
    );
    if (limitError) return limitError;

    const range = await Range.create({
      minAmount: min,
      maxAmount: max,
      label: `₹${min} - ₹${max}`,
      campaignId: campaign._id,
      rewards: normalizeRewardsForSave(rewards, []),
      rewardsVersion: 0,
    });
    return json({ success: true, range }, 201);
  } catch (error) {
    if (error instanceof ValidationError) {
      return json({ success: false, error: error.message }, 400);
    }
    console.error("Error creating range:", error);
    return json({ success: false, error: "Failed to create range" }, 500);
  }
}

export async function DELETE(request) {
  try {
    await connectDB();
    const { account, error } = await requireAuth("range:delete");
    if (error) return error;

    const { searchParams } = new URL(request.url);
    const rangeId = searchParams.get("rangeId");

    if (!rangeId) {
      return json({ success: false, error: "rangeId is required" }, 400);
    }
    if (!isId(rangeId)) {
      return json({ success: false, error: "Invalid range ID" }, 400);
    }

    const target = await Range.findById(rangeId).lean();
    if (!target) {
      return json({ success: false, error: "Range not found" }, 404);
    }
    const campaign = await Campaign.findById(target.campaignId).setOptions({ includeDeleted: true }).lean();
    if (!canWriteCampaign(account, campaign)) {
      return json({ success: false, error: "Access denied" }, 403);
    }

    // Guard: refuse to delete a range that customers have already used —
    // deleting it would orphan their scratch card / participation history.
    const [scratchRecords, participations] = await Promise.all([
      ScratchCardRecord.countDocuments({ range_id: rangeId }),
      CustomerParticipation.countDocuments({ range_id: rangeId }),
    ]);
    if (scratchRecords + participations > 0) {
      return json(
        {
          success: false,
          error: "Cannot delete a range that customers have already scratched or participated in.",
        },
        400,
      );
    }

    await Range.deleteOne({ _id: rangeId });
    return json({ success: true }, 200);
  } catch (error) {
    console.error("Error deleting range:", error);
    return json({ success: false, error: "Failed to delete range" }, 500);
  }
}
