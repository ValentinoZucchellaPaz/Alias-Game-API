// src/config/redis.js
import { createClient } from "redis";
import dotenv from "dotenv";
dotenv.config();

class Redis {
  client;
  ttl;
  prefix;
  connected = false;

  constructor({ ttl = 3600, prefix = "" }) {
    this.ttl = ttl;
    this.prefix = prefix;

    if (!this.client) {
      this.client = createClient({
        url:
          process.env.REDIS_URL ||
          `redis://${process.env.REDIS_HOST || "localhost"}:${process.env.REDIS_PORT || 6379}`,
        password: process.env.REDIS_PASSWORD || undefined,
      });
      this.client.on("error", (err) => console.error("❌ Redis Client Error:", err));
    }
  }

  _key(key) {
    return `${this.prefix}${key}`;
  }

  // new implementation to avoid unresolved promise (client connection) if redis not available
  async connectRedis(timeoutMs = 2000) {
    if (this.connected) return;

    const connectPromise = this.client.connect();

    const timeoutPromise = new Promise((_, reject) =>
      setTimeout(() => reject(new Error("Redis connection timeout")), timeoutMs)
    );

    try {
      await Promise.race([connectPromise, timeoutPromise]);
      this.connected = true;
      console.log("✅ Connected to Redis");
    } catch (err) {
      console.error("❌ Redis connection failed:", err.message);
      throw err;
    }
  }

  async set(key, value, ttl) {
    await this.connectRedis();
    await this.client.set(this._key(key), JSON.stringify(value), {
      EX: ttl ?? this.ttl,
    });
  }

  async get(key) {
    await this.connectRedis();
    const value = await this.client.get(this._key(key));
    return value ? JSON.parse(value) : null;
  }

  async del(key) {
    await this.connectRedis();
    await this.client.del(this._key(key));
  }

  async disconnect() {
    if (this.connected) {
      this.client.destroy(); // recomendacion del ide xq disconnect está deprecado
      this.connected = false;
      console.log("Redis disconnected!");
    }
  }
}

const redisClient = new Redis({ ttl: 3600, prefix: "alias-game:" });

export { redisClient };
