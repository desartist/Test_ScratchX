/**
 * GET /api/distributor/retailers/[retailerId] - Get retailer details
 * PATCH /api/distributor/retailers/[retailerId] - Update retailer
 * DELETE /api/distributor/retailers/[retailerId] - Delete retailer
 */

import { NextResponse } from 'next/server';
import { connectDB } from '@/lib/connectDB';
import { requireAuth } from '@/lib/auth';
import Account from '@/models/accountModel';
import { Types } from 'mongoose';

export async function GET(request, { params }) {
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

    const { retailerId } = params;

    if (!Types.ObjectId.isValid(retailerId)) {
      return NextResponse.json(
        { success: false, error: 'Invalid retailer ID' },
        { status: 400 }
      );
    }

    const retailer = await Account.findOne({
      _id: retailerId,
      distributorId: account._id,
      role: 'Retailer',
    }).lean();

    if (!retailer) {
      return NextResponse.json(
        { success: false, error: 'Retailer not found' },
        { status: 404 }
      );
    }

    return NextResponse.json(
      {
        success: true,
        data: retailer,
      },
      { status: 200 }
    );
  } catch (error) {
    console.error('[API] Error fetching retailer:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to fetch retailer' },
      { status: 500 }
    );
  }
}

export async function PATCH(request, { params }) {
  try {
    await connectDB();
    const { account, error: authError } = await requireAuth();
    if (authError) return authError;

    if (account.role !== 'Distributor') {
      return NextResponse.json(
        { success: false, error: 'Only distributors can update retailers' },
        { status: 403 }
      );
    }

    const { retailerId } = params;

    if (!Types.ObjectId.isValid(retailerId)) {
      return NextResponse.json(
        { success: false, error: 'Invalid retailer ID' },
        { status: 400 }
      );
    }

    const body = await request.json();
    const updatableFields = [
      'businessName',
      'name',
      'phone',
      'address',
      'city',
      'state',
      'pincode',
      'gstNumber',
      'status',
    ];

    const updateData = {};
    updatableFields.forEach((field) => {
      if (body[field] !== undefined) {
        updateData[field] = body[field];
      }
    });

    const retailer = await Account.findOneAndUpdate(
      {
        _id: retailerId,
        distributorId: account._id,
        role: 'Retailer',
      },
      updateData,
      { new: true, lean: true }
    );

    if (!retailer) {
      return NextResponse.json(
        { success: false, error: 'Retailer not found' },
        { status: 404 }
      );
    }

    return NextResponse.json(
      {
        success: true,
        message: 'Retailer updated successfully',
        data: retailer,
      },
      { status: 200 }
    );
  } catch (error) {
    console.error('[API] Error updating retailer:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to update retailer' },
      { status: 500 }
    );
  }
}

export async function DELETE(request, { params }) {
  try {
    await connectDB();
    const { account, error: authError } = await requireAuth();
    if (authError) return authError;

    if (account.role !== 'Distributor') {
      return NextResponse.json(
        { success: false, error: 'Only distributors can delete retailers' },
        { status: 403 }
      );
    }

    const { retailerId } = params;

    if (!Types.ObjectId.isValid(retailerId)) {
      return NextResponse.json(
        { success: false, error: 'Invalid retailer ID' },
        { status: 400 }
      );
    }

    const retailer = await Account.findOneAndDelete({
      _id: retailerId,
      distributorId: account._id,
      role: 'Retailer',
    });

    if (!retailer) {
      return NextResponse.json(
        { success: false, error: 'Retailer not found' },
        { status: 404 }
      );
    }

    return NextResponse.json(
      {
        success: true,
        message: 'Retailer deleted successfully',
      },
      { status: 200 }
    );
  } catch (error) {
    console.error('[API] Error deleting retailer:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to delete retailer' },
      { status: 500 }
    );
  }
}
