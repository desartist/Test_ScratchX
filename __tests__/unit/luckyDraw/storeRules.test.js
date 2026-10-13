import { storeHasLocation, storeProblem } from '@/lib/luckyDraw/storeRules';

const located = { store_name: 'Andheri', latitude: 19.13, longitude: 72.83 };
const unlocated = { store_name: 'Thane', latitude: null, longitude: null };

describe('storeHasLocation', () => {
  it('needs both coordinates as numbers, and treats 0,0 as not set', () => {
    expect(storeHasLocation(located)).toBe(true);
    expect(storeHasLocation(unlocated)).toBe(false);
    expect(storeHasLocation({ latitude: 0, longitude: 0 })).toBe(false);
    expect(storeHasLocation({ latitude: '19.1', longitude: 72.8 })).toBe(false);
    expect(storeHasLocation(undefined)).toBe(false);
  });
});

describe('storeProblem', () => {
  it('needs at least one active store for every draw type', () => {
    for (const type of ['physical', 'live_online', 'digital']) {
      expect(storeProblem(type, [])).toBe('You have no active stores. Add a store first.');
    }
  });

  it('needs a store with a location for a digital draw only', () => {
    expect(storeProblem('digital', [unlocated])).toBe(
      'Customers can only scan in at a store with a location. Add a location to one of your stores first.',
    );
    expect(storeProblem('digital', [unlocated, located])).toBeNull();
    expect(storeProblem('live_online', [unlocated])).toBeNull();
    expect(storeProblem('physical', [unlocated])).toBeNull();
  });
});
