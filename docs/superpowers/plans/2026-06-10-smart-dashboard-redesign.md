# Smart (Multi-Store) Merchant Dashboard Redesign — Implementation Plan

> **For agentic workers:** Use superpowers:subagent-driven-development or executing-plans to implement task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Redesign the Smart-plan merchant dashboard to match the approved Figma prototype, backed entirely by real data — building the missing analytics aggregation APIs and a new Scratch Allocation Request (approvals) feature, then assembling a mobile-first, component-driven dashboard.

**Architecture:** Three layers. (1) **Backend analytics** — extend `lib/dashboardService.js` with time-series/per-store aggregation methods and add thin `/api/analytics/*` routes. (2) **Approvals feature** — new `ScratchAllocationRequest` model + CRUD/approve/reject routes. (3) **Frontend** — a new `SmartDashboard` composed of reusable, individually-tested components (cards, charts, tables), wired only to real APIs. No mock data, no hardcoded metrics; sections without data show explicit empty states. All existing business logic, validations, subscription/store/campaign rules, and APIs are preserved — only UI and additive read-only endpoints change.

**Tech Stack:** Next.js 16 (App Router — note `AGENTS.md`: read `node_modules/next/dist/docs/` before using framework APIs), React 19, Mongoose/MongoDB, CSS Modules with tokens from `app/globals.css`. Charts are **custom SVG/CSS components** (no new dependency).

---

## Constraints (do NOT violate)

- Do NOT change existing API contracts, business logic, subscription/store/campaign validation, multi-store permissions, Core/Smart restrictions, unlimited-scratches logic, scratch calculations, session handling, or auth.
- New analytics endpoints are **read-only** and additive.
- No mock data, no hardcoded metrics. Every number traces to an API field. Missing data → empty state.
- CSS Modules only (no inline styles), tokens from `globals.css`. Mobile-first (base ~431px), responsive at 768px / 1024px.
- Follow existing auth pattern in routes: `const { account, error } = await requireAuth(); if (error) return error;`

## Design tokens (from `app/globals.css`)

Use existing vars. Brand mapping for this redesign:
- Primary `--color-primary: #ef9e1b`; Navy `--color-navy: #010f44`; Success `--color-success`; Warning `--color-warning`.
- Subscription hero gradient (Figma purple): add new tokens `--grad-hero-start: #6d5df6; --grad-hero-end: #8b7cf7;` to `globals.css` `:root`.
- Card radius: use `16px` for dashboard cards (Figma) — add `--radius-dash-card: 16px`. Shadow: `--shadow-card`.

---

## PHASE 1 — Backend: Analytics aggregation

Source models confirmed: `Scan` (`scannedAt`, `campaignId`, `merchantId`, `source`), `CustomerParticipation` (`merchant_id`, `store_id`, `campaign_id`, `customer_mobile`, `createdAt`, `couponClaimedAt`), `ScratchCardTransaction` (`merchant_id`, `campaign_id`, `store_id`, `action_type`, `quantity`, `createdAt`), `Campaign` (cached `used_scratch_cards`, `redeemed_scratch_cards`), `CampaignStoreMapping` (per-store allocations), `Store`. Existing routes to reuse/extend: `/api/analytics/customer-growth`, `/api/analytics/inventory`, `/api/analytics/redemptions`, `/api/analytics/customer-insights`.

### Task 1.1: Add analytics methods to dashboardService

**Files:**
- Modify: `lib/dashboardService.js` (append methods to the exported service)
- Test: `lib/__tests__/dashboardAnalytics.test.js` (Create)

Add these methods (all accept `(merchantId, { days = 7 } = {})` and return plain objects; use aggregation pipelines with `lean()`):

- [ ] **Step 1: Write failing tests** for each method with a seeded in-memory dataset (or a fixture merchant). Assert shape, not exact values.

```js
// lib/__tests__/dashboardAnalytics.test.js
import dashboardService from "@/lib/dashboardService";
// Each test seeds a merchant with known Scan/Participation/Transaction docs, then asserts:
test("getDailyScratchUsage returns one bucket per day in range", async () => {
  const res = await dashboardService.getDailyScratchUsage(MID, { days: 7 });
  expect(res).toHaveLength(7);
  expect(res[0]).toHaveProperty("date");
  expect(res[0]).toHaveProperty("used");
});
// Repeat for: getCustomerGrowthSeries, getCampaignConsumption, getStoreWisePerformance, getPerStoreStats, getKpiSummary
```

- [ ] **Step 2: Run tests, confirm they fail** (`npm test -- dashboardAnalytics`). Expected: "is not a function".

- [ ] **Step 3: Implement methods.** Concrete aggregations:

```js
// getDailyScratchUsage — scratches consumed/redeemed per day
async getDailyScratchUsage(merchantId, { days = 7 } = {}) {
  const since = new Date(Date.now() - (days - 1) * 86400000);
  since.setHours(0, 0, 0, 0);
  const rows = await ScratchCardTransaction.aggregate([
    { $match: { merchant_id: toObjId(merchantId),
        action_type: { $in: ["redeemed", "allocated_to_store"] },
        createdAt: { $gte: since } } },
    { $group: { _id: { $dateToString: { format: "%Y-%m-%d", date: "$createdAt" } },
        used: { $sum: "$quantity" } } },
  ]);
  return fillDateBuckets(since, days, rows, "used"); // helper below
}

// getCustomerGrowthSeries — new vs repeat per day
async getCustomerGrowthSeries(merchantId, { days = 7 } = {}) {
  const since = new Date(Date.now() - (days - 1) * 86400000); since.setHours(0,0,0,0);
  // firstSeen per mobile (all time) to classify new vs repeat
  const firstSeen = await CustomerParticipation.aggregate([
    { $match: { merchant_id: toObjId(merchantId) } },
    { $group: { _id: "$customer_mobile", first: { $min: "$createdAt" } } },
  ]);
  const firstMap = new Map(firstSeen.map(r => [r._id, r.first]));
  const parts = await CustomerParticipation.find({
    merchant_id: merchantId, createdAt: { $gte: since } })
    .select("customer_mobile createdAt").lean();
  // bucket: a participation is "new" if its day === firstSeen day for that mobile
  return bucketNewVsRepeat(since, days, parts, firstMap);
}

// getCampaignConsumption — donut: used per campaign (cached fields)
async getCampaignConsumption(merchantId) {
  const camps = await Campaign.find({ merchantId })
    .select("campaignName used_scratch_cards redeemed_scratch_cards").lean();
  return camps.map(c => ({ campaignId: c._id, name: c.campaignName,
    used: (c.used_scratch_cards || 0) + (c.redeemed_scratch_cards || 0) }))
    .filter(c => c.used > 0).sort((a,b) => b.used - a.used);
}

// getStoreWisePerformance — scratches per store
async getStoreWisePerformance(merchantId) {
  const rows = await CampaignStoreMapping.aggregate([
    { $match: { merchant_id: toObjId(merchantId) } },
    { $group: { _id: "$store_id",
        used: { $sum: { $add: ["$used_scratch_cards", "$redeemed_scratch_cards"] } } } },
    { $lookup: { from: "stores", localField: "_id", foreignField: "_id", as: "s" } },
    { $unwind: "$s" },
    { $project: { storeId: "$_id", name: "$s.store_name", used: 1 } },
    { $sort: { used: -1 } },
  ]);
  return rows;
}

// getPerStoreStats — scans + unique customers per store (for store performance cards)
async getPerStoreStats(merchantId) {
  // customers per store (direct store_id)
  const cust = await CustomerParticipation.aggregate([
    { $match: { merchant_id: toObjId(merchantId) } },
    { $group: { _id: "$store_id", customers: { $addToSet: "$customer_mobile" } } },
    { $project: { storeId: "$_id", customers: { $size: "$customers" } } },
  ]);
  // scans per store: Scan has no store_id → join via Campaign.assignedStores
  const scans = await Scan.aggregate([
    { $match: { merchantId: toObjId(merchantId) } },
    { $lookup: { from: "campaigns", localField: "campaignId", foreignField: "_id", as: "c" } },
    { $unwind: "$c" }, { $unwind: "$c.assignedStores" },
    { $group: { _id: "$c.assignedStores.storeId", scans: { $sum: 1 } } },
    { $project: { storeId: "$_id", scans: 1 } },
  ]);
  return mergeByStore(cust, scans); // { storeId: {customers, scans} }
}

// getKpiSummary — header KPI tiles (real fields only)
async getKpiSummary(merchantId) {
  const [stores, campaigns] = await Promise.all([
    Store.find({ merchant_id: merchantId }).select("status").lean(),
    Campaign.find({ merchantId }).select("status endDate").lean(),
  ]);
  const now = Date.now();
  return {
    totalStores: stores.length,
    activeStores: stores.filter(s => s.status === "active").length,
    totalCampaigns: campaigns.length,
    activeCampaigns: campaigns.filter(c => c.status === "active").length,
    endingSoon: campaigns.filter(c => c.endDate &&
      (new Date(c.endDate) - now) / 86400000 <= 7 && new Date(c.endDate) > now).length,
  };
}
```

Add helpers at top of file: `toObjId(id)` (`new mongoose.Types.ObjectId(id)` guarded by `isValid`), `fillDateBuckets(since, days, rows, key)` (returns `[{date:'YYYY-MM-DD', [key]:n}]` with zero-fill), `bucketNewVsRepeat(...)` (`[{date, new, repeat}]`), `mergeByStore(a,b)`.

- [ ] **Step 4: Run tests, confirm pass.**
- [ ] **Step 5: Commit** `feat(analytics): add dashboard time-series + per-store aggregation methods`.

### Task 1.2: Analytics API routes

**Files (Create):**
- `app/api/analytics/scratch-usage/route.js` → `getDailyScratchUsage`
- `app/api/analytics/campaign-consumption/route.js` → `getCampaignConsumption`
- `app/api/analytics/store-performance/route.js` → `getStoreWisePerformance` + `getPerStoreStats`
- `app/api/analytics/kpi-summary/route.js` → `getKpiSummary`

(`customer-growth` already exists — reuse; verify it returns `{date,new,repeat}` shape, adapt service call if needed.)

- [ ] **Step 1:** Each route: `GET`, `await connectDB()`, `requireAuth()`, read `?days=` (default 7, clamp 1–90), call service with `account._id`, return `{ success: true, data }`. On error return `{ success:false, error }` 500. Use existing routes as template.

```js
// app/api/analytics/scratch-usage/route.js
import { connectDB } from "@/lib/connectDB";
import { requireAuth } from "@/lib/auth";
import dashboardService from "@/lib/dashboardService";
import { NextResponse } from "next/server";
export async function GET(request) {
  await connectDB();
  const { account, error } = await requireAuth();
  if (error) return error;
  try {
    const days = Math.min(90, Math.max(1, Number(new URL(request.url).searchParams.get("days")) || 7));
    const data = await dashboardService.getDailyScratchUsage(account._id, { days });
    return NextResponse.json({ success: true, data });
  } catch (e) {
    console.error("[analytics/scratch-usage]", e);
    return NextResponse.json({ success: false, error: "Failed to load scratch usage" }, { status: 500 });
  }
}
```

- [ ] **Step 2:** Manually verify each via curl with a logged-in cookie (or temporarily log results). Confirm 200 + shape.
- [ ] **Step 3: Commit** `feat(analytics): add scratch-usage, campaign-consumption, store-performance, kpi-summary routes`.

---

## PHASE 2 — Backend: Scratch Allocation Requests (approvals)

No existing model. Build the manager→merchant approval workflow shown in the Figma "Pending Requests" section.

### Task 2.1: ScratchAllocationRequest model

**Files:** Create `models/scratchAllocationRequestModel.js`

- [ ] **Step 1: Define schema** and export with the `mongoose.models.X || mongoose.model(...)` guard.

```js
import mongoose from "mongoose";
const schema = new mongoose.Schema({
  merchantId: { type: mongoose.Schema.Types.ObjectId, ref: "Account", required: true, index: true },
  requestedBy: { type: mongoose.Schema.Types.ObjectId, ref: "Account", required: true }, // manager
  campaignId: { type: mongoose.Schema.Types.ObjectId, ref: "Campaign", required: true },
  storeId:    { type: mongoose.Schema.Types.ObjectId, ref: "Store", required: true },
  campaignName: String, storeName: String, requestedByName: String, // snapshots for display
  quantity: { type: Number, required: true, min: 1 },
  reason: { type: String, default: "" },
  priority: { type: String, enum: ["low","medium","high"], default: "medium" },
  status: { type: String, enum: ["pending","approved","rejected"], default: "pending", index: true },
  respondedBy: { type: mongoose.Schema.Types.ObjectId, ref: "Account", default: null },
  respondedAt: { type: Date, default: null },
  responseNote: { type: String, default: "" },
}, { timestamps: true });
schema.index({ merchantId: 1, status: 1, createdAt: -1 });
export default mongoose.models.ScratchAllocationRequest ||
  mongoose.model("ScratchAllocationRequest", schema);
```

- [ ] **Step 2: Commit** `feat(model): ScratchAllocationRequest for manager allocation approvals`.

### Task 2.2: Request CRUD + approve/reject routes

**Files (Create):**
- `app/api/merchant/scratch-requests/route.js` — `GET` (list, `?status=pending`) + `POST` (create; manager)
- `app/api/merchant/scratch-requests/[id]/approve/route.js` — `POST`
- `app/api/merchant/scratch-requests/[id]/reject/route.js` — `POST`

- [ ] **Step 1:** `GET` — `requireAuth`, resolve owner merchant id (if `account.role === "Manager"` use `account.parentId`, else `account._id`), return requests for that merchant filtered by optional `status`, newest first. Include populated display fields.

- [ ] **Step 2:** `POST` create — manager submits `{ campaignId, storeId, quantity, reason, priority }`. Validate the campaign/store belong to the merchant. Snapshot `campaignName/storeName/requestedByName`. Status `pending`. Also create a `Notification` for the merchant (`type:"other"`, severity by priority, `actionUrl:"/dashboard"`).

- [ ] **Step 3:** approve — only the merchant owner (role `Merchant`, `_id === request.merchantId`) may approve. On approve: set status/respondedBy/respondedAt, then **reuse existing allocation logic** (call the same service/path used when a merchant allocates scratches to a campaign-store — do NOT reimplement inventory math; locate it in the campaign-store allocation route/service and invoke it). If allocation fails (e.g., insufficient entitlement), return the underlying error and leave request `pending`.

```js
// [id]/approve/route.js (sketch — wire to real allocation service)
const { account, error } = await requireAuth(); if (error) return error;
const reqDoc = await ScratchAllocationRequest.findById(params.id);
if (!reqDoc || String(reqDoc.merchantId) !== String(account._id) || account.role !== "Merchant")
  return NextResponse.json({ success:false, error:"Not authorized" }, { status:403 });
if (reqDoc.status !== "pending")
  return NextResponse.json({ success:false, error:"Already processed" }, { status:409 });
// reuse allocation: allocateScratchesToCampaignStore({ merchantId, campaignId, storeId, quantity })
await allocate(...);            // existing logic
reqDoc.status = "approved"; reqDoc.respondedBy = account._id; reqDoc.respondedAt = new Date();
await reqDoc.save();
```

- [ ] **Step 4:** reject — owner-only, set status `rejected` + `responseNote`. No inventory change.
- [ ] **Step 5:** Manually verify create→list→approve and create→reject flows via curl.
- [ ] **Step 6: Commit** `feat(api): scratch allocation request submit/list/approve/reject`.

### Task 2.3: Recent Activity source

Recent Activity uses the existing `Notification` collection (read-only).

**Files (Create):** `app/api/notifications/recent/route.js` (if not already present)
- [ ] **Step 1:** `GET` — `requireAuth`, return latest N (default 10) notifications for the owner, newest first, mapped to `{ id, type, title, message, severity, createdAt, actionUrl }`. If a recent-notifications route already exists, reuse it instead of creating.
- [ ] **Step 2: Commit** `feat(api): recent notifications feed for dashboard activity`.

---

## PHASE 3 — Frontend: reusable components

Create under `components/dashboard/smart/` (new folder) to avoid disturbing existing components. Each component: `'use client'` where interactive, CSS Module sibling, real props only, skeleton + empty variants where it owns a data section. Reuse existing `Badge`, `ProgressBar`, `StatCard`, `CampaignCard` where they fit; wrap/restyle rather than fork when possible.

For every component task: build it, render in isolation, verify at 431 / 768 / 1024px, then commit.

### Task 3.1: Charts (custom SVG/CSS — no dependency)
**Files (Create):** `components/dashboard/smart/charts/BarChart.js` (+`.module.css`), `LineAreaChart.js`, `DonutChart.js`, `HBarList.js`, plus `charts/index.js`.
- [ ] `BarChart` — grouped bars (new vs repeat). Props: `data:[{label,series:{new,repeat}}]`, `colors`, `height`. Pure SVG, responsive `viewBox`, accessible `<title>`.
- [ ] `LineAreaChart` — daily usage. Props: `data:[{label,value}]`, `height`, optional `highlightIndex` for tooltip. SVG path + gradient fill.
- [ ] `DonutChart` — Props: `segments:[{label,value,color}]`, `centerLabel`. SVG stroke-dasharray arcs + legend.
- [ ] `HBarList` — store ranking. Props: `items:[{label,value}]`, `max`. CSS flex bars.
- [ ] Each renders an empty state when `data`/`segments` is empty (`<EmptyState size="sm" .../>`).
- [ ] Verify each in isolation; **Commit** `feat(ui): custom svg chart components`.

### Task 3.2: Layout & content components
**Files (Create) under `components/dashboard/smart/`:**
- [ ] `DashboardHeader.js` — avatar+store name+location, subtitle, `Create Campaign` button, notification bell w/ unread count. Props: `merchantName, storeName, location, unreadCount, onCreateCampaign`.
- [ ] `SubscriptionHero.js` — purple gradient banner: "Day X of 90", "Unlimited Scratches", valid-until, `used` / `daysRemaining`, buttons `View Usage` / `Choose Plans`, inline warning when `daysRemaining<=7`. Props from subscription API.
- [ ] `KpiTileGrid.js` — 2×N tiles (Stores, Campaigns + ending-soon note). Props: `kpi` from `/api/analytics/kpi-summary`.
- [ ] `TopCampaignCard.js` — name, status `Badge`, date range, days-left, store count, price range, scratch-allocation `ProgressBar` (`used/total`, `left`), optional pending-request warning, `View`/`Assign`. Reuse existing `ProgressBar`.
- [ ] `StorePerformanceCard.js` — store name, status/pending `Badge`, contact, scans, campaigns, price range, entitlement, used, `View Store`/`Review`.
- [ ] `PendingRequestCard.js` — request title, priority `Badge`, store, time-ago, requester, requested qty, campaign, note, `Review`/`Approve` (calls approve/reject endpoints; optimistic update).
- [ ] `RecentActivity.js` — timeline list from notifications feed; newest first; icon per `type`.
- [ ] `QuickActions.js` — action cards: Create Campaign, Create Store, View Customers, Manage Subscription, Purchase Scratches, Generate Reports (route links). Horizontal scroll on mobile.
- [ ] `SectionHeader.js` — title + `View all >` link (shared).
- [ ] `EmptyState.js` — icon, title, description, optional CTA; `size` prop.
- [ ] `DashboardSkeleton.js` — skeleton blocks for header/hero/kpi/cards/charts.
- [ ] Verify each in isolation at 3 breakpoints; **Commit** per logical group.

---

## PHASE 4 — Frontend: assemble SmartDashboard

### Task 4.1: SmartDashboard container
**Files:** Create `components/dashboards/SmartDashboard.js` (+`.module.css`); Modify `app/(dashboard)/dashboard/page.js` to route Smart+active-subscription merchants to `SmartDashboard` (keep `RetailerDashboard` for Core and as fallback).

- [ ] **Step 1:** Container fetches in parallel (all real APIs): `/api/dashboard`, `/api/subscription/status`, `/api/analytics/kpi-summary`, `/api/analytics/customer-growth?days=7`, `/api/analytics/scratch-usage?days=7`, `/api/analytics/campaign-consumption`, `/api/analytics/store-performance?days=7`, `/api/merchant/scratch-requests?status=pending`, `/api/notifications/recent`. Use `Promise.allSettled`; each section degrades to empty state independently. Show `DashboardSkeleton` until first paint.
- [ ] **Step 2:** Compose sections in Figma order: Header → SubscriptionHero → KpiTileGrid → Top Campaigns → Store Performance → Pending Requests → Customer Insights (stats + BarChart) → Scratch Consumption (LineAreaChart) → Campaign-wise (DonutChart) → Store-wise (stats + HBarList) → Quick Actions → Recent Activity.
- [ ] **Step 3:** Wire approve/reject in PendingRequestCard to endpoints; on success refetch pending list + kpi.
- [ ] **Step 4:** Confirm Core plan still renders `RetailerDashboard` unchanged.
- [ ] **Step 5: Commit** `feat(dashboard): assemble Smart multi-store dashboard from real APIs`.

### Task 4.2: Responsive + states pass
**Files:** the `.module.css` files from Phases 3–4.
- [ ] `<768px`: single column; KPI tiles 2-col grid; store/campaign cards stack; Quick Actions horizontal scroll; hero collapses gracefully. `768–1024`: 2-col where sensible. `>1024`: max-width container, multi-col sections.
- [ ] Verify all empty states (no campaigns / no stores / no requests / no chart data) render real empty components, never fake numbers.
- [ ] **Commit** `style(dashboard): responsive + empty/loading states`.

---

## PHASE 5 — Verification

- [ ] Run the app (preview), log in as the Smart merchant (account `arabhishek442@gmail.com`, has active Smart subscription, 1 store "Test Store").
- [ ] Confirm every visible number matches an API response (cross-check Network tab) — no placeholders.
- [ ] Confirm empty states for sections with no data (e.g., charts when no scans yet).
- [ ] Create a manager scratch-request (or seed one) → confirm it appears under Pending Requests → approve → confirm inventory changed via existing allocation logic and request disappears.
- [ ] Screenshot at 431 / 768 / 1024px and compare against `figma_dashboard.png`.
- [ ] Confirm Core-plan dashboard unchanged.

---

## Files summary

**Create — backend:** `models/scratchAllocationRequestModel.js`; routes under `app/api/analytics/{scratch-usage,campaign-consumption,store-performance,kpi-summary}/route.js`, `app/api/merchant/scratch-requests/route.js` + `[id]/{approve,reject}/route.js`, `app/api/notifications/recent/route.js` (if absent); test `lib/__tests__/dashboardAnalytics.test.js`.
**Modify — backend:** `lib/dashboardService.js` (additive methods only).
**Create — frontend:** `components/dashboards/SmartDashboard.js`; `components/dashboard/smart/*` (header, hero, kpi grid, cards, quick actions, activity, section header, empty state, skeleton) and `components/dashboard/smart/charts/*`.
**Modify — frontend:** `app/(dashboard)/dashboard/page.js` (route Smart→SmartDashboard), `app/globals.css` (add hero gradient + dash-card radius tokens).
**Do NOT modify:** existing API contracts, models (except the new one), allocation/inventory logic, subscription guards, auth, `RetailerDashboard` behavior for Core.

## Schema dependencies found
- `Scan` has no `store_id` → per-store scans derived via `Campaign.assignedStores` join (handled in `getPerStoreStats`).
- Pending-requests feature did not exist → new `ScratchAllocationRequest` model (Phase 2).
- Approve must reuse the existing campaign-store allocation logic — locate and invoke it; do not reimplement inventory math.
