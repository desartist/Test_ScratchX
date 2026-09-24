import mongoose from 'mongoose';
import LuckyDrawCampaign from '@/models/luckyDrawCampaignModel';
import LuckyDraw from '@/models/luckyDrawModel';
import LuckyDrawEntry from '@/models/luckyDrawEntryModel';

export const DAY = 24 * 60 * 60 * 1000;
export const newId = () => new mongoose.Types.ObjectId();

let phoneCounter = 0;
export function nextPhone() {
  phoneCounter += 1;
  return `9${String(phoneCounter).padStart(9, '0')}`;
}

export function campaignData(overrides = {}) {
  const now = Date.now();
  return {
    merchantId: newId(),
    name: 'Diwali Lucky Draw',
    description: '',
    assignedStores: [
      {
        storeId: newId(),
        storeName: 'Main Store',
        storeCode: 'MAIN1',
        address: '1 Market Road',
        city: 'Mumbai',
        state: 'Maharashtra',
        pincode: '400001',
        latitude: 19.076,
        longitude: 72.8777,
        status: 'active',
      },
    ],
    startDate: new Date(now - DAY),
    endDate: new Date(now + 30 * DAY),
    status: 'active',
    entryTiers: [
      { minAmount: 0, maxAmount: 1000, entriesGranted: 1 },
      { minAmount: 1000, maxAmount: null, entriesGranted: 3 },
    ],
    prizeTiers: [
      { rank: 1, prizeDescription: 'Smart TV', prizeValue: 30000 },
      { rank: 2, prizeDescription: 'Mixer Grinder', prizeValue: 3000 },
    ],
    maxEntriesPerCustomerPerPeriod: null,
    drawConfig: { scheduleType: 'end_of_campaign', triggerMode: 'automatic' },
    ...overrides,
  };
}

export function createCampaign(overrides = {}) {
  return LuckyDrawCampaign.create(campaignData(overrides));
}

export function createOpenDraw(campaign, overrides = {}) {
  return LuckyDraw.create({
    campaignId: campaign._id,
    periodStart: new Date(Date.now() - DAY),
    drawDate: new Date(Date.now() + 7 * DAY),
    status: 'scheduled',
    ...overrides,
  });
}

export function createEntry(campaign, draw, overrides = {}) {
  return LuckyDrawEntry.create({
    campaignId: campaign._id,
    drawId: draw._id,
    storeId: campaign.assignedStores[0].storeId,
    customerName: 'Asha Verma',
    customerPhone: nextPhone(),
    consent: true,
    billAmount: 1200,
    entriesGranted: 3,
    ...overrides,
  });
}
