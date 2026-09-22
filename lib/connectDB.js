import dotenv from 'dotenv';
import mongoose from 'mongoose';

dotenv.config();

const MONGODB_URI = process.env.MONGODB_URI || process.env.DB_URL;

if (!MONGODB_URI) {
  throw new Error('MONGODB_URI (or DB_URL) environment variable is not defined');
}

// Mongoose's default autoIndex/autoCreate runs createIndexes/create for EVERY
// registered model as soon as a process connects. With ~70 models / 200+
// indexes that is 270+ commands fired at the database on every cold start
// (each serverless instance, each restart), queued on a 10-connection pool
// ahead of the real queries — which is what made the first dashboard loads
// take seconds. Index definitions still live in the schemas; in production
// they are applied on demand with `npm run db:sync-indexes` (run after a
// deploy that adds/changes an index). Set MONGOOSE_AUTO_INDEX=true to opt
// back in per environment. Development keeps the old behaviour.
const AUTO_INDEX =
  process.env.MONGOOSE_AUTO_INDEX != null
    ? process.env.MONGOOSE_AUTO_INDEX === 'true'
    : process.env.NODE_ENV === 'development';

mongoose.set('autoIndex', AUTO_INDEX);
mongoose.set('autoCreate', AUTO_INDEX);

let cached = global.mongoose;

if (!cached) {
  cached = global.mongoose = { conn: null, promise: null };
}

export async function connectDB() {
  if (cached.conn) {
    return cached.conn;
  }

  if (!cached.promise) {
    cached.promise = mongoose
      .connect(MONGODB_URI, {
        bufferCommands: false,
        maxPoolSize: 10,
        autoIndex: AUTO_INDEX,
        autoCreate: AUTO_INDEX,
      })
      .then((mongooseInstance) => {
        console.log('MongoDB connected');
        return mongooseInstance;
      });
  }

  try {
    cached.conn = await cached.promise;
  } catch (error) {
    cached.promise = null;
    throw error;
  }

  return cached.conn;
}

export default connectDB;
