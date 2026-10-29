import { ok, errorResponse, requireEntryStaff } from '@/lib/luckyDraw/http';
import { listStaffDraws } from '@/lib/services/luckyDraw/staffEntryService';

/** Open Physical and Live online draws the caller can add entries to. */
export async function GET() {
  try {
    const { error, account } = await requireEntryStaff();
    if (error) return error;
    return ok(await listStaffDraws(account));
  } catch (err) {
    return errorResponse(err);
  }
}
