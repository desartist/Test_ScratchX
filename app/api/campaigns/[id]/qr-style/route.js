import { connectDB } from '@/lib/connectDB';
import Campaign from '@/models/campaignModel';

// ~512KB cap on a data-URL logo to avoid bloating the campaign document.
const MAX_LOGO_LENGTH = 700000;
const MAX_COLOR_LENGTH = 32;
const MAX_BRAND_LENGTH = 60;

/**
 * PUT /api/campaigns/[id]/qr-style - Persist the customizable QR studio style.
 * Auth: x-user-id / x-user-role headers (matches other campaign routes).
 * Only the owning merchant may save. Validates colors, brand name length, and
 * caps data-URL logo size.
 */
export async function PUT(request, { params }) {
  try {
    const userId = request.headers.get('x-user-id');
    const userRole = request.headers.get('x-user-role');

    if (!userId) {
      return Response.json(
        { success: false, message: 'User authentication required' },
        { status: 401 }
      );
    }

    const { id } = await params;

    if (!id) {
      return Response.json(
        { success: false, message: 'Campaign ID is required' },
        { status: 400 }
      );
    }

    const body = await request.json();
    const { fgColor, bgColor, brandName, logoUrl } = body || {};

    // ---- Validation (lenient but bounded) ----
    const update = {};

    const validateColor = (value, field) => {
      if (value === undefined) return true;
      if (typeof value !== 'string' || value.length > MAX_COLOR_LENGTH) {
        return false;
      }
      update[field] = value;
      return true;
    };

    if (!validateColor(fgColor, 'fgColor')) {
      return Response.json(
        { success: false, message: 'Invalid fgColor' },
        { status: 400 }
      );
    }
    if (!validateColor(bgColor, 'bgColor')) {
      return Response.json(
        { success: false, message: 'Invalid bgColor' },
        { status: 400 }
      );
    }

    if (brandName !== undefined) {
      if (typeof brandName !== 'string') {
        return Response.json(
          { success: false, message: 'Invalid brandName' },
          { status: 400 }
        );
      }
      const trimmed = brandName.trim();
      if (trimmed.length > MAX_BRAND_LENGTH) {
        return Response.json(
          { success: false, message: 'Brand name cannot exceed 60 characters' },
          { status: 400 }
        );
      }
      update.brandName = trimmed;
    }

    if (logoUrl !== undefined) {
      if (logoUrl === null) {
        update.logoUrl = null;
      } else if (typeof logoUrl !== 'string') {
        return Response.json(
          { success: false, message: 'Invalid logoUrl' },
          { status: 400 }
        );
      } else {
        if (logoUrl.startsWith('data:') && logoUrl.length > MAX_LOGO_LENGTH) {
          return Response.json(
            {
              success: false,
              message: 'Logo image is too large. Please use a smaller image (under ~512KB).',
            },
            { status: 413 }
          );
        }
        update.logoUrl = logoUrl;
      }
    }

    await connectDB();

    const campaign = await Campaign.findById(id);

    if (!campaign) {
      return Response.json(
        { success: false, message: 'Campaign not found' },
        { status: 404 }
      );
    }

    if (campaign.merchantId.toString() !== userId && userRole !== 'Merchant') {
      return Response.json(
        { success: false, message: 'Unauthorized' },
        { status: 403 }
      );
    }

    // Merge: keep existing values for any field not provided.
    const existing = campaign.qrStyle || {};
    campaign.qrStyle = {
      fgColor: update.fgColor !== undefined ? update.fgColor : (existing.fgColor ?? '#010f44'),
      bgColor: update.bgColor !== undefined ? update.bgColor : (existing.bgColor ?? '#ffffff'),
      brandName: update.brandName !== undefined ? update.brandName : (existing.brandName ?? ''),
      logoUrl: update.logoUrl !== undefined ? update.logoUrl : (existing.logoUrl ?? null),
    };

    await campaign.save();

    return Response.json({ success: true, qrStyle: campaign.qrStyle });
  } catch (error) {
    console.error('Error saving QR style:', error);
    return Response.json(
      { success: false, message: 'Failed to save QR style' },
      { status: 500 }
    );
  }
}
