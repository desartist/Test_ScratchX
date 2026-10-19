/**
 * The scratch-allocation screen (CampaignScratchesStep), rendered for real
 * (react-dom/server) through BOTH hosts — the launch wizard (after creating
 * coupons) and the campaign page's Allocate Scratches popup — so the two
 * can't drift apart. One test per design case.
 */
const React = require('react');
const { renderToStaticMarkup } = require('react-dom/server');

jest.mock('../../components/campaign/CampaignScratchesStep.module.css', () => ({ __esModule: true, default: new Proxy({}, { get: (_, k) => String(k) }) }));
jest.mock('../../components/campaign/ScratchAllocationModal.module.css', () => ({ __esModule: true, default: new Proxy({}, { get: (_, k) => String(k) }) }));
jest.mock('../../components/campaign/LaunchWizardModal.module.css', () => ({ __esModule: true, default: new Proxy({}, { get: (_, k) => String(k) }) }));
jest.mock('next/navigation', () => ({ useRouter: () => ({ push: jest.fn() }) }));
jest.mock('@/components/auth/AuthContext', () => ({ useAuthContext: () => ({ account: { _id: 'm1', role: 'Merchant' } }) }));
jest.mock('@/lib/smartCacheService', () => ({ smartCacheService: { invalidateRelated: jest.fn() } }));
jest.mock('@/hooks/queries/useStoresQuery', () => ({ useStoresQuery: () => ({ data: { data: [] }, isPending: false }) }));

const mockState = {};
jest.mock('@/hooks/queries/useSubscriptionQuery', () => ({
  useSubscriptionStatusQuery: () => ({ data: mockState.subscription, isPending: false }),
}));
jest.mock('@/hooks/queries/useCampaignQuery', () => ({
  useCampaignQuery: () => ({ data: { data: { campaignName: 'C', assignedStores: [], ...mockState.campaign } }, isPending: false }),
  useCampaignRangesQuery: () => ({ data: { success: true, ranges: mockState.ranges }, isPending: false }),
  useInvalidateCampaignCluster: () => () => {},
}));

const LaunchWizardModal = require('@/components/campaign/LaunchWizardModal').default;
const ScratchAllocationModal = require('@/components/campaign/ScratchAllocationModal').default;

const PACK = { plan: 'SMART', unlimitedScratches: false, scratchRemaining: 4000, scratchPacksRemaining: 4000 };
const UNLIMITED = { plan: 'SMART', unlimitedScratches: true, scratchRemaining: 'UNLIMITED', scratchPacksRemaining: 0 };
const NEW_CAMPAIGN = { allocated_scratch_cards: 0, used_scratch_cards: 0, redeemed_scratch_cards: 0 };
const GIFT_IMG = 'data:image/jpeg;base64,AAAA';

const coupon = (value, qty, extra = {}) => ({
  type: 'flat', value, isActive: true, quantityEnabled: qty != null, totalQuantity: qty ?? null, ...extra,
});

function setup({ ranges, subscription = PACK, campaign = NEW_CAMPAIGN }) {
  mockState.ranges = ranges;
  mockState.subscription = subscription;
  mockState.campaign = campaign;
}
const render = (Host) => renderToStaticMarkup(React.createElement(Host, { campaignId: 'c1', open: true, onClose() {} }));

describe.each([
  ['launch wizard', LaunchWizardModal],
  ['campaign page popup', ScratchAllocationModal],
])('%s', (_, Host) => {
  test('every coupon limited → "Campaign Scratches Ready": total, Coupon N rows, gift image, CTAs', () => {
    setup({ ranges: [{ minAmount: 500, maxAmount: 4000, rewards: [coupon(34, 5), coupon(40, 5), coupon(32, 5), coupon(0, 5, { type: 'gift', value: GIFT_IMG })] }] });
    const html = render(Host);
    expect(html).toContain('Campaign Scratches Ready');
    expect(html).toMatch(/readyTotalValue">20</);
    for (const n of [1, 2, 3, 4]) expect(html).toContain(`Coupon ${n}`);
    expect(html).not.toMatch(/₹34|₹40/);
    expect(html).toContain(`<img src="${GIFT_IMG}"`);
    expect(html).toContain('No extra allocation needed.');
    expect(html).toContain('Confirm &amp; Continue');
    expect(html).toContain('Review Rewards');
    expect(html).not.toMatch(/No Cap|Scratch Balance/);
  });

  test('02 mixed: reserved / available for others / total + distribute note', () => {
    setup({ ranges: [{ rewards: [coupon(34, 5), coupon(40), coupon(32)] }] });
    const html = render(Host);
    expect(html).toContain('Set Campaign Scratches');
    expect(html).toContain('4,000 available');
    expect(html).toMatch(/splitValue">5<\/div><div class="splitText">Reserved for quantity-limited rewards/);
    expect(html).toMatch(/splitValue">1,995<\/div><div class="splitText">Available for other rewards/);
    expect(html).toMatch(/splitValue">2,000<\/div><div class="splitText">Total campaign scratches/);
    expect(html).toContain('ScratchX will automatically distribute');
    expect(html).toMatch(/class="chip chipActive"[^>]*><svg[^]*?2,000/);
  });

  test('04 no quantities: Campaign Capacity', () => {
    setup({ ranges: [{ rewards: [coupon(34), coupon(40)] }] });
    const html = render(Host);
    expect(html).toContain('Campaign Capacity');
    expect(html).toContain('2,000 customers');
    expect(html).not.toContain('Reward Allocation');
  });

  test('05 too low: error, "—", minimum, chips below it disabled, Confirm disabled', () => {
    // A new campaign starts at the minimum — so an existing one below it
    // is the way to land on this state without typing.
    setup({
      ranges: [{ rewards: [coupon(34, 2500), coupon(40)] }],
      subscription: UNLIMITED,
      campaign: { allocated_scratch_cards: 2000, used_scratch_cards: 0, redeemed_scratch_cards: 0 },
    });
    const html = render(Host);
    expect(html).toContain('Unlimited');
    expect(html).toContain('inputError');
    expect(html).toContain('Campaign scratches are too low');
    expect(html).toContain('Set at least 2,500 scratches.');
    expect(html).toMatch(/splitValue">—</);
    expect(html).toContain('Minimum 2,500 scratches');
    expect(html).toMatch(/<button type="button" class="chip" disabled="" aria-pressed="false">1,000<\/button>/);
    expect(html).toMatch(/<button type="button" class="primaryBtn" disabled="">Confirm &amp; Continue/);
  });

  test('a new campaign whose limited coupons need more than 2,000 starts at that minimum', () => {
    setup({ ranges: [{ rewards: [coupon(34, 2500), coupon(40)] }] });
    const html = render(Host);
    expect(html).toContain('value="2,500"');
    expect(html).not.toContain('Campaign scratches are too low');
  });

  test('one unlimited coupon → the chips are back', () => {
    setup({ ranges: [{ rewards: [coupon(34, 5), coupon(40)] }] });
    const html = render(Host);
    expect(html).toContain('No Cap');
    expect(html).not.toContain('Campaign Scratches Ready');
  });
});

describe('campaign page popup — existing allocation', () => {
  test('starts from the current total; unchanged → hint + Confirm disabled', () => {
    setup({
      ranges: [{ rewards: [coupon(34, 5), coupon(40)] }],
      campaign: { allocated_scratch_cards: 3000, used_scratch_cards: 120, redeemed_scratch_cards: 0 },
    });
    const html = render(ScratchAllocationModal);
    expect(html).toContain('value="3,000"');
    expect(html).toContain('Currently 3,000 allocated · 120 used');
    expect(html).toContain('Same as the current allocation — no change.');
    expect(html).toMatch(/<button type="button" class="primaryBtn" disabled="">Confirm &amp; Continue/);
  });

  test('fixed total already in place → no change', () => {
    setup({
      ranges: [{ rewards: [coupon(34, 5), coupon(40, 5)] }],
      campaign: { allocated_scratch_cards: 10, used_scratch_cards: 0, redeemed_scratch_cards: 0 },
    });
    const html = render(ScratchAllocationModal);
    expect(html).toMatch(/readyTotalValue">10</);
    expect(html).toContain('Same as the current allocation — no change.');
  });

  test('fixed total differs from today → shows what it is now, Confirm enabled', () => {
    setup({
      ranges: [{ rewards: [coupon(34, 5), coupon(40, 5)] }],
      campaign: { allocated_scratch_cards: 2000, used_scratch_cards: 0, redeemed_scratch_cards: 0 },
    });
    const html = render(ScratchAllocationModal);
    expect(html).toContain('Currently 2,000 allocated');
    expect(html).toMatch(/<button type="button" class="primaryBtn">Confirm &amp; Continue/);
  });
});
