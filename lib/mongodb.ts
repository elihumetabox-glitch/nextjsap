import mongoose, { type Mongoose } from "mongoose";

function getMongoUri(): string {
  const uri = process.env.MONGODB_URI;

  if (!uri) {
    throw new Error("Missing MONGODB_URI environment variable.");
  }

  return uri;
}

interface MongooseCache {
  connection: Mongoose | null;
  promise: Promise<Mongoose> | null;
}

// Persist the cache across Next.js hot reloads in development.
const globalWithMongoose = globalThis as typeof globalThis & {
  mongoose?: MongooseCache;
};

const cached =
  globalWithMongoose.mongoose ??
  (globalWithMongoose.mongoose = { connection: null, promise: null });

/** Returns a reusable connection to the configured MongoDB database. */
export async function connectToDatabase(): Promise<Mongoose> {
  if (cached.connection) {
    return cached.connection;
  }

  // Reuse an in-flight connection so concurrent requests do not open duplicates.
  cached.promise ??= mongoose.connect(getMongoUri());

  try {
    cached.connection = await cached.promise;
    return cached.connection;
  } catch (error) {
    // Allow a later request to retry if this connection attempt fails.
    cached.promise = null;
    throw error;
  }
}