import { connectDB } from "@/lib/connectDB";
import { getLoginToken } from "@/lib/auth";
import Account from "@/models/accountModel";
import { logAction } from "@/lib/services/auditLogService";

const MAX_QR_SIZE_BYTES = 500 * 1024; // 500 KB base64 string limit
const IFSC_PATTERN = /^[A-Z]{4}0[A-Z0-9]{6}$/;
const UPI_PATTERN = /^[\w.-]{2,256}@[a-zA-Z]{2,64}$/;

export async function GET(req) {
  await connectDB();

  const account = await getLoginToken();
  if (!account) {
    return Response.json({ success: false, error: "Unauthorized" }, { status: 401 });
  }

  return Response.json({
    success: true,
    paymentDetails: account.paymentDetails || {
      accountHolderName: null,
      accountNumber: null,
      ifscCode: null,
      upiId: null,
      qrCodeImage: null,
    },
  });
}

export async function PUT(req) {
  await connectDB();

  const account = await getLoginToken();
  if (!account) {
    return Response.json({ success: false, error: "Unauthorized" }, { status: 401 });
  }

  if (account.role !== "Distributor") {
    return Response.json(
      { success: false, error: "Only distributors can set payment details" },
      { status: 403 }
    );
  }

  const body = await req.json();
  const accountHolderName = body.accountHolderName?.trim() || null;
  const accountNumber = body.accountNumber?.trim() || null;
  const ifscCode = body.ifscCode?.trim().toUpperCase() || null;
  const upiId = body.upiId?.trim() || null;
  // Distinguish "field omitted" (keep existing QR) from an explicit `null`
  // (user removed the QR code) — both would collapse to the same thing
  // under `??`, silently undoing a deliberate removal.
  const qrCodeImage = Object.prototype.hasOwnProperty.call(body, "qrCodeImage")
    ? body.qrCodeImage
    : account.paymentDetails?.qrCodeImage ?? null;

  if (!qrCodeImage) {
    return Response.json(
      { success: false, error: "QR code image is required" },
      { status: 400 }
    );
  }

  // Bank transfer needs both halves to be usable — require them together.
  if ((accountNumber && !ifscCode) || (ifscCode && !accountNumber)) {
    return Response.json(
      { success: false, error: "Account Number and IFSC Code must be provided together" },
      { status: 400 }
    );
  }

  if (accountNumber && !/^\d{6,20}$/.test(accountNumber)) {
    return Response.json(
      { success: false, error: "Account Number must be 6-20 digits" },
      { status: 400 }
    );
  }

  if (ifscCode && !IFSC_PATTERN.test(ifscCode)) {
    return Response.json(
      { success: false, error: "Invalid IFSC code format" },
      { status: 400 }
    );
  }

  if (upiId && !UPI_PATTERN.test(upiId)) {
    return Response.json(
      { success: false, error: "Invalid UPI ID format" },
      { status: 400 }
    );
  }

  if (qrCodeImage) {
    if (!qrCodeImage.startsWith("data:image/")) {
      return Response.json({ success: false, error: "Invalid QR code image format" }, { status: 400 });
    }
    const mimeMatch = qrCodeImage.match(/^data:(image\/(?:jpeg|png|webp|gif));base64,/);
    if (!mimeMatch) {
      return Response.json(
        { success: false, error: "QR code must be a JPEG, PNG, WebP, or GIF image" },
        { status: 400 }
      );
    }
    const base64Data = qrCodeImage.split(",")[1];
    const sizeBytes = Math.ceil((base64Data.length * 3) / 4);
    if (sizeBytes > MAX_QR_SIZE_BYTES) {
      return Response.json(
        { success: false, error: "QR code image too large. Maximum size is 500 KB." },
        { status: 400 }
      );
    }
  }

  const updated = await Account.findByIdAndUpdate(
    account._id,
    {
      paymentDetails: {
        accountHolderName,
        accountNumber,
        ifscCode,
        upiId,
        qrCodeImage,
      },
    },
    { new: true, runValidators: true }
  );

  const ip = req.headers.get("x-forwarded-for") || "unknown";
  await logAction(account._id, "PAYMENT_DETAILS_UPDATE", {
    ip,
    metadata: {
      hasBankDetails: !!(accountNumber && ifscCode),
      hasUpi: !!upiId,
      hasQrCode: !!qrCodeImage,
    },
  });

  return Response.json({
    success: true,
    message: "Payment details updated successfully",
    paymentDetails: updated.paymentDetails,
  });
}
