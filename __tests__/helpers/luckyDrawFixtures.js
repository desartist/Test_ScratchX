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
    drawType: 'digital',
    minBillAmount: 0,
    prizeTiers: [
      { rank: 1, prizeDescription: 'Smart TV', prizeValue: 30000, quantity: 1 },
      { rank: 2, prizeDescription: 'Mixer Grinder', prizeValue: 3000, quantity: 1 },
    ],
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

let entrySeq = 100000; // far above any number entryService hands out, so fixture and service entries never collide in one campaign
export function createEntry(campaign, draw, overrides = {}) {
  entrySeq += 1;
  return LuckyDrawEntry.create({
    campaignId: campaign._id,
    drawId: draw._id,
    storeId: campaign.assignedStores[0].storeId,
    customerName: 'Asha Verma',
    customerPhone: nextPhone(),
    consent: true,
    billAmount: 1200,
    entriesGranted: 1,
    entryNumber: entrySeq,
    source: 'qr',
    ...overrides,
  });
}
