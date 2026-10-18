/**
 * Reward activation + optional quantity — pure rules
 * (lib/services/rewardInventoryService.js).
 */
const {
  isRewardEligible,
  pickEligibleReward,
  configuredCardCount,
  normalizeRewardsForSave,
  parseQuantity,
  MESSAGES,
  MAX_REWARD_QUANTITY,
} = require('@/lib/services/rewardInventoryService');

const TYPES = [
  { type: 'flat', value: 50 },
  { type: 'percentage', value: 10, description: '10% off' },
  { type: 'gift', value: 'data:image/jpeg;base64,AAAA', description: 'Free mug' },
];

describe('eligibility', () => {
  test('legacy reward with no status/quantity fields is eligible (backward compatible)', () => {
    expect(isRewardEligible({ type: 'flat', value: 50 })).toBe(true);
  });
  test('inactive reward is never eligible, whatever its stock', () => {
    expect(isRewardEligible({ isActive: false })).toBe(false);
    expect(isRewardEligible({ isActive: false, quantityEnabled: true, remainingQuantity: 10 })).toBe(false);
  });
  test('limited reward is eligible only while stock remains', () => {
    expect(isRewardEligible({ isActive: true, quantityEnabled: true, remainingQuantity: 1 })).toBe(true);
    expect(isRewardEligible({ isActive: true, quantityEnabled: true, remainingQuantity: 0 })).toBe(false);
  });
  test('unlimited reward ignores stale quantity numbers', () => {
    expect(isRewardEligible({ isActive: true, quantityEnabled: false, remainingQuantity: 0 })).toBe(true);
  });
  test.each(TYPES)('applies to $type rewards', (r) => {
    expect(isRewardEligible({ ...r, isActive: false })).toBe(false);
    expect(isRewardEligible({ ...r, isActive: true })).toBe(true);
  });
});

describe('pickEligibleReward', () => {
  const rewards = [
    { rewardId: 'a', isActive: true },
    { rewardId: 'b', isActive: false },
    { rewardId: 'c', isActive: true, quantityEnabled: true, remainingQuantity: 0 },
    { rewardId: 'd', isActive: true, quantityEnabled: true, remainingQuantity: 3 },
  ];

  test('never picks an inactive or exhausted reward', () => {
    for (let i = 0; i < 200; i++) {
      expect(['a', 'd']).toContain(pickEligibleReward(rewards).rewardId);
    }
  });

  test('uniform over the eligible pool only (same random rule as before)', () => {
    expect(pickEligibleReward(rewards, () => 0).rewardId).toBe('a');
    expect(pickEligibleReward(rewards, () => 0.99).rewardId).toBe('d');
  });

  test('returns null when nothing is eligible — no invalid reward is issued', () => {
    expect(pickEligibleReward([{ isActive: false }, { quantityEnabled: true, remainingQuantity: 0 }])).toBeNull();
    expect(pickEligibleReward([])).toBeNull();
    expect(pickEligibleReward(undefined)).toBeNull();
  });
});

describe('configuredCardCount — the card count never shrinks', () => {
  const sixRewards = [
    { isActive: true },
    { isActive: true, quantityEnabled: true, remainingQuantity: 5 },
    { isActive: false, quantityEnabled: true, remainingQuantity: 10 },
    { isActive: true, quantityEnabled: true, remainingQuantity: 2 },
    { isActive: false, quantityEnabled: true, remainingQuantity: 0 },
    { isActive: true },
  ];

  test('the spec example: 6 configured, 2 inactive → 6 cards, not 4', () => {
    expect(configuredCardCount({ displayCoupons: 6 }, { rewards: sixRewards })).toBe(6);
  });

  test('all rewards inactive → still the configured count', () => {
    const allOff = sixRewards.map((r) => ({ ...r, isActive: false }));
    expect(configuredCardCount({ displayCoupons: 6 }, { rewards: allOff })).toBe(6);
  });

  test('fewer saved rewards than configured → configured count', () => {
    expect(configuredCardCount({ displayCoupons: 8 }, { rewards: [{}, {}] })).toBe(8);
  });

  test('more saved rewards than configured → never hides one', () => {
    expect(configuredCardCount({ displayCoupons: 4 }, { rewards: sixRewards })).toBe(6);
  });

  test('legacy campaign without displayCoupons → saved rewards', () => {
    expect(configuredCardCount({}, { rewards: sixRewards })).toBe(6);
  });
});

describe('parseQuantity', () => {
  test.each([1, 5, '7', ' 12 ', MAX_REWARD_QUANTITY])('accepts %p', (v) => {
    expect(parseQuantity(v)).toBe(Number(String(v).trim()));
  });
  test.each([0, -1, 1.5, '1.5', 'abc', '', null, undefined, NaN, MAX_REWARD_QUANTITY + 1, '1e3', '-3', {}, []])(
    'rejects %p',
    (v) => {
      expect(() => parseQuantity(v)).toThrow(/whole number/);
    },
  );
});

describe('normalizeRewardsForSave', () => {
  test('new rewards get stable ids and default to active + unlimited', () => {
    const [r] = normalizeRewardsForSave([{ type: 'flat', value: 50 }], []);
    expect(r.rewardId).toMatch(/^[a-f0-9]{24}$/);
    expect(r).toMatchObject({
      isActive: true,
      quantityEnabled: false,
      totalQuantity: null,
      remainingQuantity: null,
      redeemedQuantity: 0,
      type: 'flat',
      value: 50,
    });
  });

  test.each(TYPES)('$type: inactive and limited are both supported', (cfg) => {
    const [r] = normalizeRewardsForSave([{ ...cfg, isActive: false, quantityEnabled: true, totalQuantity: 5 }], []);
    expect(r).toMatchObject({ isActive: false, quantityEnabled: true, totalQuantity: 5, remainingQuantity: 5 });
  });

  test('quantity enabled initialises remaining = total', () => {
    const [r] = normalizeRewardsForSave([{ type: 'gift', value: 'x', quantityEnabled: true, totalQuantity: 5 }], []);
    expect(r).toMatchObject({ totalQuantity: 5, remainingQuantity: 5, redeemedQuantity: 0 });
  });

  test('client-sent counters are ignored — the server owns them', () => {
    const stored = [{ rewardId: 'aaaaaaaaaaaaaaaaaaaaaaaa', quantityEnabled: true, totalQuantity: 10, remainingQuantity: 7, redeemedQuantity: 3 }];
    const [r] = normalizeRewardsForSave(
      [{ rewardId: 'aaaaaaaaaaaaaaaaaaaaaaaa', type: 'flat', value: 1, quantityEnabled: true, totalQuantity: 10, remainingQuantity: 999, redeemedQuantity: 0 }],
      stored,
    );
    expect(r.redeemedQuantity).toBe(3);
    expect(r.remainingQuantity).toBe(7);
  });

  test('increase stock: total 5 → 10 with 2 redeemed → remaining 8, redeemed 2', () => {
    const id = 'bbbbbbbbbbbbbbbbbbbbbbbb';
    const stored = [{ rewardId: id, quantityEnabled: true, totalQuantity: 5, remainingQuantity: 3, redeemedQuantity: 2 }];
    const [r] = normalizeRewardsForSave([{ rewardId: id, type: 'flat', value: 1, quantityEnabled: true, totalQuantity: 10 }], stored);
    expect(r).toMatchObject({ totalQuantity: 10, remainingQuantity: 8, redeemedQuantity: 2 });
  });

  test('decrease stock: total 10 → 6 with 3 redeemed → remaining 3', () => {
    const id = 'cccccccccccccccccccccccc';
    const stored = [{ rewardId: id, quantityEnabled: true, totalQuantity: 10, remainingQuantity: 7, redeemedQuantity: 3 }];
    const [r] = normalizeRewardsForSave([{ rewardId: id, type: 'flat', value: 1, quantityEnabled: true, totalQuantity: 6 }], stored);
    expect(r).toMatchObject({ totalQuantity: 6, remainingQuantity: 3, redeemedQuantity: 3 });
  });

  test('cannot go below what has been redeemed', () => {
    const id = 'dddddddddddddddddddddddd';
    const stored = [{ rewardId: id, quantityEnabled: true, totalQuantity: 10, remainingQuantity: 3, redeemedQuantity: 7 }];
    expect(() =>
      normalizeRewardsForSave([{ rewardId: id, type: 'flat', value: 1, quantityEnabled: true, totalQuantity: 5 }], stored),
    ).toThrow(MESSAGES.BELOW_REDEEMED);
  });

  test('cannot be active with zero stock left', () => {
    const id = 'eeeeeeeeeeeeeeeeeeeeeeee';
    const stored = [{ rewardId: id, isActive: false, quantityEnabled: true, totalQuantity: 5, remainingQuantity: 0, redeemedQuantity: 5 }];
    expect(() =>
      normalizeRewardsForSave([{ rewardId: id, type: 'flat', value: 1, isActive: true, quantityEnabled: true, totalQuantity: 5 }], stored),
    ).toThrow(MESSAGES.REPLENISH_FIRST);
  });

  test('...but can stay inactive at zero', () => {
    const id = 'eeeeeeeeeeeeeeeeeeeeeeee';
    const stored = [{ rewardId: id, isActive: false, quantityEnabled: true, totalQuantity: 5, remainingQuantity: 0, redeemedQuantity: 5 }];
    const [r] = normalizeRewardsForSave([{ rewardId: id, type: 'flat', value: 1, isActive: false, quantityEnabled: true, totalQuantity: 5 }], stored);
    expect(r).toMatchObject({ isActive: false, remainingQuantity: 0 });
  });

  test('replenishing does NOT re-activate a manually inactive coupon', () => {
    const id = 'ffffffffffffffffffffffff';
    const stored = [{ rewardId: id, isActive: false, quantityEnabled: true, totalQuantity: 5, remainingQuantity: 0, redeemedQuantity: 5 }];
    const [r] = normalizeRewardsForSave([{ rewardId: id, type: 'flat', value: 1, isActive: false, quantityEnabled: true, totalQuantity: 8 }], stored);
    expect(r).toMatchObject({ isActive: false, remainingQuantity: 3 });
  });

  test('once replenished, it can be activated', () => {
    const id = 'ffffffffffffffffffffffff';
    const stored = [{ rewardId: id, isActive: false, quantityEnabled: true, totalQuantity: 5, remainingQuantity: 0, redeemedQuantity: 5 }];
    const [r] = normalizeRewardsForSave([{ rewardId: id, type: 'flat', value: 1, isActive: true, quantityEnabled: true, totalQuantity: 8 }], stored);
    expect(r).toMatchObject({ isActive: true, remainingQuantity: 3 });
  });

  test('disabling quantity keeps redemption history and the active flag', () => {
    const id = '111111111111111111111111';
    const stored = [{ rewardId: id, isActive: false, quantityEnabled: true, totalQuantity: 5, remainingQuantity: 3, redeemedQuantity: 2 }];
    const [r] = normalizeRewardsForSave([{ rewardId: id, type: 'flat', value: 1, isActive: false, quantityEnabled: false }], stored);
    expect(r).toMatchObject({ quantityEnabled: false, totalQuantity: null, remainingQuantity: null, redeemedQuantity: 2, isActive: false });
  });

  test('re-enabling continues from the kept redeemed count (no double counting)', () => {
    const id = '222222222222222222222222';
    const stored = [{ rewardId: id, quantityEnabled: false, totalQuantity: null, remainingQuantity: null, redeemedQuantity: 2 }];
    const [r] = normalizeRewardsForSave([{ rewardId: id, type: 'flat', value: 1, quantityEnabled: true, totalQuantity: 10 }], stored);
    expect(r).toMatchObject({ totalQuantity: 10, redeemedQuantity: 2, remainingQuantity: 8 });
  });

  test('a rewardId from another range is ignored — fresh id, fresh counters', () => {
    const [r] = normalizeRewardsForSave(
      [{ rewardId: '333333333333333333333333', type: 'flat', value: 1, quantityEnabled: true, totalQuantity: 4 }],
      [], // not in THIS range
    );
    expect(r.rewardId).not.toBe('333333333333333333333333');
    expect(r).toMatchObject({ redeemedQuantity: 0, remainingQuantity: 4 });
  });

  test('a rewardId repeated in one request is not duplicated', () => {
    const id = '444444444444444444444444';
    const stored = [{ rewardId: id, quantityEnabled: true, totalQuantity: 5, remainingQuantity: 5, redeemedQuantity: 0 }];
    const out = normalizeRewardsForSave(
      [
        { rewardId: id, type: 'flat', value: 1 },
        { rewardId: id, type: 'flat', value: 2 },
      ],
      stored,
    );
    expect(out[0].rewardId).toBe(id);
    expect(out[1].rewardId).not.toBe(id);
  });

  test.each([[-1], [0], [1.5], ['abc'], [null], [undefined], [MAX_REWARD_QUANTITY + 1]])(
    'rejects invalid quantity %p when enabled',
    (q) => {
      expect(() =>
        normalizeRewardsForSave([{ type: 'flat', value: 1, quantityEnabled: true, totalQuantity: q }], []),
      ).toThrow(/whole number/);
    },
  );

  test('rejects a non-array payload', () => {
    expect(() => normalizeRewardsForSave('nope', [])).toThrow();
  });
});
