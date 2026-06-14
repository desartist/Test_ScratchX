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
    profile: {
      name: account.name || "",
      firstName: account.firstName || "",
      lastName: account.lastName || "",
      email: account.email,
      phone: account.phone || "",
      businessType: account.profile?.businessType || "",
      profileImage: account.profileImage || null,
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
  const { name, firstName, lastName, phone, businessType } = body;

  // Validate
  if (!name && !firstName && !lastName && !phone && !businessType) {
    return Response.json(
      { success: false, error: "At least one field required" },
      { status: 400 }
    );
  }

  // Update account
  const updateData = {};
  if (name) updateData.name = name.trim();
  if (firstName) updateData.firstName = firstName.trim();
  if (lastName) updateData.lastName = lastName.trim();
  if (phone) updateData.phone = phone.trim();
  if (businessType) {
    if (!updateData.profile) updateData.profile = {};
    updateData.profile.businessType = businessType.trim();
  }

  const updated = await Account.findByIdAndUpdate(
    account._id,
    updateData,
    { new: true, runValidators: true }
  );

  // Log action
  const ip = req.headers.get("x-forwarded-for") || "unknown";
  await logAction(account._id, "PROFILE_UPDATE", {
    ip,
    metadata: { updatedFields: Object.keys(updateData) },
  });

  return Response.json({
    success: true,
    message: "Profile updated successfully",
    profile: {
      name: updated.name || "",
      firstName: updated.firstName || "",
      lastName: updated.lastName || "",
      email: updated.email,
      phone: updated.phone || "",
      businessType: updated.profile?.businessType || "",
    },
  });
}
