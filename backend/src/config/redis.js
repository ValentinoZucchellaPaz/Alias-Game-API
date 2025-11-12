import Redis from "ioredis";
import dotenv from "dotenv";
import { logger } from "../utils/logger.js";
dotenv.config();

class RedisClientSingleton {
  static instance = null;
  static connected = false;

  static async getInstance(timeoutMs = 2000) {
    if (RedisClientSingleton.instance && RedisClientSingleton.connected) {
      return RedisClientSingleton.instance;
    }

    // Create new ioredis client
    const client = new Redis({
      host: process.env.REDIS_HOST || "localhost",
      port: process.env.REDIS_PORT ? Number(process.env.REDIS_PORT) : 6379,
      password: process.env.REDIS_PASSWORD || undefined,
      lazyConnect: true, // manual connect for timeout race
    });

    client.on("error", (err) => logger.error("❌ Redis Client Error:", err));
    client.on("end", () => {
      RedisClientSingleton.connected = false;
      logger.warn("⚠️ Redis connection closed");
    });

    // timeout protection
    const connectPromise = client.connect();
    const timeoutPromise = new Promise((_, reject) =>
      setTimeout(() => reject(new Error("Redis connection timeout")), timeoutMs)
    );

    try {
      await Promise.race([connectPromise, timeoutPromise]);
      RedisClientSingleton.instance = client;
      RedisClientSingleton.connected = true;
      logger.info("✅ Connected to Redis (singleton, ioredis)");
      return client;
    } catch (err) {
      logger.error("❌ Redis connection failed:", err.message);
      client.disconnect();
      throw err;
    }
  }

  static async disconnect() {
    if (RedisClientSingleton.instance && RedisClientSingleton.connected) {
      await RedisClientSingleton.instance.quit();
      RedisClientSingleton.connected = false;
      logger.info("Redis disconnected!");
    }
  }
}

class RedisWrapper {
  client;
  ttl;
  prefix;

  constructor({ ttl = 3600, prefix = "" }) {
    this.ttl = ttl;
    this.prefix = prefix;
    this.client = null; // cannot put async code inside a constructor => init()
  }

  async init() {
    if (!this.client) {
      this.client = await RedisClientSingleton.getInstance();
    }
    return this;
  }

  _key(key) {
    return `${this.prefix}${key}`;
  }

  async set(key, value, ttl) {
    await this.init();
    await this.client.set(this._key(key), JSON.stringify(value), "EX", ttl ?? this.ttl);
  }

  async get(key) {
    await this.init();
    const value = await this.client.get(this._key(key));
    return value ? JSON.parse(value) : null;
  }

  async del(key) {
    await this.init();
    // Remove keys from index tracking
    await this.client.zrem(this._key("index"), this._key(key));
    // Delete the actual hash asociated with the key
    await this.client.del(this._key(key));
  }

  /**
   * Save a hash in redis, and add to index of keys for tracking all saved hashes
   * @param {*} key
   * @param {*} data
   * @param {*} ttl
   */
  // Note: Before it used just hset without index, there was no easy way to retrieve all saved rooms
  // Now uses `zaad` also, basically a sorted set to have an index of keys w a timestamp
  // Everytime a hash is saved (ex. a room), its key is added to this sorted set(`this._key("index")` or for ex `alias-game:room:index`) w actual timestamp.
  // For retrieving all rooms use `zrange` in this index to get all saved keys
  async hSet(key, data, ttl) {
    await this.init();
    logger.log("redisClient.hSet (this is being save in redis):", this._key(key), data, ttl);

    // adds key as a value in an index
    await this.client.zadd(this._key("index"), Date.now(), this._key(key));
    // save room info
    await this.client.hset(this._key(key), data);
    // set expiration time
    if (ttl ?? this.ttl) await this.client.expire(this._key(key), ttl ?? this.ttl);
  }

  async hGetAll(key) {
    await this.init();
    const data = await this.client.hgetall(this._key(key));
    logger.log("redisClient.hGetAll (this is being retrieve from redis):", this._key(key), data);
    return Object.keys(data).length ? data : null;
  }

  // Get all items from a namespace ex all rooms
  async getAllFromNamespace(limit = 10) {
    await this.init();

    // Get all keys from index zaad
    const keys = await this.client.zrange(this._key("index"), 0, limit - 1);
    // Get all hashed asociated to that key
    const values = await Promise.all(
      keys.map(async (key) => {
        let rooms = await this.client.hgetall(key);
        return rooms;
      })
    );
    // filter nulls and return
    return values.filter((value) => value && Object.keys(value).length > 0);
  }
}

// Export client to other modules
export async function getRedisClient() {
  return await RedisClientSingleton.getInstance();
}

const tokenCache = new RedisWrapper({ ttl: 24 * 3600, prefix: "alias-game:token:" }); // min duration token 1 day
const roomCache = new RedisWrapper({ ttl: 6 * 3600, prefix: "alias-game:room:" }); // code:hSet
const gameCache = new RedisWrapper({ ttl: 6 * 3600, prefix: "alias-game:game:" }); // code:hSet
const socketCache = new RedisWrapper({
  ttl: 6 * 3600,
  prefix: "alias-game:userSocket:",
}); // userId:socketId
const healthTestCache = new RedisWrapper({ ttl: 600, prefix: "health:" });

export { tokenCache, roomCache, gameCache, socketCache, RedisClientSingleton, healthTestCache };
