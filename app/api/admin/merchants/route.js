import { NextResponse } from 'next/server';
import { connectDB } from '@/lib/connectDB';
import { requireAdmin } from '@/lib/adminAuth';
import Account from '@/models/accountModel';
import Subscription from '@/models/subscriptionModel';

export async function GET(request) {
  try {
    await connectDB();
    await requireAdmin();

    const { searchParams } = new URL(request.url);
    const page = parseInt(searchParams.get('page')) || 1;
    const limit = parseInt(searchParams.get('limit')) || 20;
    const search = searchParams.get('search') || '';
    const skip = (page - 1) * limit;

    const accountQuery = {};
    if (search) {
      accountQuery.$or = [
        { businessName: { $regex: search, $options: 'i' } },
        { email: { $regex: search, $options: 'i' } },
      ];
    }

    const accounts = await Account.find(accountQuery)
      .select('businessName email phone createdAt')
      .skip(skip)
      .limit(limit)
      .lean();

    const merchantsWithSubscription = await Promise.all(
      accounts.map(async (account) => {
        const subscription = await Subscription.findOne({ merchantId: account._id })
          .select('planName status currentPeriodEnd')
          .lean();

        return {
          merchantId: account._id,
          businessName: account.businessName,
          email: account.email,
          joinedDate: account.createdAt,
          subscription: subscription || { planName: 'None', status: 'none' },
        };
      })
    );

    const total = await Account.countDocuments(accountQuery);

    return NextResponse.json({
      success: true,
      data: {
        merchants: merchantsWithSubscription,
        pagination: { page, limit, total, pages: Math.ceil(total / limit) },
      },
    });
  } catch (error) {
    return NextResponse.json(
      { success: false, error: error.message || 'Error fetching merchants' },
      { status: error.message?.includes('Unauthorized') ? 403 : 500 }
    );
  }
}
