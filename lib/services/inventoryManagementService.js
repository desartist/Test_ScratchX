import mongoose from 'mongoose';
import Campaign from '@/models/campaignModel';
import Account from '@/models/accountModel';
import ScratchCardTransaction from '@/models/scratchCardTransactionModel';

/**
 * Consume inventory when a QR code is scanned
 * NOTE: MongoDB transactions removed for standalone development instances
 *
 * @param {string} campaignId - Campaign ID
 * @param {string} merchantId - Merchant ID
 * @param {string} userId - User who performed the action
 * @param {string} ipAddress - IP address of the request
 * @param {string} sourceSystem - Source system (web_dashboard, mobile_app, api, batch_import)
 * @returns {Promise<{success: boolean, campaign?: object, transactionId?: string, error?: string}>}
 */
export async function consumeInventory(
  campaignId,
  merchantId,
  userId,
  ipAddress,
  sourceSystem = 'web_dashboard'
) {
  try {
    // Validate inputs
    if (!campaignId || !merchantId || !userId) {
      throw new Error('Missing required parameters: campaignId, merchantId, userId');
    }

    // Fetch campaign (without session/transaction)
    const campaign = await Campaign.findById(campaignId);
    if (!campaign) {
      throw new Error(`Campaign not found: ${campaignId}`);
    }

    // Validate campaign status
    if (campaign.status !== 'active') {
      throw new Error(`Campaign is not active. Current status: ${campaign.status}`);
    }

    // Validate remaining cards available
    if (campaign.remaining_scratch_cards <= 0) {
      throw new Error('No remaining scratches available for this campaign');
    }

    // Validate campaign dates
    const now = new Date();
    if (now < campaign.startDate) {
      throw new Error('Campaign has not started yet');
    }
    if (now > campaign.endDate) {
      throw new Error('Campaign has ended');
    }

    // Fetch merchant/account to validate
    const merchant = await Account.findById(merchantId);
    if (!merchant) {
      throw new Error(`Merchant not found: ${merchantId}`);
    }

    // Fetch user to validate
    const user = await Account.findById(userId);
    if (!user) {
      throw new Error(`User not found: ${userId}`);
    }

    // Store previous values for audit
    const previousUsed = campaign.used_scratch_cards;
    const previousRemaining = campaign.remaining_scratch_cards;

    // Update campaign inventory
    campaign.used_scratch_cards += 1;
    campaign.remaining_scratch_cards -= 1;
    campaign.tracking.qrCodesScanned += 1;

    await campaign.save();

    // Create audit transaction record
    // source_system: Validated enum value from ScratchCardTransaction schema
    // Valid values: ['web_dashboard', 'mobile_app', 'api', 'batch_import']
    const transaction = await ScratchCardTransaction.create({
      merchant_id: merchantId,
      campaign_id: campaignId,
      action_type: 'allocated_to_campaign',
      quantity: 1,
      previous_balance: previousRemaining,
      new_balance: campaign.remaining_scratch_cards,
      status: 'completed',
      created_by: userId,
      source_system: sourceSystem || 'mobile_app', // Default to 'mobile_app' for QR scans
      ip_address: ipAddress,
      remarks: `QR code scanned in campaign ${campaign.campaignName}`
    });

    return {
      success: true,
      campaign: {
        id: campaign._id,
        name: campaign.campaignName,
        remaining: campaign.remaining_scratch_cards,
        used: campaign.used_scratch_cards,
        allocated: campaign.allocated_scratch_cards,
        redeemed: campaign.redeemed_scratch_cards
      },
      transactionId: transaction._id.toString()
    };
  } catch (error) {
    console.error('Error in consumeInventory:', error);
    return {
      success: false,
      error: error.message
    };
  }
}

/**
 * Redeem inventory when a customer redeems their reward
 * NOTE: MongoDB transactions removed for standalone development instances
 *
 * @param {string} campaignId - Campaign ID
 * @param {string} merchantId - Merchant ID
 * @param {string} userId - User who performed the action
 * @param {string} ipAddress - IP address of the request
 * @returns {Promise<{success: boolean, redeemed?: number, campaign?: object, transactionId?: string, error?: string}>}
 */
export async function redeemInventory(
  campaignId,
  merchantId,
  userId,
  ipAddress
) {
  try {
    // Validate inputs
    if (!campaignId || !merchantId || !userId) {
      throw new Error('Missing required parameters: campaignId, merchantId, userId');
    }

    // Fetch campaign (without session/transaction)
    const campaign = await Campaign.findById(campaignId);
    if (!campaign) {
      throw new Error(`Campaign not found: ${campaignId}`);
    }

    // Validate: redeemed won't exceed used
    if (campaign.redeemed_scratch_cards >= campaign.used_scratch_cards) {
      throw new Error('Cannot redeem more than used scratch cards');
    }

    // Store previous values for audit
    const previousRedeemed = campaign.redeemed_scratch_cards;

    // Update campaign inventory
    campaign.redeemed_scratch_cards += 1;
    // Recalculate remaining: allocated - used - redeemed
    campaign.remaining_scratch_cards =
      campaign.allocated_scratch_cards -
      campaign.used_scratch_cards -
      campaign.redeemed_scratch_cards;

    await campaign.save();

    // Create audit transaction record
    // source_system: Use 'mobile_app' for customer redemptions via QR scan
    // Valid values: ['web_dashboard', 'mobile_app', 'api', 'batch_import']
    const transaction = await ScratchCardTransaction.create({
      merchant_id: merchantId,
      campaign_id: campaignId,
      action_type: 'redeemed',
      quantity: 1,
      previous_balance: previousRedeemed,
      new_balance: campaign.redeemed_scratch_cards,
      status: 'completed',
      created_by: userId,
      source_system: 'mobile_app', // QR code redemptions are mobile/customer app
      ip_address: ipAddress,
      remarks: `Reward redeemed in campaign ${campaign.campaignName}`
    });

    return {
      success: true,
      redeemed: campaign.redeemed_scratch_cards,
      campaign: {
        id: campaign._id,
        name: campaign.campaignName,
        remaining: campaign.remaining_scratch_cards,
        used: campaign.used_scratch_cards,
        allocated: campaign.allocated_scratch_cards,
        redeemed: campaign.redeemed_scratch_cards
      },
      transactionId: transaction._id.toString()
    };
  } catch (error) {
    console.error('Error in redeemInventory:', error);
    return {
      success: false,
      error: error.message
    };
  }
}

/**
 * Validate inventory consistency
 * Checks that inventory math is valid and consistent
 *
 * @param {string} campaignId - Campaign ID
 * @returns {Promise<{valid: boolean, issues: string[], campaign: object}>}
 */
export async function validateInventoryConsistency(campaignId) {
  try {
    // Validate input
    if (!campaignId) {
      throw new Error('Missing required parameter: campaignId');
    }

    // Fetch campaign
    const campaign = await Campaign.findById(campaignId);
    if (!campaign) {
      return {
        valid: false,
        issues: [`Campaign not found: ${campaignId}`],
        campaign: null
      };
    }

    const issues = [];

    // Check: used <= allocated
    if (campaign.used_scratch_cards > campaign.allocated_scratch_cards) {
      issues.push(
        `Used scratch cards (${campaign.used_scratch_cards}) exceeds allocated (${campaign.allocated_scratch_cards})`
      );
    }

    // Check: redeemed <= used
    if (campaign.redeemed_scratch_cards > campaign.used_scratch_cards) {
      issues.push(
        `Redeemed scratch cards (${campaign.redeemed_scratch_cards}) exceeds used (${campaign.used_scratch_cards})`
      );
    }

    // Check: remaining >= 0
    if (campaign.remaining_scratch_cards < 0) {
      issues.push(
        `Remaining scratch cards (${campaign.remaining_scratch_cards}) is negative`
      );
    }

    // Check: remaining = allocated - used - redeemed
    const expectedRemaining =
      campaign.allocated_scratch_cards -
      campaign.used_scratch_cards -
      campaign.redeemed_scratch_cards;

    if (campaign.remaining_scratch_cards !== expectedRemaining) {
      issues.push(
        `Remaining calculation mismatch. Expected: ${expectedRemaining}, Actual: ${campaign.remaining_scratch_cards}`
      );
    }

    return {
      valid: issues.length === 0,
      issues,
      campaign: {
        id: campaign._id,
        name: campaign.campaignName,
        allocated: campaign.allocated_scratch_cards,
        used: campaign.used_scratch_cards,
        redeemed: campaign.redeemed_scratch_cards,
        remaining: campaign.remaining_scratch_cards,
        expectedRemaining
      }
    };
  } catch (error) {
    console.error('Error in validateInventoryConsistency:', error);
    return {
      valid: false,
      issues: [error.message],
      campaign: null
    };
  }
}
