import dns from "node:dns";
import mongoose, { type Mongoose } from "mongoose";

function applyMongoDns(): void {
  // On Vercel / AWS Lambda, use native system DNS resolver.
  // Overriding DNS on Vercel can cause SRV query timeouts because outbound port 53 to custom IPs is blocked.
  if (process.env.VERCEL) {
    return;
  }

  const customServers = process.env.MONGODB_DNS_SERVERS
    ?.split(",")
    .map((server) => server.trim())
    .filter(Boolean);

  const servers = customServers?.length
    ? customServers
    : ["8.8.8.8", "8.8.4.4", "1.1.1.1"];

  try {
    dns.setServers(servers);
    console.log("[MongoDB DNS] Configured DNS servers:", dns.getServers());
  } catch (error) {
    console.warn("[MongoDB DNS] Could not set DNS servers for MongoDB:", error);
  }
}

// Must run at module load time — before any mongoose.connect() SRV lookup.
// Node.js c-ares uses TCP for SRV queries; many home/ISP routers block outbound
// TCP:53, causing querySrv ECONNREFUSED. External DNS servers (Google/Cloudflare)
// support TCP:53 and bypass this restriction.
applyMongoDns();

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

const MAX_CONNECTION_ATTEMPTS = 3;
const INITIAL_RETRY_DELAY_MS = 250;

// Persist the cache across Next.js hot reloads in development.
const globalWithMongoose = globalThis as typeof globalThis & {
  mongoose?: MongooseCache;
};

const cached =
    globalWithMongoose.mongoose ??
    (globalWithMongoose.mongoose = { connection: null, promise: null });

function isRetryableConnectionError(error: unknown): boolean {
  if (!(error instanceof Error)) {
    return false;
  }

  const errorWithCause = error as Error & { cause?: unknown; code?: string };
  const retryableCodes = new Set([
    "ECONNREFUSED",
    "ECONNRESET",
    "EAI_AGAIN",
    "ENOTFOUND",
    "ETIMEOUT",
    "ETIMEDOUT",
  ]);

  return (
    (typeof errorWithCause.code === "string" && retryableCodes.has(errorWithCause.code)) ||
    (error.name === "MongoServerSelectionError" ||
      error.name === "MongooseServerSelectionError") ||
    isRetryableConnectionError(errorWithCause.cause)
  );
}

function wait(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function connectWithRetry(): Promise<Mongoose> {
  let lastError: unknown;

  for (let attempt = 1; attempt <= MAX_CONNECTION_ATTEMPTS; attempt += 1) {
    try {
      return await mongoose.connect(getMongoUri());
    } catch (error) {
      lastError = error;

      if (attempt === MAX_CONNECTION_ATTEMPTS || !isRetryableConnectionError(error)) {
        throw error;
      }

      applyMongoDns();
      await wait(INITIAL_RETRY_DELAY_MS * 2 ** (attempt - 1));
    }
  }

  throw lastError;
}

/** Returns a reusable connection to the configured MongoDB database. */
export async function connectToDatabase(): Promise<Mongoose> {
  if (cached.connection) {
    return cached.connection;
  }

  // Ensure DNS servers are applied in case the runtime re-initialized
  applyMongoDns();

  // Reuse an in-flight connection so concurrent requests do not open duplicates.
  cached.promise ??= connectWithRetry();

  try {
    cached.connection = await cached.promise;
    return cached.connection;
  } catch (error) {
    // Allow a later request to retry if this connection attempt fails.
    cached.promise = null;
    throw error;
  }
}
