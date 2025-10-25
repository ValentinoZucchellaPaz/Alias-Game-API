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
    console.log("borrando key de Redis", key);
    await this.connectRedis();
    await this.client.del(this._key(key));
  }

  // metodos para rooms
  async hSet(key, data, ttl) {
    await this.connectRedis();
    console.log("redisClient.hSet (esto se esta guardando en redis):", this._key(key), data, ttl);
    await this.client.hSet(this._key(key), data, ttl ?? this.ttl);
    // if (ttl ?? this.ttl) await this.client.expire(this._key(key), ttl ?? this.ttl);
  }

  async hGetAll(key) {
    await this.connectRedis();
    const data = await this.client.hGetAll(this._key(key));
    return Object.keys(data).length ? data : null;
  }

  async disconnect() {
    if (this.connected) {
      this.client.destroy(); // recomendacion del ide xq disconnect está deprecado
      this.connected = false;
      console.log("Redis disconnected!");
    }
  }
}

// muchos redis client para cada cosa
const tokenCache = new Redis({ ttl: 24 * 3600, prefix: "alias-game:token:" }); // min duracion token 1 dia
const roomCache = new Redis({ ttl: 6 * 3600, prefix: "alias-game:room:" }); // code:hSet

export { tokenCache, roomCache };
