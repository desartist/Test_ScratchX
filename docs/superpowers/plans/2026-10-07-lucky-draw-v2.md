# Lucky Draw v2: match the accepted prototype

Branch: `lucky-draw` (work only here). Builds on the existing Lucky Draw feature (24 commits, 2026-09-24).
Prototype accepted by the customer: `lucky-draw-prototype.html` (13 screens).

## Goal

Update the whole Lucky Draw flow to match the prototype, plus three new requirements:

1. Every prize category has an **image**, a **name** and a **value** (₹ per winner), and a **number of winners**.
2. Three **distribution modes**:
   - `online` — the existing flow, kept as it is: customers enter by QR with their bill amount, ScratchX picks winners (automatic or owner-run), winners get SMS with claim codes.
   - `manual_online_reveal` — the store hands out numbered entry slips at the counter. On the reveal date ScratchX picks the winning slip numbers at random and the owner reveals them **live online**, one category at a time, smallest prize first. Customers watch on the public reveal page.
   - `manual_offline_reveal` — the store hands out numbered slips and draws them **in the store**. The owner types in the winning slip numbers and publishes the results.
3. Prize **calculator** with custom entry (budget mode with suggested split, prize-list mode, expected entries, optional budget limit).

## Key decisions (assumptions to confirm with the user)

- "Manual" means the *entries* are physical numbered slips (1..N). The two manual modes differ in how winners are picked and revealed: system-random + live online reveal vs. physical draw + typed-in results.
- Online mode keeps its behaviour (geofence, bill-amount entry ranges, recurring schedules, automatic/manual trigger, SMS + claim codes). It gains prize images/quantities, the 3-date model and a public results page that shows winners by category.
- Prize categories replace single prizes: `{ name, value, quantity, image }`. Stored in the existing `prizeTiers` (`prizeDescription` = name, `prizeValue` = value, new `quantity`, new `imageUrl`). `rank` 1 = grand prize. Winners are **picked** in rank order (grand prize from the full pool) but **revealed** smallest value first.
- Images follow the project's existing pattern (scratch-card gift images): compressed in the browser to a ~400px JPEG data URL and stored on the record. Server limit 200 KB per image, max 20 categories, max 1,000 winners in total.
- Three dates: `startDate` (entries open), `endDate` (entries close), new `revealDate` (winners revealed, ≥ entries close). For `end_of_campaign` schedules the draw date is the reveal date (falls back to `endDate` for old campaigns).
- Extending dates follows the prototype: dates only move **later**. Extending entries-close past the reveal date moves the reveal date too, keeping the same gap. Every change is logged in the draw's history and entrants can be told by SMS. The older "change draw date" endpoint stays for compatibility.
- Manual modes: single draw on the reveal date, never run by cron (`triggerMode: 'manual'`, `scheduleType: 'end_of_campaign'`). No entry ranges and no store location are needed. The owner sets how many slips were handed out (can only increase).
- Winners in manual modes have a `slipNumber` instead of an entry/phone; customer name/phone are optional. Owner marks prizes as claimed from the winners list (new "Mark as claimed"), and claim codes keep working for online winners.
- Live reveal state lives on the draw: `reveal.revealedCount` (categories revealed, in reveal order), `startedAt`, `completedAt`. The public reveal endpoint only ever returns winners of revealed categories.

## Tasks

1. **Model + constants**: `distributionMode`, `revealDate`, `slipCount` on campaign; `quantity`, `imageUrl` on prize tiers (+ draw snapshot); `slipNumber`, `prizeValue`, optional entry/customer fields on winner; `reveal` + `manualPicks` on draw; entry tiers only required for online.
2. **Prize categories lib** (`lib/luckyDraw/prizeCategories.js`): validate name/value/quantity/image, expand categories into winner slots, reveal order, totals. Calculator maths (`lib/luckyDraw/calculator.js`): suggested split, totals, cost per entry, chance to win, budget check.
3. **Campaign service**: create with mode rules, 3 dates, categories; detail returns reveal + slips info.
4. **Winner selection** with quantities (online) and random slip picking (manual online).
5. **Schedule**: initial draw date uses `revealDate`.
6. **Date extension service** (`extendDates`): registration end / reveal date, later only, gap rule, history, SMS.
7. **Manual draw service**: set slip count, save typed picks (draft), publish offline results, start live reveal (random slips), reveal next category; online draws are fully revealed on completion.
8. **Claims**: owner marks a winner as claimed (by id).
9. **Public API**: campaign info with categories/images/mode/dates; reveal/results endpoint (revealed categories only, masked names, slip numbers, "is my slip a winner").
10. **API routes** for 3, 6–9, all behind the flag + merchant auth, with integration tests.
11. **Screens** (match prototype, app design tokens): list with filter tabs + first-time empty state; calculator; 4-step create wizard (mode → details & dates → prizes with image/name/value/winners → review); draw page (timeline, stats, extend panel, slips, prizes, history, winners & claims); manual record page; owner live reveal page; public entry page (prize images, 3 dates, manual modes info); public reveal page (scratch-style reveal).
12. **Tests**: unit tests for every new lib/service, integration tests for new routes, update flag tests (flag is now on), pages render test for new pages. Run full lucky draw suite + lint.

## Verification

- `MONGOMS_SYSTEM_BINARY=/opt/mongo/mongod npx jest __tests__/unit/luckyDraw __tests__/integration/luckyDraw`
- `npx eslint` on changed files; `npx next build` if it fits the environment.
- Browser check of every new screen with Playwright against `next dev` where possible.

## Progress log

(updated as tasks complete — see `git log origin/main..lucky-draw`)
