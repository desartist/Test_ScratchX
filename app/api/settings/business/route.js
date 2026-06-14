import { connectDB } from "@/lib/connectDB";
import { getLoginToken } from "@/lib/auth";
import Account from "@/models/accountModel";
import { logAction } from "@/lib/services/auditLogService";

export async function GET(req) {
  await connectDB();

  const account = await getLoginToken();
  if (!account) {
    return Response.json(
      { success: false, error: "Unauthorized" },
      { status: 401 }
    );
  }

  return Response.json({
    success: true,
    businessInfo: account.businessInfo || {
      businessName: null,
      gstNumber: null,
      address: null,
      city: null,
      state: null,
      pincode: null,
    },
  });
}

export async function PUT(req) {
  await connectDB();

  const account = await getLoginToken();
  if (!account) {
    return Response.json(
      { success: false, error: "Unauthorized" },
      { status: 401 }
    );
  }

  const body = await req.json();
  const { businessName, gstNumber, address, city, state, pincode } = body;

  // Validate required fields
  if (!businessName || !address || !city || !state) {
    return Response.json(
      { success: false, error: "Business Name, Address, City, and State are required" },
      { status: 400 }
    );
  }

  // Validate pincode if provided
  if (pincode && !/^\d{6}$/.test(pincode)) {
    return Response.json(
      { success: false, error: "Pincode must be 6 digits" },
      { status: 400 }
    );
  }

  // Validate GST if provided
  if (gstNumber) {
    if (gstNumber.length > 15) {
      return Response.json(
        { success: false, error: "GST number cannot exceed 15 characters" },
        { status: 400 }
      );
    }
    // Validate GST format
    const gstPattern = /^[0-9]{2}[A-Z]{5}[0-9]{4}[A-Z]{1}[1-9A-Z]{1}[Z]{1}[0-9]{1}$/;
    if (!gstPattern.test(gstNumber)) {
      return Response.json(
        { success: false, error: "Invalid GST number format" },
        { status: 400 }
      );
    }
  }

  const updated = await Account.findByIdAndUpdate(
    account._id,
    {
      businessInfo: {
        businessName: businessName.trim(),
        gstNumber: gstNumber ? gstNumber.trim() : null,
        address: address.trim(),
        city: city.trim(),
        state: state.trim(),
        pincode: pincode ? pincode.trim() : null,
      },
    },
    { new: true, runValidators: true }
  );

  // Log action
  const ip = req.headers.get("x-forwarded-for") || "unknown";
  await logAction(account._id, "BUSINESS_INFO_UPDATE", {
    ip,
    metadata: { changes: ["businessName", "address", "city", "state"] },
  });

  return Response.json({
    success: true,
    message: "Business information updated successfully",
    businessInfo: updated.businessInfo,
  });
}
