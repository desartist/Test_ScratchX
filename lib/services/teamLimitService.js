import Account from "@/models/accountModel";
import Store from "@/models/storeModel";
import { getBaseTeamLimits, EXTRA_SEAT_PRICE_INR, MAX_MANAGERS_PER_STORE } from "@/lib/teamLimits";

/**
 * Is `store` the merchant's main store? Only matters for Retail + SMART
 * (see lib/teamLimits.js). Trusts `store.is_main_store` when set, but falls
 * back defensively for stores that predate that flag (or were created
 * through a path that never set it): a merchant with only one store is
 * trivially "main" regardless of the flag, and otherwise the earliest
 * created store is treated as main. Without this fallback, plenty of real
 * single-store SMART merchants would be wrongly capped at 2 instead of 3.
 */
async function resolveIsMainStore(store) {
  if (store.is_main_store) return true;

  const siblingCount = await Store.countDocuments({
    merchant_id: store.merchant_id,
    isDeleted: false,
  });
  if (siblingCount <= 1) return true;

  const earliest = await Store.findOne({ merchant_id: store.merchant_id, isDeleted: false })
    .sort({ createdAt: 1 })
    .select("_id");
  return String(earliest?._id) === String(store._id);
}

/**
 * Effective Store_Manager/Store_Staff seat cap for one store (plan limit +
 * purchased seat add-ons) plus current usage against it. Manager is capped
 * at MAX_MANAGERS_PER_STORE independently of the total; Staff has no
 * independent sub-cap, only the shared total.
 */
export async function getStoreTeamLimitStatus(merchantAccount, store) {
  const businessModel = merchantAccount?.profile?.businessModel;
  const activePlan = merchantAccount?.activePlan;

  const isMainStore =
    activePlan === "SMART" && businessModel !== "Wholesale"
      ? await resolveIsMainStore(store)
      : true;

  const base = getBaseTeamLimits(merchantAccount, isMainStore);
  const addons = store.teamSeatAddons || {};
  const extraSeats = (addons.extraManagerSeats || 0) + (addons.extraStaffSeats || 0);
  const maxTotal = base.maxTotal + extraSeats;

  const [managerCount, staffCount] = await Promise.all([
    Account.countDocuments({
      storeId: store._id,
      role: "Store_Manager",
      status: { $ne: "deactivated" },
    }),
    Account.countDocuments({
      storeId: store._id,
      role: "Store_Staff",
      status: { $ne: "deactivated" },
    }),
  ]);

  const totalCount = managerCount + staffCount;

  return {
    managerCount,
    staffCount,
    totalCount,
    maxManagers: MAX_MANAGERS_PER_STORE,
    maxTotal,
    // Informational only (shown in the Team Access header) — doesn't gate
    // anything directly; businessModel/plan feed into maxTotal above.
    businessModel: businessModel || null,
    canAddManager: managerCount < MAX_MANAGERS_PER_STORE && totalCount < maxTotal,
    canAddStaff: totalCount < maxTotal,
    extraSeatPriceINR: EXTRA_SEAT_PRICE_INR,
  };
}

/**
 * Throws a TEAM_LIMIT_REACHED error (carrying the current limitStatus) if
 * adding one more member of `role` to `store` would exceed the merchant's
 * limits. Returns the limit status otherwise.
 */
export async function assertCanAddTeamMember(merchantAccount, store, role) {
  const status = await getStoreTeamLimitStatus(merchantAccount, store);
  const allowed = role === "Store_Manager" ? status.canAddManager : status.canAddStaff;

  if (!allowed) {
    const message =
      role === "Store_Manager" && status.managerCount >= status.maxManagers
        ? `Only ${status.maxManagers} Manager is allowed per store.`
        : `Team seat limit reached for this store (${status.totalCount}/${status.maxTotal}). Request an extra seat to add more.`;
    const err = new Error(message);
    err.code = "TEAM_LIMIT_REACHED";
    err.limitStatus = status;
    throw err;
  }

  return status;
}
