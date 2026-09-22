// Applies every schema-defined index (and creates missing collections).
// Auto-indexing is disabled in production (see lib/connectDB.js) because it
// fired 270+ commands at the DB on every cold start; run this instead after
// a deploy that adds or changes an index:
//   npm run db:sync-indexes
// Reads MONGODB_URI (or DB_URL) from the environment / .env.local.
import fs from 'fs';
import path from 'path';
import mongoose from 'mongoose';

const modelsDir = path.resolve('models');
const uri = process.env.MONGODB_URI || process.env.DB_URL;
if (!uri) {
  console.error('MONGODB_URI (or DB_URL) is not set');
  process.exit(1);
}

await mongoose.connect(uri, { autoIndex: false, autoCreate: false });

for (const file of fs.readdirSync(modelsDir).filter((f) => f.endsWith('.js'))) {
  try {
    await import(path.join(modelsDir, file));
  } catch (err) {
    console.warn(`skip ${file}: ${err.message}`);
  }
}

for (const name of mongoose.modelNames()) {
  const Model = mongoose.model(name);
  const started = Date.now();
  try {
    await Model.createCollection().catch(() => {});
    await Model.createIndexes();
    console.log(`✓ ${name} (${Date.now() - started}ms)`);
  } catch (err) {
    console.error(`✗ ${name}: ${err.message}`);
  }
}

await mongoose.disconnect();
