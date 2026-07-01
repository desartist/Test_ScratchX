/**
 * Distributor Audit Log Model
 *
 * Comprehensive audit trail for all distributor-related actions
 * Tracks who did what, when, where, and the impact
 */

import mongoose from 'mongoose';

const distributorAuditLogSchema = new mongoose.Schema(
  {
    // Audit identification
    logId: {
      type: String,
      unique: true,
      required: true,
      index: true,
    },

    // Actor (who performed the action)
    actorId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Account',
      required: true,
      index: true,
    },
    actorEmail: String,
    actorRole: String, // 'super_admin', 'distributor', 'support'

    // Target (what was affected)
    targetType: {
      type: String,
      enum: [
        'distributor',
        'retailer',
        'plan_assignment',
        'order',
        'transaction',
        'inventory',
        'subscription',
      ],
      required: true,
      index: true,
    },
    targetId: {
      type: mongoose.Schema.Types.ObjectId,
      required: true,
      index: true,
    },
    targetDetails: mongoose.Schema.Types.Mixed,

    // Distributor context
    distributorId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Distributor',
      required: true,
      index: true,
    },

    // Action details
    action: {
      type: String,
      enum: [
        'create',
        'read',
        'update',
        'delete',
        'purchase_plans',
        'assign_plan',
        'revoke_plan',
        'create_retailer',
        'update_retailer',
        'deactivate_retailer',
        'view_analytics',
        'export_data',
        'download_invoice',
        'approve_payment',
        'reject_payment',
        'adjust_inventory',
        'cancel_order',
        'send_notification',
      ],
      required: true,
      index: true,
    },

    // Change details
    changes: {
      before: mongoose.Schema.Types.Mixed,
      after: mongoose.Schema.Types.Mixed,
      changedFields: [String],
    },

    // Impact
    impact: {
      type: String,
      enum: ['low', 'medium', 'high', 'critical'],
      default: 'low',
    },
    impactDescription: String,

    // Status
    status: {
      type: String,
      enum: ['success', 'partial_success', 'failed', 'warning'],
      default: 'success',
    },
    errorMessage: String,
    warningMessage: String,

    // Context information
    metadata: {
      ipAddress: String,
      userAgent: String,
      requestId: String,
      source: {
        type: String,
        enum: ['web', 'api', 'admin_panel', 'batch_job'],
        default: 'web',
      },
      endpoint: String,
      method: String, // HTTP method: GET, POST, PUT, DELETE
    },

    // Sensitive data handling
    requiresApproval: {
      type: Boolean,
      default: false,
    },
    approvedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Account',
    },
    approvedAt: Date,
    approvalReason: String,

    // Compliance
    complianceChecked: {
      type: Boolean,
      default: false,
    },
    complianceStatus: String,
    complianceNotes: String,

    // Related logs
    relatedLogs: [
      {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'DistributorAuditLog',
      },
    ],

    // Data retention
    dataClassification: {
      type: String,
      enum: ['public', 'internal', 'confidential', 'restricted'],
      default: 'internal',
    },
    retentionDays: {
      type: Number,
      default: 2555, // ~7 years default
    },
    expiresAt: Date,
  },
  {
    timestamps: true,
    indexes: [
      { distributorId: 1, createdAt: -1 },
      { actorId: 1, createdAt: -1 },
      { targetId: 1, createdAt: -1 },
      { action: 1, createdAt: -1 },
      { logId: 1 },
      { status: 1, createdAt: -1 },
      { impact: 1, createdAt: -1 },
      { targetType: 1, action: 1, createdAt: -1 },
    ],
  }
);

// Auto-set expiresAt based on retentionDays
distributorAuditLogSchema.pre('save', function (next) {
  if (!this.expiresAt && this.retentionDays) {
    const expiryDate = new Date();
    expiryDate.setDate(expiryDate.getDate() + this.retentionDays);
    this.expiresAt = expiryDate;
  }
  next();
});

export default mongoose.models.DistributorAuditLog ||
  mongoose.model('DistributorAuditLog', distributorAuditLogSchema);
