import { ValidationError } from '@/lib/errors';

export function ok(data, status = 200) {
  return Response.json({ success: true, data, error: null }, { status });
}

export function fail(message, status) {
  return Response.json({ success: false, data: null, error: message }, { status });
}

/** Maps service errors to HTTP. Anything unexpected becomes a generic 500. */
export function errorResponse(error) {
  // Mongoose's own ValidationError has no statusCode but is a client error.
  const status = error?.statusCode || (error?.name === 'ValidationError' ? 400 : 500);
  if (status >= 500) console.error('[LuckyDraw]', error);
  return fail(status >= 500 ? 'Something went wrong. Please try again.' : error.message, status);
}

export async function readJson(request) {
  try {
    return await request.json();
  } catch {
    throw new ValidationError('Send a JSON body');
  }
}
