import DistributorBalance from '@/models/distributorBalanceModel';
import MerchantAllocation from '@/models/merchantAllocationModel';

/**
 * Allocate scratch cards from distributor to merchant
 *
 * @param {Object} params - Allocation parameters
 * @param {ObjectId} params.distributorId - ID of the distributor
 * @param {ObjectId} params.merchantId - ID of the merchant
 * @param {string} params.merchantName - Name of the merchant
 * @param {number} params.quantity - Number of scratch cards to allocate
 * @param {ObjectId} params.allocatedBy - User ID who is performing the allocation
 * @returns {Promise<{allocation: Object, remaining: number, transaction: Object}>}
 * @throws {Error} If validation fails or insufficient balance
 */
export async function allocateScratchCardsToMerchant(params) {
  const { distributorId, merchantId, merchantName, quantity, allocatedBy } = params;

  // Validate quantity
  if (!Number.isInteger(quantity)) {
    throw new Error('Quantity must be an integer');
  }

  if (quantity <= 0) {
    throw new Error('Quantity must be greater than 0');
  }

  // Get distributor balance
  const balance = await DistributorBalance.findOne({ distributorId });

  if (!balance) {
    throw new Error('Distributor balance not found');
  }

  // Calculate remaining balance
  const remaining = balance.getRemainingBalance();

  // Check if allocation exceeds remaining balance
  if (quantity > remaining) {
    throw new Error('Insufficient balance');
  }

  // Find existing allocation for this merchant
  const existingAllocation = balance.getMerchantAllocation(merchantId);

  // Update or add allocation
  if (existingAllocation) {
    // Update existing allocation
    existingAllocation.quantity = quantity;
    existingAllocation.allocatedAt = new Date();
    existingAllocation.allocatedBy = allocatedBy;
  } else {
    // Add new allocation
    balance.allocations.push({
      merchantId,
      merchantName,
      quantity,
      allocatedAt: new Date(),
      allocatedBy,
    });
  }

  // Update lastUpdated timestamp
  balance.lastUpdated = new Date();

  // Save updated balance
  await balance.save();

  // Create transaction record for audit trail
  const transaction = await MerchantAllocation.create({
    distributorId,
    merchantId,
    quantity,
    transactionType: 'allocation',
    status: 'completed',
    allocatedBy,
    previousDistributorBalance: remaining + quantity,
    newDistributorBalance: remaining,
  });

  // Calculate new remaining after this allocation
  const newRemaining = balance.getRemainingBalance();

  return {
    allocation: {
      merchantId,
      merchantName,
      quantity,
      allocatedAt: new Date(),
      allocatedBy,
    },
    remaining: newRemaining,
    transaction: transaction.toObject(),
  };
}

/**
 * Get distributor balance with all allocations
 *
 * @param {ObjectId} distributorId - ID of the distributor
 * @returns {Promise<{total: number, allocated: number, remaining: number, allocations: Array}>}
 * @throws {Error} If distributor balance not found
 */
export async function getDistributorBalance(distributorId) {
  const balance = await DistributorBalance.findOne({ distributorId });

  if (!balance) {
    throw new Error('Distributor balance not found');
  }

  const allocated = balance.allocations.reduce((sum, allocation) => {
    return sum + allocation.quantity;
  }, 0);

  const remaining = balance.totalAllocated - allocated;

  return {
    total: balance.totalAllocated,
    allocated,
    remaining,
    allocations: balance.allocations.map(alloc => ({
      merchantId: alloc.merchantId,
      merchantName: alloc.merchantName,
      quantity: alloc.quantity,
      allocatedAt: alloc.allocatedAt,
      allocatedBy: alloc.allocatedBy,
    })),
  };
}

/**
 * Get specific merchant allocation
 *
 * @param {ObjectId} distributorId - ID of the distributor
 * @param {ObjectId} merchantId - ID of the merchant
 * @returns {Promise<Object|null>} - Allocation record or null if not found
 * @throws {Error} If distributor balance not found
 */
export async function getMerchantAllocation(distributorId, merchantId) {
  const balance = await DistributorBalance.findOne({ distributorId });

  if (!balance) {
    throw new Error('Distributor balance not found');
  }

  const allocation = balance.getMerchantAllocation(merchantId);

  if (!allocation) {
    return null;
  }

  return {
    merchantId: allocation.merchantId,
    merchantName: allocation.merchantName,
    quantity: allocation.quantity,
    allocatedAt: allocation.allocatedAt,
    allocatedBy: allocation.allocatedBy,
  };
}

/**
 * Deallocate/revoke scratch cards from a merchant
 *
 * @param {ObjectId} distributorId - ID of the distributor
 * @param {ObjectId} merchantId - ID of the merchant
 * @param {ObjectId} deallocatedBy - User ID who is performing the deallocation
 * @returns {Promise<{transaction: Object}>}
 * @throws {Error} If allocation not found or balance not found
 */
export async function deallocateScratchCards(distributorId, merchantId, deallocatedBy) {
  // Get distributor balance
  const balance = await DistributorBalance.findOne({ distributorId });

  if (!balance) {
    throw new Error('Distributor balance not found');
  }

  // Find allocation for this merchant
  const allocation = balance.getMerchantAllocation(merchantId);

  if (!allocation) {
    throw new Error('Allocation not found');
  }

  const allocationQuantity = allocation.quantity;

  // Remove allocation
  balance.allocations = balance.allocations.filter(
    (alloc) => alloc.merchantId.toString() !== merchantId.toString()
  );

  // Update lastUpdated timestamp
  balance.lastUpdated = new Date();

  // Save updated balance
  await balance.save();

  // Create revocation transaction record
  const transaction = await MerchantAllocation.create({
    distributorId,
    merchantId,
    quantity: allocationQuantity,
    transactionType: 'revocation',
    status: 'completed',
    allocatedBy: deallocatedBy,
  });

  return {
    transaction: transaction.toObject(),
  };
}
