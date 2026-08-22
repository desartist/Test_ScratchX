import { connectDB } from "@/lib/connectDB";
import { requireAuth } from "@/lib/auth";
import Campaign from "@/models/campaignModel";
import CustomerParticipation from "@/models/customerParticipationModel";

function superAdminOnly(account) {
  if (account.role !== "Super_Admin") {
    return Response.json({ success: false, error: "Forbidden" }, { status: 403 });
  }
  return null;
}

function dayKey(date) {
  return date.toISOString().slice(0, 10); // YYYY-MM-DD
}

// Must read the same calendar day as dayKey()'s UTC-based ISO slice —
// formatting in the server's local timezone here would disagree with dayKey
// whenever the server isn't running in UTC, mislabeling every point by a day.
function dayLabel(date) {
  return date.toLocaleDateString("en-IN", { day: "numeric", month: "short", timeZone: "UTC" });
}

// GET /api/admin/activity-trend — platform-wide daily engagement funnel
// (scans/participations/redemptions) for the last N days, plus a campaign
// status breakdown. Built from CustomerParticipation's real per-event
// timestamps (createdAt / revealed_at / redeemed_at) — the same fields
// already used for the QR & Redemptions module — rather than
// Campaign.tracking.qrCodesScanned, which is a cumulative counter with no
// per-day timestamp and can't be sliced into a daily series.
export async function GET(request) {
  await connectDB();
  const { account, error } = await requireAuth();
  if (error) return error;
  const denied = superAdminOnly(account);
  if (denied) return denied;

  const { searchParams } = new URL(request.url);
  const days = Math.min(90, Math.max(7, parseInt(searchParams.get("days") ?? "30")));

  const start = new Date();
  start.setHours(0, 0, 0, 0);
  start.setDate(start.getDate() - (days - 1));

  const [scansByDay, revealsByDay, redemptionsByDay, statusCounts] = await Promise.all([
    CustomerParticipation.aggregate([
      { $match: { createdAt: { $gte: start } } },
      { $group: { _id: { $dateToString: { format: "%Y-%m-%d", date: "$createdAt" } }, count: { $sum: 1 } } },
    ]),
    CustomerParticipation.aggregate([
      { $match: { revealed_at: { $gte: start } } },
      { $group: { _id: { $dateToString: { format: "%Y-%m-%d", date: "$revealed_at" } }, count: { $sum: 1 } } },
    ]),
    CustomerParticipation.aggregate([
      { $match: { redeemed_at: { $gte: start } } },
      { $group: { _id: { $dateToString: { format: "%Y-%m-%d", date: "$redeemed_at" } }, count: { $sum: 1 } } },
    ]),
    Campaign.aggregate([{ $group: { _id: "$status", count: { $sum: 1 } } }]),
  ]);

  const scansMap = Object.fromEntries(scansByDay.map((d) => [d._id, d.count]));
  const revealsMap = Object.fromEntries(revealsByDay.map((d) => [d._id, d.count]));
  const redemptionsMap = Object.fromEntries(redemptionsByDay.map((d) => [d._id, d.count]));

  const trend = [];
  for (let i = 0; i < days; i++) {
    const d = new Date(start);
    d.setDate(d.getDate() + i);
    const key = dayKey(d);
    trend.push({
      date: key,
      label: dayLabel(d),
      scans: scansMap[key] || 0,
      participations: revealsMap[key] || 0,
      redemptions: redemptionsMap[key] || 0,
    });
  }

  const campaignStatus = { draft: 0, active: 0, paused: 0, ended: 0 };
  for (const s of statusCounts) {
    if (s._id in campaignStatus) campaignStatus[s._id] = s.count;
  }

  return Response.json({ success: true, trend, campaignStatus }, { status: 200 });
}
