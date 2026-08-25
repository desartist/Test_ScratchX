import { connectDB } from "@/lib/connectDB";
import { requireAuth } from "@/lib/auth";
import CustomerParticipation from "@/models/customerParticipationModel";
import ScratchCardRecord from "@/models/scratchCardRecordModel";

const STORE_TEAM_ROLES = ["Store_Manager", "Store_Staff"];

// GET /api/store-campaigns/[id]/my-customers
// The customers who scanned *this* team member's own personalized QR code
// for this campaign (see handled_by_staff_id on CustomerParticipation,
// populated whenever a scan comes in through a staff-attributed QR link).
// Read-only, scoped to the logged-in Store_Manager/Store_Staff themselves —
// never shows scans attributed to a colleague.
export async function GET(request, { params }) {
  try {
    await connectDB();
    const { account, error } = await requireAuth();
    if (error) return error;

    if (!STORE_TEAM_ROLES.includes(account.role)) {
      return Response.json(
        { success: false, error: "This page is for store team accounts only" },
        { status: 403 }
      );
    }

    const { id } = await params;

    const participations = await CustomerParticipation.find({
      campaign_id: id,
      handled_by_staff_id: account._id,
    })
      .sort({ createdAt: -1 })
      .select("customer_name customer_mobile status scratch_card_id createdAt")
      .lean();

    const scratchCardIds = participations.map((p) => p.scratch_card_id).filter(Boolean);
    const scratchCards = scratchCardIds.length
      ? await ScratchCardRecord.find({ _id: { $in: scratchCardIds } })
          .select("reward_type reward_value reward_description")
          .lean()
      : [];
    const rewardByCardId = new Map(scratchCards.map((c) => [String(c._id), c]));

    return Response.json(
      {
        success: true,
        customers: participations.map((p) => {
          const reward = p.scratch_card_id ? rewardByCardId.get(String(p.scratch_card_id)) : null;
          return {
            _id: p._id,
            name: p.customer_name,
            mobile: p.customer_mobile,
            status: p.status,
            reward: reward
              ? {
                  type: reward.reward_type,
                  value: reward.reward_value,
                  description: reward.reward_description,
                }
              : null,
            createdAt: p.createdAt,
          };
        }),
        count: participations.length,
      },
      { status: 200 }
    );
  } catch (err) {
    console.error("Error fetching my-customers:", err);
    return Response.json(
      { success: false, error: "Failed to load customers" },
      { status: 500 }
    );
  }
}
