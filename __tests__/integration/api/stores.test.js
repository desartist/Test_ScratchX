/**
 * Stores API Integration Tests
 * Tests CRUD operations, authorization, and inventory management for stores
 *
 * Since this is a Next.js App Router project, we test the service layer
 * which is used by the API routes, ensuring the business logic is correct.
 */

const StoreService = require('@/lib/storeService').default;
const Store = require('@/models/storeModel').default;
const Account = require('@/models/accountModel').default;
const ScratchCardTransaction = require('@/models/scratchCardTransactionModel').default;
const { ValidationError, NotFoundError, AuthorizationError } = require('@/lib/errors');
const { generateTestUser, generateAuthToken, getNextAuthHeaders } = require('@/__tests__/fixtures/auth.fixture');

describe('Stores API Integration Tests', () => {
  let testMerchant;
  let testMerchantId;
  let testUserId;
  let testStore;
  let testStoreId;

  beforeEach(async () => {
    // Create test merchant account
    const merchantUser = generateTestUser('Merchant', {
      email: `merchant-${Date.now()}@example.com`,
    });
    testMerchant = await Account.create(merchantUser);
    testMerchantId = testMerchant._id.toString();
    testUserId = testMerchant._id.toString();

    // Create test store
    const storeData = global.createMockStore(testMerchantId);
    testStore = await Store.create(storeData);
    testStoreId = testStore._id.toString();

    // Create transaction record for store creation
    await ScratchCardTransaction.create({
      merchant_id: testMerchantId,
      store_id: testStoreId,
      action_type: 'inventory_added',
      quantity: storeData.total_scratch_cards || 0,
      previous_balance: 0,
      new_balance: storeData.total_scratch_cards || 0,
      created_by: testUserId,
      remarks: `Store created: ${storeData.store_name}`,
      source_system: 'web_dashboard'
    });
  });

  // ==========================================
  // POST /api/stores - Create Store Tests
  // ==========================================

  describe('POST /api/stores - Create Store', () => {
    /**
     * Test 1: Create store with valid data -> should return 201 with created store
     */
    test('Create store with valid data -> should return 201 with created store', async () => {
      // Arrange
      const storeData = {
        store_name: 'New Premium Store',
        store_code: `ST${Date.now().toString().slice(-12)}`.substring(0, 20).toUpperCase(),
        address: '456 Commerce Street',
        city: 'Delhi',
        state: 'Delhi',
        pincode: '110001',
        contact_person: 'Rajesh Kumar',
        contact_number: '9876543210',
        location: {
          type: 'Point',
          coordinates: [77.2090, 28.6139] // Delhi coordinates
        },
        total_scratch_cards: 1000
      };

      // Act
      const createdStore = await StoreService.createStore(
        testMerchantId,
        storeData,
        testUserId
      );

      // Assert
      expect(createdStore).toBeDefined();
      expect(createdStore._id).toBeDefined();
      expect(createdStore.store_name).toBe(storeData.store_name);
      expect(createdStore.store_code).toBe(storeData.store_code.toUpperCase());
      expect(createdStore.merchant_id.toString()).toBe(testMerchantId);
      expect(createdStore.status).toBe('active');
      expect(createdStore.total_scratch_cards).toBe(1000);
      expect(createdStore.remaining_scratch_cards).toBe(1000);

      // Verify transaction was created
      const transaction = await ScratchCardTransaction.findOne({
        store_id: createdStore._id,
        action_type: 'inventory_added'
      });
      expect(transaction).toBeDefined();
      expect(transaction.quantity).toBe(1000);
    });

    /**
     * Test 2: Create without store_code field -> should return 400 with validation error
     */
    test('Create without store_code field -> should return 400 with validation error', async () => {
      // Arrange
      const storeData = {
        store_name: 'Invalid Store',
        // Missing store_code intentionally
        address: '456 Commerce Street',
        city: 'Delhi',
        state: 'Delhi',
        pincode: '110001',
        contact_person: 'Rajesh Kumar',
        contact_number: '9876543210',
      };

      // Act & Assert
      await expect(
        StoreService.createStore(testMerchantId, storeData, testUserId)
      ).rejects.toThrow(ValidationError);

      // Verify error message mentions store_code
      try {
        await StoreService.createStore(testMerchantId, storeData, testUserId);
      } catch (error) {
        expect(error.message).toContain('store_code');
      }
    });

    /**
     * Test 3: Create with invalid pincode (not 6 digits) -> should return 400
     */
    test('Create with invalid pincode (not 6 digits) -> should return 400', async () => {
      // Arrange
      const storeData = {
        store_name: 'Invalid Pincode Store',
        store_code: `ST${Date.now().toString().slice(-12)}`.substring(0, 20).toUpperCase(),
        address: '456 Commerce Street',
        city: 'Delhi',
        state: 'Delhi',
        pincode: '12345', // Only 5 digits - invalid
        contact_person: 'Rajesh Kumar',
        contact_number: '9876543210',
      };

      // Act & Assert
      let errorThrown = false;
      try {
        await StoreService.createStore(testMerchantId, storeData, testUserId);
      } catch (error) {
        errorThrown = true;
        expect(error.message).toContain('Pincode');
      }
      expect(errorThrown).toBe(true);
    });

    /**
     * Test 4: Create with non-existent merchant -> should return 404
     */
    test('Create with non-existent merchant -> should return 404', async () => {
      // Arrange
      const fakeMerchantId = global.generateTestId().toString();
      const storeData = global.createMockStore(fakeMerchantId);

      // Act & Assert
      await expect(
        StoreService.createStore(fakeMerchantId, storeData, testUserId)
      ).rejects.toThrow(NotFoundError);
    });

    /**
     * Test 5: Create with duplicate store_code -> should return 400
     */
    test('Create with duplicate store_code -> should return 400', async () => {
      // Arrange
      const duplicateCode = testStore.store_code;
      const storeData = {
        store_name: 'Duplicate Code Store',
        store_code: duplicateCode, // Same as existing store
        address: '456 Commerce Street',
        city: 'Delhi',
        state: 'Delhi',
        pincode: '110001',
        contact_person: 'Rajesh Kumar',
        contact_number: '9876543210',
      };

      // Act & Assert
      await expect(
        StoreService.createStore(testMerchantId, storeData, testUserId)
      ).rejects.toThrow(ValidationError);

      try {
        await StoreService.createStore(testMerchantId, storeData, testUserId);
      } catch (error) {
        expect(error.message).toContain('already exists');
      }
    });
  });

  // ==========================================
  // GET /api/stores - List Stores Tests
  // ==========================================

  describe('GET /api/stores - List Stores', () => {
    let additionalStore1;
    let additionalStore2;

    beforeEach(async () => {
      // Create additional test stores
      additionalStore1 = await Store.create(
        global.createMockStore(testMerchantId, {
          store_name: 'Store Mumbai',
          city: 'Mumbai',
          status: 'active'
        })
      );

      additionalStore2 = await Store.create(
        global.createMockStore(testMerchantId, {
          store_name: 'Store Bangalore Inactive',
          city: 'Bangalore',
          status: 'inactive'
        })
      );
    });

    /**
     * Test 6: List all stores for authenticated merchant -> should return 200 with stores
     */
    test('List all stores for merchant -> should return 200 with merchant\'s stores', async () => {
      // Act
      const result = await StoreService.getStoresByMerchant(testMerchantId);

      // Assert
      expect(result).toBeDefined();
      expect(result.stores).toBeDefined();
      expect(Array.isArray(result.stores)).toBe(true);
      expect(result.stores.length).toBeGreaterThanOrEqual(3); // testStore + additionalStore1 + additionalStore2
      expect(result.pagination).toBeDefined();
      expect(result.pagination.total).toBeGreaterThanOrEqual(3);
      expect(result.pagination.page).toBe(1);
      expect(result.pagination.limit).toBe(10);

      // Verify stores belong to merchant
      result.stores.forEach(store => {
        expect(store.merchant_id.toString()).toBe(testMerchantId);
      });
    });

    /**
     * Test 7: List with pagination (limit, skip) -> should respect query parameters
     */
    test('List with pagination (limit, skip) -> should respect query parameters', async () => {
      // Act - Get first page with limit 2
      const page1 = await StoreService.getStoresByMerchant(testMerchantId, {
        page: 1,
        limit: 2
      });

      // Act - Get second page with limit 2
      const page2 = await StoreService.getStoresByMerchant(testMerchantId, {
        page: 2,
        limit: 2
      });

      // Assert
      expect(page1.stores.length).toBeLessThanOrEqual(2);
      expect(page1.pagination.limit).toBe(2);
      expect(page1.pagination.page).toBe(1);

      // If there are more than 2 stores, page 2 should have different stores
      if (page1.pagination.total > 2) {
        expect(page2.stores.length).toBeGreaterThan(0);
        expect(page2.pagination.page).toBe(2);

        // Verify different stores on different pages
        const page1Ids = page1.stores.map(s => s._id.toString());
        const page2Ids = page2.stores.map(s => s._id.toString());
        const intersection = page1Ids.filter(id => page2Ids.includes(id));
        expect(intersection.length).toBe(0); // No overlap
      }
    });

    /**
     * Test 8: List with status filter -> should return only stores matching status
     */
    test('List with status filter -> should return only stores matching status', async () => {
      // Act - Filter by active status
      const activeResult = await StoreService.getStoresByMerchant(testMerchantId, {
        status: 'active'
      });

      // Act - Filter by inactive status
      const inactiveResult = await StoreService.getStoresByMerchant(testMerchantId, {
        status: 'inactive'
      });

      // Assert
      activeResult.stores.forEach(store => {
        expect(store.status).toBe('active');
      });

      inactiveResult.stores.forEach(store => {
        expect(store.status).toBe('inactive');
      });

      // We should have at least 1 inactive store
      expect(inactiveResult.stores.length).toBeGreaterThan(0);
    });
  });

  // ==========================================
  // GET /api/stores/:id - Get Store Tests
  // ==========================================

  describe('GET /api/stores/:id - Get Store', () => {
    /**
     * Test 9: Get existing store by ID -> should return 200 with store details
     */
    test('Get existing store by ID -> should return 200 with store details', async () => {
      // Act
      const store = await StoreService.getStoreById(testStoreId);

      // Assert
      expect(store).toBeDefined();
      expect(store._id.toString()).toBe(testStoreId);
      expect(store.store_name).toBe(testStore.store_name);
      expect(store.merchant_id.toString()).toBe(testMerchantId);
      expect(store.store_code).toBe(testStore.store_code);
      expect(store.city).toBe(testStore.city);
      expect(store.state).toBe(testStore.state);
      expect(store.pincode).toBe(testStore.pincode);
    });

    /**
     * Test 10: Get non-existent store -> should return 404 with "Store not found"
     */
    test('Get non-existent store -> should return 404 with "Store not found"', async () => {
      // Arrange
      const fakeStoreId = global.generateTestId().toString();

      // Act & Assert
      await expect(
        StoreService.getStoreById(fakeStoreId)
      ).rejects.toThrow(NotFoundError);

      try {
        await StoreService.getStoreById(fakeStoreId);
      } catch (error) {
        expect(error.message).toContain('Store not found');
      }
    });

    /**
     * Test 11: Get store with canManageStore check (ownership verification)
     */
    test('User can only access their own store (unless Super_Admin)', async () => {
      // Arrange - Create another merchant
      const otherMerchant = await Account.create(
        generateTestUser('Merchant', {
          email: `merchant-other-${Date.now()}@example.com`,
        })
      );

      // Act - Check if first merchant can manage own store
      const canManageOwn = await StoreService.canManageStore(
        testMerchantId,
        testStoreId,
        'Merchant'
      );

      // Act - Check if other merchant can manage first merchant's store
      const canManageOther = await StoreService.canManageStore(
        otherMerchant._id.toString(),
        testStoreId,
        'Merchant'
      );

      // Assert
      expect(canManageOwn).toBe(true);
      expect(canManageOther).toBe(false);
    });
  });

  // ==========================================
  // PATCH /api/stores/:id - Update Store Tests
  // ==========================================

  describe('PATCH /api/stores/:id - Update Store', () => {
    /**
     * Test 12: Update valid store fields (store_name, city, state) -> should return 200
     */
    test('Update valid store fields -> should return 200 with updated store', async () => {
      // Arrange
      const updateData = {
        store_name: 'Updated Store Name',
        city: 'New Delhi',
        state: 'Delhi'
      };

      // Act
      const updatedStore = await StoreService.updateStore(testStoreId, updateData, testUserId);

      // Assert
      expect(updatedStore).toBeDefined();
      expect(updatedStore.store_name).toBe(updateData.store_name);
      expect(updatedStore.city).toBe(updateData.city);
      expect(updatedStore.state).toBe(updateData.state);
      expect(updatedStore.store_code).toBe(testStore.store_code); // Unchanged

      // Verify in database
      const dbStore = await Store.findById(testStoreId);
      expect(dbStore.store_name).toBe(updateData.store_name);
      expect(dbStore.city).toBe(updateData.city);
    });

    /**
     * Test 13: Update with invalid pincode -> should return 400
     */
    test('Update with invalid pincode -> should return 400', async () => {
      // Arrange
      const updateData = {
        pincode: '123' // Only 3 digits - invalid
      };

      // Act & Assert
      let errorThrown = false;
      try {
        await StoreService.updateStore(testStoreId, updateData, testUserId);
      } catch (error) {
        errorThrown = true;
        expect(error.message).toContain('Pincode');
      }
      expect(errorThrown).toBe(true);
    });
  });

  // ==========================================
  // PATCH /api/stores/:id/inventory - Inventory Tests
  // ==========================================

  describe('PATCH /api/stores/:id/inventory - Inventory Management', () => {
    /**
     * Test 14: Add inventory to store -> should return 200, increment total, create transaction
     */
    test('Add inventory to store -> should return 200, increment total, create transaction', async () => {
      // Arrange
      const previousTotal = testStore.total_scratch_cards;
      const quantityToAdd = 500;

      // Act
      const result = await StoreService.updateStoreInventory(
        testStoreId,
        quantityToAdd,
        'inventory_added',
        testUserId,
        'Test inventory addition'
      );

      // Assert
      expect(result).toBeDefined();
      expect(result.store).toBeDefined();
      expect(result.transaction).toBeDefined();
      expect(result.store.total_scratch_cards).toBe(previousTotal + quantityToAdd);
      expect(result.store.remaining_scratch_cards).toBe(previousTotal + quantityToAdd);

      // Verify transaction was created
      expect(result.transaction.action_type).toBe('inventory_added');
      expect(result.transaction.quantity).toBe(quantityToAdd);
      expect(result.transaction.previous_balance).toBe(previousTotal);
      expect(result.transaction.new_balance).toBe(previousTotal + quantityToAdd);

      // Verify in database
      const updatedStore = await Store.findById(testStoreId);
      expect(updatedStore.total_scratch_cards).toBe(previousTotal + quantityToAdd);
    });

    /**
     * Test 15: Remove inventory with insufficient balance -> should return 400 with error
     */
    test('Remove inventory with insufficient balance -> should return 400 with "Insufficient inventory"', async () => {
      // Arrange
      const currentTotal = testStore.total_scratch_cards;
      const quantityToRemove = currentTotal + 100; // Try to remove more than available

      // Act & Assert
      await expect(
        StoreService.updateStoreInventory(
          testStoreId,
          quantityToRemove,
          'inventory_removed',
          testUserId
        )
      ).rejects.toThrow(ValidationError);

      try {
        await StoreService.updateStoreInventory(
          testStoreId,
          quantityToRemove,
          'inventory_removed',
          testUserId
        );
      } catch (error) {
        expect(error.message.toLowerCase()).toContain('cannot remove');
      }
    });
  });

  // ==========================================
  // Authorization Tests (Role-based access)
  // ==========================================

  describe('Authorization Tests', () => {
    /**
     * Additional test: Verify different roles can perform appropriate actions
     */
    test('Super_Admin can access any store, Merchant only their own', async () => {
      // Arrange - Create a Super_Admin user
      const superAdmin = await Account.create(
        generateTestUser('Super_Admin', {
          email: `admin-${Date.now()}@example.com`,
        })
      );

      // Act - Super_Admin can manage any store
      const canAdminManage = await StoreService.canManageStore(
        superAdmin._id.toString(),
        testStoreId,
        'Super_Admin'
      );

      // Assert
      expect(canAdminManage).toBe(true);
    });
  });
});
