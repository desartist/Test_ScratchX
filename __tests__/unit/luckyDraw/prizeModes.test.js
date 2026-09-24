import { validatePrizeAllocation } from '@/lib/luckyDraw/prizeModes';

const prize = (tierIndexes) => ({ prizeDescription: 'P', tierIndexes });

describe('validatePrizeAllocation', () => {
  it('shared prizes need nothing else', () => {
    expect(validatePrizeAllocation('shared', [prize([]), prize(undefined)], 1)).toBeNull();
    expect(validatePrizeAllocation('shared', [prize([])], 3)).toBeNull();
  });

  it('rejects an unknown mode', () => {
    expect(validatePrizeAllocation('nonsense', [prize([])], 2)).toMatch(/how prizes are split/i);
  });

  it('tying prizes to ranges needs at least two ranges', () => {
    expect(validatePrizeAllocation('pool_per_tier', [prize([0])], 1)).toMatch(/at least two/i);
    expect(validatePrizeAllocation('restricted', [prize([0])], 1)).toMatch(/at least two/i);
  });

  it('rejects a prize that points at a range that does not exist', () => {
    expect(validatePrizeAllocation('restricted', [prize([5]), prize([])], 2)).toMatch(/does not exist/i);
    expect(validatePrizeAllocation('restricted', [prize([-1])], 2)).toMatch(/does not exist/i);
    expect(validatePrizeAllocation('restricted', [prize([0.5])], 2)).toMatch(/does not exist/i);
  });

  describe('pool_per_tier', () => {
    it('accepts one prize group per range', () => {
      expect(validatePrizeAllocation('pool_per_tier', [prize([1]), prize([0]), prize([0])], 2)).toBeNull();
    });
    it('each prize must belong to exactly one range', () => {
      expect(validatePrizeAllocation('pool_per_tier', [prize([0, 1]), prize([1])], 2)).toMatch(/exactly one/i);
      expect(validatePrizeAllocation('pool_per_tier', [prize([]), prize([1])], 2)).toMatch(/exactly one/i);
    });
    it('every range needs at least one prize', () => {
      expect(validatePrizeAllocation('pool_per_tier', [prize([0]), prize([0])], 2)).toMatch(/every entry range needs/i);
    });
  });

  describe('restricted', () => {
    it('accepts restricted prizes when every range can still win something', () => {
      expect(validatePrizeAllocation('restricted', [prize([1]), prize([])], 2)).toBeNull();
      expect(validatePrizeAllocation('restricted', [prize([1]), prize([0, 1])], 2)).toBeNull();
    });
    it('rejects it when some range could never win', () => {
      expect(validatePrizeAllocation('restricted', [prize([1]), prize([1])], 2)).toMatch(/every entry range must be able/i);
    });
  });
});
