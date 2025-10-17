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

  async connectRedis() {
    if (!this.connected) {
      await this.client.connect();
      this.connected = true;
      console.log("✅ Connected to Redis");
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
      await this.client.disconnect();
      this.connected = false;
      console.log("Redis disconnected!");
    }
  }
}

const redisClient = new Redis({ ttl: 3600, prefix: "alias-game:" });

export { redisClient };
