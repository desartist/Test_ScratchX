import { connectDB } from "@/lib/connectDB";
import { requireAuth } from "@/lib/auth";
import Account from "@/models/accountModel";
import Lead, { LEAD_STATUSES, LEAD_INTEREST_LEVELS } from "@/models/leadModel";

const ALLOWED_ROLES = ["Super_Admin", "Distributor", "Sales_Executive"];

function checkAllowed(account) {
  if (!ALLOWED_ROLES.includes(account.role)) {
    return Response.json({ success: false, error: "Forbidden" }, { status: 403 });
  }
  return null;
}

function scopedQuery(id, account) {
  const query = { _id: id };
  if (account.role === "Distributor") query.distributorId = account._id;
  if (account.role === "Sales_Executive") query.assignedTo = account._id;
  return query;
}

async function findScopedLead(id, account) {
  return Lead.findOne(scopedQuery(id, account))
    .populate("assignedTo", "name email")
    .populate("convertedRetailerId", "name email profile.storeName")
    .populate("notes.authorId", "name")
    .populate("timeline.actorId", "name");
}

// GET /api/distributor/leads/[id] — lead detail (summary + notes + timeline)
export async function GET(request, { params }) {
  await connectDB();
  const { account, error } = await requireAuth();
  if (error) return error;
  const denied = checkAllowed(account);
  if (denied) return denied;

  const { id } = await params;
  const lead = await findScopedLead(id, account);
  if (!lead) {
    return Response.json({ success: false, error: "Lead not found" }, { status: 404 });
  }

  return Response.json({ success: true, lead }, { status: 200 });
}

// PATCH /api/distributor/leads/[id] — update status/assignment/interest/demo/follow-up/lost reason
export async function PATCH(request, { params }) {
  await connectDB();
  const { account, error } = await requireAuth();
  if (error) return error;
  const denied = checkAllowed(account);
  if (denied) return denied;

  const { id } = await params;
  const lead = await Lead.findOne(scopedQuery(id, account));
  if (!lead) {
    return Response.json({ success: false, error: "Lead not found" }, { status: 404 });
  }

  const body = await request.json();
  const {
    status, assignedTo, interestLevel, demoDate, nextFollowUpDate, lostReason,
    businessName, ownerName, phone, email, businessCategory, city, state, territory,
  } = body;

  // Reassignment is a Distributor/Admin-only action — a Sales_Executive
  // could otherwise route a lead to a colleague to dodge tracking.
  if (assignedTo !== undefined && account.role === "Sales_Executive") {
    return Response.json(
      { success: false, error: "Only your distributor can reassign a lead" },
      { status: 403 },
    );
  }

  const timelineAdds = [];

  if (status !== undefined && status !== lead.status) {
    if (!LEAD_STATUSES.includes(status)) {
      return Response.json({ success: false, error: "Invalid status" }, { status: 400 });
    }
    lead.status = status;
    timelineAdds.push({
      event: "status_changed",
      detail: status,
      actorId: account._id,
      actorName: account.name,
    });
    if (status === "Not Interested") {
      lead.lostReason = lostReason || lead.lostReason;
      timelineAdds.push({ event: "lost", detail: lostReason || null, actorId: account._id, actorName: account.name });
    }
  }

  if (assignedTo !== undefined) {
    if (assignedTo === null) {
      lead.assignedTo = null;
    } else {
      const exec = await Account.findOne({
        _id: assignedTo,
        role: "Sales_Executive",
        parentId: lead.distributorId,
        status: { $ne: "deactivated" },
      }).select("_id name");
      if (!exec) {
        return Response.json(
          { success: false, error: "Assigned sales executive not found under this distributor" },
          { status: 400 },
        );
      }
      lead.assignedTo = exec._id;
      timelineAdds.push({
        event: "assigned",
        detail: exec.name,
        actorId: account._id,
        actorName: account.name,
      });
    }
  }

  if (interestLevel !== undefined) {
    if (interestLevel !== null && !LEAD_INTEREST_LEVELS.includes(interestLevel)) {
      return Response.json({ success: false, error: "Invalid interest level" }, { status: 400 });
    }
    lead.interestLevel = interestLevel;
  }

  if (demoDate !== undefined) {
    lead.demoDate = demoDate ? new Date(demoDate) : null;
    if (demoDate) {
      timelineAdds.push({
        event: "demo_scheduled",
        detail: new Date(demoDate).toLocaleString("en-IN"),
        actorId: account._id,
        actorName: account.name,
      });
    }
  }

  if (nextFollowUpDate !== undefined) {
    lead.nextFollowUpDate = nextFollowUpDate ? new Date(nextFollowUpDate) : null;
    if (nextFollowUpDate) {
      timelineAdds.push({
        event: "follow_up_set",
        detail: new Date(nextFollowUpDate).toLocaleString("en-IN"),
        actorId: account._id,
        actorName: account.name,
      });
    }
  }

  // Simple field edits — no timeline noise for these.
  if (businessName !== undefined) lead.businessName = businessName;
  if (ownerName !== undefined) lead.ownerName = ownerName;
  if (phone !== undefined) lead.phone = phone;
  if (email !== undefined) lead.email = email;
  if (businessCategory !== undefined) lead.businessCategory = businessCategory;
  if (city !== undefined) lead.city = city;
  if (state !== undefined) lead.state = state;
  if (territory !== undefined) lead.territory = territory;

  if (timelineAdds.length) {
    lead.timeline.push(...timelineAdds);
  }

  await lead.save();

  return Response.json({ success: true, lead }, { status: 200 });
}
