const mongoose = require('mongoose');

describe('Test Infrastructure Setup', () => {
  test('mongoose connection should be ready', () => {
    expect(mongoose.connection.readyState).toBe(1);
  });

  test('global.generateTestId should be available and return ObjectId', () => {
    expect(typeof global.generateTestId).toBe('function');
    const id = global.generateTestId();
    expect(mongoose.Types.ObjectId.isValid(id)).toBe(true);
  });

  test('global.createMockUser should be available and return user object', () => {
    expect(typeof global.createMockUser).toBe('function');
    const user = global.createMockUser();

    expect(user).toHaveProperty('_id');
    expect(user).toHaveProperty('email');
    expect(user).toHaveProperty('password');
    expect(user).toHaveProperty('firstName', 'John');
    expect(user).toHaveProperty('lastName', 'Doe');
    expect(user).toHaveProperty('role', 'Merchant');
    expect(user).toHaveProperty('merchantId');
    expect(user).toHaveProperty('status', 'active');
    expect(mongoose.Types.ObjectId.isValid(user._id)).toBe(true);
    expect(mongoose.Types.ObjectId.isValid(user.merchantId)).toBe(true);
  });

  test('global.createMockUser should accept overrides', () => {
    const customUser = global.createMockUser({
      firstName: 'Jane',
      role: 'Admin',
      email: 'custom@example.com'
    });

    expect(customUser.firstName).toBe('Jane');
    expect(customUser.role).toBe('Admin');
    expect(customUser.email).toBe('custom@example.com');
    expect(customUser.lastName).toBe('Doe'); // default value
  });

  test('global.createMockMerchant should be available and return merchant object', () => {
    expect(typeof global.createMockMerchant).toBe('function');
    const merchant = global.createMockMerchant();

    expect(merchant).toHaveProperty('_id');
    expect(merchant).toHaveProperty('yourName');
    expect(merchant).toHaveProperty('email');
    expect(merchant).toHaveProperty('gst_number');
    expect(merchant).toHaveProperty('business_name');
    expect(merchant).toHaveProperty('contact_number');
    expect(merchant).toHaveProperty('status', 'active');
    expect(merchant).toHaveProperty('total_scratch_cards', 1000);
    expect(merchant).toHaveProperty('used_scratch_cards', 0);
    expect(merchant).toHaveProperty('remaining_scratch_cards', 1000);
    expect(mongoose.Types.ObjectId.isValid(merchant._id)).toBe(true);
  });

  test('global.createMockMerchant should accept overrides', () => {
    const customMerchant = global.createMockMerchant({
      business_name: 'Custom Business',
      total_scratch_cards: 500
    });

    expect(customMerchant.business_name).toBe('Custom Business');
    expect(customMerchant.total_scratch_cards).toBe(500);
    expect(customMerchant.status).toBe('active'); // default value
  });

  test('global.createMockStore should be available and return store object', () => {
    expect(typeof global.createMockStore).toBe('function');
    const merchantId = global.generateTestId();
    const store = global.createMockStore(merchantId);

    expect(store).toHaveProperty('_id');
    expect(store).toHaveProperty('merchant_id', merchantId);
    expect(store).toHaveProperty('store_name');
    expect(store).toHaveProperty('store_code');
    expect(store).toHaveProperty('address');
    expect(store).toHaveProperty('city');
    expect(store).toHaveProperty('state');
    expect(store).toHaveProperty('pincode');
    expect(store).toHaveProperty('contact_person');
    expect(store).toHaveProperty('contact_number');
    expect(store).toHaveProperty('status', 'active');
    expect(store).toHaveProperty('total_scratch_cards', 500);
    expect(store).toHaveProperty('used_scratch_cards', 0);
    expect(store).toHaveProperty('remaining_scratch_cards', 500);
    expect(mongoose.Types.ObjectId.isValid(store._id)).toBe(true);
  });

  test('global.createMockStore should accept null merchantId and generate new one', () => {
    const store = global.createMockStore();
    expect(mongoose.Types.ObjectId.isValid(store.merchant_id)).toBe(true);
  });

  test('global.createMockStore should accept overrides', () => {
    const customStore = global.createMockStore(null, {
      city: 'Bangalore',
      total_scratch_cards: 250
    });

    expect(customStore.city).toBe('Bangalore');
    expect(customStore.total_scratch_cards).toBe(250);
    expect(customStore.status).toBe('active'); // default value
  });

  test('global.createMockCampaign should be available and return campaign object', () => {
    expect(typeof global.createMockCampaign).toBe('function');
    const merchantId = global.generateTestId();
    const campaign = global.createMockCampaign(merchantId);

    expect(campaign).toHaveProperty('_id');
    expect(campaign).toHaveProperty('merchantId', merchantId);
    expect(campaign).toHaveProperty('campaignName');
    expect(campaign).toHaveProperty('campaign_code');
    expect(campaign).toHaveProperty('startDate');
    expect(campaign).toHaveProperty('endDate');
    expect(campaign).toHaveProperty('status', 'active');
    expect(campaign).toHaveProperty('allocated_scratch_cards', 1000);
    expect(campaign).toHaveProperty('used_scratch_cards', 0);
    expect(campaign).toHaveProperty('redeemed_scratch_cards', 0);
    expect(campaign).toHaveProperty('remaining_scratch_cards', 1000);
    expect(campaign).toHaveProperty('tracking');
    expect(mongoose.Types.ObjectId.isValid(campaign._id)).toBe(true);
  });

  test('global.createMockCampaign should accept null merchantId and generate new one', () => {
    const campaign = global.createMockCampaign();
    expect(mongoose.Types.ObjectId.isValid(campaign.merchantId)).toBe(true);
  });

  test('global.createMockCampaign should accept overrides', () => {
    const customCampaign = global.createMockCampaign(null, {
      campaignName: 'Custom Campaign',
      allocated_scratch_cards: 500
    });

    expect(customCampaign.campaignName).toBe('Custom Campaign');
    expect(customCampaign.allocated_scratch_cards).toBe(500);
    expect(customCampaign.status).toBe('active'); // default value
  });

  test('mock objects should have proper date objects for campaign dates', () => {
    const campaign = global.createMockCampaign();
    expect(campaign.startDate).toBeInstanceOf(Date);
    expect(campaign.endDate).toBeInstanceOf(Date);
    expect(campaign.endDate.getTime()).toBeGreaterThan(campaign.startDate.getTime());
  });
});
