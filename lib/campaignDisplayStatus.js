/**
 * The status a campaign is SHOWN with — stored status adjusted for its dates.
 *
 *   draft      never launched (no QR generated yet), whatever its dates
 *   ended      end date has passed
 *   scheduled  launched (stores, scratches and QR all set) but the start date
 *              is still ahead — it goes live on its own on that date
 *   otherwise  the stored status (active, paused)
 *
 * One rule for every screen: a copy of the old version showed launched
 * campaigns as "Draft" until their start date.
 *
 * @param {{ status?: string, startDate?: string|Date, endDate?: string|Date }} campaign
 * @param {Date} [now]
 */
export function campaignDisplayStatus(campaign, now = new Date()) {
  const status = (campaign?.status || "active").toLowerCase();
  if (status === "draft") return "draft";
  if (campaign?.endDate && new Date(campaign.endDate) < now) return "ended";
  if (campaign?.startDate && new Date(campaign.startDate) > now) return "scheduled";
  return status;
}
