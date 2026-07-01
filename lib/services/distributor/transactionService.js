/**
 * Transaction Ledger Service
 *
 * Maintains financial ledger for distributors
 * Tracks all debit/credit movements
 */

import DistributorTransaction from '@/models/distributorTransactionModel';

class TransactionService {
  /**
   * Record a transaction
   */
  async recordTransaction(transactionData) {
    try {
      const {
        distributorId,
        transactionType,
        amount,
        transactionDirection,
        referenceType,
        referenceId,
        description,
        paymentMethod,
        paymentReference,
        createdBy,
        notes,
      } = transactionData;

      // Generate transaction ID
      const transactionId = `TXN-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;

      // Get current balance (sum of all previous transactions)
      const previousTransactions = await DistributorTransaction.find({
        distributorId,
        status: 'completed',
      }).sort({ createdAt: -1 });

      let balanceBefore = 0;
      if (previousTransactions.length > 0) {
        // Last transaction's balance after is current balance before
        const lastTransaction = previousTransactions[0];
        balanceBefore = lastTransaction.balanceAfter || 0;
      }

      // Calculate new balance
      const balanceAfter =
        transactionDirection === 'credit'
          ? balanceBefore + amount
          : balanceBefore - amount;

      const transaction = new DistributorTransaction({
        transactionId,
        distributorId,
        transactionType,
        amount,
        transactionDirection,
        balanceBefore,
        balanceAfter,
        referenceType,
        referenceId,
        description: description || this.getDefaultDescription(transactionType),
        status: 'completed',
        paymentMethod,
        paymentReference,
        createdBy,
        notes,
      });

      await transaction.save();

      console.log(`[TransactionService] Recorded transaction: ${transactionId}`);

      return transaction;
    } catch (error) {
      console.error('[TransactionService] Error recording transaction:', error);
      throw error;
    }
  }

  /**
   * Get transaction history for a distributor
   */
  async getTransactionHistory(distributorId, filters = {}) {
    try {
      const query = { distributorId };

      if (filters.transactionType) query.transactionType = filters.transactionType;
      if (filters.status) query.status = filters.status;
      if (filters.direction) query.transactionDirection = filters.direction;

      if (filters.startDate || filters.endDate) {
        query.createdAt = {};
        if (filters.startDate)
          query.createdAt.$gte = new Date(filters.startDate);
        if (filters.endDate) query.createdAt.$lte = new Date(filters.endDate);
      }

      const transactions = await DistributorTransaction.find(query)
        .sort({ createdAt: -1 })
        .limit(filters.limit || 100)
        .skip(filters.skip || 0)
        .populate('createdBy', 'email name');

      const total = await DistributorTransaction.countDocuments(query);

      return {
        transactions,
        total,
        page: Math.floor((filters.skip || 0) / (filters.limit || 100)) + 1,
      };
    } catch (error) {
      console.error('[TransactionService] Error getting transaction history:', error);
      throw error;
    }
  }

  /**
   * Get current balance for distributor
   */
  async getCurrentBalance(distributorId) {
    try {
      const latestTransaction = await DistributorTransaction.findOne({
        distributorId,
        status: 'completed',
      }).sort({ createdAt: -1 });

      const balance = latestTransaction?.balanceAfter || 0;

      return {
        balance,
        lastTransactionAt: latestTransaction?.createdAt,
        lastTransactionType: latestTransaction?.transactionType,
      };
    } catch (error) {
      console.error('[TransactionService] Error getting current balance:', error);
      throw error;
    }
  }

  /**
   * Get transaction summary for a period
   */
  async getTransactionSummary(distributorId, startDate, endDate) {
    try {
      const query = {
        distributorId,
        status: 'completed',
        createdAt: {
          $gte: new Date(startDate),
          $lte: new Date(endDate),
        },
      };

      const transactions = await DistributorTransaction.find(query);

      const summary = {
        totalTransactions: transactions.length,
        totalCredit: 0,
        totalDebit: 0,
        byType: {},
      };

      transactions.forEach((txn) => {
        if (txn.transactionDirection === 'credit') {
          summary.totalCredit += txn.amount;
        } else {
          summary.totalDebit += txn.amount;
        }

        if (!summary.byType[txn.transactionType]) {
          summary.byType[txn.transactionType] = {
            count: 0,
            credit: 0,
            debit: 0,
          };
        }

        summary.byType[txn.transactionType].count += 1;
        if (txn.transactionDirection === 'credit') {
          summary.byType[txn.transactionType].credit += txn.amount;
        } else {
          summary.byType[txn.transactionType].debit += txn.amount;
        }
      });

      summary.netAmount = summary.totalCredit - summary.totalDebit;

      return summary;
    } catch (error) {
      console.error('[TransactionService] Error getting transaction summary:', error);
      throw error;
    }
  }

  /**
   * Get monthly breakdown
   */
  async getMonthlyBreakdown(distributorId, year) {
    try {
      const startDate = new Date(`${year}-01-01`);
      const endDate = new Date(`${year}-12-31`);

      const transactions = await DistributorTransaction.find({
        distributorId,
        status: 'completed',
        createdAt: {
          $gte: startDate,
          $lte: endDate,
        },
      });

      const breakdown = {};

      // Initialize months
      for (let i = 1; i <= 12; i++) {
        const month = String(i).padStart(2, '0');
        breakdown[month] = {
          credit: 0,
          debit: 0,
          count: 0,
        };
      }

      // Aggregate transactions
      transactions.forEach((txn) => {
        const month = String(txn.createdAt.getMonth() + 1).padStart(2, '0');
        breakdown[month].count += 1;

        if (txn.transactionDirection === 'credit') {
          breakdown[month].credit += txn.amount;
        } else {
          breakdown[month].debit += txn.amount;
        }
      });

      return breakdown;
    } catch (error) {
      console.error('[TransactionService] Error getting monthly breakdown:', error);
      throw error;
    }
  }

  /**
   * Reverse a transaction (for refunds)
   */
  async reverseTransaction(transactionId, reason) {
    try {
      const transaction = await DistributorTransaction.findById(transactionId);

      if (!transaction) {
        throw new Error('Transaction not found');
      }

      // Create reversal transaction
      const reversalAmount = transaction.amount;
      const reversalDirection =
        transaction.transactionDirection === 'credit' ? 'debit' : 'credit';

      const reversalTxn = new DistributorTransaction({
        transactionId: `REV-${transaction.transactionId}`,
        distributorId: transaction.distributorId,
        transactionType: 'refund',
        amount: reversalAmount,
        transactionDirection: reversalDirection,
        referenceType: 'transaction',
        referenceId: transaction._id,
        description: `Reversal of ${transaction.transactionType}: ${reason}`,
        status: 'completed',
        relatedTransactions: [transaction._id],
      });

      await reversalTxn.save();

      // Mark original as reversed
      transaction.status = 'reversed';
      transaction.reversedAt = new Date();
      await transaction.save();

      console.log(`[TransactionService] Reversed transaction: ${transactionId}`);

      return reversalTxn;
    } catch (error) {
      console.error('[TransactionService] Error reversing transaction:', error);
      throw error;
    }
  }

  /**
   * Get default description for transaction type
   */
  getDefaultDescription(transactionType) {
    const descriptions = {
      purchase: 'Plans purchase',
      assignment: 'Plan assignment to retailer',
      commission_earned: 'Commission earned from assignment',
      refund: 'Refund processed',
      payout: 'Commission payout',
      wallet_adjustment: 'Wallet adjustment',
      order_cancelled: 'Order cancellation refund',
    };

    return descriptions[transactionType] || 'Transaction';
  }
}

export default new TransactionService();
