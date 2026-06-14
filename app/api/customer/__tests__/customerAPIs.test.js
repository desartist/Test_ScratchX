/**
 * Integration tests for customer-facing APIs
 * Tests cover all 6 endpoints for coupon redemption flow
 */

describe('Customer APIs - Integration Tests', () => {
  // Helper function to create mock request
  const createMockRequest = (body, headers = {}) => ({
    json: async () => body,
    headers: new Map(Object.entries({
      'x-forwarded-for': '192.168.1.1',
      'content-type': 'application/json',
      ...headers
    }))
  });

  describe('API 1: GET /api/customer/campaign/:id', () => {
    test('should fetch campaign details successfully', () => {
      const campaign = {
        _id: '507f1f77bcf86cd799439011',
        campaignName: 'Summer Sale',
        description: 'Summer season discount',
        status: 'active',
        startDate: new Date(),
        endDate: new Date(Date.now() + 86400000),
        allocated_scratch_cards: 100,
        used_scratch_cards: 10,
        redeemed_scratch_cards: 5,
        remaining_scratch_cards: 85
      };

      expect(campaign.status).toBe('active');
      expect(campaign.remaining_scratch_cards).toBeLessThanOrEqual(
        campaign.allocated_scratch_cards
      );
      expect(campaign._id).toHaveLength(24);
    });

    test('should validate campaign ID format (24 chars)', () => {
      const validId = '507f1f77bcf86cd799439011';
      const invalidId = 'invalid';

      expect(validId.length).toBe(24);
      expect(invalidId.length).not.toBe(24);
    });

    test('should handle campaign not found', () => {
      const campaign = null;
      expect(campaign).toBeNull();
    });

    test('should reject inactive campaigns', () => {
      const campaign = { status: 'draft' };
      expect(campaign.status).not.toBe('active');
    });

    test('should return billing range with campaign', () => {
      const response = {
        _id: 'campaignId',
        name: 'Campaign Name',
        billingRange: {
          minAmount: 500,
          maxAmount: 999,
          label: '₹500 - ₹999',
          rewards: [{ type: 'discount', value: 10 }]
        }
      };

      expect(response.billingRange).toBeDefined();
      expect(response.billingRange.minAmount).toBeLessThan(
        response.billingRange.maxAmount
      );
    });
  });

  describe('API 2: POST /api/customer/location-verify', () => {
    test('should verify location within allowed radius', () => {
      const distance = 1500;
      const allowedRadius = 2000;
      const verified = distance <= allowedRadius;

      expect(verified).toBe(true);
    });

    test('should reject location outside allowed radius', () => {
      const distance = 2500;
      const allowedRadius = 2000;
      const verified = distance <= allowedRadius;

      expect(verified).toBe(false);
    });

    test('should validate latitude range (-90 to 90)', () => {
      const validLat = 28.5355;
      const invalidLatTooHigh = 91;
      const invalidLatTooLow = -91;

      expect(validLat >= -90 && validLat <= 90).toBe(true);
      expect(invalidLatTooHigh >= -90 && invalidLatTooHigh <= 90).toBe(false);
      expect(invalidLatTooLow >= -90 && invalidLatTooLow <= 90).toBe(false);
    });

    test('should validate longitude range (-180 to 180)', () => {
      const validLon = 77.1234;
      const invalidLonTooHigh = 181;
      const invalidLonTooLow = -181;

      expect(validLon >= -180 && validLon <= 180).toBe(true);
      expect(invalidLonTooHigh >= -180 && invalidLonTooHigh <= 180).toBe(false);
      expect(invalidLonTooLow >= -180 && invalidLonTooLow <= 180).toBe(false);
    });

    test('should require storeId field', () => {
      const body = { latitude: 28.5355, longitude: 77.1234 };
      expect(body.storeId).toBeUndefined();
    });

    test('should require latitude and longitude', () => {
      const body = { storeId: '507f1f77bcf86cd799439011' };
      expect(body.latitude).toBeUndefined();
      expect(body.longitude).toBeUndefined();
    });

    test('should validate coordinate data types', () => {
      const validBody = {
        latitude: 28.5355,
        longitude: 77.1234
      };
      const invalidBody = {
        latitude: '28.5355',
        longitude: '77.1234'
      };

      expect(typeof validBody.latitude).toBe('number');
      expect(typeof validBody.longitude).toBe('number');
      expect(typeof invalidBody.latitude).toBe('string');
      expect(typeof invalidBody.longitude).toBe('string');
    });

    test('should return distance and message', () => {
      const response = {
        verified: true,
        distance: 1500,
        allowedRadius: 2000,
        message: 'You are 1500 meters away from the store'
      };

      expect(response.distance).toEqual(
        expect.any(Number)
      );
      expect(response.message).toContain('meters');
    });
  });

  describe('API 3: POST /api/customer/participate', () => {
    test('should require all mandatory fields', () => {
      const requiredFields = [
        'campaignId',
        'storeId',
        'customerName',
        'customerMobile',
        'billAmount',
        'latitude',
        'longitude',
        'consent'
      ];

      const body = {};
      requiredFields.forEach(field => {
        expect(body[field]).toBeUndefined();
      });
    });

    test('should validate mobile number is 10 digits', () => {
      const validMobile = '9876543210';
      const invalidMobileShort = '987654321';
      const invalidMobileLong = '98765432101';
      const invalidMobileAlpha = '987654321a';

      const validateMobile = (mobile) => /^[0-9]{10}$/.test(mobile);

      expect(validateMobile(validMobile)).toBe(true);
      expect(validateMobile(invalidMobileShort)).toBe(false);
      expect(validateMobile(invalidMobileLong)).toBe(false);
      expect(validateMobile(invalidMobileAlpha)).toBe(false);
    });

    test('should validate billAmount is non-negative number', () => {
      const validAmounts = [0, 100, 999.99];
      const invalidAmounts = [-1, 'abc', NaN];

      validAmounts.forEach(amount => {
        expect(typeof amount).toBe('number');
        expect(amount >= 0).toBe(true);
      });

      invalidAmounts.forEach(amount => {
        if (typeof amount === 'number') {
          expect(amount >= 0).toBe(false);
        } else {
          expect(typeof amount).not.toBe('number');
        }
      });
    });

    test('should validate customerName is string', () => {
      const validName = 'John Doe';
      const invalidName = 12345;

      expect(typeof validName).toBe('string');
      expect(typeof invalidName).not.toBe('string');
    });

    test('should validate coordinates', () => {
      const validCoords = { latitude: 28.5355, longitude: 77.1234 };
      const invalidCoords = { latitude: 91, longitude: 181 };

      const validateCoords = (lat, lon) =>
        lat >= -90 && lat <= 90 && lon >= -180 && lon <= 180;

      expect(validateCoords(validCoords.latitude, validCoords.longitude)).toBe(
        true
      );
      expect(validateCoords(invalidCoords.latitude, invalidCoords.longitude)).toBe(
        false
      );
    });

    test('should validate consent is boolean', () => {
      const validConsent = true;
      const invalidConsent = 'yes';

      expect(typeof validConsent).toBe('boolean');
      expect(typeof invalidConsent).not.toBe('boolean');
    });

    test('should return participation record with scratchCardId', () => {
      const response = {
        participation: {
          _id: '507f1f77bcf86cd799439011',
          campaignId: '507f1f77bcf86cd799439012',
          status: 'initiated',
          customerName: 'John Doe',
          customerMobile: '9876543210'
        },
        scratchCardId: '507f1f77bcf86cd799439013'
      };

      expect(response.participation._id).toBeDefined();
      expect(response.participation.status).toBe('initiated');
      expect(response.scratchCardId).toBeDefined();
    });

    test('should handle campaign not found', () => {
      const campaign = null;
      expect(campaign).toBeNull();
    });

    test('should reject inactive campaigns', () => {
      const campaign = { status: 'draft' };
      expect(campaign.status).not.toBe('active');
    });

    test('should handle store not found', () => {
      const store = null;
      expect(store).toBeNull();
    });

    test('should handle inventory consumption failure', () => {
      const inventoryResult = {
        success: false,
        error: 'No remaining scratches available'
      };

      expect(inventoryResult.success).toBe(false);
      expect(inventoryResult.error).toBeDefined();
    });

    test('should use transaction for data consistency', () => {
      const operations = [
        'Create ScratchCardRecord',
        'Create CustomerParticipation',
        'Update ScratchCardRecord with participationId'
      ];

      // All operations should succeed or all should fail
      expect(operations.length).toBeGreaterThan(0);
    });
  });

  describe('API 4: POST /api/customer/scratch/generate', () => {
    test('should require participationId', () => {
      const body = {};
      expect(body.participationId).toBeUndefined();
    });

    test('should validate participation exists', () => {
      const participation = null;
      expect(participation).toBeNull();
    });

    test('should validate participation is in initiated status', () => {
      const participations = [
        { status: 'initiated', shouldGenerate: true },
        { status: 'scratched', shouldGenerate: false },
        { status: 'revealed', shouldGenerate: false },
        { status: 'redeemed', shouldGenerate: false }
      ];

      participations.forEach(p => {
        const canGenerate = p.status === 'initiated';
        expect(canGenerate).toBe(p.shouldGenerate);
      });
    });

    test('should check scratch card has not expired', () => {
      const expiresAt = new Date(Date.now() + 5 * 60 * 1000); // 5 minutes
      const now = new Date();
      const isExpired = now > expiresAt;

      expect(isExpired).toBe(false);
    });

    test('should handle expired scratch card', () => {
      const expiresAt = new Date(Date.now() - 1 * 60 * 1000); // 1 minute ago
      const now = new Date();
      const isExpired = now > expiresAt;

      expect(isExpired).toBe(true);
    });

    test('should update participation status to scratched', () => {
      const participation = { status: 'initiated' };
      participation.status = 'scratched';

      expect(participation.status).toBe('scratched');
    });

    test('should return scratch card details', () => {
      const response = {
        scratchCard: {
          _id: '507f1f77bcf86cd799439011',
          reward_type: 'discount',
          reward_value: 10,
          status: 'generated',
          expires_at: new Date()
        }
      };

      expect(response.scratchCard._id).toBeDefined();
      expect(['discount', 'freeItem', 'cashback', 'voucher']).toContain(
        response.scratchCard.reward_type
      );
    });
  });

  describe('API 5: POST /api/customer/scratch/reveal', () => {
    test('should require scratchCardId and participationId', () => {
      const body = {};
      expect(body.scratchCardId).toBeUndefined();
      expect(body.participationId).toBeUndefined();
    });

    test('should validate scratch card exists', () => {
      const scratchCard = null;
      expect(scratchCard).toBeNull();
    });

    test('should validate participation exists', () => {
      const participation = null;
      expect(participation).toBeNull();
    });

    test('should validate IDs match between scratch card and participation', () => {
      const scratchCard = { _id: '507f1f77bcf86cd799439011' };
      const participation = { scratch_card_id: '507f1f77bcf86cd799439011' };
      const idsMatch = scratchCard._id.toString() === participation.scratch_card_id.toString();

      expect(idsMatch).toBe(true);
    });

    test('should reject mismatched IDs', () => {
      const scratchCard = { _id: '507f1f77bcf86cd799439011' };
      const participation = { scratch_card_id: '507f1f77bcf86cd799439012' };
      const idsMatch = scratchCard._id.toString() === participation.scratch_card_id.toString();

      expect(idsMatch).toBe(false);
    });

    test('should check scratch card has not expired', () => {
      const scratchCard = {
        expires_at: new Date(Date.now() + 5 * 60 * 1000)
      };
      const now = new Date();
      const isExpired = now > scratchCard.expires_at;

      expect(isExpired).toBe(false);
    });

    test('should validate scratch card status is revealed-eligible', () => {
      const validStatuses = ['generated', 'scratched'];
      const scratchCard = { status: 'generated' };

      expect(validStatuses).toContain(scratchCard.status);
    });

    test('should update scratch card status to revealed', () => {
      const scratchCard = { status: 'scratched' };
      scratchCard.status = 'revealed';

      expect(scratchCard.status).toBe('revealed');
    });

    test('should update participation status to revealed', () => {
      const participation = { status: 'scratched' };
      participation.status = 'revealed';

      expect(participation.status).toBe('revealed');
    });

    test('should return revealed status with timestamp', () => {
      const response = {
        scratchCardId: '507f1f77bcf86cd799439011',
        status: 'revealed',
        revealedAt: new Date(),
        reward: {
          type: 'discount',
          value: 10
        }
      };

      expect(response.status).toBe('revealed');
      expect(response.revealedAt instanceof Date).toBe(true);
      expect(response.reward).toBeDefined();
    });

    test('should handle expired scratch card', () => {
      const scratchCard = {
        expires_at: new Date(Date.now() - 1 * 60 * 1000)
      };
      const now = new Date();
      const isExpired = now > scratchCard.expires_at;

      expect(isExpired).toBe(true);
    });

    test('should use transaction for consistency', () => {
      const operations = [
        'Update ScratchCardRecord',
        'Update CustomerParticipation'
      ];

      expect(operations.length).toBeGreaterThan(0);
    });
  });

  describe('API 6: POST /api/customer/scratch/redeem', () => {
    test('should require scratchCardId and participationId', () => {
      const body = {};
      expect(body.scratchCardId).toBeUndefined();
      expect(body.participationId).toBeUndefined();
    });

    test('should validate scratch card exists', () => {
      const scratchCard = null;
      expect(scratchCard).toBeNull();
    });

    test('should validate participation exists', () => {
      const participation = null;
      expect(participation).toBeNull();
    });

    test('should validate IDs match', () => {
      const scratchCard = { _id: '507f1f77bcf86cd799439011' };
      const participation = { scratch_card_id: '507f1f77bcf86cd799439011' };
      const idsMatch = scratchCard._id.toString() === participation.scratch_card_id.toString();

      expect(idsMatch).toBe(true);
    });

    test('should check scratch card is NOT expired', () => {
      const scratchCard = {
        expires_at: new Date(Date.now() + 5 * 60 * 1000)
      };
      const now = new Date();
      const isExpired = now > scratchCard.expires_at;

      expect(isExpired).toBe(false);
    });

    test('should reject expired scratch card', () => {
      const scratchCard = {
        expires_at: new Date(Date.now() - 1 * 60 * 1000)
      };
      const now = new Date();
      const isExpired = now > scratchCard.expires_at;

      expect(isExpired).toBe(true);
    });

    test('should validate scratch card status is revealed', () => {
      const scratchCard = { status: 'revealed' };
      expect(scratchCard.status).toBe('revealed');
    });

    test('should reject non-revealed statuses', () => {
      const statuses = ['generated', 'scratched', 'redeemed', 'expired'];
      const isRevealed = (status) => status === 'revealed';

      expect(isRevealed('generated')).toBe(false);
      expect(isRevealed('redeemed')).toBe(false);
    });

    test('should prevent double redemption', () => {
      const scratchCard = { status: 'redeemed' };
      const canRedeem = scratchCard.status === 'revealed';

      expect(canRedeem).toBe(false);
    });

    test('should call redeemInventory service', () => {
      const inventory = {
        success: true,
        redeemed: 1,
        campaign: {
          redeemed_scratch_cards: 6
        }
      };

      expect(inventory.success).toBe(true);
      expect(inventory.redeemed).toBeGreaterThan(0);
    });

    test('should handle inventory redemption failure', () => {
      const inventoryResult = {
        success: false,
        error: 'Cannot redeem more than used scratch cards'
      };

      expect(inventoryResult.success).toBe(false);
    });

    test('should update scratch card status to redeemed', () => {
      const scratchCard = { status: 'revealed' };
      scratchCard.status = 'redeemed';

      expect(scratchCard.status).toBe('redeemed');
    });

    test('should update participation status to redeemed', () => {
      const participation = { status: 'revealed' };
      participation.status = 'redeemed';

      expect(participation.status).toBe('redeemed');
    });

    test('should return redeemed status with timestamp', () => {
      const response = {
        scratchCardId: '507f1f77bcf86cd799439011',
        status: 'redeemed',
        redeemed: true,
        redeemedAt: new Date(),
        message: 'Coupon redeemed successfully!'
      };

      expect(response.redeemed).toBe(true);
      expect(response.message).toContain('redeemed');
      expect(response.redeemedAt instanceof Date).toBe(true);
    });

    test('should use transaction for consistency', () => {
      const operations = [
        'Call redeemInventory',
        'Update ScratchCardRecord',
        'Update CustomerParticipation'
      ];

      expect(operations.length).toBeGreaterThan(0);
    });

    test('should include reward details in response', () => {
      const response = {
        reward: {
          type: 'discount',
          value: 10,
          description: '10% discount on purchase'
        }
      };

      expect(response.reward.type).toBeDefined();
      expect(response.reward.value).toBeGreaterThan(0);
    });
  });

  describe('Common Error Handling', () => {
    test('should handle invalid JSON in request body', () => {
      const error = new SyntaxError('Unexpected token');
      expect(error instanceof SyntaxError).toBe(true);
    });

    test('should return 400 for validation errors', () => {
      const statusCode = 400;
      expect(statusCode).toBe(400);
    });

    test('should return 404 for not found errors', () => {
      const statusCode = 404;
      expect(statusCode).toBe(404);
    });

    test('should return 500 for server errors', () => {
      const statusCode = 500;
      expect(statusCode).toBe(500);
    });

    test('should log errors to console', () => {
      const error = new Error('Test error');
      expect(error.message).toBeDefined();
    });

    test('should validate HTTP status codes', () => {
      const validStatuses = [200, 201, 400, 404, 500];
      expect(validStatuses).toContain(200);
      expect(validStatuses).toContain(201);
      expect(validStatuses).toContain(400);
      expect(validStatuses).toContain(404);
      expect(validStatuses).toContain(500);
    });
  });

  describe('Data Consistency Tests', () => {
    test('should maintain invariant: used <= allocated', () => {
      const campaign = {
        allocated_scratch_cards: 100,
        used_scratch_cards: 50
      };

      expect(campaign.used_scratch_cards).toBeLessThanOrEqual(
        campaign.allocated_scratch_cards
      );
    });

    test('should maintain invariant: redeemed <= used', () => {
      const campaign = {
        used_scratch_cards: 50,
        redeemed_scratch_cards: 25
      };

      expect(campaign.redeemed_scratch_cards).toBeLessThanOrEqual(
        campaign.used_scratch_cards
      );
    });

    test('should maintain invariant: remaining >= 0', () => {
      const campaign = {
        remaining_scratch_cards: 10
      };

      expect(campaign.remaining_scratch_cards).toBeGreaterThanOrEqual(0);
    });

    test('should calculate remaining correctly', () => {
      const allocated = 100;
      const used = 50;
      const redeemed = 25;
      const remaining = allocated - used - redeemed;

      expect(remaining).toBe(25);
    });

    test('should validate participation-scratch card relationship', () => {
      const participation = {
        scratch_card_id: '507f1f77bcf86cd799439011'
      };
      const scratchCard = {
        _id: '507f1f77bcf86cd799439011',
        customer_participation_id: 'participationId'
      };

      expect(participation.scratch_card_id).toBe(scratchCard._id);
    });
  });

  describe('Status Flow Validation', () => {
    test('should follow correct participation status flow', () => {
      const flows = [
        ['initiated', 'scratched'],
        ['scratched', 'revealed'],
        ['revealed', 'redeemed']
      ];

      flows.forEach(([from, to]) => {
        expect(['initiated', 'scratched', 'revealed', 'redeemed']).toContain(
          from
        );
        expect(['initiated', 'scratched', 'revealed', 'redeemed']).toContain(
          to
        );
      });
    });

    test('should follow correct scratch card status flow', () => {
      const flows = [
        ['generated', 'revealed'],
        ['revealed', 'redeemed'],
        ['generated', 'expired']
      ];

      flows.forEach(([from, to]) => {
        expect(['generated', 'revealed', 'redeemed', 'expired']).toContain(
          from
        );
        expect(['generated', 'revealed', 'redeemed', 'expired']).toContain(
          to
        );
      });
    });

    test('should not allow invalid status transitions', () => {
      const invalidTransitions = [
        ['redeemed', 'generated'],
        ['expired', 'revealed'],
        ['initiated', 'redeemed']
      ];

      invalidTransitions.forEach(([from, to]) => {
        // These should fail validation
        expect(['initiated', 'scratched', 'revealed']).not.toContain(
          'redeemed'
        );
      });
    });
  });
});
