/**
 * The status written into a store's own list of campaigns
 * (store.assignedCampaigns[].status), which only accepts
 * 'active' | 'inactive' | 'ending_soon' | 'ended'.
 *
 * Campaigns have other statuses — a campaign is still 'draft' when the
 * launch wizard assigns its store (the QR comes after), or 'paused' — and
 * copying those across made the store document invalid: the assignment's
 * store save failed silently, and later the store couldn't be saved at all.
 */
const STORE_CAMPAIGN_STATUSES = ["active", "inactive", "ending_soon", "ended"];

export function storeCampaignStatus(campaignStatus) {
  const s = String(campaignStatus || "active").toLowerCase();
  return STORE_CAMPAIGN_STATUSES.includes(s) ? s : "inactive";
}
