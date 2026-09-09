import { connectDB } from "@/lib/connectDB";
import { requireAuth } from "@/lib/auth";
import Account from "@/models/accountModel";

const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

async function findScopedExecutive(id, account) {
  const query = { _id: id, role: "Sales_Executive" };
  if (account.role === "Distributor") query.parentId = account._id;
  return Account.findOne(query);
}

// PATCH /api/distributor/sales-executives/[id] — edit details or
// activate/deactivate (deactivated execs are blocked from logging in,
// same convention as Store_Manager/Store_Staff — see app/api/team/members/route.js)
export async function PATCH(request, { params }) {
  await connectDB();
  const { account, error } = await requireAuth();
  if (error) return error;
  if (!["Super_Admin", "Distributor"].includes(account.role)) {
    return Response.json({ success: false, error: "Forbidden" }, { status: 403 });
  }

  const { id } = await params;
  const executive = await findScopedExecutive(id, account);
  if (!executive) {
    return Response.json({ success: false, error: "Sales executive not found" }, { status: 404 });
  }

  const { name, email, phone, territory, status } = await request.json();

  if (email && email.toLowerCase() !== executive.email) {
    if (!EMAIL_PATTERN.test(email)) {
      return Response.json({ success: false, error: "Please enter a valid email address" }, { status: 400 });
    }
    const existingEmail = await Account.findOne({ email: email.toLowerCase() });
    if (existingEmail) {
      return Response.json({ success: false, error: "Email already in use" }, { status: 400 });
    }
    executive.email = email.toLowerCase();
  }

  if (phone && !/^\d{10}$/.test(phone)) {
    return Response.json({ success: false, error: "Phone number must be exactly 10 digits" }, { status: 400 });
  }

  if (name) executive.name = name;
  if (phone) executive.phone = phone;
  if (territory !== undefined) executive.profile = { ...executive.profile, territory };
  if (status && ["active", "deactivated"].includes(status)) executive.status = status;

  await executive.save();

  return Response.json(
    {
      success: true,
      executive: {
        _id: executive._id,
        name: executive.name,
        email: executive.email,
        phone: executive.phone,
        status: executive.status,
        territory: executive.profile?.territory || null,
      },
    },
    { status: 200 },
  );
}
