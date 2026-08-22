import PlatformSettings from "@/models/platformSettingsModel";

// The singleton always has the same shape, created lazily on first read.
export async function getPlatformSettings() {
  let settings = await PlatformSettings.findOne();
  if (!settings) {
    settings = await PlatformSettings.create({});
  }
  return settings;
}

// Effective distributor commission rate when a distributor has no
// profile.commissionRate of their own set — DB setting first, then the
// DISTRIBUTOR_COMMISSION_RATE env var, then 0.
export async function getEffectiveDefaultCommissionRate() {
  const settings = await getPlatformSettings();
  if (settings.defaultCommissionRate !== null && settings.defaultCommissionRate !== undefined) {
    return settings.defaultCommissionRate;
  }
  return parseFloat(process.env.DISTRIBUTOR_COMMISSION_RATE ?? "0");
}
