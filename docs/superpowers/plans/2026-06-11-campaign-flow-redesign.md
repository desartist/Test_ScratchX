# Campaign Flow Redesign & Campaign Details Page — Implementation Plan

> **For agentic workers:** Use superpowers:subagent-driven-development to execute task-by-task with two-stage review. Steps use checkbox (`- [ ]`) syntax.

**Goal:** Restructure the campaign lifecycle into a guided flow — empty-state onboarding → basic info (saved as **draft**) → reward ranges → a Campaign Details management page that gates QR generation behind store-assignment + scratch-allocation + subscription checks — matching the Figma, reusing all existing APIs, and renaming only user-facing text to "Scratches".

**Architecture:** Almost entirely frontend + flow wiring. The backend already provides: create (`/api/campaign/create`), ranges (`/api/campaign_range`), store assign (`/api/campaigns/[id]/assign`), scratch allocate (`/api/campaigns/[id]/allocate-scratch`), **already-gated** QR generation (`/api/campaigns/[id]/generate-qr`), detail fetch (`/api/campaigns/[id]`), pending requests (`/api/merchant/scratch-requests`), and all subscription guards. We reuse these as-is. New work: an empty-state screen, a redesigned details page, QR-gating UI, single/multi-store assignment UI, and a UI-text rename. One small additive schema field (`qrCodeUrl`/`qrGeneratedAt`) is persisted so the details page can show QR status.

**Tech Stack:** Next.js 16 App Router, React 19, CSS Modules + `globals.css` tokens, reuse `components/dashboard/smart/*` (charts, EmptyState, Badge, ProgressBar, PendingRequestCard). No new deps.

---

## Constraints (do NOT violate)
- **Rename = UI display text ONLY.** Do NOT rename DB fields, API request/response keys, or internal variables (`allocated_scratch_cards`, `used_scratch_cards`, etc. stay). Only change strings users see → "Scratches".
- Do NOT break or rewrite existing APIs/services/guards. Reuse them. New API only if truly missing (none expected).
- Preserve all subscription validations, plan limits (Core=1 store, Smart=multi), first-store-without-subscription exception, and unlimited-scratches (90-day) logic — reuse `subscription.unlimitedScratches`, do NOT add campaign-level bonus fields.
- CSS Modules only, mobile-first, responsive to desktop (reuse the dashboard's breakpoint approach).
- **Verification rule (hard):** NO test or script may connect to the real dev DB (`mongodb://localhost:27017/ScratchX`). Use mongodb-memory-server for any test, or verify via the user's browser. The repo's `__tests__/setup.js` wipes every collection in `afterEach` — never let it touch a real DB.

## Reusable assets (from audit)
- APIs: `/api/campaign/create`, `/api/campaigns`, `/api/campaigns/[id]` (GET/PUT/DELETE), `/api/campaigns/[id]/assign`, `/api/campaigns/[id]/allocate-scratch`, `/api/campaigns/[id]/generate-qr`, `/api/campaign_range` (GET/POST), `/api/merchant/scratch-requests?status=pending`, `/api/stores`, `/api/analytics/store-performance`, `/api/analytics/scratch-usage`.
- Components: `components/dashboard/smart/EmptyState.js`, `charts/{HBarList,LineAreaChart}.js`, `components/dashboard/Badge.js`, `components/dashboard/ProgressBar.js`, `components/dashboard/smart/PendingRequestCard.js`, `SectionHeader.js`.
- Schema: `models/campaignModel.js` — `status` enum already includes `'draft'`,`'active'`,`'paused'`,`'ended'`; `assignedStores[]` snapshot subdoc; scratch fields; `tracking`.

---

## PHASE 1 — Campaign empty-state onboarding

### Task 1.1: "Your store is ready" empty state
**Files:** Create `components/campaign/CampaignEmptyState.js` (+`.module.css`); Modify `app/(dashboard)/campaign/page.js`.
- [ ] Build `CampaignEmptyState` per the mobile design: illustration (reuse an existing asset under `public/` if present, else an inline SVG/emoji), headline "Your store is ready!", subtext "Launch your first campaign and start engaging customers with ScratchX.", primary CTA "Create My First Campaign" → `router.push('/campaign/new')`, secondary "Skip for now" → `router.push('/dashboard')`, and a benefits row (✓ Reward Customers, ✓ Increase Engagement, ✓ Drive Repeat Purchases, ✓ Real-time Tracking). Responsive (mobile + desktop), ScratchX tokens.
- [ ] In `campaign/page.js`: when the fetched campaigns array is empty (and not loading/error), render `<CampaignEmptyState/>` INSTEAD of the current "No campaigns found" + search/tabs block. When campaigns exist, keep the existing listing (search/tabs/cards) unchanged.
- [ ] Verify lint; commit `feat(campaign): onboarding empty state when merchant has no campaigns`.

---

## PHASE 2 — Create flow saves DRAFT and routes to details

### Task 2.1: Create as draft, route to details
**Files:** Modify `app/(dashboard)/campaign/new/page.js`.
- [ ] Stop hardcoding `status:"active"` in the submit payload (line ~218). Omit `status` so the schema default `'draft'` applies (or send `status:"draft"` explicitly). Keep all existing fields (campaignName, startDate, endDate, displayCoupons) and validations (name required, start required, end required, end>start). Add Campaign Description + optional Notes inputs (description maps to existing `description` field; "notes" can also map to `description` or be appended — do NOT add a schema field unless needed; if a separate notes field is wanted, reuse `description` and label the UI clearly, or skip notes).
- [ ] On success, redirect to the new Campaign Details page route (Phase 3): `router.push('/campaign/${id}')` (the detail route already exists; Phase 3 redesigns it). After basic info, the details page is where ranges/stores/scratches/QR happen — so the "review" step 2 becomes optional/removed in favor of landing on details. Keep step 1 form; replace step-2 "review+activate" with "Save & Continue" → details page.
- [ ] Verify lint; commit `feat(campaign): create saves draft and lands on details page`.

### Task 2.2: Reward ranges step (reuse existing API)
**Files:** Modify `app/(dashboard)/campaign/new/page.js` or the details page (decide: ranges as a step in /new OR a section on details). RECOMMENDED: ranges live as an editable **section on the Campaign Details page** (Phase 3 Task 3.3), since the spec lists them as a details section. So this task = ensure the details page can create/edit/delete ranges via `POST /api/campaign_range` and `GET /api/campaign_range?id=`. No new API.
- [ ] (Implemented within Phase 3 Task 3.3.) Placeholder task — confirm range create/list/delete wired there. Enforce max 3 (backend already enforces via `enforceFeatureLimit`; surface the limit in UI). Validation: ≥1 range to enable QR, reward value>0, winners>0.

---

## PHASE 3 — Campaign Details page redesign (Figma)

The detail page exists at `app/(dashboard)/campaign/[id]/page.js`. Redesign it section-by-section per the Figma, reusing components.

### Task 3.1: Overview + status + QR-gating checklist
**Files:** Modify `app/(dashboard)/campaign/[id]/page.js` (+ its `.module.css`); create small subcomponents under `components/campaign/` as needed.
- [ ] **Overview card** (top, like Figma): campaign name + status `Badge`, date range, "X days left", store count, price range (from ranges), and a **Scratch Allocation** `ProgressBar` (`used/allocated`, "N left"). Reuse Badge + ProgressBar.
- [ ] **QR-gating checklist + button:** compute readiness client-side from the campaign detail response: (1) basic info ✓ (always, exists), (2) ≥1 reward range, (3) ≥1 active assigned store, (4) `allocated_scratch_cards > 0`, (5) subscription active + scratch entitlement (read from `/api/subscription/status`). Render a checklist showing each condition met/unmet. The **Generate QR** button is disabled until all pass; on click → `POST /api/campaigns/[id]/generate-qr` (already enforces the same gates server-side; surface any returned error). After success, show QR preview (the route returns `qrCodeUrl` PNG data URL), Download PNG, Copy Link (`/scan/{id}`). (SVG download + Regenerate optional — implement PNG + copy at minimum; add SVG via client-side render if time permits.)
- [ ] If no active subscription / entitlement expired: show an upgrade prompt instead of enabling QR (reuse subscription status; block generation). Drafts remain viewable.
- [ ] Commit `feat(campaign): details overview + QR-gating checklist`.

### Task 3.2: Store Assignment section (single auto / multi select)
**Files:** Modify the details page; create `components/campaign/StoreAssignment.js` (+css).
- [ ] Fetch merchant stores (`/api/stores`) and the campaign's `assignedStores`. **Single-store plan (Core / merchant has 1 store):** auto-show the main store as **Assigned** (badge), no manual selection; if not yet assigned, auto-assign via `POST /api/campaigns/[id]/assign` with that store. **Multi-store plan (Smart):** list stores with Assign / Assigned / "Pending Request" (cross-reference `/api/merchant/scratch-requests?status=pending`) states, search, multi-select, and remove (assign uses the existing endpoint; removal via existing mechanism). Show assigned count vs plan store capacity (reuse plan limits from subscription). Enforce plan limit in UI (block assigning beyond capacity; backend already validates).
- [ ] Show the "Request linked to this campaign" pending-allocation card (Figma) when a scratch-allocation request references this campaign — reuse `PendingRequestCard` with a "Review Request" CTA.
- [ ] Commit `feat(campaign): store assignment (single auto-assign + multi-store select)`.

### Task 3.3: Reward Ranges + Scratches Allocation sections
**Files:** Modify the details page; create `components/campaign/RewardRanges.js` and `components/campaign/ScratchAllocation.js` (+css).
- [ ] **Reward Ranges:** card-based, max 3, each: reward name/amount, winner count, allocated/remaining, Edit + Delete. Create/edit via `POST /api/campaign_range`, list via `GET /api/campaign_range?id={campaignId}`. Surface the max-3 limit (backend enforces). Validate value>0, winners>0.
- [ ] **Scratches Allocation:** show Available (from subscription entitlement / `/api/subscription/status`), Allocated (`campaign.allocated_scratch_cards`), Remaining, usage progress. Allocate via `POST /api/campaigns/[id]/allocate-scratch` (already validates subscription limits). UI labeled "Scratches" (text only).
- [ ] (Optional, if data present) **Store-wise Performance** + **Daily Scratch Usage** + **Reward Distribution** sections per Figma, reusing `HBarList` / `LineAreaChart` and `/api/analytics/*`; render EmptyState when no data.
- [ ] Commit `feat(campaign): reward ranges + scratches allocation sections`.

### Task 3.4: Persist QR + qrStatus (minimal additive schema)
**Files:** Modify `models/campaignModel.js` (additive), `app/api/campaigns/[id]/generate-qr/route.js`.
- [ ] Add OPTIONAL fields to campaign schema: `qrCodeUrl: { type: String, default: null }`, `qrGeneratedAt: { type: Date, default: null }` (additive, non-breaking). In generate-qr route, persist these on success (currently it returns the data URL but may not save it). The details page reads them to show QR status / re-display without regenerating. Do NOT add a separate status enum — derive "QR status" from `status==='active' && !!qrCodeUrl`.
- [ ] Commit `feat(campaign): persist generated QR url + timestamp`.

---

## PHASE 4 — UI text rename "Scratch Cards" → "Scratches"

### Task 4.1: Rename user-facing strings only
**Files:** JSX/render strings across campaign + dashboard + modal components (NOT models/services/API keys).
- [ ] Find user-facing occurrences of "Scratch Card"/"Scratch Cards" in JSX text (headings, labels, buttons, empty-state copy, modal titles) and change to "Scratch"/"Scratches". Scope: `components/**/*.js`, `app/(dashboard)/**/*.js` render strings only. Do a careful pass — change the STRING LITERALS shown to users, leave `allocated_scratch_cards` variable/key references and any string that is an API key or matches a field name untouched.
- [ ] Explicitly DO NOT touch: `models/**`, `lib/**` field names, API request/response keys, test assertions that check field names, the customer scan app data contract.
- [ ] Verify the app still compiles and the dashboard (which reads `*_scratch_cards` keys) is unaffected.
- [ ] Commit `refactor(ui): rename user-facing 'Scratch Cards' to 'Scratches' (text only)`.

---

## PHASE 5 — Verification (browser, no DB-touching tests)
- [ ] User-driven browser check (preview can't run alongside the dev server). Confirm: empty-state shows for a no-campaign merchant; create → lands on details as **draft**; QR button disabled until ranges+store+scratches+subscription all pass, then generates and flips to active; single-store auto-assign works; "Scratches" wording throughout; responsive desktop + mobile.
- [ ] Any automated test uses mongodb-memory-server only. No script connects to the real dev DB.
- [ ] Screenshot vs Figma; confirm existing campaign listing (when campaigns exist) and other dashboards are unaffected.

---

## Files summary
**Create:** `components/campaign/CampaignEmptyState.js`, `StoreAssignment.js`, `RewardRanges.js`, `ScratchAllocation.js` (+ `.module.css` each); small QR-checklist subcomponent.
**Modify:** `app/(dashboard)/campaign/page.js` (empty state), `app/(dashboard)/campaign/new/page.js` (draft + routing), `app/(dashboard)/campaign/[id]/page.js` (+css) (details redesign), `models/campaignModel.js` (+qrCodeUrl/qrGeneratedAt), `app/api/campaigns/[id]/generate-qr/route.js` (persist QR), assorted JSX for the text rename.
**Reuse (do not modify):** all listed APIs/services/guards; dashboard chart + Badge + ProgressBar + EmptyState + PendingRequestCard components.
**New APIs:** none expected.

## Schema changes
- Additive only: `campaign.qrCodeUrl` (String, null), `campaign.qrGeneratedAt` (Date, null). No migration needed (defaults apply). No rename of existing fields.

## Business-logic changes
- Create now yields `draft` (was forced `active`). Activation happens only via QR generation (already gated). No change to allocation/inventory math, subscription guards, or unlimited-scratches logic — all reused.
