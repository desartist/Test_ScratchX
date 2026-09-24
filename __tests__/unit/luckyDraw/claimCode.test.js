import { generateClaimCode } from '@/lib/services/luckyDraw/claimCode';

describe('generateClaimCode', () => {
  it('is 8 characters from an unambiguous alphabet by default', () => {
    for (let i = 0; i < 200; i++) {
      expect(generateClaimCode()).toMatch(/^[ABCDEFGHJKLMNPQRSTUVWXYZ23456789]{8}$/);
    }
  });

  it('honours a custom length', () => {
    expect(generateClaimCode(12)).toHaveLength(12);
  });

  it('does not repeat across many codes', () => {
    const codes = new Set(Array.from({ length: 2000 }, () => generateClaimCode()));
    expect(codes.size).toBe(2000);
  });
});
