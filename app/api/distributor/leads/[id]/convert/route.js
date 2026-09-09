import { connectDB } from "@/lib/connectDB";
import { requireAuth } from "@/lib/auth";
import Account from "@/models/accountModel";
import Lead from "@/models/leadModel";

// POST /api/distributor/leads/[id]/convert
//
// Marks a lead Converted and links it to the retailer/wholesaler account
// that was just created for it. Deliberately does NOT create the Merchant
// account itself — that stays the sole responsibility of the existing
// POST /api/distributor/merchants flow (AddBusinessModal), so there is only
// ever one place in the codebase that creates a Merchant account. The
// frontend calls merchants POST first, then this route with the resulting
// merchant._id.
export async function POST(request, { params }) {
  await connectDB();
  const { account, error } = await requireAuth();
  if (error) return error;
  if (!["Super_Admin", "Distributor"].includes(account.role)) {
    return Response.json({ success: false, error: "Forbidden" }, { status: 403 });
  }

  const { id } = await params;
  const { retailerId } = await request.json();
  if (!retailerId) {
    return Response.json({ success: false, error: "retailerId is required" }, { status: 400 });
  }

  const query = { _id: id };
  if (account.role === "Distributor") query.distributorId = account._id;
  const lead = await Lead.findOne(query);
  if (!lead) {
    return Response.json({ success: false, error: "Lead not found" }, { status: 404 });
  }

  const retailerQuery = { _id: retailerId, role: "Merchant" };
  if (account.role === "Distributor") retailerQuery.parentId = account._id;
  const retailer = await Account.findOne(retailerQuery).select("_id name");
  if (!retailer) {
    return Response.json(
      { success: false, error: "Retailer account not found under this distributor" },
      { status: 400 },
    );
  }

  lead.status = "Converted";
  lead.convertedRetailerId = retailer._id;
  lead.convertedAt = new Date();
  lead.timeline.push({
    event: "converted",
    detail: retailer.name,
    actorId: account._id,
    actorName: account.name,
  });
  await lead.save();

  return Response.json({ success: true, lead }, { status: 200 });
}
