/**
 * Distributor Services Index
 *
 * Central export for all distributor-related services
 */

import commissionService from './commissionService';
import inventoryService from './inventoryService';
import purchaseService from './purchaseService';
import transactionService from './transactionService';
import assignmentService from './assignmentService';
import notificationService from './notificationService';

export {
  commissionService,
  inventoryService,
  purchaseService,
  transactionService,
  assignmentService,
  notificationService,
};

// Single export for convenience
export default {
  commission: commissionService,
  inventory: inventoryService,
  purchase: purchaseService,
  transaction: transactionService,
  assignment: assignmentService,
  notification: notificationService,
};
