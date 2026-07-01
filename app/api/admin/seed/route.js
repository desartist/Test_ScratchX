import { connectDB } from "@/lib/connectDB";
import SubscriptionPlan from "@/models/subscriptionPlanModel";
import Account from "@/models/accountModel";
import bcrypt from "bcrypt";

/**
 * POST /api/admin/seed
 *
 * One-time setup route. Protected by SEED_SECRET env variable.
 * - Upserts the 4 default subscription plans.
 * - Creates the first Super_Admin account if none exists.
 *
 * Body: { secret, adminName, adminEmail, adminPassword }
 */
export async function POST(request) {
  try {
    await connectDB();

    const { secret, adminName, adminEmail, adminPassword } = await request.json();

    if (!secret || secret !== process.env.SEED_SECRET) {
      return Response.json({ success: false, error: "Invalid seed secret" }, { status: 403 });
    }

    // — Upsert default subscription plans —
    const plans = [
      {
        name: "Free",
        description: "Get started with basic campaign tools.",
        price: { monthly: 0, annual: 0 },
        features: {
          maxCampaigns: 1,
          maxScansPerMonth: 100,
          maxRangesPerCampaign: 2,
          maxManagers: 0,
          analyticsAccess: false,
          exportData: false,
          whatsappIntegration: false,
          customBranding: false,
          prioritySupport: false,
        },
        isActive: true,
        isPublic: true,
        sortOrder: 1,
      },
      {
        name: "Starter",
        description: "For growing stores running regular campaigns.",
        price: { monthly: 999, annual: 9990 },
        features: {
          maxCampaigns: 5,
          maxScansPerMonth: 1000,
          maxRangesPerCampaign: 5,
          maxManagers: 1,
          analyticsAccess: true,
          exportData: false,
          whatsappIntegration: false,
          customBranding: false,
          prioritySupport: false,
        },
        isActive: true,
        isPublic: true,
        sortOrder: 2,
      },
      {
        name: "Growth",
        description: "Full-featured plan for serious merchants.",
        price: { monthly: 2499, annual: 24990 },
        features: {
          maxCampaigns: 20,
          maxScansPerMonth: 5000,
          maxRangesPerCampaign: 10,
          maxManagers: 3,
          analyticsAccess: true,
          exportData: true,
          whatsappIntegration: true,
          customBranding: false,
          prioritySupport: false,
        },
        isActive: true,
        isPublic: true,
        sortOrder: 3,
      },
      {
        name: "Enterprise",
        description: "Unlimited everything with dedicated support.",
        price: { monthly: 7999, annual: 79990 },
        features: {
          maxCampaigns: -1,
          maxScansPerMonth: -1,
          maxRangesPerCampaign: -1,
          maxManagers: -1,
          analyticsAccess: true,
          exportData: true,
          whatsappIntegration: true,
          customBranding: true,
          prioritySupport: true,
        },
        isActive: true,
        isPublic: true,
        sortOrder: 4,
      },
    ];

    const planResults = [];
    for (const plan of plans) {
      const result = await SubscriptionPlan.findOneAndUpdate(
        { name: plan.name },
        plan,
        { upsert: true, new: true },
      );
      planResults.push(result.name);
    }

    // — Create first Super_Admin if none exists —
    let adminResult = null;
    const existing = await Account.findOne({ role: "Super_Admin" });

    if (!existing && adminEmail && adminPassword) {
      const hashedPassword = await bcrypt.hash(adminPassword, 10);
      const admin = await Account.create({
        name: adminName || "Super Admin",
        email: adminEmail,
        password: hashedPassword,
        role: "Super_Admin",
      });
      adminResult = { name: admin.name, email: admin.email };
    } else if (existing) {
      adminResult = "Super_Admin already exists — skipped";
    } else {
      adminResult = "No adminEmail/adminPassword provided — skipped";
    }

    return Response.json({
      success: true,
      plans: planResults,
      admin: adminResult,
    });
  } catch (error) {
    console.error("Seed error:", error);
    return Response.json({ success: false, error: "Seed failed" }, { status: 500 });
  }
}
