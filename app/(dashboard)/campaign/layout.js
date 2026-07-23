import React from 'react';
import { connectDB } from '@/lib/connectDB';
import { getLoginToken } from '@/lib/auth';
import Subscription from '@/models/subscriptionModel';
import SubscriptionRequired from '@/components/subscription/SubscriptionRequired';

export const dynamic = 'force-dynamic';

async function hasActiveSubscription(account) {
  if (!account) return false;

  const isManager = account.role === 'Manager';
  const ownerId = isManager ? account.parentId : account._id;
  const ownerType = account.role === 'Distributor' ? 'distributor' : 'merchant';

  const subscription = await Subscription.findOne({
    ownerId,
    ownerType,
    status: { $in: ['trial', 'active', 'past_due'] },
  }).select('_id');

  return Boolean(subscription);
}

export default async function CampaignLayout({ children }) {
  await connectDB();
  const account = await getLoginToken();
  const isActive = await hasActiveSubscription(account);

  if (!isActive) {
    return <SubscriptionRequired />;
  }

  return children;
}
