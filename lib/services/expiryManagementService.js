import ScratchCardRecord from '@/models/scratchCardRecordModel';
import CustomerParticipation from '@/models/customerParticipationModel';

/**
 * Schedule expiry for a scratch card
 * Sets expires_at timestamp and updates expiry_duration_minutes
 * Also updates the associated CustomerParticipation record
 *
 * @param {string} scratchCardId - The ID of the scratch card record
 * @param {number} expiryDurationMinutes - Duration in minutes (default: 5)
 * @returns {Promise<{success: boolean, expiresAt?: Date, expiryMinutes?: number, scratchCard?: object, error?: string}>}
 */
export async function scheduleExpiry(scratchCardId, expiryDurationMinutes = 5) {
  try {
    // Validate inputs
    if (!scratchCardId) {
      throw new Error('Missing required parameter: scratchCardId');
    }

    if (expiryDurationMinutes < 1) {
      throw new Error('Expiry duration must be at least 1 minute');
    }

    // Fetch scratch card record
    const scratchCard = await ScratchCardRecord.findById(scratchCardId);
    if (!scratchCard) {
      throw new Error(`Scratch card not found: ${scratchCardId}`);
    }

    // Calculate expiry timestamp
    const now = new Date();
    const expiresAt = new Date(now.getTime() + expiryDurationMinutes * 60 * 1000);

    // Update scratch card record
    scratchCard.expires_at = expiresAt;
    scratchCard.expiry_duration_minutes = expiryDurationMinutes;
    await scratchCard.save();

    // Update associated CustomerParticipation record
    const participation = await CustomerParticipation.findById(
      scratchCard.customer_participation_id
    );
    if (participation) {
      participation.expires_at = expiresAt;
      await participation.save();
    }

    return {
      success: true,
      expiresAt,
      expiryMinutes: expiryDurationMinutes,
      scratchCard: {
        id: scratchCard._id,
        expires_at: scratchCard.expires_at,
        expiry_duration_minutes: scratchCard.expiry_duration_minutes,
        status: scratchCard.status
      }
    };
  } catch (error) {
    console.error('Error in scheduleExpiry:', error);
    return {
      success: false,
      error: error.message
    };
  }
}

/**
 * Check if a scratch card has expired
 *
 * @param {object} scratchCard - The scratch card object
 * @returns {boolean} - True if card is expired, false otherwise
 */
export function isExpired(scratchCard) {
  try {
    // Validate inputs
    if (!scratchCard) {
      console.warn('isExpired: scratchCard is null or undefined');
      return false;
    }

    // Check if expires_at exists
    if (!scratchCard.expires_at) {
      return false;
    }

    // Compare current time with expiry time
    const now = new Date();
    const expiresAt = new Date(scratchCard.expires_at);

    return now > expiresAt;
  } catch (error) {
    console.error('Error in isExpired:', error);
    return false;
  }
}

/**
 * Mark a scratch card as expired
 * Updates both ScratchCardRecord and CustomerParticipation status to 'expired'
 *
 * @param {string} scratchCardId - The ID of the scratch card record
 * @returns {Promise<{success: boolean, scratchCard?: object, error?: string}>}
 */
export async function markAsExpired(scratchCardId) {
  try {
    // Validate inputs
    if (!scratchCardId) {
      throw new Error('Missing required parameter: scratchCardId');
    }

    // Fetch scratch card record
    const scratchCard = await ScratchCardRecord.findById(scratchCardId);
    if (!scratchCard) {
      throw new Error(`Scratch card not found: ${scratchCardId}`);
    }

    // Update scratch card record
    scratchCard.status = 'expired';
    scratchCard.is_expired = true;
    await scratchCard.save();

    // Update associated CustomerParticipation record
    const participation = await CustomerParticipation.findById(
      scratchCard.customer_participation_id
    );
    if (participation) {
      participation.status = 'expired';
      await participation.save();
    }

    return {
      success: true,
      scratchCard: {
        id: scratchCard._id,
        status: scratchCard.status,
        is_expired: scratchCard.is_expired,
        expires_at: scratchCard.expires_at
      }
    };
  } catch (error) {
    console.error('Error in markAsExpired:', error);
    return {
      success: false,
      error: error.message
    };
  }
}

/**
 * Find all expired scratch cards that haven't been marked as expired yet
 * Queries for cards where expires_at < now, status != 'expired', and is_expired = false
 *
 * @returns {Promise<{success: boolean, cards?: Array, count?: number, error?: string}>}
 */
export async function findExpiredCards() {
  try {
    const now = new Date();

    // Query for expired cards
    const cards = await ScratchCardRecord.find({
      expires_at: { $lt: now },
      status: { $ne: 'expired' },
      is_expired: false
    }).lean();

    return {
      success: true,
      cards: cards || [],
      count: cards ? cards.length : 0
    };
  } catch (error) {
    console.error('Error in findExpiredCards:', error);
    return {
      success: false,
      cards: [],
      count: 0,
      error: error.message
    };
  }
}

/**
 * Process expiring scratch cards - Background job entry point
 * Finds all expired cards and marks them as expired
 * Tracks processed and failed counts
 *
 * @returns {Promise<{success: boolean, processedCount?: number, failedCount?: number, totalChecked?: number, error?: string}>}
 */
export async function processExpiringCards() {
  try {
    let processedCount = 0;
    let failedCount = 0;

    // Find expired cards
    const findResult = await findExpiredCards();
    if (!findResult.success) {
      throw new Error(`Failed to find expired cards: ${findResult.error}`);
    }

    const cards = findResult.cards || [];
    const totalChecked = cards.length;

    // Process each expired card
    for (const card of cards) {
      try {
        const markResult = await markAsExpired(card._id.toString());
        if (markResult.success) {
          processedCount += 1;
        } else {
          failedCount += 1;
          console.error(
            `Failed to mark card ${card._id} as expired: ${markResult.error}`
          );
        }
      } catch (error) {
        failedCount += 1;
        console.error(`Error processing card ${card._id}:`, error);
      }
    }

    return {
      success: true,
      processedCount,
      failedCount,
      totalChecked
    };
  } catch (error) {
    console.error('Error in processExpiringCards:', error);
    return {
      success: false,
      processedCount: 0,
      failedCount: 0,
      totalChecked: 0,
      error: error.message
    };
  }
}
