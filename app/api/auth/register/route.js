import { connectDB } from "@/lib/connectDB.js";
import Account from "@/models/accountModel.js";
import bcrypt from "bcrypt";

// Public self-registration creates a Merchant account only.
// Super_Admin creates Distributor accounts; Distributor creates Merchant accounts
// via their own protected API routes.
export async function POST(request) {
  try {
    await connectDB();

    const {
      name,
      email,
      password,
      storeName,
      storeAddress,
      businessType,
      countryCode,
      phoneNumber,
      storeLocation,
    } = await request.json();

    console.log("Registering account:", { name, email, storeName });

    const hashedPassword = await bcrypt.hash(password, 10);

    const account = await Account.create({
      name,
      email,
      password: hashedPassword,
      role: "Merchant",
      status: "active",
      source: "Password_Signup",
      profile: {
        storeName,
        storeAddress,
        businessType,
        countryCode,
        phoneNumber,
        storeLocation,
      },
    });

    return Response.json(
      {
        success: true,
        account: {
          name: account.name,
          email: account.email,
          role: account.role,
          storeName: account.profile.storeName,
        },
      },
      { status: 201 },
    );
  } catch (error) {
    if (error.code === 11000) {
      return Response.json(
        { success: false, error: "Email already registered" },
        { status: 409 },
      );
    }
    console.error("Register error:", error);
    return Response.json(
      { success: false, error: "Internal server error" },
      { status: 500 },
    );
  }
}
