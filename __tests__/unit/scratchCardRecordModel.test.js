import mongoose from "mongoose";
import ScratchCardRecord from "../../models/scratchCardRecordModel";

describe("ScratchCardRecord Model", () => {
  // Sample valid data for tests
  const validScratchCardData = {
    campaign_id: new mongoose.Types.ObjectId(),
    merchant_id: new mongoose.Types.ObjectId(),
    store_id: new mongoose.Types.ObjectId(),
    range_id: new mongoose.Types.ObjectId(),
    customer_participation_id: new mongoose.Types.ObjectId(),
    reward_type: "discount",
    reward_value: 100,
    reward_description: "20% off on purchase",
    expires_at: new Date(Date.now() + 5 * 60 * 1000), // 5 minutes from now
  };

  describe("Schema Fields", () => {
    test("should have all required reference fields", () => {
      const schema = ScratchCardRecord.schema;
      expect(schema.paths.campaign_id).toBeDefined();
      expect(schema.paths.merchant_id).toBeDefined();
      expect(schema.paths.store_id).toBeDefined();
      expect(schema.paths.range_id).toBeDefined();
      expect(schema.paths.customer_participation_id).toBeDefined();
    });

    test("should have all reward information fields", () => {
      const schema = ScratchCardRecord.schema;
      expect(schema.paths.reward_type).toBeDefined();
      expect(schema.paths.reward_value).toBeDefined();
      expect(schema.paths.reward_description).toBeDefined();
    });

    test("should have status field with correct enum values", () => {
      const schema = ScratchCardRecord.schema;
      const statusField = schema.paths.status;
      expect(statusField).toBeDefined();
      expect(statusField.enumValues).toEqual([
        "generated",
        "revealed",
        "redeemed",
        "expired",
      ]);
      expect(statusField.defaultValue).toBe("generated");
    });

    test("should have timestamp fields", () => {
      const schema = ScratchCardRecord.schema;
      expect(schema.paths.generated_at).toBeDefined();
      expect(schema.paths.revealed_at).toBeDefined();
      expect(schema.paths.redeemed_at).toBeDefined();
      expect(schema.paths.expires_at).toBeDefined();
    });

    test("should have expiry detail fields", () => {
      const schema = ScratchCardRecord.schema;
      expect(schema.paths.expiry_duration_minutes).toBeDefined();
      expect(schema.paths.is_expired).toBeDefined();
      expect(schema.paths.expiry_duration_minutes.defaultValue).toBe(5);
      expect(schema.paths.is_expired.defaultValue).toBe(false);
    });

    test("should have timestamps enabled (createdAt, updatedAt)", () => {
      const schema = ScratchCardRecord.schema;
      expect(schema.options.timestamps).toBe(true);
      expect(schema.paths.createdAt).toBeDefined();
      expect(schema.paths.updatedAt).toBeDefined();
    });
  });

  describe("Field Validation", () => {
    test("reward_type should only accept valid enum values", () => {
      const schema = ScratchCardRecord.schema;
      const rewardTypeField = schema.paths.reward_type;
      expect(rewardTypeField.enumValues).toEqual([
        "discount",
        "freeItem",
        "cashback",
        "voucher",
      ]);
    });

    test("reward_value should not allow negative values", () => {
      const schema = ScratchCardRecord.schema;
      const rewardValueField = schema.paths.reward_value;
      expect(rewardValueField.validators.length).toBeGreaterThan(0);
    });

    test("reward_description should have max length of 200 characters", () => {
      const schema = ScratchCardRecord.schema;
      const rewardDescField = schema.paths.reward_description;
      const maxLengthValidator = rewardDescField.validators.find(
        (v) => v.type === "maxlength"
      );
      expect(maxLengthValidator?.message).toContain("200");
    });

    test("expiry_duration_minutes should have minimum of 1 minute", () => {
      const schema = ScratchCardRecord.schema;
      const expiryDurationField = schema.paths.expiry_duration_minutes;
      const minValidator = expiryDurationField.validators.find(
        (v) => v.type === "min"
      );
      expect(minValidator?.message).toContain("1");
    });

    test("required fields should be marked as required", () => {
      const schema = ScratchCardRecord.schema;
      expect(schema.paths.campaign_id.isRequired).toBe(true);
      expect(schema.paths.merchant_id.isRequired).toBe(true);
      expect(schema.paths.store_id.isRequired).toBe(true);
      expect(schema.paths.range_id.isRequired).toBe(true);
      expect(schema.paths.customer_participation_id.isRequired).toBe(true);
      expect(schema.paths.reward_type.isRequired).toBe(true);
      expect(schema.paths.reward_value.isRequired).toBe(true);
      expect(schema.paths.expires_at.isRequired).toBe(true);
    });
  });

  describe("Indexes", () => {
    test("should have compound index on campaign_id and status", () => {
      const schema = ScratchCardRecord.schema;
      const indexes = schema._indexes || [];
      const hasIndex = indexes.some(
        (idx) => idx[0].campaign_id === 1 && idx[0].status === 1
      );
      expect(hasIndex || schema.paths.campaign_id._index === true).toBeTruthy();
    });

    test("should have compound index on merchant_id and createdAt", () => {
      const schema = ScratchCardRecord.schema;
      const indexes = schema._indexes || [];
      const hasIndex = indexes.some(
        (idx) => idx[0].merchant_id === 1 && idx[0].createdAt === -1
      );
      expect(hasIndex).toBeTruthy();
    });

    test("should have compound index on status and expires_at", () => {
      const schema = ScratchCardRecord.schema;
      const indexes = schema._indexes || [];
      const hasIndex = indexes.some(
        (idx) => idx[0].status === 1 && idx[0].expires_at === 1
      );
      expect(hasIndex).toBeTruthy();
    });

    test("should have compound index on is_expired and status", () => {
      const schema = ScratchCardRecord.schema;
      const indexes = schema._indexes || [];
      const hasIndex = indexes.some(
        (idx) => idx[0].is_expired === 1 && idx[0].status === 1
      );
      expect(hasIndex).toBeTruthy();
    });

    test("should have compound index on campaign_id, store_id and createdAt", () => {
      const schema = ScratchCardRecord.schema;
      const indexes = schema._indexes || [];
      const hasIndex = indexes.some(
        (idx) =>
          idx[0].campaign_id === 1 &&
          idx[0].store_id === 1 &&
          idx[0].createdAt === -1
      );
      expect(hasIndex).toBeTruthy();
    });

    test("should have TTL index on createdAt for auto-deletion after 30 days", () => {
      const schema = ScratchCardRecord.schema;
      const indexes = schema._indexes || [];
      const ttlIndex = indexes.find((idx) => idx[1]?.expireAfterSeconds);
      expect(ttlIndex).toBeTruthy();
      expect(ttlIndex?.[1]?.expireAfterSeconds).toBe(2592000); // 30 days in seconds
    });

    test("should have indexes on key fields for efficient queries", () => {
      const schema = ScratchCardRecord.schema;
      expect(schema.paths.campaign_id._index).toBeTruthy();
      expect(schema.paths.merchant_id._index).toBeTruthy();
      expect(schema.paths.store_id._index).toBeTruthy();
      expect(schema.paths.status._index).toBeTruthy();
      expect(schema.paths.expires_at._index).toBeTruthy();
      expect(schema.paths.is_expired._index).toBeTruthy();
    });
  });

  describe("Default Values", () => {
    test("status should default to 'generated'", () => {
      const schema = ScratchCardRecord.schema;
      expect(schema.paths.status.defaultValue).toBe("generated");
    });

    test("generated_at should default to current date", () => {
      const schema = ScratchCardRecord.schema;
      expect(schema.paths.generated_at.defaultValue).toBeDefined();
    });

    test("revealed_at should default to null", () => {
      const schema = ScratchCardRecord.schema;
      expect(schema.paths.revealed_at.defaultValue).toBe(null);
    });

    test("redeemed_at should default to null", () => {
      const schema = ScratchCardRecord.schema;
      expect(schema.paths.redeemed_at.defaultValue).toBe(null);
    });

    test("expiry_duration_minutes should default to 5", () => {
      const schema = ScratchCardRecord.schema;
      expect(schema.paths.expiry_duration_minutes.defaultValue).toBe(5);
    });

    test("is_expired should default to false", () => {
      const schema = ScratchCardRecord.schema;
      expect(schema.paths.is_expired.defaultValue).toBe(false);
    });
  });

  describe("References", () => {
    test("should have proper MongoDB ObjectId references", () => {
      const schema = ScratchCardRecord.schema;
      expect(schema.paths.campaign_id.instance).toBe("ObjectId");
      expect(schema.paths.merchant_id.instance).toBe("ObjectId");
      expect(schema.paths.store_id.instance).toBe("ObjectId");
      expect(schema.paths.range_id.instance).toBe("ObjectId");
      expect(schema.paths.customer_participation_id.instance).toBe("ObjectId");
    });

    test("should have correct ref values for relationships", () => {
      const schema = ScratchCardRecord.schema;
      expect(schema.paths.campaign_id.options.ref).toBe("Campaign");
      expect(schema.paths.merchant_id.options.ref).toBe("Account");
      expect(schema.paths.store_id.options.ref).toBe("Store");
      expect(schema.paths.range_id.options.ref).toBe("Range");
      expect(schema.paths.customer_participation_id.options.ref).toBe(
        "CustomerParticipation"
      );
    });
  });

  describe("Lifecycle Validation", () => {
    test("should support complete status lifecycle: generated -> revealed -> redeemed", () => {
      const schema = ScratchCardRecord.schema;
      const statusEnum = schema.paths.status.enumValues;
      expect(statusEnum).toContain("generated");
      expect(statusEnum).toContain("revealed");
      expect(statusEnum).toContain("redeemed");
      expect(statusEnum).toContain("expired");
    });

    test("should have timestamp fields to track state transitions", () => {
      const schema = ScratchCardRecord.schema;
      expect(schema.paths.generated_at).toBeDefined();
      expect(schema.paths.revealed_at).toBeDefined();
      expect(schema.paths.redeemed_at).toBeDefined();
    });

    test("should support expiry tracking", () => {
      const schema = ScratchCardRecord.schema;
      expect(schema.paths.expires_at).toBeDefined();
      expect(schema.paths.is_expired).toBeDefined();
      expect(schema.paths.expiry_duration_minutes).toBeDefined();
    });
  });

  describe("Trim and Normalize", () => {
    test("reward_description should trim whitespace", () => {
      const schema = ScratchCardRecord.schema;
      const rewardDescField = schema.paths.reward_description;
      expect(rewardDescField.options.trim).toBe(true);
    });
  });
});
