import mongoose from 'mongoose';
import CustomerParticipation from '../../models/customerParticipationModel';

describe('CustomerParticipation Model', () => {
  // Mock ObjectId for testing
  const mockCampaignId = new mongoose.Types.ObjectId();
  const mockMerchantId = new mongoose.Types.ObjectId();
  const mockStoreId = new mongoose.Types.ObjectId();
  const mockScratchCardId = new mongoose.Types.ObjectId();
  const mockRangeId = new mongoose.Types.ObjectId();

  const validParticipationData = {
    campaign_id: mockCampaignId,
    merchant_id: mockMerchantId,
    store_id: mockStoreId,
    scratch_card_id: mockScratchCardId,
    range_id: mockRangeId,
    customer_name: 'John Doe',
    customer_mobile: '9876543210',
    customer_email: 'john@example.com',
    customer_consent: true,
    bill_amount: 1000,
    customer_latitude: 28.7041,
    customer_longitude: 77.1025,
    distance_from_store_meters: 500
  };

  describe('Model Schema Structure', () => {
    test('should export CustomerParticipation model', () => {
      expect(CustomerParticipation).toBeDefined();
      expect(CustomerParticipation.modelName).toBe('CustomerParticipation');
    });

    test('should have all required fields in schema', () => {
      const schema = CustomerParticipation.schema;
      const requiredFields = [
        'campaign_id',
        'merchant_id',
        'store_id',
        'scratch_card_id',
        'range_id',
        'customer_name',
        'customer_mobile',
        'customer_consent',
        'bill_amount',
        'customer_latitude',
        'customer_longitude'
      ];

      requiredFields.forEach(field => {
        expect(schema.paths[field]).toBeDefined();
      });
    });

    test('should have timestamps option enabled', () => {
      const schema = CustomerParticipation.schema;
      expect(schema.options.timestamps).toBe(true);
    });

    test('should have createdAt and updatedAt fields', () => {
      const schema = CustomerParticipation.schema;
      expect(schema.paths.createdAt).toBeDefined();
      expect(schema.paths.updatedAt).toBeDefined();
    });
  });

  describe('Field Validation', () => {
    test('should create a valid document without validation error', () => {
      const doc = new CustomerParticipation(validParticipationData);
      const errors = doc.validateSync();
      expect(errors).toBeUndefined();
    });

    test('should require campaign_id', () => {
      const data = { ...validParticipationData };
      delete data.campaign_id;
      const doc = new CustomerParticipation(data);
      const errors = doc.validateSync();
      expect(errors).toBeDefined();
      expect(errors.errors.campaign_id).toBeDefined();
      expect(errors.errors.campaign_id.message).toBe('Campaign ID is required');
    });

    test('should require merchant_id', () => {
      const data = { ...validParticipationData };
      delete data.merchant_id;
      const doc = new CustomerParticipation(data);
      const errors = doc.validateSync();
      expect(errors).toBeDefined();
      expect(errors.errors.merchant_id.message).toBe('Merchant ID is required');
    });

    test('should require store_id', () => {
      const data = { ...validParticipationData };
      delete data.store_id;
      const doc = new CustomerParticipation(data);
      const errors = doc.validateSync();
      expect(errors).toBeDefined();
      expect(errors.errors.store_id.message).toBe('Store ID is required');
    });

    test('should require scratch_card_id', () => {
      const data = { ...validParticipationData };
      delete data.scratch_card_id;
      const doc = new CustomerParticipation(data);
      const errors = doc.validateSync();
      expect(errors).toBeDefined();
      expect(errors.errors.scratch_card_id.message).toBe('Scratch card ID is required');
    });

    test('should require range_id', () => {
      const data = { ...validParticipationData };
      delete data.range_id;
      const doc = new CustomerParticipation(data);
      const errors = doc.validateSync();
      expect(errors).toBeDefined();
      expect(errors.errors.range_id.message).toBe('Range ID is required');
    });

    test('should require customer_name', () => {
      const data = { ...validParticipationData };
      delete data.customer_name;
      const doc = new CustomerParticipation(data);
      const errors = doc.validateSync();
      expect(errors).toBeDefined();
      expect(errors.errors.customer_name.message).toBe('Customer name is required');
    });

    test('should enforce customer_name maxlength (100 characters)', () => {
      const data = {
        ...validParticipationData,
        customer_name: 'a'.repeat(101)
      };
      const doc = new CustomerParticipation(data);
      const errors = doc.validateSync();
      expect(errors).toBeDefined();
    });

    test('should require customer_mobile', () => {
      const data = { ...validParticipationData };
      delete data.customer_mobile;
      const doc = new CustomerParticipation(data);
      const errors = doc.validateSync();
      expect(errors).toBeDefined();
      expect(errors.errors.customer_mobile.message).toBe('Mobile number is required');
    });

    test('should validate customer_mobile format (10 digits)', () => {
      const invalidNumbers = ['12345', '1234567890a', '', '999'];
      invalidNumbers.forEach(mobile => {
        const data = { ...validParticipationData, customer_mobile: mobile };
        const doc = new CustomerParticipation(data);
        const errors = doc.validateSync();
        expect(errors).toBeDefined();
      });
    });

    test('should accept valid 10-digit mobile numbers', () => {
      const validNumbers = ['9876543210', '1234567890', '0123456789'];
      validNumbers.forEach(mobile => {
        const data = { ...validParticipationData, customer_mobile: mobile };
        const doc = new CustomerParticipation(data);
        const errors = doc.validateSync();
        expect(errors).toBeUndefined();
      });
    });

    test('should enforce customer_email maxlength (100 characters)', () => {
      const data = {
        ...validParticipationData,
        customer_email: 'a'.repeat(91) + '@example.com'
      };
      const doc = new CustomerParticipation(data);
      const errors = doc.validateSync();
      expect(errors).toBeDefined();
    });

    test('should default customer_consent to false when not provided', () => {
      const data = { ...validParticipationData };
      delete data.customer_consent;
      const doc = new CustomerParticipation(data);
      const errors = doc.validateSync();
      // No error since it has a default value
      expect(doc.customer_consent).toBe(false);
    });

    test('should default customer_consent to false', () => {
      const data = { ...validParticipationData };
      delete data.customer_consent;
      const doc = new CustomerParticipation(data);
      expect(doc.customer_consent).toBe(false);
    });

    test('should require bill_amount', () => {
      const data = { ...validParticipationData };
      delete data.bill_amount;
      const doc = new CustomerParticipation(data);
      const errors = doc.validateSync();
      expect(errors).toBeDefined();
      expect(errors.errors.bill_amount.message).toBe('Bill amount is required');
    });

    test('should enforce bill_amount minimum (non-negative)', () => {
      const data = { ...validParticipationData, bill_amount: -100 };
      const doc = new CustomerParticipation(data);
      const errors = doc.validateSync();
      expect(errors).toBeDefined();
    });

    test('should accept bill_amount of 0', () => {
      const data = { ...validParticipationData, bill_amount: 0 };
      const doc = new CustomerParticipation(data);
      const errors = doc.validateSync();
      expect(errors).toBeUndefined();
    });

    test('should require customer_latitude', () => {
      const data = { ...validParticipationData };
      delete data.customer_latitude;
      const doc = new CustomerParticipation(data);
      const errors = doc.validateSync();
      expect(errors).toBeDefined();
      expect(errors.errors.customer_latitude.message).toBe('Customer latitude is required');
    });

    test('should validate customer_latitude range (-90 to 90)', () => {
      const invalidValues = [-91, 91, -180, 180];
      invalidValues.forEach(value => {
        const data = { ...validParticipationData, customer_latitude: value };
        const doc = new CustomerParticipation(data);
        const errors = doc.validateSync();
        expect(errors).toBeDefined();
      });
    });

    test('should accept valid customer_latitude values', () => {
      const validValues = [-90, -45, 0, 45, 90];
      validValues.forEach(value => {
        const data = { ...validParticipationData, customer_latitude: value };
        const doc = new CustomerParticipation(data);
        const errors = doc.validateSync();
        expect(errors).toBeUndefined();
      });
    });

    test('should require customer_longitude', () => {
      const data = { ...validParticipationData };
      delete data.customer_longitude;
      const doc = new CustomerParticipation(data);
      const errors = doc.validateSync();
      expect(errors).toBeDefined();
      expect(errors.errors.customer_longitude.message).toBe('Customer longitude is required');
    });

    test('should validate customer_longitude range (-180 to 180)', () => {
      const invalidValues = [-181, 181, -270, 270];
      invalidValues.forEach(value => {
        const data = { ...validParticipationData, customer_longitude: value };
        const doc = new CustomerParticipation(data);
        const errors = doc.validateSync();
        expect(errors).toBeDefined();
      });
    });

    test('should accept valid customer_longitude values', () => {
      const validValues = [-180, -90, 0, 90, 180];
      validValues.forEach(value => {
        const data = { ...validParticipationData, customer_longitude: value };
        const doc = new CustomerParticipation(data);
        const errors = doc.validateSync();
        expect(errors).toBeUndefined();
      });
    });

    test('should default distance_from_store_meters to 0', () => {
      const data = { ...validParticipationData };
      delete data.distance_from_store_meters;
      const doc = new CustomerParticipation(data);
      expect(doc.distance_from_store_meters).toBe(0);
    });

    test('should enforce distance_from_store_meters minimum', () => {
      const data = { ...validParticipationData, distance_from_store_meters: -10 };
      const doc = new CustomerParticipation(data);
      const errors = doc.validateSync();
      expect(errors).toBeDefined();
    });

    test('should validate status enum', () => {
      const validStatuses = ['initiated', 'verified', 'scratched', 'revealed', 'redeemed', 'expired', 'failed'];
      validStatuses.forEach(status => {
        const data = { ...validParticipationData, status };
        const doc = new CustomerParticipation(data);
        const errors = doc.validateSync();
        expect(errors).toBeUndefined();
      });
    });

    test('should reject invalid status', () => {
      const data = { ...validParticipationData, status: 'invalid_status' };
      const doc = new CustomerParticipation(data);
      const errors = doc.validateSync();
      expect(errors).toBeDefined();
    });

    test('should default status to initiated', () => {
      const data = { ...validParticipationData };
      delete data.status;
      const doc = new CustomerParticipation(data);
      expect(doc.status).toBe('initiated');
    });

    test('should default reward_id to null', () => {
      const data = { ...validParticipationData };
      delete data.reward_id;
      const doc = new CustomerParticipation(data);
      expect(doc.reward_id).toBeNull();
    });

    test('should allow null for optional timestamp fields', () => {
      const doc = new CustomerParticipation(validParticipationData);
      expect(doc.revealed_at).toBeNull();
      expect(doc.redeemed_at).toBeNull();
      expect(doc.expires_at).toBeNull();
    });

    test('should generate generated_at timestamp', () => {
      const doc = new CustomerParticipation(validParticipationData);
      expect(doc.generated_at).toBeDefined();
      expect(doc.generated_at instanceof Date).toBe(true);
    });
  });

  describe('Schema Indexes', () => {
    test('should have indexes defined on schema', () => {
      const schema = CustomerParticipation.schema;
      const indexes = schema._indexes;
      expect(indexes).toBeDefined();
      expect(indexes.length).toBeGreaterThan(0);
    });

    test('should have index on campaign_id', () => {
      const schema = CustomerParticipation.schema;
      const paths = schema.paths.campaign_id;
      expect(paths.options.index).toBe(true);
    });

    test('should have index on merchant_id', () => {
      const schema = CustomerParticipation.schema;
      const paths = schema.paths.merchant_id;
      expect(paths.options.index).toBe(true);
    });

    test('should have index on store_id', () => {
      const schema = CustomerParticipation.schema;
      const paths = schema.paths.store_id;
      expect(paths.options.index).toBe(true);
    });

    test('should have index on customer_mobile', () => {
      const schema = CustomerParticipation.schema;
      const paths = schema.paths.customer_mobile;
      expect(paths.options.index).toBe(true);
    });

    test('should have index on status', () => {
      const schema = CustomerParticipation.schema;
      const paths = schema.paths.status;
      expect(paths.options.index).toBe(true);
    });

    test('should have index on expires_at', () => {
      const schema = CustomerParticipation.schema;
      const paths = schema.paths.expires_at;
      expect(paths.options.index).toBe(true);
    });
  });

  describe('Type Validation', () => {
    test('customer_name should be String type', () => {
      const schema = CustomerParticipation.schema;
      expect(schema.paths.customer_name.instance).toBe('String');
    });

    test('bill_amount should be Number type', () => {
      const schema = CustomerParticipation.schema;
      expect(schema.paths.bill_amount.instance).toBe('Number');
    });

    test('customer_latitude should be Number type', () => {
      const schema = CustomerParticipation.schema;
      expect(schema.paths.customer_latitude.instance).toBe('Number');
    });

    test('customer_consent should be Boolean type', () => {
      const schema = CustomerParticipation.schema;
      expect(schema.paths.customer_consent.instance).toBe('Boolean');
    });

    test('campaign_id should be ObjectId type', () => {
      const schema = CustomerParticipation.schema;
      expect(schema.paths.campaign_id.instance).toBe('ObjectId');
    });

    test('merchant_id should be ObjectId type', () => {
      const schema = CustomerParticipation.schema;
      expect(schema.paths.merchant_id.instance).toBe('ObjectId');
    });

    test('store_id should be ObjectId type', () => {
      const schema = CustomerParticipation.schema;
      expect(schema.paths.store_id.instance).toBe('ObjectId');
    });

    test('scratch_card_id should be ObjectId type', () => {
      const schema = CustomerParticipation.schema;
      expect(schema.paths.scratch_card_id.instance).toBe('ObjectId');
    });

    test('range_id should be ObjectId type', () => {
      const schema = CustomerParticipation.schema;
      expect(schema.paths.range_id.instance).toBe('ObjectId');
    });
  });

  describe('Trim and Lowercase Options', () => {
    test('should trim customer_name field', () => {
      const data = {
        ...validParticipationData,
        customer_name: '  John Doe  '
      };
      const doc = new CustomerParticipation(data);
      expect(doc.customer_name).toBe('John Doe');
    });

    test('should trim customer_email field', () => {
      const data = {
        ...validParticipationData,
        customer_email: '  John@Example.COM  '
      };
      const doc = new CustomerParticipation(data);
      expect(doc.customer_email).toBe('john@example.com');
    });

    test('should convert customer_email to lowercase', () => {
      const data = {
        ...validParticipationData,
        customer_email: 'John@Example.COM'
      };
      const doc = new CustomerParticipation(data);
      expect(doc.customer_email).toBe('john@example.com');
    });
  });

  describe('References', () => {
    test('campaign_id should reference Campaign model', () => {
      const schema = CustomerParticipation.schema;
      const ref = schema.paths.campaign_id.options.ref;
      expect(ref).toBe('Campaign');
    });

    test('merchant_id should reference Account model', () => {
      const schema = CustomerParticipation.schema;
      const ref = schema.paths.merchant_id.options.ref;
      expect(ref).toBe('Account');
    });

    test('store_id should reference Store model', () => {
      const schema = CustomerParticipation.schema;
      const ref = schema.paths.store_id.options.ref;
      expect(ref).toBe('Store');
    });

    test('scratch_card_id should reference ScratchCardRecord model', () => {
      const schema = CustomerParticipation.schema;
      const ref = schema.paths.scratch_card_id.options.ref;
      expect(ref).toBe('ScratchCardRecord');
    });

    test('range_id should reference Range model', () => {
      const schema = CustomerParticipation.schema;
      const ref = schema.paths.range_id.options.ref;
      expect(ref).toBe('Range');
    });
  });
});
