const CampaignService = require('@/lib/campaignService').default;
const Campaign = require('@/models/campaignModel').default;
const CampaignStoreMapping = require('@/models/campaignStoreMappingModel').default;
const Store = require('@/models/storeModel').default;
const Account = require('@/models/accountModel').default;
const ScratchCardTransaction = require('@/models/scratchCardTransactionModel').default;
const { ValidationError, NotFoundError } = require('@/lib/errors');

describe('CampaignService', () => {
  let merchantId;
  let storeId;
  let campaignId;
  let userId;
  let merchantData;
  let storeData;
  let campaignData;

  beforeEach(() => {
    merchantId = global.generateTestId();
    storeId = global.generateTestId();
    campaignId = global.generateTestId();
    userId = global.generateTestId();

    merchantData = {
      _id: merchantId,
      email: `merchant-${Date.now()}@example.com`,
      password: 'hashedPassword123',
      firstName: 'John',
      lastName: 'Merchant',
      role: 'Merchant',
      status: 'active',
      total_scratch_cards: 10000,
      used_scratch_cards: 0,
      remaining_scratch_cards: 10000
    };

    storeData = {
      merchant_id: merchantId,
      store_name: 'Test Store',
      store_code: `ST${Date.now().toString().slice(-10)}`.substring(0, 20).toUpperCase(),
      address: '123 Business Ave',
      city: 'Mumbai',
      state: 'Maharashtra',
      pincode: '400001',
      contact_person: 'Manager',
      contact_number: '9876543210',
      location: {
        type: 'Point',
        coordinates: [72.8479, 19.0760]
      },
      total_scratch_cards: 1000,
      used_scratch_cards: 0,
      remaining_scratch_cards: 1000
    };

    const now = new Date();
    const futureDate = new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000); // 30 days from now

    campaignData = {
      campaignName: 'Test Campaign',
      description: 'Test campaign description',
      startDate: now,
      endDate: futureDate,
      status: 'active',
      allocated_scratch_cards: 1000,
      used_scratch_cards: 0,
      redeemed_scratch_cards: 0,
      remaining_scratch_cards: 1000
    };
  });

  /**
   * Test 1: createCampaign with valid data creates campaign
   */
  test('createCampaign: valid data → creates campaign', async () => {
    // Setup: Create merchant
    const merchant = await Account.create(merchantData);

    // Execute: Create campaign
    const created = await CampaignService.createCampaign(
      merchant._id.toString(),
      {
        campaignName: campaignData.campaignName,
        description: campaignData.description,
        startDate: campaignData.startDate,
        endDate: campaignData.endDate
      },
      userId.toString()
    );

    // Assert: Campaign created with correct data
    expect(created).toBeDefined();
    expect(created.merchantId.toString()).toBe(merchant._id.toString());
    expect(created.campaignName).toBe(campaignData.campaignName);
    expect(created.status).toBe('draft');
  });

  /**
   * Test 2: createCampaign with missing campaignName throws error
   */
  test('createCampaign: missing campaignName → throws error', async () => {
    // Setup: Create merchant
    const merchant = await Account.create(merchantData);

    // Execute & Assert: Should throw ValidationError
    await expect(
      CampaignService.createCampaign(
        merchant._id.toString(),
        {
          description: campaignData.description,
          startDate: campaignData.startDate,
          endDate: campaignData.endDate
        },
        userId.toString()
      )
    ).rejects.toThrow(ValidationError);
  });

  /**
   * Test 3: createCampaign with end_date before start_date throws error
   */
  test('createCampaign: end_date before start_date → throws error', async () => {
    // Setup: Create merchant
    const merchant = await Account.create(merchantData);
    const now = new Date();
    const pastDate = new Date(now.getTime() - 24 * 60 * 60 * 1000); // 1 day ago

    // Execute & Assert: Should throw ValidationError
    await expect(
      CampaignService.createCampaign(
        merchant._id.toString(),
        {
          campaignName: campaignData.campaignName,
          description: campaignData.description,
          startDate: now,
          endDate: pastDate
        },
        userId.toString()
      )
    ).rejects.toThrow(ValidationError);

    await expect(
      CampaignService.createCampaign(
        merchant._id.toString(),
        {
          campaignName: campaignData.campaignName,
          description: campaignData.description,
          startDate: now,
          endDate: pastDate
        },
        userId.toString()
      )
    ).rejects.toThrow('End date must be after start date');
  });

  /**
   * Test 4: assignCampaignToStores assigns to multiple stores returns array of mappings
   */
  test('assignCampaignToStores: assigns to multiple stores → returns array of mappings', async () => {
    // Setup: Create merchant, campaign, and stores
    const merchant = await Account.create(merchantData);
    const campaign = await Campaign.create({
      merchantId: merchant._id,
      ...campaignData
    });

    const store1 = await Store.create({
      merchant_id: merchant._id,
      store_name: 'Store 1',
      store_code: `ST${Date.now().toString().slice(-10)}1`,
      address: '123 Main St',
      city: 'Mumbai',
      state: 'Maharashtra',
      pincode: '400001',
      contact_person: 'Manager 1',
      contact_number: '9876543210',
      location: {
        type: 'Point',
        coordinates: [72.8479, 19.0760]
      },
      total_scratch_cards: 1000
    });

    const store2 = await Store.create({
      merchant_id: merchant._id,
      store_name: 'Store 2',
      store_code: `ST${Date.now().toString().slice(-10)}2`,
      address: '456 Second Ave',
      city: 'Bangalore',
      state: 'Karnataka',
      pincode: '560001',
      contact_person: 'Manager 2',
      contact_number: '9876543211',
      location: {
        type: 'Point',
        coordinates: [77.5941, 12.9716]
      },
      total_scratch_cards: 1000
    });

    // Execute: Assign campaign to stores
    const result = await CampaignService.assignCampaignToStores(
      campaign._id.toString(),
      [store1._id.toString(), store2._id.toString()],
      100,
      userId.toString()
    );

    // Assert: Both stores assigned successfully
    expect(result).toBeDefined();
    expect(result.successful).toHaveLength(2);
    expect(result.successful[0].allocated).toBe(100);
    expect(result.successful[1].allocated).toBe(100);
    expect(result.summary.success).toBe(2);
    expect(result.summary.failed).toBe(0);

    // Verify mappings were created
    const mapping1 = await CampaignStoreMapping.findOne({
      campaign_id: campaign._id,
      store_id: store1._id
    });
    expect(mapping1).toBeDefined();
    expect(mapping1.allocated_scratch_cards).toBe(100);
  });

  /**
   * Test 5: assignCampaignToStores campaign not found throws error
   */
  test('assignCampaignToStores: campaign not found → throws error', async () => {
    // Setup: Create stores but use non-existent campaign ID
    const nonExistentCampaignId = global.generateTestId();

    // Execute & Assert: Should throw NotFoundError
    await expect(
      CampaignService.assignCampaignToStores(
        nonExistentCampaignId.toString(),
        [storeId.toString()],
        100,
        userId.toString()
      )
    ).rejects.toThrow(NotFoundError);

    await expect(
      CampaignService.assignCampaignToStores(
        nonExistentCampaignId.toString(),
        [storeId.toString()],
        100,
        userId.toString()
      )
    ).rejects.toThrow('Campaign not found');
  });

  /**
   * Test 6: assignCampaignToStores exceeds inventory throws error
   */
  test('assignCampaignToStores: exceeds inventory → throws error', async () => {
    // Setup: Create merchant, campaign with limited inventory, and store
    const merchant = await Account.create(merchantData);
    const campaign = await Campaign.create({
      merchantId: merchant._id,
      ...campaignData,
      allocated_scratch_cards: 100, // Only 100 available
      remaining_scratch_cards: 100
    });

    const store = await Store.create({
      merchant_id: merchant._id,
      store_name: 'Store',
      store_code: `ST${Date.now().toString().slice(-10)}`,
      address: '123 Main St',
      city: 'Mumbai',
      state: 'Maharashtra',
      pincode: '400001',
      contact_person: 'Manager',
      contact_number: '9876543210',
      location: {
        type: 'Point',
        coordinates: [72.8479, 19.0760]
      },
      total_scratch_cards: 1000
    });

    // Execute & Assert: Should throw ValidationError
    await expect(
      CampaignService.assignCampaignToStores(
        campaign._id.toString(),
        [store._id.toString()],
        200, // Exceeds available
        userId.toString()
      )
    ).rejects.toThrow(ValidationError);

    await expect(
      CampaignService.assignCampaignToStores(
        campaign._id.toString(),
        [store._id.toString()],
        200,
        userId.toString()
      )
    ).rejects.toThrow('insufficient allocation');
  });

  /**
   * Test 7: getCampaignsByStore returns campaigns for store
   */
  test('getCampaignsByStore: returns campaigns for store', async () => {
    // Setup: Create merchant, campaigns, and store with allocations
    const merchant = await Account.create(merchantData);
    const store = await Store.create({
      merchant_id: merchant._id,
      store_name: 'Test Store',
      store_code: `ST${Date.now().toString().slice(-10)}`,
      address: '123 Main St',
      city: 'Mumbai',
      state: 'Maharashtra',
      pincode: '400001',
      contact_person: 'Manager',
      contact_number: '9876543210',
      location: {
        type: 'Point',
        coordinates: [72.8479, 19.0760]
      },
      total_scratch_cards: 1000
    });

    const campaign1 = await Campaign.create({
      merchantId: merchant._id,
      campaignName: 'Campaign 1',
      campaign_code: `CAMP${Date.now().toString().slice(-6)}1`,
      startDate: new Date(),
      endDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
      status: 'active'
    });

    const campaign2 = await Campaign.create({
      merchantId: merchant._id,
      campaignName: 'Campaign 2',
      campaign_code: `CAMP${Date.now().toString().slice(-6)}2`,
      startDate: new Date(),
      endDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
      status: 'active'
    });

    await CampaignStoreMapping.create({
      campaign_id: campaign1._id,
      store_id: store._id,
      merchant_id: merchant._id,
      allocation_by: userId,
      allocated_scratch_cards: 100,
      status: 'active'
    });

    await CampaignStoreMapping.create({
      campaign_id: campaign2._id,
      store_id: store._id,
      merchant_id: merchant._id,
      allocation_by: userId,
      allocated_scratch_cards: 200,
      status: 'active'
    });

    // Execute: Get campaigns for store
    const campaigns = await CampaignService.getCampaignsByStore(store._id.toString());

    // Assert: Both campaigns returned with allocations
    expect(campaigns).toBeDefined();
    expect(campaigns).toHaveLength(2);
    expect(campaigns[0].allocation).toBeDefined();
    expect(campaigns[0].allocation.allocated).toBe(100);
    expect(campaigns[1].allocation.allocated).toBe(200);
  });

  /**
   * Test 8: getCampaignsByStore no campaigns returns empty array
   */
  test('getCampaignsByStore: no campaigns → returns empty array', async () => {
    // Setup: Create merchant and store with no campaigns
    const merchant = await Account.create(merchantData);
    const store = await Store.create({
      merchant_id: merchant._id,
      store_name: 'Test Store',
      store_code: `ST${Date.now().toString().slice(-10)}`,
      address: '123 Main St',
      city: 'Mumbai',
      state: 'Maharashtra',
      pincode: '400001',
      contact_person: 'Manager',
      contact_number: '9876543210',
      location: {
        type: 'Point',
        coordinates: [72.8479, 19.0760]
      },
      total_scratch_cards: 1000
    });

    // Execute: Get campaigns for store
    const campaigns = await CampaignService.getCampaignsByStore(store._id.toString());

    // Assert: Empty array returned
    expect(campaigns).toBeDefined();
    expect(campaigns).toEqual([]);
  });

  /**
   * Test 9: getCampaignInventorySummary calculates utilization correctly
   */
  test('getCampaignInventorySummary: calculates utilization correctly', async () => {
    // Setup: Create merchant and campaign with inventory usage
    const merchant = await Account.create(merchantData);
    const campaign = await Campaign.create({
      merchantId: merchant._id,
      campaignName: campaignData.campaignName,
      campaign_code: `CAMP${Date.now().toString().slice(-8)}`,
      startDate: new Date(),
      endDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
      status: 'active',
      allocated_scratch_cards: 1000,
      used_scratch_cards: 250,
      redeemed_scratch_cards: 100,
      remaining_scratch_cards: 650
    });

    // Execute: Get inventory summary
    const summary = await CampaignService.getCampaignInventorySummary(campaign._id.toString());

    // Assert: Summary with correct utilization percentage
    expect(summary).toBeDefined();
    expect(summary.campaign).toBeDefined();
    expect(summary.inventory).toBeDefined();
    expect(summary.inventory.total_allocated).toBe(1000);
    expect(summary.inventory.total_used).toBe(250);
    expect(summary.inventory.total_redeemed).toBe(100);
    expect(summary.inventory.total_remaining).toBe(650);
    expect(summary.inventory.utilization_percentage).toBe(25); // (250 / 1000) * 100
  });

  /**
   * Test 10: getCampaignInventoryStatus returns store breakdown
   */
  test('getCampaignInventoryStatus: returns store breakdown', async () => {
    // Setup: Create merchant, campaign, and stores with mappings
    const merchant = await Account.create(merchantData);
    const campaign = await Campaign.create({
      merchantId: merchant._id,
      campaignName: campaignData.campaignName,
      campaign_code: `CAMP${Date.now().toString().slice(-8)}`,
      startDate: new Date(),
      endDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
      status: 'active',
      allocated_scratch_cards: 500,
      used_scratch_cards: 100,
      redeemed_scratch_cards: 50,
      remaining_scratch_cards: 350
    });

    const store1 = await Store.create({
      merchant_id: merchant._id,
      store_name: 'Store 1',
      store_code: `ST${Date.now().toString().slice(-10)}1`,
      address: '123 Main St',
      city: 'Mumbai',
      state: 'Maharashtra',
      pincode: '400001',
      contact_person: 'Manager',
      contact_number: '9876543210',
      location: {
        type: 'Point',
        coordinates: [72.8479, 19.0760]
      },
      total_scratch_cards: 1000
    });

    const store2 = await Store.create({
      merchant_id: merchant._id,
      store_name: 'Store 2',
      store_code: `ST${Date.now().toString().slice(-10)}2`,
      address: '456 Second Ave',
      city: 'Bangalore',
      state: 'Karnataka',
      pincode: '560001',
      contact_person: 'Manager',
      contact_number: '9876543211',
      location: {
        type: 'Point',
        coordinates: [77.5941, 12.9716]
      },
      total_scratch_cards: 1000
    });

    await CampaignStoreMapping.create({
      campaign_id: campaign._id,
      store_id: store1._id,
      merchant_id: merchant._id,
      allocation_by: userId,
      allocated_scratch_cards: 300,
      used_scratch_cards: 50,
      redeemed_scratch_cards: 25,
      remaining_scratch_cards: 225,
      status: 'active'
    });

    await CampaignStoreMapping.create({
      campaign_id: campaign._id,
      store_id: store2._id,
      merchant_id: merchant._id,
      allocation_by: userId,
      allocated_scratch_cards: 200,
      used_scratch_cards: 50,
      redeemed_scratch_cards: 25,
      remaining_scratch_cards: 125,
      status: 'active'
    });

    // Execute: Get inventory status
    const status = await CampaignService.getCampaignInventorySummary(campaign._id.toString());

    // Assert: Returns campaign and store breakdown
    expect(status).toBeDefined();
    expect(status.campaign).toBeDefined();
    expect(status.inventory).toBeDefined();
    expect(status.store_count).toBe(2);
  });
});
