/**
 * GET /api/distributor/retailers - Get list of retailers
 * POST /api/distributor/retailers - Create new retailer
 */

import { NextResponse } from 'next/server';
import { connectDB } from '@/lib/connectDB';
import { requireAuth } from '@/lib/auth';
import Account from '@/models/accountModel';

export async function GET(request) {
  try {
    await connectDB();
    const { account, error: authError } = await requireAuth();
    if (authError) return authError;

    if (account.role !== 'Distributor') {
      return NextResponse.json(
        { success: false, error: 'Only distributors can access retailers' },
        { status: 403 }
      );
    }

    const { searchParams } = new URL(request.url);
    const page = parseInt(searchParams.get('page')) || 1;
    const limit = parseInt(searchParams.get('limit')) || 20;
    const search = searchParams.get('search') || '';
    const status = searchParams.get('status');

    const skip = (page - 1) * limit;

    // Build query
    const query = {
      distributorId: account._id,
      role: 'Retailer',
    };

    if (search) {
      query.$or = [
        { businessName: { $regex: search, $options: 'i' } },
        { email: { $regex: search, $options: 'i' } },
        { city: { $regex: search, $options: 'i' } },
      ];
    }

    if (status) {
      query.status = status;
    }

    // Fetch retailers with pagination
    const retailers = await Account.find(query)
      .select('businessName email phone city status activePlans totalSales commission _id')
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit)
      .lean();

    const total = await Account.countDocuments(query);

    // Calculate metrics
    const metrics = {
      total: await Account.countDocuments({ distributorId: account._id, role: 'Retailer' }),
      active: await Account.countDocuments({
        distributorId: account._id,
        role: 'Retailer',
        status: 'active',
      }),
      pending: await Account.countDocuments({
        distributorId: account._id,
        role: 'Retailer',
        status: 'pending',
      }),
      totalCommission: (
        await Account.aggregate([
          {
            $match: { distributorId: account._id, role: 'Retailer' },
          },
          {
            $group: { _id: null, total: { $sum: { $toDouble: '$commission' } } },
          },
        ])
      )[0]?.total || 0,
    };

    return NextResponse.json(
      {
        success: true,
        data: {
          retailers,
          metrics,
          pagination: {
            page,
            limit,
            total,
            pages: Math.ceil(total / limit),
          },
        },
      },
      { status: 200 }
    );
  } catch (error) {
    console.error('[API] Error fetching retailers:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to fetch retailers' },
      { status: 500 }
    );
  }
}

export async function POST(request) {
  try {
    await connectDB();
    const { account, error: authError } = await requireAuth();
    if (authError) return authError;

    if (account.role !== 'Distributor') {
      return NextResponse.json(
        { success: false, error: 'Only distributors can create retailers' },
        { status: 403 }
      );
    }

    const body = await request.json();
    const {
      businessName,
      ownerName,
      email,
      phone,
      address,
      city,
      state,
      pincode,
      gstNumber,
    } = body;

    if (!businessName || !email || !phone) {
      return NextResponse.json(
        { success: false, error: 'Missing required fields' },
        { status: 400 }
      );
    }

    // Check if email already exists
    const existing = await Account.findOne({ email });
    if (existing) {
      return NextResponse.json(
        { success: false, error: 'Email already exists' },
        { status: 400 }
      );
    }

    // Create retailer account
    const retailer = await Account.create({
      name: ownerName,
      businessName,
      email,
      phone,
      address,
      city,
      state,
      pincode,
      gstNumber,
      role: 'Retailer',
      distributorId: account._id,
      status: 'pending',
      isEmailVerified: false,
      isPhoneVerified: false,
    });

    return NextResponse.json(
      {
        success: true,
        message: 'Retailer created successfully',
        data: {
          retailerId: retailer._id,
          email: retailer.email,
          status: retailer.status,
        },
      },
      { status: 201 }
    );
  } catch (error) {
    console.error('[API] Error creating retailer:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to create retailer' },
      { status: 500 }
    );
  }
}
