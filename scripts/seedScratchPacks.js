/**
 * Seed Script: Create available scratch packs
 *
 * Usage: node scripts/seedScratchPacks.js
 *
 * Creates 4 standard scratch pack options for purchase
 */

const mongoose = require("mongoose");
const path = require("path");

// Import models
const ScratchPack = require("../models/scratchPackModel").default;

// MongoDB connection
const MONGODB_URI = process.env.MONGODB_URI || "mongodb://localhost:27017/scratchx";

async function seedScratchPacks() {
  try {
    console.log("🌱 Seeding Scratch Packs...");
    console.log("Connecting to MongoDB:", MONGODB_URI);

    await mongoose.connect(MONGODB_URI);
    console.log("✓ Connected to MongoDB\n");

    // Clear existing packs
    const deleted = await ScratchPack.deleteMany({});
    console.log(`✓ Cleared ${deleted.deletedCount} existing packs\n`);

    // Define scratch packs
    const packs = [
      {
        name: "1K",
        quantity: 1000,
        price: {
          amount: 4999, // ₹49.99 in paise
          currency: "INR",
        },
        discount: {
          percentage: 0,
          amountSaved: 0,
        },
        validityDays: 365,
        isActive: true,
        isPopular: false,
        isBestValue: false,
        sortOrder: 1,
        description: "1,000 scratches for small campaigns",
        maxPacksPerMonth: -1,
        costPerUnit: 5, // paise per scratch
      },
      {
        name: "5K",
        quantity: 5000,
        price: {
          amount: 22499, // ₹224.99 in paise
          currency: "INR",
        },
        discount: {
          percentage: 10,
          amountSaved: 2500,
        },
        validityDays: 365,
        isActive: true,
        isPopular: true,
        isBestValue: false,
        sortOrder: 2,
        description: "5,000 scratches with 10% discount",
        maxPacksPerMonth: -1,
        costPerUnit: 4.5,
      },
      {
        name: "10K",
        quantity: 10000,
        price: {
          amount: 39999, // ₹399.99 in paise
          currency: "INR",
        },
        discount: {
          percentage: 20,
          amountSaved: 10000,
        },
        validityDays: 365,
        isActive: true,
        isPopular: false,
        isBestValue: true,
        sortOrder: 3,
        description: "10,000 scratches with 20% discount - Best Value",
        maxPacksPerMonth: -1,
        costPerUnit: 4,
      },
      {
        name: "50K",
        quantity: 50000,
        price: {
          amount: 179999, // ₹1799.99 in paise
          currency: "INR",
        },
        discount: {
          percentage: 25,
          amountSaved: 60000,
        },
        validityDays: 365,
        isActive: true,
        isPopular: false,
        isBestValue: false,
        sortOrder: 4,
        description: "50,000 scratches with 25% discount - Bulk Purchase",
        maxPacksPerMonth: -1,
        costPerUnit: 3.6,
      },
    ];

    // Insert packs
    const created = await ScratchPack.insertMany(packs);
    console.log(`✓ Created ${created.length} scratch packs:\n`);

    created.forEach((pack) => {
      const discountText = pack.discount.percentage > 0
        ? ` | ${pack.discount.percentage}% OFF`
        : "";
      console.log(
        `  • ${pack.name} Pack: ${pack.quantity.toLocaleString()} scratches | ₹${(pack.price.amount / 100).toFixed(2)}${discountText}`
      );
    });

    console.log("\n✅ Seed data created successfully!\n");

    // Show purchase pricing
    console.log("💰 Pricing Summary:");
    console.log("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━");
    created.forEach((pack) => {
      const finalPrice = pack.price.amount - pack.discount.amountSaved;
      const costPerUnit = (finalPrice / pack.quantity) * 100; // paise to paisa
      console.log(
        `${pack.quantity.toLocaleString()}: ₹${(finalPrice / 100).toFixed(2)} (${costPerUnit.toFixed(4)}p per scratch)`
      );
    });
    console.log("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n");

    await mongoose.disconnect();
    console.log("✓ Disconnected from MongoDB");
    process.exit(0);
  } catch (error) {
    console.error("❌ Error seeding scratch packs:", error);
    process.exit(1);
  }
}

// Run seed
seedScratchPacks();
