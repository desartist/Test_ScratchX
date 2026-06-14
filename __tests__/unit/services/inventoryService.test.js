const InventoryService = require('@/lib/inventoryService').default;
const Campaign = require('@/models/campaignModel').default;
const CampaignStoreMapping = require('@/models/campaignStoreMappingModel').default;
const Store = require('@/models/storeModel').default;
const Account = require('@/models/accountModel').default;
const ScratchCardTransaction = require('@/models/scratchCardTransactionModel').default;
const { ValidationError, NotFoundError } = require('@/lib/errors');

describe('InventoryService', () => {
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
    const futureDate = new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000);

    campaignData = {
      merchantId,
      campaignName: 'Test Campaign',
      campaign_code: `CAMP${Date.now().toString().slice(-8)}`,
      startDate: now,
      endDate: futureDate,
      status: 'active',
      allocated_scratch_cards: 0,
      used_scratch_cards: 0,
      redeemed_scratch_cards: 0,
      remaining_scratch_cards: 0
    };
  });

  /**
   * Test 1: allocateToCampaign valid allocation creates transaction
   */
  test('allocateToCampaign: valid allocation → creates transaction', async () => {
    // Setup: Create merchant and campaign
    const merchant = await Account.create(merchantData);
    const campaign = await Campaign.create(campaignData);

    // Execute: Allocate inventory to campaign
    const result = await InventoryService.allocateToCampaign(
      merchant._id.toString(),
      campaign._id.toString(),
      500,
      userId.toString()
    );

    // Assert: Campaign updated with allocation
    expect(result).toBeDefined();
    expect(result.campaign).toBeDefined();
    expect(result.campaign.allocated_scratch_cards).toBe(500);
    expect(result.campaign.remaining_scratch_cards).toBe(500);
    expect(result.transaction).toBeDefined();
    expect(result.transaction.action_type).toBe('allocated_to_campaign');
    expect(result.transaction.quantity).toBe(500);
  });

  /**
   * Test 2: allocateToCampaign invalid quantity throws error
   */
  test('allocateToCampaign: invalid quantity → throws error', async () => {
    // Setup: Create merchant and campaign
    const merchant = await Account.create(merchantData);
    const campaign = await Campaign.create(campaignData);

    // Execute & Assert: Should throw ValidationError for zero or negative quantity
    await expect(
      InventoryService.allocateToCampaign(
        merchant._id.toString(),
        campaign._id.toString(),
        0, // Invalid quantity
        userId.toString()
      )
    ).rejects.toThrow(ValidationError);

    await expect(
      InventoryService.allocateToCampaign(
        merchant._id.toString(),
        campaign._id.toString(),
        -100, // Negative quantity
        userId.toString()
      )
    ).rejects.toThrow('must be greater than 0');
  });

  /**
   * Test 3: allocateToStore from campaign to store updates inventory
   */
  test('allocateToStore: from campaign to store → updates inventory', async () => {
    // Setup: Create merchant, campaign, and store
    const merchant = await Account.create(merchantData);
    const store = await Store.create({ merchant_id: merchant._id, ...storeData });
    const campaign = await Campaign.create({
      ...campaignData,
      allocated_scratch_cards: 1000,
      remaining_scratch_cards: 1000
    });

    // Execute: Allocate from campaign to store
    const result = await InventoryService.allocateToStore(
      merchant._id.toString(),
      campaign._id.toString(),
      store._id.toString(),
      300,
      userId.toString()
    );

    // Assert: New mapping created with allocation
    expect(result).toBeDefined();
    expect(result.mapping).toBeDefined();
    expect(result.mapping.allocated_scratch_cards).toBe(300);
    expect(result.isNew).toBe(true);
    expect(result.transaction).toBeDefined();
    expect(result.transaction.action_type).toBe('allocated_to_store');
  });

  /**
   * Test 4: allocateToStore exceeds allocation throws error
   */
  test('allocateToStore: exceeds allocation → throws error', async () => {
    // Setup: Create merchant, campaign with limited allocation, and store
    const merchant = await Account.create(merchantData);
    const store = await Store.create({ merchant_id: merchant._id, ...storeData });
    const campaign = await Campaign.create({
      ...campaignData,
      allocated_scratch_cards: 100,
      remaining_scratch_cards: 100
    });

    // Execute & Assert: Should throw ValidationError
    await expect(
      InventoryService.allocateToStore(
        merchant._id.toString(),
        campaign._id.toString(),
        store._id.toString(),
        500, // Exceeds campaign allocation
        userId.toString()
      )
    ).rejects.toThrow(ValidationError);

    await expect(
      InventoryService.allocateToStore(
        merchant._id.toString(),
        campaign._id.toString(),
        store._id.toString(),
        500,
        userId.toString()
      )
    ).rejects.toThrow('insufficient allocation');
  });

  /**
   * Test 5: getCampaignInventoryStatus returns status with utilization
   */
  test('getCampaignInventoryStatus: returns status with utilization', async () => {
    // Setup: Create merchant, campaign, stores, and mappings
    const merchant = await Account.create(merchantData);
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

    const campaign = await Campaign.create({
      ...campaignData,
      allocated_scratch_cards: 600,
      used_scratch_cards: 150,
      redeemed_scratch_cards: 50,
      remaining_scratch_cards: 400
    });

    await CampaignStoreMapping.create({
      campaign_id: campaign._id,
      store_id: store1._id,
      merchant_id: merchant._id,
      allocation_by: userId,
      allocated_scratch_cards: 300,
      used_scratch_cards: 75,
      redeemed_scratch_cards: 25,
      remaining_scratch_cards: 200,
      status: 'active'
    });

    await CampaignStoreMapping.create({
      campaign_id: campaign._id,
      store_id: store2._id,
      merchant_id: merchant._id,
      allocation_by: userId,
      allocated_scratch_cards: 300,
      used_scratch_cards: 75,
      redeemed_scratch_cards: 25,
      remaining_scratch_cards: 200,
      status: 'active'
    });

    // Execute: Get inventory status
    const status = await InventoryService.getCampaignInventoryStatus(
      campaign._id.toString()
    );

    // Assert: Status with utilization percentage
    expect(status).toBeDefined();
    expect(status.campaign).toBeDefined();
    expect(status.allocation).toBeDefined();
    expect(status.allocation.total).toBe(600);
    expect(status.allocation.used).toBe(150);
    expect(status.allocation.utilizationPercentage).toBe(25); // (150 / 600) * 100
    expect(status.storeAllocations).toHaveLength(2);
  });

  /**
   * Test 6: getCampaignInventoryStatus zero inventory handles safely
   */
  test('getCampaignInventoryStatus: zero inventory → handles safely', async () => {
    // Setup: Create merchant and campaign with zero allocation
    const merchant = await Account.create(merchantData);
    const campaign = await Campaign.create({
      ...campaignData,
      allocated_scratch_cards: 0,
      used_scratch_cards: 0,
      redeemed_scratch_cards: 0,
      remaining_scratch_cards: 0
    });

    // Execute: Get inventory status
    const status = await InventoryService.getCampaignInventoryStatus(
      campaign._id.toString()
    );

    // Assert: Zero utilization without division error
    expect(status).toBeDefined();
    expect(status.allocation.total).toBe(0);
    expect(status.allocation.utilizationPercentage).toBe(0);
    expect(status.storeAllocations).toEqual([]);
  });

  /**
   * Test 7: getStoreInventoryStatus returns store stats
   */
  test('getStoreInventoryStatus: returns store stats', async () => {
    // Setup: Create merchant, campaigns, store, and mappings
    const merchant = await Account.create(merchantData);
    const store = await Store.create({
      merchant_id: merchant._id,
      ...storeData,
      total_scratch_cards: 1000,
      used_scratch_cards: 200,
      remaining_scratch_cards: 800
    });

    const campaign1 = await Campaign.create({
      ...campaignData,
      campaignName: 'Campaign 1',
      campaign_code: `CAMP${Date.now().toString().slice(-6)}1`,
      allocated_scratch_cards: 500
    });

    const campaign2 = await Campaign.create({
      ...campaignData,
      campaignName: 'Campaign 2',
      campaign_code: `CAMP${Date.now().toString().slice(-6)}2`,
      allocated_scratch_cards: 300
    });

    await CampaignStoreMapping.create({
      campaign_id: campaign1._id,
      store_id: store._id,
      merchant_id: merchant._id,
      allocation_by: userId,
      allocated_scratch_cards: 500,
      used_scratch_cards: 100,
      redeemed_scratch_cards: 50,
      remaining_scratch_cards: 350,
      status: 'active'
    });

    await CampaignStoreMapping.create({
      campaign_id: campaign2._id,
      store_id: store._id,
      merchant_id: merchant._id,
      allocation_by: userId,
      allocated_scratch_cards: 300,
      used_scratch_cards: 100,
      redeemed_scratch_cards: 0,
      remaining_scratch_cards: 200,
      status: 'active'
    });

    // Execute: Get store inventory status
    const status = await InventoryService.getStoreInventoryStatus(
      store._id.toString()
    );

    // Assert: Store status with campaign breakdown
    expect(status).toBeDefined();
    expect(status.store).toBeDefined();
    expect(status.store.name).toBe(storeData.store_name);
    expect(status.inventory).toBeDefined();
    expect(status.inventory.total).toBe(1000);
    expect(status.inventory.allocated).toBe(800);
    expect(status.inventory.used).toBe(200);
    expect(status.campaignAllocations).toHaveLength(2);
  });

  /**
   * Test 8: getStoreInventoryStatus zero inventory returns 0%
   */
  test('getStoreInventoryStatus: zero inventory → returns 0%', async () => {
    // Setup: Create merchant and store with zero inventory
    const merchant = await Account.create(merchantData);
    const store = await Store.create({
      merchant_id: merchant._id,
      ...storeData,
      total_scratch_cards: 0,
      used_scratch_cards: 0,
      remaining_scratch_cards: 0
    });

    // Execute: Get store inventory status
    const status = await InventoryService.getStoreInventoryStatus(
      store._id.toString()
    );

    // Assert: Zero utilization without division error
    expect(status).toBeDefined();
    expect(status.inventory.total).toBe(0);
    expect(status.inventory.utilizationPercentage).toBe(0);
    expect(status.campaignAllocations).toEqual([]);
  });

  /**
   * Test 9: getAllocationHistory returns filtered history
   */
  test('getAllocationHistory: returns filtered history', async () => {
    // Setup: Create merchant, campaign, store, and allocation transactions
    const merchant = await Account.create(merchantData);
    const store = await Store.create({ merchant_id: merchant._id, ...storeData });
    const campaign = await Campaign.create(campaignData);
    const mapping = await CampaignStoreMapping.create({
      campaign_id: campaign._id,
      store_id: store._id,
      merchant_id: merchant._id,
      allocation_by: userId,
      allocated_scratch_cards: 500,
      status: 'active'
    });

    // Create allocation transactions
    await ScratchCardTransaction.create({
      merchant_id: merchant._id,
      campaign_id: campaign._id,
      store_id: store._id,
      campaign_store_mapping_id: mapping._id,
      action_type: 'allocated_to_campaign',
      quantity: 500,
      previous_balance: 0,
      new_balance: 500,
      created_by: userId,
      remarks: 'Allocated to campaign'
    });

    await ScratchCardTransaction.create({
      merchant_id: merchant._id,
      campaign_id: campaign._id,
      store_id: store._id,
      campaign_store_mapping_id: mapping._id,
      action_type: 'allocated_to_store',
      quantity: 500,
      previous_balance: 0,
      new_balance: 500,
      created_by: userId,
      remarks: 'Allocated to store'
    });

    // Execute: Get allocation history
    const history = await InventoryService.getAllocationHistory(
      merchant._id.toString()
    );

    // Assert: History returned with allocations
    expect(history).toBeDefined();
    expect(history.length).toBeGreaterThanOrEqual(2);
    const allocationTypes = history.map(t => t.action_type);
    expect(allocationTypes).toContain('allocated_to_campaign');
    expect(allocationTypes).toContain('allocated_to_store');
  });

  /**
   * Test 10: getAllocationHistory action filter returns matching records
   */
  test('getAllocationHistory: action filter → returns matching records', async () => {
    // Setup: Create merchant, campaign, store, and multiple transaction types
    const merchant = await Account.create(merchantData);
    const store = await Store.create({ merchant_id: merchant._id, ...storeData });
    const campaign = await Campaign.create(campaignData);
    const mapping = await CampaignStoreMapping.create({
      campaign_id: campaign._id,
      store_id: store._id,
      merchant_id: merchant._id,
      allocation_by: userId,
      allocated_scratch_cards: 500,
      status: 'active'
    });

    // Create multiple allocation transactions
    for (let i = 0; i < 3; i++) {
      await ScratchCardTransaction.create({
        merchant_id: merchant._id,
        campaign_id: campaign._id,
        store_id: store._id,
        campaign_store_mapping_id: mapping._id,
        action_type: 'allocated_to_campaign',
        quantity: 100,
        created_by: userId
      });
    }

    for (let i = 0; i < 2; i++) {
      await ScratchCardTransaction.create({
        merchant_id: merchant._id,
        campaign_id: campaign._id,
        store_id: store._id,
        campaign_store_mapping_id: mapping._id,
        action_type: 'allocated_to_store',
        quantity: 100,
        created_by: userId
      });
    }

    // Execute: Get allocation history for this merchant
    const history = await InventoryService.getAllocationHistory(
      merchant._id.toString()
    );

    // Assert: History contains allocation records
    expect(history).toBeDefined();
    expect(Array.isArray(history)).toBe(true);
    expect(history.length).toBeGreaterThanOrEqual(5);

    // Verify allocation action types are present
    const actionTypes = history.map(t => t.action_type);
    expect(actionTypes).toContain('allocated_to_campaign');
    expect(actionTypes).toContain('allocated_to_store');
  });
});
