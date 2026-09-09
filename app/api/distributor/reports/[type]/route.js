import { connectDB } from "@/lib/connectDB";
import { requireAuth } from "@/lib/auth";
import { toCsv, csvResponse } from "@/lib/csv";
import Account from "@/models/accountModel";
import Campaign from "@/models/campaignModel";
import Payment from "@/models/paymentModel";
import Lead from "@/models/leadModel";

// Row cap — same safety ceiling as the admin reports export.
const MAX_ROWS = 5000;

function fmtDate(d) {
  return d ? new Date(d).toISOString().slice(0, 10) : "";
}

async function buildRetailersReport(distributorId) {
  const merchants = await Account.find({ role: "Merchant", parentId: distributorId })
    .select("name email profile.storeName profile.businessModel status activePlan createdAt")
    .limit(MAX_ROWS)
    .lean();

  const columns = [
    { label: "Business Name", value: (r) => r.profile?.storeName || r.name },
    { label: "Owner", value: (r) => r.name },
    { label: "Email", value: (r) => r.email },
    { label: "Business Model", value: (r) => r.profile?.businessModel || "Retail" },
    { label: "Plan", value: (r) => r.activePlan || "None" },
    { label: "Status", value: (r) => r.status },
    { label: "Joined", value: (r) => fmtDate(r.createdAt) },
  ];
  return toCsv(merchants, columns);
}

async function buildLeadsReport(distributorId) {
  const leads = await Lead.find({ distributorId })
    .populate("assignedTo", "name")
    .select("businessName ownerName phone email city state status interestLevel assignedTo createdAt")
    .limit(MAX_ROWS)
    .lean();

  const columns = [
    { label: "Business Name", value: (l) => l.businessName },
    { label: "Owner", value: (l) => l.ownerName },
    { label: "Phone", value: (l) => l.phone },
    { label: "Email", value: (l) => l.email || "" },
    { label: "City", value: (l) => l.city || "" },
    { label: "State", value: (l) => l.state || "" },
    { label: "Status", value: (l) => l.status },
    { label: "Interest", value: (l) => l.interestLevel || "" },
    { label: "Assigned To", value: (l) => l.assignedTo?.name || "" },
    { label: "Created", value: (l) => fmtDate(l.createdAt) },
  ];
  return toCsv(leads, columns);
}

async function buildPaymentsReport(distributorId) {
  const payments = await Payment.find({ distributorId })
    .populate("merchantId", "name profile.storeName")
    .select("merchantId amount tax totalAmount status paymentGateway createdAt")
    .sort({ createdAt: -1 })
    .limit(MAX_ROWS)
    .lean();

  const columns = [
    { label: "Retailer", value: (p) => p.merchantId?.profile?.storeName || p.merchantId?.name || "" },
    { label: "Amount (INR)", value: (p) => p.amount },
    { label: "Tax (INR)", value: (p) => p.tax || 0 },
    { label: "Total (INR)", value: (p) => p.totalAmount },
    { label: "Status", value: (p) => p.status },
    { label: "Gateway", value: (p) => p.paymentGateway || "" },
    { label: "Date", value: (p) => fmtDate(p.createdAt) },
  ];
  return toCsv(payments, columns);
}

async function buildCampaignsReport(distributorId) {
  const retailers = await Account.find({ role: "Merchant", parentId: distributorId }).select("_id name profile.storeName");
  const retailerIds = retailers.map((r) => r._id);
  const retailerMap = Object.fromEntries(retailers.map((r) => [String(r._id), r.profile?.storeName || r.name]));

  const campaigns = retailerIds.length
    ? await Campaign.find({ merchantId: { $in: retailerIds } })
        .select("campaignName merchantId status startDate endDate allocated_scratch_cards used_scratch_cards redeemed_scratch_cards createdAt")
        .limit(MAX_ROWS)
        .lean()
    : [];

  const columns = [
    { label: "Campaign", value: (c) => c.campaignName },
    { label: "Retailer", value: (c) => retailerMap[String(c.merchantId)] || "" },
    { label: "Status", value: (c) => c.status },
    { label: "Start Date", value: (c) => fmtDate(c.startDate) },
    { label: "End Date", value: (c) => fmtDate(c.endDate) },
    { label: "Allocated", value: (c) => c.allocated_scratch_cards || 0 },
    { label: "Used", value: (c) => c.used_scratch_cards || 0 },
    { label: "Redeemed", value: (c) => c.redeemed_scratch_cards || 0 },
    { label: "Created", value: (c) => fmtDate(c.createdAt) },
  ];
  return toCsv(campaigns, columns);
}

const REPORTS = {
  retailers: { build: buildRetailersReport, filename: "my-retailers-report" },
  leads: { build: buildLeadsReport, filename: "my-leads-report" },
  payments: { build: buildPaymentsReport, filename: "my-payments-report" },
  campaigns: { build: buildCampaignsReport, filename: "my-campaigns-report" },
};

// GET /api/distributor/reports/[type] — CSV export scoped to this
// distributor's own network only (see admin/reports/[type] for the
// platform-wide Super_Admin equivalent this mirrors).
export async function GET(request, { params }) {
  await connectDB();
  const { account, error } = await requireAuth();
  if (error) return error;
  if (account.role !== "Distributor") {
    return Response.json({ success: false, error: "Forbidden" }, { status: 403 });
  }

  const { type } = await params;
  const report = REPORTS[type];
  if (!report) {
    return Response.json(
      { success: false, error: `Unknown report type. Valid: ${Object.keys(REPORTS).join(", ")}` },
      { status: 400 },
    );
  }

  const csv = await report.build(account._id);
  const date = new Date().toISOString().slice(0, 10);

  return csvResponse(csv, `${report.filename}-${date}.csv`);
}
