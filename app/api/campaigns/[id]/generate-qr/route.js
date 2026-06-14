import { connectDB } from '@/lib/connectDB';
import Campaign from '@/models/campaignModel';
import Range from '@/models/rangeModel';
import qrcode from 'qrcode';

export async function POST(request, { params }) {
  try {
    const userId = request.headers.get('x-user-id');
    const userRole = request.headers.get('x-user-role');

    if (!userId) {
      return Response.json(
        { success: false, data: null, message: 'User authentication required' },
        { status: 401 }
      );
    }

    const { id: campaignId } = await params;

    if (!campaignId) {
      return Response.json(
        { success: false, data: null, message: 'Campaign ID is required' },
        { status: 400 }
      );
    }

    await connectDB();

    // Fetch campaign
    const campaign = await Campaign.findById(campaignId);

    if (!campaign) {
      return Response.json(
        { success: false, data: null, message: 'Campaign not found' },
        { status: 404 }
      );
    }

    // Verify ownership
    if (campaign.merchantId.toString() !== userId && userRole !== 'Admin') {
      return Response.json(
        { success: false, data: null, message: 'Unauthorized' },
        { status: 403 }
      );
    }

    // ===== VALIDATION 1: Billing Ranges =====
    const billingRanges = await Range.find({ campaignId: campaignId });
    if (!billingRanges || billingRanges.length === 0) {
      return Response.json(
        {
          success: false,
          data: null,
          message: 'Please create at least one billing range.'
        },
        { status: 400 }
      );
    }

    // ===== VALIDATION 2: Store Snapshots (NEW PATTERN) =====
    // Check campaign.assignedStores array for active assignments
    const activeStores = (campaign.assignedStores || []).filter(
      store => store.status === 'active'
    );
    if (!activeStores || activeStores.length === 0) {
      return Response.json(
        {
          success: false,
          data: null,
          message: 'Please assign at least one store.'
        },
        { status: 400 }
      );
    }

    // ===== VALIDATION 3: Scratch Allocation =====
    if (!campaign.allocated_scratch_cards || campaign.allocated_scratch_cards === 0) {
      return Response.json(
        {
          success: false,
          data: null,
          message: 'Please allocate scratches before launch.'
        },
        { status: 400 }
      );
    }

    // ===== VALIDATION 4: Campaign Not Ended =====
    if (campaign.status === 'ended') {
      return Response.json(
        {
          success: false,
          data: null,
          message: 'Cannot launch an ended campaign.'
        },
        { status: 400 }
      );
    }

    // ===== GENERATE QR CODE =====
    // Generate redirect URL instead of JSON
    const qrUrl = `${process.env.NEXT_PUBLIC_CLIENT_URL}/scan/${campaign._id.toString()}`;

    // Generate QR code as data URL
    const qrCodeDataUrl = await qrcode.toDataURL(qrUrl, {
      errorCorrectionLevel: 'H',
      type: 'image/png',
      quality: 0.95,
      margin: 1,
      width: 300,
    });

    // ===== UPDATE CAMPAIGN STATUS =====
    campaign.status = 'active';
    campaign.qrCodeUrl = qrCodeDataUrl;
    campaign.qrGeneratedAt = new Date();
    await campaign.save();

    return Response.json({
      success: true,
      data: {
        campaignId: campaign._id,
        qrCodeUrl: qrCodeDataUrl,
        qrGeneratedAt: campaign.qrGeneratedAt,
        campaign: {
          _id: campaign._id,
          campaignName: campaign.campaignName,
          status: campaign.status,
          startDate: campaign.startDate,
          endDate: campaign.endDate,
          allocated_scratch_cards: campaign.allocated_scratch_cards,
          storeCount: activeStores.length,
        },
      },
      message: 'QR code generated successfully'
    });
  } catch (error) {
    console.error('Error generating QR code:', error);
    return Response.json(
      { success: false, data: null, message: 'Failed to generate QR code' },
      { status: 500 }
    );
  }
}
