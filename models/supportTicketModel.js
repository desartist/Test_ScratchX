import mongoose from "mongoose";

/**
 * SupportTicket
 *
 * Platform support/requests tracked by the Super Admin team. Raised for a
 * retailer or distributor account (the "requester") — either logged by an
 * admin on the requester's behalf (phone/email/chat) or, in future, filed
 * directly by the requester once a self-service portal exists.
 */
const replySchema = new mongoose.Schema(
  {
    authorId: { type: mongoose.Schema.Types.ObjectId, ref: "Account", required: true },
    authorName: { type: String, required: true },
    message: { type: String, required: true },
    isInternalNote: { type: Boolean, default: false },
  },
  { timestamps: true },
);

const supportTicketSchema = new mongoose.Schema(
  {
    requesterId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Account",
      required: true,
      index: true,
    },
    requesterRole: {
      type: String,
      enum: ["Merchant", "Distributor"],
      required: true,
    },
    subject: { type: String, required: true, trim: true, maxlength: 200 },
    description: { type: String, required: true, trim: true, maxlength: 5000 },
    category: {
      type: String,
      enum: ["Payment", "QR", "Campaign", "Scratch", "Subscription", "Account", "Technical", "Other"],
      default: "Other",
      index: true,
    },
    priority: {
      type: String,
      enum: ["Critical", "High", "Medium", "Low"],
      default: "Medium",
      index: true,
    },
    status: {
      type: String,
      enum: ["Open", "In Progress", "Waiting", "Resolved", "Closed"],
      default: "Open",
      index: true,
    },
    assignedTo: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Account",
      default: null,
      index: true,
    },
    replies: [replySchema],
    resolvedAt: { type: Date, default: null },
    closedAt: { type: Date, default: null },
  },
  { timestamps: true },
);

supportTicketSchema.index({ status: 1, priority: 1, createdAt: -1 });
supportTicketSchema.index({ requesterId: 1, createdAt: -1 });

export default mongoose.models.SupportTicket ||
  mongoose.model("SupportTicket", supportTicketSchema);
