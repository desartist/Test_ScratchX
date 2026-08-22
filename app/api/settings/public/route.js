import { connectDB } from "@/lib/connectDB";
import { requireAuth } from "@/lib/auth";
import { getPlatformSettings } from "@/lib/services/platformSettingsService";

// GET /api/settings/public — the small, non-sensitive subset of platform
// settings any authenticated user needs: maintenance banner state and
// support contact emails (used by the Support page and the dashboard shell).
export async function GET(request) {
  await connectDB();
  const { error } = await requireAuth();
  if (error) return error;

  const settings = await getPlatformSettings();
  return Response.json(
    {
      success: true,
      maintenanceMode: settings.maintenanceMode,
      supportContacts: settings.supportContacts,
    },
    { status: 200 },
  );
}
