import { connectDB } from "@/lib/connectDB";
import { requireAuth } from "@/lib/auth";
import Account from "@/models/accountModel";
import Campaign from "@/models/campaignModel";

function superAdminOnly(account) {
  if (account.role !== "Super_Admin") {
    return Response.json({ success: false, error: "Forbidden" }, { status: 403 });
  }
  return null;
}

// Merchants at or below this remaining % are flagged "low balance".
const LOW_BALANCE_THRESHOLD_PERCENT = 10;

// GET /api/admin/scratch-inventory — platform-wide scratch card balances
// across every merchant. Rolled up from Campaign.{allocated,used,redeemed,
// remaining}_scratch_cards — the real, live source of scratch numbers in
// this app (confirmed against /api/admin/campaigns and the merchant's own
// Campaigns page). Account.scratchCards is a legacy field that stays at 0
// for real merchants and is NOT used for this rollup.
export async function GET(request) {
  await connectDB();
  const { account, error } = await requireAuth();
  if (error) return error;
  const denied = superAdminOnly(account);
  if (denied) return denied;

  const { searchParams } = new URL(request.url);
  const page = Math.max(1, parseInt(searchParams.get("page") ?? "1"));
  const limit = Math.min(100, parseInt(searchParams.get("limit") ?? "20"));
  const search = searchParams.get("search") || "";
  const lowBalanceOnly = searchParams.get("lowBalance") === "true";
  const skip = (page - 1) * limit;

  const merchantQuery = { role: "Merchant" };
  if (search) {
    merchantQuery.$or = [
      { name: { $regex: search, $options: "i" } },
      { email: { $regex: search, $options: "i" } },
      { "profile.storeName": { $regex: search, $options: "i" } },
    ];
  }

  const [merchants, campaignAgg] = await Promise.all([
    Account.find(merchantQuery).select("name email profile.storeName createdAt").lean(),
    Campaign.aggregate([
      {
        $group: {
          _id: "$merchantId",
          allocated: { $sum: "$allocated_scratch_cards" },
          used: { $sum: "$used_scratch_cards" },
          redeemed: { $sum: "$redeemed_scratch_cards" },
          remaining: { $sum: "$remaining_scratch_cards" },
        },
      },
    ]),
  ]);

  const scratchByMerchant = Object.fromEntries(campaignAgg.map((c) => [String(c._id), c]));

  let rows = merchants.map((m) => {
    const s = scratchByMerchant[String(m._id)] || { allocated: 0, used: 0, redeemed: 0, remaining: 0 };
    const remainingPercent = s.allocated > 0 ? (s.remaining / s.allocated) * 100 : 0;
    return {
      _id: m._id,
      merchantName: m.profile?.storeName || m.name,
      email: m.email,
      total: s.allocated,
      used: s.used,
      allocated: s.allocated,
      redeemed: s.redeemed,
      remaining: s.remaining,
      isLowBalance: s.allocated > 0 && remainingPercent <= LOW_BALANCE_THRESHOLD_PERCENT,
    };
  });

  rows.sort((a, b) => b.allocated - a.allocated);

  // Platform-wide totals (across ALL merchants matching the search, not just
  // the current page) so the KPI cards stay accurate under pagination.
  const totals = rows.reduce(
    (acc, r) => {
      acc.allocated += r.allocated;
      acc.used += r.used;
      acc.remaining += r.remaining;
      acc.redeemed += r.redeemed;
      if (r.isLowBalance) acc.lowBalanceCount += 1;
      return acc;
    },
    { allocated: 0, used: 0, remaining: 0, redeemed: 0, lowBalanceCount: 0, merchantCount: rows.length },
  );

  if (lowBalanceOnly) rows = rows.filter((r) => r.isLowBalance);

  const total = rows.length;
  const paginated = rows.slice(skip, skip + limit);

  return Response.json(
    {
      success: true,
      merchants: paginated,
      total,
      page,
      limit,
      totals,
    },
    { status: 200 },
  );
}
