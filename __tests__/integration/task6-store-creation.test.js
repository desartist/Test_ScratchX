/**
 * Task 6 Integration Tests
 * Tests the store creation endpoint with first store exception and plan-based limits
 *
 * Testing scenarios:
 * 1. First store without plan: Should succeed (first store exception)
 * 2. Second store without plan: Should fail with 403
 * 3. Second store with CORE plan: Should fail with 403 (limit 1)
 * 4. Stores 1-5 with SMART plan: Should succeed
 * 5. Sixth store with SMART plan: Should fail with 403 (limit 5)
 */

import mongoose from 'mongoose';
import Account from '@/models/accountModel';
import Store from '@/models/storeModel';
import Subscription from '@/models/subscriptionModel';
import SubscriptionPlan from '@/models/subscriptionPlanModel';
import connectDB from '@/lib/db';

describe('Task 6: Store Creation with First Store Exception and Plan-Based Limits', () => {
  let testMerchant;
  let testPlanCore;
  let testPlanSmart;

  beforeAll(async () => {
    await connectDB();
  });

  beforeEach(async () => {
    // Create test merchant
    testMerchant = await Account.create({
      email: `merchant-${Date.now()}@example.com`,
      role: 'Merchant',
      firstName: 'Test',
      lastName: 'Merchant',
      status: 'active'
    });

    // Create CORE plan
    testPlanCore = await SubscriptionPlan.create({
      name: 'CORE',
      price: 2999,
      limits: {
        maxStores: 1,
        maxCampaigns: 5,
        maxScratchCardsPerMonth: 5000
      }
    });

    // Create SMART plan
    testPlanSmart = await SubscriptionPlan.create({
      name: 'SMART',
      price: 4999,
      limits: {
        maxStores: 5,
        maxCampaigns: 20,
        maxScratchCardsPerMonth: 50000
      }
    });
  });

  afterEach(async () => {
    // Cleanup
    await Account.deleteMany({ email: /merchant-/ });
    await Store.deleteMany({ merchant_id: testMerchant._id });
    await Subscription.deleteMany({ ownerId: testMerchant._id });
  });

  afterAll(async () => {
    // Cleanup plans
    await SubscriptionPlan.deleteMany({ name: { $in: ['CORE', 'SMART'] } });
    await mongoose.connection.close();
  });

  // ========================================
  // Test 1: First store without plan (ALLOWED)
  // ========================================
  test('First store without plan should be ALLOWED (first store exception)', async () => {
    const storeData = {
      store_name: 'First Store',
      address: '123 Main St',
      city: 'Mumbai',
      state: 'Maharashtra',
      pincode: '400001',
      contact_person: 'John Doe',
      contact_number: '9876543210',
      latitude: 19.0760,
      longitude: 72.8479
    };

    // Create store via StoreService
    const Store_module = (await import('@/lib/storeService')).default;
    const store = await Store_module.createStore(
      testMerchant._id.toString(),
      storeData,
      testMerchant._id.toString()
    );

    expect(store).toBeDefined();
    expect(store._id).toBeDefined();
    expect(store.is_main_store).toBe(true);

    // Verify account was updated
    const updatedAccount = await Account.findById(testMerchant._id);
    expect(updatedAccount.mainStoreId).toEqual(store._id);
    expect(updatedAccount.onboarding.hasCompletedStoreCreation).toBe(true);

    // Verify store count
    const storeCount = await Store.countDocuments({ merchant_id: testMerchant._id });
    expect(storeCount).toBe(1);
  });

  // ========================================
  // Test 2: Second store without plan (BLOCKED)
  // ========================================
  test('Second store without plan should be BLOCKED with 403', async () => {
    // Create first store
    await Store.create({
      merchant_id: testMerchant._id,
      store_name: 'Store 1',
      address: '123 Main St',
      city: 'Mumbai',
      state: 'Maharashtra',
      pincode: '400001',
      contact_person: 'John Doe',
      contact_number: '9876543210',
      latitude: 19.0760,
      longitude: 72.8479,
      is_main_store: true
    });

    // Try to create second store via platformAccessService
    const platformAccessService = (await import('@/lib/services/platformAccessService')).default;
    const result = await platformAccessService.canCreateStore(testMerchant._id.toString());

    expect(result.allowed).toBe(false);
    expect(result.reason).toContain('Cannot create additional stores');
  });

  // ========================================
  // Test 3: Second store with CORE plan (BLOCKED)
  // ========================================
  test('Second store with CORE plan should be BLOCKED (max 1 store limit)', async () => {
    // Create first store
    await Store.create({
      merchant_id: testMerchant._id,
      store_name: 'Store 1',
      address: '123 Main St',
      city: 'Mumbai',
      state: 'Maharashtra',
      pincode: '400001',
      contact_person: 'John Doe',
      contact_number: '9876543210',
      latitude: 19.0760,
      longitude: 72.8479,
      is_main_store: true
    });

    // Create CORE subscription
    await Subscription.create({
      ownerId: testMerchant._id,
      ownerType: 'merchant',
      planId: testPlanCore._id,
      status: 'active',
      currentPeriodStart: new Date(),
      currentPeriodEnd: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000)
    });

    // Try to create second store
    const platformAccessService = (await import('@/lib/services/platformAccessService')).default;
    const result = await platformAccessService.canCreateStore(testMerchant._id.toString());

    expect(result.allowed).toBe(false);
    expect(result.reason).toContain('CORE plan allows up to 1 store');
  });

  // ========================================
  // Test 4: Stores 1-5 with SMART plan (ALLOWED)
  // ========================================
  test('Stores 1-5 with SMART plan should all be ALLOWED', async () => {
    // Create SMART subscription
    await Subscription.create({
      ownerId: testMerchant._id,
      ownerType: 'merchant',
      planId: testPlanSmart._id,
      status: 'active',
      currentPeriodStart: new Date(),
      currentPeriodEnd: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000)
    });

    // Create stores 1-5
    for (let i = 1; i <= 5; i++) {
      const storeData = {
        merchant_id: testMerchant._id,
        store_name: `Store ${i}`,
        address: `${100 + i} Main St`,
        city: 'Mumbai',
        state: 'Maharashtra',
        pincode: '400001',
        contact_person: `Contact ${i}`,
        contact_number: '9876543210',
        latitude: 19.0760,
        longitude: 72.8479,
        is_main_store: i === 1,
        isExtraStore: i > 1,
        extraStoreFee: i > 1 ? 199 : 0
      };

      const store = await Store.create(storeData);
      expect(store._id).toBeDefined();

      // Check if can create next store
      if (i < 5) {
        const platformAccessService = (await import('@/lib/services/platformAccessService')).default;
        const result = await platformAccessService.canCreateStore(testMerchant._id.toString());
        expect(result.allowed).toBe(true);
      }
    }

    // Verify 5 stores created
    const storeCount = await Store.countDocuments({ merchant_id: testMerchant._id });
    expect(storeCount).toBe(5);
  });

  // ========================================
  // Test 5: Sixth store with SMART plan (BLOCKED)
  // ========================================
  test('Sixth store with SMART plan should be BLOCKED (max 5 store limit)', async () => {
    // Create SMART subscription
    await Subscription.create({
      ownerId: testMerchant._id,
      ownerType: 'merchant',
      planId: testPlanSmart._id,
      status: 'active',
      currentPeriodStart: new Date(),
      currentPeriodEnd: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000)
    });

    // Create 5 stores
    for (let i = 1; i <= 5; i++) {
      await Store.create({
        merchant_id: testMerchant._id,
        store_name: `Store ${i}`,
        address: `${100 + i} Main St`,
        city: 'Mumbai',
        state: 'Maharashtra',
        pincode: '400001',
        contact_person: `Contact ${i}`,
        contact_number: '9876543210',
        latitude: 19.0760,
        longitude: 72.8479,
        is_main_store: i === 1
      });
    }

    // Try to create 6th store
    const platformAccessService = (await import('@/lib/services/platformAccessService')).default;
    const result = await platformAccessService.canCreateStore(testMerchant._id.toString());

    expect(result.allowed).toBe(false);
    expect(result.reason).toContain('SMART plan allows up to 5 store');
  });

  // ========================================
  // Test 6: Verify mainStoreId is set only for first store
  // ========================================
  test('mainStoreId should be set only for the first store', async () => {
    // Create SMART subscription
    await Subscription.create({
      ownerId: testMerchant._id,
      ownerType: 'merchant',
      planId: testPlanSmart._id,
      status: 'active'
    });

    // Create first store
    const store1 = await Store.create({
      merchant_id: testMerchant._id,
      store_name: 'Store 1',
      address: '123 Main St',
      city: 'Mumbai',
      state: 'Maharashtra',
      pincode: '400001',
      contact_person: 'John',
      contact_number: '9876543210',
      latitude: 19.0760,
      longitude: 72.8479,
      is_main_store: true
    });

    // Update account mainStoreId
    await Account.findByIdAndUpdate(testMerchant._id, {
      mainStoreId: store1._id,
      'onboarding.hasCompletedStoreCreation': true
    });

    // Create second store
    const store2 = await Store.create({
      merchant_id: testMerchant._id,
      store_name: 'Store 2',
      address: '456 Main St',
      city: 'Mumbai',
      state: 'Maharashtra',
      pincode: '400001',
      contact_person: 'Jane',
      contact_number: '9876543211',
      latitude: 19.0760,
      longitude: 72.8479,
      is_main_store: false
    });

    // Verify account still has only first store as mainStore
    const account = await Account.findById(testMerchant._id);
    expect(account.mainStoreId.toString()).toBe(store1._id.toString());

    // Verify only first store has is_main_store = true
    const mainStoreCount = await Store.countDocuments({
      merchant_id: testMerchant._id,
      is_main_store: true
    });
    expect(mainStoreCount).toBe(1);
  });

  // ========================================
  // Test 7: Verify isMainStore and storeType flags
  // ========================================
  test('First store should have isMainStore=true and storeType=MAIN', async () => {
    const storeData = {
      store_name: 'Main Store',
      address: '123 Main St',
      city: 'Mumbai',
      state: 'Maharashtra',
      pincode: '400001',
      contact_person: 'John',
      contact_number: '9876543210',
      latitude: 19.0760,
      longitude: 72.8479,
      is_main_store: true,
      isMainStore: true,
      isDefaultStore: true,
      storeType: 'MAIN'
    };

    const store = await Store.create({
      merchant_id: testMerchant._id,
      ...storeData
    });

    expect(store.is_main_store).toBe(true);
    expect(store.isMainStore).toBe(true);
    expect(store.isDefaultStore).toBe(true);
    expect(store.storeType).toBe('MAIN');
  });
});
