import { createClient } from "redis";

// Create Redis clients but don't connect at module load time
let redis: any = null;
let redisPublisher: any = null;

// Initialize Redis client with proper error handling
async function initRedis() {
  if (!process.env.REDIS_URL) {
    console.warn("REDIS_URL not configured, Redis functionality will be disabled");
    return null;
  }

  try {
    const client = createClient({
      url: process.env.REDIS_URL,
    });
    
    client.on("error", (err) => {
      console.log("Redis Client Error", err);
    });
    
    await client.connect();
    return client;
  } catch (error) {
    console.warn("Failed to connect to Redis:", error);
    return null;
  }
}

// Initialize Redis publisher with proper error handling
async function initRedisPublisher() {
  if (!process.env.REDIS_URL) {
    console.warn("REDIS_URL not configured, Redis publisher functionality will be disabled");
    return null;
  }

  try {
    const client = createClient({
      url: process.env.REDIS_URL,
    });
    
    client.on("error", (err) => {
      console.log("Publisher Redis Client Error", err);
    });
    
    await client.connect();
    return client;
  } catch (error) {
    console.warn("Failed to connect to Redis publisher:", error);
    return null;
  }
}

// Lazy initialization functions
export async function getRedis() {
  if (redis === null) {
    redis = await initRedis();
  }
  return redis;
}

export async function getRedisPublisher() {
  if (redisPublisher === null) {
    redisPublisher = await initRedisPublisher();
  }
  return redisPublisher;
}
