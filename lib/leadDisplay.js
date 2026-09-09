// Shared lead-pipeline display constants — single source of truth for the
// Leads list page, the Lead detail drawer, and the Sales_Executive "My
// Leads" view, so the status list/colors can never drift out of sync with
// each other or with models/leadModel.js (LEAD_STATUSES there is the real
// source of truth for validation; this file only needs to stay in sync with
// it for display purposes).

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

export const STATUS_COLORS = {
  "New Lead": "#6b7280",
  "Contacted": "#3b82f6",
  "Demo Scheduled": "#8b5cf6",
  "Demo Done": "#6d5df6",
  "Follow-up Pending": "#f59e0b",
  "Interested": "#0ea5e9",
  "Plan Discussed": "#ef9e1b",
  "Converted": "#10b981",
  "Not Interested": "#ef4444",
};

export const INTEREST_CLASS = {
  Low: "interestLow",
  Medium: "interestMedium",
  High: "interestHigh",
};
