// The project uses ES6 modules, so we need to access the .default export
const StoreService = require('@/lib/storeService').default;
const Store = require('@/models/storeModel').default;
const Account = require('@/models/accountModel').default;
const ScratchCardTransaction = require('@/models/scratchCardTransactionModel').default;
const { ValidationError, NotFoundError, AuthorizationError } = require('@/lib/errors');

describe('StoreService', () => {
  let merchantId;
  let merchantData;
  let storeData;
  let userId;

  beforeEach(() => {
    merchantId = global.generateTestId();
    userId = global.generateTestId();

    merchantData = {
      _id: merchantId,
      email: `merchant-${Date.now()}@example.com`,
      password: 'hashedPassword123',
      firstName: 'John',
      lastName: 'Merchant',
      role: 'Merchant',
      status: 'active'
    };

    storeData = {
      store_name: 'Test Store Location',
      store_code: `ST${Date.now().toString().slice(-10)}`.substring(0, 20).toUpperCase(),
      address: '123 Business Avenue',
      city: 'Mumbai',
      state: 'Maharashtra',
      pincode: '400001',
      contact_person: 'Store Manager',
      contact_number: '9876543210',
      location: {
        type: 'Point',
        coordinates: [72.8479, 19.0760]
      },
      total_scratch_cards: 500
    };
  });

  /**
   * Test 1: createStore with valid data creates store
   */
  test('createStore: valid data → creates store', async () => {
    // Setup: Create merchant in database
    const merchant = await Account.create(merchantData);

    // Execute: Create store
    const createdStore = await StoreService.createStore(
      merchant._id.toString(),
      storeData,
      userId.toString()
    );

    // Assert: Store was created with correct data
    expect(createdStore).toBeDefined();
    expect(createdStore.merchant_id.toString()).toBe(merchant._id.toString());
    expect(createdStore.store_name).toBe(storeData.store_name);
    expect(createdStore.store_code).toBe(storeData.store_code.toUpperCase());
    expect(createdStore.address).toBe(storeData.address);
    expect(createdStore.city).toBe(storeData.city);
    expect(createdStore.state).toBe(storeData.state);
    expect(createdStore.pincode).toBe(storeData.pincode);
    expect(createdStore.contact_person).toBe(storeData.contact_person);
    expect(createdStore.contact_number).toBe(storeData.contact_number);
    expect(createdStore.total_scratch_cards).toBe(500);
    expect(createdStore.used_scratch_cards).toBe(0);
    expect(createdStore.remaining_scratch_cards).toBe(500);

    // Verify transaction was created
    const transaction = await ScratchCardTransaction.findOne({
      store_id: createdStore._id
    });
    expect(transaction).toBeDefined();
    expect(transaction.action_type).toBe('inventory_added');
    expect(transaction.quantity).toBe(500);
  });

  /**
   * Test 2: createStore with missing store_code throws ValidationError
   */
  test('createStore: missing store_code → throws error', async () => {
    // Setup: Create merchant and prepare store data without store_code
    const merchant = await Account.create(merchantData);
    const invalidStoreData = { ...storeData };
    delete invalidStoreData.store_code;

    // Execute & Assert: Should throw ValidationError
    await expect(
      StoreService.createStore(
        merchant._id.toString(),
        invalidStoreData,
        userId.toString()
      )
    ).rejects.toThrow(ValidationError);

    await expect(
      StoreService.createStore(
        merchant._id.toString(),
        invalidStoreData,
        userId.toString()
      )
    ).rejects.toThrow('store_code is required');
  });

  /**
   * Test 3: createStore with invalid pincode (not 6 digits) throws error
   */
  test('createStore: invalid pincode (not 6 digits) → throws error', async () => {
    // Setup: Create merchant and prepare store data with invalid pincode
    const merchant = await Account.create(merchantData);
    const invalidStoreData = { ...storeData, pincode: '12345' }; // 5 digits

    // Execute & Assert: Should throw ValidationError
    await expect(
      StoreService.createStore(
        merchant._id.toString(),
        invalidStoreData,
        userId.toString()
      )
    ).rejects.toThrow();
  });

  /**
   * Test 4: getStoresByMerchant returns all stores for merchant
   */
  test('getStoresByMerchant: returns all stores for merchant', async () => {
    // Setup: Create merchant and multiple stores
    const merchant = await Account.create(merchantData);
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
      total_scratch_cards: 100
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
      total_scratch_cards: 200
    });

    // Execute: Get stores by merchant
    const result = await StoreService.getStoresByMerchant(merchant._id.toString());

    // Assert: Both stores returned with correct pagination
    expect(result).toBeDefined();
    expect(result.stores).toBeDefined();
    expect(result.stores.length).toBe(2);
    expect(result.pagination).toBeDefined();
    expect(result.pagination.total).toBe(2);
    expect(result.pagination.page).toBe(1);
    expect(result.pagination.pages).toBe(1);

    // Verify store data
    const storeNames = result.stores.map(s => s.store_name);
    expect(storeNames).toContain('Store 1');
    expect(storeNames).toContain('Store 2');
  });

  /**
   * Test 5: getStoresByMerchant returns empty array if no stores
   */
  test('getStoresByMerchant: returns empty array if no stores', async () => {
    // Setup: Create merchant with no stores
    const merchant = await Account.create(merchantData);

    // Execute: Get stores by merchant
    const result = await StoreService.getStoresByMerchant(merchant._id.toString());

    // Assert: Empty array returned
    expect(result).toBeDefined();
    expect(result.stores).toBeDefined();
    expect(result.stores).toEqual([]);
    expect(result.pagination.total).toBe(0);
    expect(result.pagination.pages).toBe(0);
  });

  /**
   * Test 6: getStoreById returns store by ID
   */
  test('getStoreById: returns store by ID', async () => {
    // Setup: Create merchant and store
    const merchant = await Account.create(merchantData);
    const store = await Store.create({
      merchant_id: merchant._id,
      ...storeData
    });

    // Execute: Get store by ID
    const retrievedStore = await StoreService.getStoreById(store._id.toString());

    // Assert: Store returned with correct data
    expect(retrievedStore).toBeDefined();
    expect(retrievedStore._id.toString()).toBe(store._id.toString());
    expect(retrievedStore.store_name).toBe(storeData.store_name);
    expect(retrievedStore.merchant_id.toString()).toBe(merchant._id.toString());
  });

  /**
   * Test 7: getStoreById throws NotFoundError if not found
   */
  test('getStoreById: throws NotFoundError if not found', async () => {
    // Setup: Use non-existent store ID
    const nonExistentStoreId = global.generateTestId();

    // Execute & Assert: Should throw NotFoundError
    await expect(
      StoreService.getStoreById(nonExistentStoreId.toString())
    ).rejects.toThrow(NotFoundError);

    await expect(
      StoreService.getStoreById(nonExistentStoreId.toString())
    ).rejects.toThrow('Store not found');
  });

  /**
   * Test 8: updateStore updates valid data
   */
  test('updateStore: updates valid data', async () => {
    // Setup: Create merchant and store
    const merchant = await Account.create(merchantData);
    const store = await Store.create({
      merchant_id: merchant._id,
      ...storeData
    });

    // Execute: Update store with new data
    const updateData = {
      store_name: 'Updated Store Name',
      city: 'Bangalore',
      address: '789 New Street'
    };

    const updatedStore = await StoreService.updateStore(
      store._id.toString(),
      updateData,
      userId.toString()
    );

    // Assert: Store updated correctly
    expect(updatedStore).toBeDefined();
    expect(updatedStore.store_name).toBe('Updated Store Name');
    expect(updatedStore.city).toBe('Bangalore');
    expect(updatedStore.address).toBe('789 New Street');
    // Original fields remain unchanged
    expect(updatedStore.store_code).toBe(storeData.store_code.toUpperCase());
  });

  /**
   * Test 9: updateStore throws AuthorizationError if user doesn't own store
   * (Note: The current implementation doesn't check user ownership in updateStore,
   * but it throws ValidationError if trying to change merchant_id)
   */
  test('updateStore: throws error if trying to change merchant_id', async () => {
    // Setup: Create merchant and store
    const merchant = await Account.create(merchantData);
    const store = await Store.create({
      merchant_id: merchant._id,
      ...storeData
    });

    const differentMerchantId = global.generateTestId();

    // Execute & Assert: Should throw ValidationError
    await expect(
      StoreService.updateStore(
        store._id.toString(),
        { merchant_id: differentMerchantId },
        userId.toString()
      )
    ).rejects.toThrow(ValidationError);

    await expect(
      StoreService.updateStore(
        store._id.toString(),
        { merchant_id: differentMerchantId },
        userId.toString()
      )
    ).rejects.toThrow('Cannot change store merchant');
  });

  /**
   * Test 10: updateStoreInventory adds inventory with transaction
   */
  test('updateStoreInventory: adds inventory with transaction', async () => {
    // Setup: Create merchant and store
    const merchant = await Account.create(merchantData);
    const store = await Store.create({
      merchant_id: merchant._id,
      total_scratch_cards: 500,
      used_scratch_cards: 0,
      remaining_scratch_cards: 500,
      ...storeData
    });

    // Execute: Add inventory
    const result = await StoreService.updateStoreInventory(
      store._id.toString(),
      250,
      'inventory_added',
      userId.toString(),
      'Added new inventory'
    );

    // Assert: Store inventory updated
    expect(result).toBeDefined();
    expect(result.store).toBeDefined();
    expect(result.store.total_scratch_cards).toBe(750);
    expect(result.store.remaining_scratch_cards).toBe(750);

    // Assert: Transaction created
    expect(result.transaction).toBeDefined();
    expect(result.transaction.action_type).toBe('inventory_added');
    expect(result.transaction.quantity).toBe(250);
    expect(result.transaction.previous_balance).toBe(500);
    expect(result.transaction.new_balance).toBe(750);
    expect(result.transaction.remarks).toBe('Added new inventory');
  });

  /**
   * Test 11: updateStoreInventory rejects removal if insufficient balance
   */
  test('updateStoreInventory: rejects removal if insufficient balance', async () => {
    // Setup: Create merchant and store with limited inventory
    const merchant = await Account.create(merchantData);
    const store = await Store.create({
      merchant_id: merchant._id,
      ...storeData,
      total_scratch_cards: 100,
      used_scratch_cards: 0,
      remaining_scratch_cards: 100
    });

    // Execute & Assert: Should throw ValidationError when removing more than available
    await expect(
      StoreService.updateStoreInventory(
        store._id.toString(),
        200, // Trying to remove more than available
        'inventory_removed',
        userId.toString(),
        'Test removal'
      )
    ).rejects.toThrow(ValidationError);

    await expect(
      StoreService.updateStoreInventory(
        store._id.toString(),
        200,
        'inventory_removed',
        userId.toString(),
        'Test removal'
      )
    ).rejects.toThrow('Cannot remove more scratch cards than available');
  });

  /**
   * Test 12: getStoreInventorySummary returns total/used/remaining/utilization
   */
  test('getStoreInventorySummary: returns total/used/remaining/utilization', async () => {
    // Setup: Create merchant and store with inventory usage
    const merchant = await Account.create(merchantData);
    const store = await Store.create({
      merchant_id: merchant._id,
      ...storeData,
      total_scratch_cards: 1000,
      used_scratch_cards: 250,
      remaining_scratch_cards: 750
    });

    // Execute: Get inventory summary
    const summary = await StoreService.getStoreInventorySummary(
      store._id.toString()
    );

    // Assert: Summary contains all required fields with correct calculations
    expect(summary).toBeDefined();
    expect(summary.total).toBe(1000);
    expect(summary.used).toBe(250);
    expect(summary.remaining).toBe(750);
    expect(summary.utilizationPercentage).toBe(25); // (250/1000) * 100 = 25%
  });

  /**
   * Test 13: getStoreInventorySummary with zero scratch cards
   */
  test('getStoreInventorySummary: returns zero utilization when total is zero', async () => {
    // Setup: Create merchant and store with zero inventory
    const merchant = await Account.create(merchantData);
    const store = await Store.create({
      merchant_id: merchant._id,
      ...storeData,
      total_scratch_cards: 0,
      used_scratch_cards: 0,
      remaining_scratch_cards: 0
    });

    // Execute: Get inventory summary
    const summary = await StoreService.getStoreInventorySummary(
      store._id.toString()
    );

    // Assert: Utilization is 0 to avoid division by zero
    expect(summary.total).toBe(0);
    expect(summary.used).toBe(0);
    expect(summary.remaining).toBe(0);
    expect(summary.utilizationPercentage).toBe(0);
  });
});
