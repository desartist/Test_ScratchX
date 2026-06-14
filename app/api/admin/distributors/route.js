import { connectDB } from "@/lib/connectDB";
import { requireAuth } from "@/lib/auth";
import Account from "@/models/accountModel";
import bcrypt from "bcrypt";

function superAdminOnly(account) {
  if (account.role !== "Super_Admin") {
    return Response.json({ success: false, error: "Forbidden" }, { status: 403 });
  }
  return null;
}

// GET /api/admin/distributors — list all distributors
export async function GET(request) {
  await connectDB();
  const { account, error } = await requireAuth();
  if (error) return error;
  const denied = superAdminOnly(account);
  if (denied) return denied;

  const { searchParams } = new URL(request.url);
  const page = Math.max(1, parseInt(searchParams.get("page") ?? "1"));
  const limit = Math.min(100, parseInt(searchParams.get("limit") ?? "20"));
  const skip = (page - 1) * limit;

  const [distributors, total] = await Promise.all([
    Account.find({ role: "Distributor" })
      .select("-password -__v")
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit),
    Account.countDocuments({ role: "Distributor" }),
  ]);

  return Response.json({ success: true, distributors, total, page, limit }, { status: 200 });
}

// POST /api/admin/distributors — create a distributor account
export async function POST(request) {
  await connectDB();
  const { account, error } = await requireAuth();
  if (error) return error;
  const denied = superAdminOnly(account);
  if (denied) return denied;

  const { name, email, password, companyName, territory, region } =
    await request.json();

  if (!name || !email || !password) {
    return Response.json(
      { success: false, error: "name, email and password are required" },
      { status: 400 },
    );
  }

  try {
    const hashed = await bcrypt.hash(password, 10);
    const distributor = await Account.create({
      name,
      email,
      password: hashed,
      role: "Distributor",
      createdBy: account._id,
      profile: { companyName, territory, region },
    });

    return Response.json(
      {
        success: true,
        distributor: {
          _id: distributor._id,
          name: distributor.name,
          email: distributor.email,
          role: distributor.role,
          profile: distributor.profile,
        },
      },
      { status: 201 },
    );
  } catch (err) {
    if (err.code === 11000) {
      return Response.json({ success: false, error: "Email already exists" }, { status: 409 });
    }
    console.error(err);
    return Response.json({ success: false, error: "Internal server error" }, { status: 500 });
  }
}

// PATCH /api/admin/distributors — update status (suspend/activate)
export async function PATCH(request) {
  await connectDB();
  const { account, error } = await requireAuth();
  if (error) return error;
  const denied = superAdminOnly(account);
  if (denied) return denied;

  const { id, status } = await request.json();

  if (!id || !["active", "inactive", "suspended"].includes(status)) {
    return Response.json(
      { success: false, error: "id and valid status are required" },
      { status: 400 },
    );
  }

  const distributor = await Account.findOneAndUpdate(
    { _id: id, role: "Distributor" },
    { status },
    { new: true, select: "-password -__v" },
  );

  if (!distributor) {
    return Response.json({ success: false, error: "Distributor not found" }, { status: 404 });
  }

  return Response.json({ success: true, distributor }, { status: 200 });
}
