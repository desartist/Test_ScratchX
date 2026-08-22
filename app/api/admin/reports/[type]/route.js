import { connectDB } from "@/lib/connectDB";
import { requireAuth } from "@/lib/auth";
import { toCsv, csvResponse } from "@/lib/csv";
import Account from "@/models/accountModel";
import Campaign from "@/models/campaignModel";
import Payment from "@/models/paymentModel";
import Subscription from "@/models/subscriptionModel";
import Store from "@/models/storeModel";
import Commission from "@/models/commissionModel";
import { logAdminAction } from "@/lib/services/platformAuditService";

function superAdminOnly(account) {
  if (account.role !== "Super_Admin") {
    return Response.json({ success: false, error: "Forbidden" }, { status: 403 });
  }
  return null;
}

// Row cap to keep exports fast and memory-safe — platform-wide but not
// unbounded (matches "avoid fetching thousands of records unnecessarily"
// as a hard safety limit, not an expected ceiling in normal use).
const MAX_ROWS = 5000;

function fmtDate(d) {
  return d ? new Date(d).toISOString().slice(0, 10) : "";
}

async function buildRetailersReport() {
  const merchants = await Account.find({ role: "Merchant" })
    .select("name email profile.storeName profile.businessModel profile.storeLocation parentId status activePlan createdAt")
    .limit(MAX_ROWS)
    .lean();
  const distributorIds = [...new Set(merchants.map((m) => m.parentId).filter(Boolean).map(String))];
  const distributors = distributorIds.length
    ? await Account.find({ _id: { $in: distributorIds } }).select("name profile.companyName")
    : [];
  const distMap = Object.fromEntries(distributors.map((d) => [String(d._id), d.profile?.companyName || d.name]));

  const columns = [
    { label: "Business Name", value: (r) => r.profile?.storeName || r.name },
    { label: "Owner", value: (r) => r.name },
    { label: "Email", value: (r) => r.email },
    { label: "Business Model", value: (r) => r.profile?.businessModel || "Retail" },
    { label: "Location", value: (r) => r.profile?.storeLocation || "" },
    { label: "Distributor", value: (r) => (r.parentId ? distMap[String(r.parentId)] || "" : "") },
    { label: "Plan", value: (r) => r.activePlan || "None" },
    { label: "Status", value: (r) => r.status },
    { label: "Joined", value: (r) => fmtDate(r.createdAt) },
  ];
  return toCsv(merchants, columns);
}

async function buildDistributorsReport() {
  const distributors = await Account.find({ role: "Distributor" })
    .select("name email profile.companyName profile.territory profile.commissionRate status createdAt")
    .limit(MAX_ROWS)
    .lean();
  const ids = distributors.map((d) => d._id);
  const commissionAgg = ids.length
    ? await Commission.aggregate([
        { $match: { distributorId: { $in: ids } } },
        { $group: { _id: "$distributorId", total: { $sum: "$totalEarning" } } },
      ])
    : [];
  const commissionMap = Object.fromEntries(commissionAgg.map((c) => [String(c._id), c.total]));

  const columns = [
    { label: "Distributor", value: (d) => d.name },
    { label: "Email", value: (d) => d.email },
    { label: "Company", value: (d) => d.profile?.companyName || "" },
    { label: "Territory", value: (d) => d.profile?.territory || "" },
    { label: "Commission Rate (%)", value: (d) => d.profile?.commissionRate ?? 0 },
    { label: "Total Earned (INR)", value: (d) => commissionMap[String(d._id)] || 0 },
    { label: "Status", value: (d) => d.status },
    { label: "Joined", value: (d) => fmtDate(d.createdAt) },
  ];
  return toCsv(distributors, columns);
}

async function buildCampaignsReport() {
  const campaigns = await Campaign.find({})
    .select("campaignName merchantId status startDate endDate assignedStores allocated_scratch_cards used_scratch_cards redeemed_scratch_cards tracking createdAt")
    .limit(MAX_ROWS)
    .lean();
  const merchantIds = [...new Set(campaigns.map((c) => String(c.merchantId)))];
  const merchants = merchantIds.length
    ? await Account.find({ _id: { $in: merchantIds } }).select("name profile.storeName")
    : [];
  const merchantMap = Object.fromEntries(merchants.map((m) => [String(m._id), m.profile?.storeName || m.name]));

  const columns = [
    { label: "Campaign", value: (c) => c.campaignName },
    { label: "Retailer", value: (c) => merchantMap[String(c.merchantId)] || "" },
    { label: "Status", value: (c) => c.status },
    { label: "Start Date", value: (c) => fmtDate(c.startDate) },
    { label: "End Date", value: (c) => fmtDate(c.endDate) },
    { label: "Stores", value: (c) => (c.assignedStores || []).filter((s) => s.status === "active").length },
    { label: "QR Scans", value: (c) => c.tracking?.qrCodesScanned || 0 },
    { label: "Allocated", value: (c) => c.allocated_scratch_cards || 0 },
    { label: "Used", value: (c) => c.used_scratch_cards || 0 },
    { label: "Redeemed", value: (c) => c.redeemed_scratch_cards || 0 },
    { label: "Created", value: (c) => fmtDate(c.createdAt) },
  ];
  return toCsv(campaigns, columns);
}

async function buildPaymentsReport() {
  const payments = await Payment.find({})
    .populate("merchantId", "name profile.storeName")
    .select("merchantId amount tax totalAmount status paymentMethod paymentGateway transactionId createdAt")
    .sort({ createdAt: -1 })
    .limit(MAX_ROWS)
    .lean();

  const columns = [
    { label: "Transaction ID", value: (p) => p.transactionId || String(p._id) },
    { label: "Retailer", value: (p) => p.merchantId?.profile?.storeName || p.merchantId?.name || "" },
    { label: "Amount (INR)", value: (p) => p.amount },
    { label: "Tax (INR)", value: (p) => p.tax || 0 },
    { label: "Total (INR)", value: (p) => p.totalAmount },
    { label: "Status", value: (p) => p.status },
    { label: "Method", value: (p) => p.paymentMethod || p.paymentGateway || "" },
    { label: "Date", value: (p) => fmtDate(p.createdAt) },
  ];
  return toCsv(payments, columns);
}

async function buildSubscriptionsReport() {
  const subs = await Subscription.find({})
    .populate({ path: "ownerId", model: "Account", select: "name email profile.storeName profile.companyName" })
    .populate("distributorId", "name profile.companyName")
    .select("ownerId ownerType distributorId planType status unlimitedScratches.validUntil createdAt")
    .sort({ createdAt: -1 })
    .limit(MAX_ROWS)
    .lean();

  const columns = [
    { label: "Owner", value: (s) => s.ownerId?.profile?.storeName || s.ownerId?.profile?.companyName || s.ownerId?.name || "" },
    { label: "Owner Type", value: (s) => s.ownerType },
    { label: "Plan", value: (s) => s.planType },
    { label: "Status", value: (s) => s.status },
    { label: "Distributor", value: (s) => s.distributorId?.profile?.companyName || s.distributorId?.name || "" },
    { label: "Valid Until", value: (s) => fmtDate(s.unlimitedScratches?.validUntil) },
    { label: "Created", value: (s) => fmtDate(s.createdAt) },
  ];
  return toCsv(subs, columns);
}

async function buildStoresReport() {
  const stores = await Store.find({ isDeleted: { $ne: true } })
    .select("store_name merchant_id city state status is_main_store total_scratch_cards used_scratch_cards createdAt")
    .limit(MAX_ROWS)
    .lean();
  const merchantIds = [...new Set(stores.map((s) => String(s.merchant_id)))];
  const merchants = merchantIds.length
    ? await Account.find({ _id: { $in: merchantIds } }).select("name profile.storeName")
    : [];
  const merchantMap = Object.fromEntries(merchants.map((m) => [String(m._id), m.profile?.storeName || m.name]));

  const columns = [
    { label: "Store", value: (s) => s.store_name },
    { label: "Retailer", value: (s) => merchantMap[String(s.merchant_id)] || "" },
    { label: "City", value: (s) => s.city },
    { label: "State", value: (s) => s.state },
    { label: "Main Store", value: (s) => (s.is_main_store ? "Yes" : "No") },
    { label: "Scratch Allocated", value: (s) => s.total_scratch_cards || 0 },
    { label: "Scratch Used", value: (s) => s.used_scratch_cards || 0 },
    { label: "Status", value: (s) => s.status },
    { label: "Created", value: (s) => fmtDate(s.createdAt) },
  ];
  return toCsv(stores, columns);
}

const REPORTS = {
  retailers: { build: buildRetailersReport, filename: "retailers-report" },
  distributors: { build: buildDistributorsReport, filename: "distributors-report" },
  campaigns: { build: buildCampaignsReport, filename: "campaigns-report" },
  payments: { build: buildPaymentsReport, filename: "payments-report" },
  subscriptions: { build: buildSubscriptionsReport, filename: "subscriptions-report" },
  stores: { build: buildStoresReport, filename: "stores-report" },
};

// GET /api/admin/reports/[type] — CSV export of a core platform dataset.
export async function GET(request, { params }) {
  await connectDB();
  const { account, error } = await requireAuth();
  if (error) return error;
  const denied = superAdminOnly(account);
  if (denied) return denied;

  const { type } = await params;
  const report = REPORTS[type];
  if (!report) {
    return Response.json(
      { success: false, error: `Unknown report type. Valid: ${Object.keys(REPORTS).join(", ")}` },
      { status: 400 },
    );
  }

  const csv = await report.build();
  const date = new Date().toISOString().slice(0, 10);

  await logAdminAction({
    account,
    module: "Reports",
    action: `Exported ${type} report`,
    request,
    targetType: "Report",
    targetLabel: report.filename,
  });

  return csvResponse(csv, `${report.filename}-${date}.csv`);
}
