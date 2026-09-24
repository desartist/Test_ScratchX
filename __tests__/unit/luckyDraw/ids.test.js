import mongoose from 'mongoose';
import { requireObjectId } from '@/lib/luckyDraw/ids';
import { NotFoundError } from '@/lib/errors';

describe('requireObjectId', () => {
  it('returns the id as a string when valid', () => {
    const id = new mongoose.Types.ObjectId();
    expect(requireObjectId(id)).toBe(String(id));
    expect(requireObjectId(String(id))).toBe(String(id));
  });

  it('throws NotFoundError with the given message when invalid', () => {
    expect(() => requireObjectId('nope', 'Draw not found')).toThrow(NotFoundError);
    expect(() => requireObjectId('nope', 'Draw not found')).toThrow('Draw not found');
    expect(() => requireObjectId(undefined)).toThrow('Not found');
  });
});
