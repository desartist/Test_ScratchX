import mongoose from "mongoose";

/**
 * Lead
 *
 * A prospective retailer/wholesaler in a Distributor's acquisition pipeline,
 * tracked from first contact through to conversion into a real Merchant
 * account (see app/api/distributor/merchants — conversion reuses that
 * existing account-creation flow rather than duplicating it; this model
 * only stores convertedRetailerId as a pointer once that happens).
 *
 * Mirrors the note/timeline pattern already used by supportTicketModel.js
 * (assignedTo, embedded sub-documents with authorId/authorName + timestamps)
 * so this feels like the same application, not a bolted-on CRM.
 */

const leadNoteSchema = new mongoose.Schema(
  {
    authorId: { type: mongoose.Schema.Types.ObjectId, ref: "Account", required: true },
    authorName: { type: String, required: true },
    message: { type: String, required: true, trim: true, maxlength: 2000 },
  },
  { timestamps: true },
);

const leadTimelineEventSchema = new mongoose.Schema(
  {
    // e.g. "created", "assigned", "status_changed", "demo_scheduled",
    // "follow_up_set", "note_added", "converted", "lost"
    event: { type: String, required: true },
    detail: { type: String, default: null },
    actorId: { type: mongoose.Schema.Types.ObjectId, ref: "Account", default: null },
    actorName: { type: String, default: null },
  },
  { timestamps: true },
);

export const LEAD_STATUSES = [
  "New Lead",
  "Contacted",
  "Demo Scheduled",
  "Demo Done",
  "Follow-up Pending",
  "Interested",
  "Plan Discussed",
  "Converted",
  "Not Interested",
];

export const LEAD_INTEREST_LEVELS = ["Low", "Medium", "High"];

const leadSchema = new mongoose.Schema(
  {
    // Owning distributor — a lead is always scoped to exactly one distributor,
    // never visible across distributors (see RBAC note in API routes).
    distributorId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Account",
      required: [true, "Distributor ID is required"],
      index: true,
    },

    // Sales_Executive this lead is currently assigned to (nullable — unassigned).
    assignedTo: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Account",
      default: null,
      index: true,
    },

    businessName: { type: String, required: [true, "Business name is required"], trim: true },
    ownerName: { type: String, required: [true, "Owner/contact name is required"], trim: true },
    phone: { type: String, required: [true, "Phone number is required"], trim: true },
    email: { type: String, trim: true, lowercase: true, default: null },
    businessCategory: { type: String, trim: true, default: null },

    city: { type: String, trim: true, default: null },
    state: { type: String, trim: true, default: null },
    territory: { type: String, trim: true, default: null },

    status: {
      type: String,
      enum: LEAD_STATUSES,
      default: "New Lead",
      index: true,
    },
    interestLevel: {
      type: String,
      enum: [...LEAD_INTEREST_LEVELS, null],
      default: null,
    },

    demoDate: { type: Date, default: null },
    nextFollowUpDate: { type: Date, default: null, index: true },

    notes: [leadNoteSchema],
    timeline: [leadTimelineEventSchema],

    // Set once this lead becomes a real retailer/wholesaler account.
    convertedRetailerId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Account",
      default: null,
    },
    convertedAt: { type: Date, default: null },
    lostReason: { type: String, trim: true, default: null },

    createdBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Account",
      required: [true, "Creator ID is required"],
    },
  },
  { timestamps: true },
);

leadSchema.index({ distributorId: 1, status: 1, createdAt: -1 });
leadSchema.index({ distributorId: 1, assignedTo: 1 });
leadSchema.index({ distributorId: 1, nextFollowUpDate: 1 });

export default mongoose.models.Lead || mongoose.model("Lead", leadSchema);
