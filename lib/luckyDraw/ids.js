import mongoose from 'mongoose';
import { NotFoundError } from '@/lib/errors';

/**
 * Guard for ids that arrive from URLs or request bodies. An invalid id is
 * reported as "not found" (404) instead of letting Mongoose throw a CastError
 * that would surface as a 500.
 */
export function requireObjectId(id, message = 'Not found') {
  if (!mongoose.isValidObjectId(id)) throw new NotFoundError(message);
  return String(id);
}
