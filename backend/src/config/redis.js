import { createClient } from "redis";
import dotenv from "dotenv";
dotenv.config();

class RedisClientSingleton {
  static instance = null;
  static connected = false;

  static async getInstance(timeoutMs = 2000) {
    if (RedisClientSingleton.instance && RedisClientSingleton.connected) {
      return RedisClientSingleton.instance;
    }

    const client = createClient({
      url:
        process.env.REDIS_URL ||
        `redis://${process.env.REDIS_HOST || "localhost"}:${process.env.REDIS_PORT || 6379}`,
      password: process.env.REDIS_PASSWORD || undefined,
    });

    client.on("error", (err) => console.error("❌ Redis Client Error:", err));

    // conexión con timeout para evitar cuelgues
    const connectPromise = client.connect();
    const timeoutPromise = new Promise((_, reject) =>
      setTimeout(() => reject(new Error("Redis connection timeout")), timeoutMs)
    );

    try {
      await Promise.race([connectPromise, timeoutPromise]);
      RedisClientSingleton.instance = client;
      RedisClientSingleton.connected = true;
      console.log("✅ Connected to Redis (singleton)");
      return client;
    } catch (err) {
      console.error("❌ Redis connection failed:", err.message);
      throw err;
    }
  }

  static async disconnect() {
    if (RedisClientSingleton.instance && RedisClientSingleton.connected) {
      await RedisClientSingleton.instance.quit();
      RedisClientSingleton.connected = false;
      console.log("Redis disconnected!");
    }
  }
}

class Redis {
  client;
  ttl;
  prefix;

  constructor({ ttl = 3600, prefix = "" }) {
    this.ttl = ttl;
    this.prefix = prefix;
    this.client = null; // no puedo meter codigo asincrono en constructor, se hace en init()
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
    await this.client.set(this._key(key), JSON.stringify(value), {
      EX: ttl ?? this.ttl,
    });
  }

  async get(key) {
    await this.init();
    const value = await this.client.get(this._key(key));
    return value ? JSON.parse(value) : null;
  }

  async del(key) {
    console.log("borrando key de Redis", key);
    await this.init();
    await this.client.del(this._key(key));
  }

  // metodos para rooms
  async hSet(key, data, ttl) {
    await this.init();
    console.log("redisClient.hSet (esto se esta guardando en redis):", this._key(key), data, ttl);
    await this.client.hSet(this._key(key), data, ttl ?? this.ttl);
    if (ttl ?? this.ttl) await this.client.expire(this._key(key), ttl ?? this.ttl);
  }

  async hGetAll(key) {
    await this.init();
    const data = await this.client.hGetAll(this._key(key));
    return Object.keys(data).length ? data : null;
  }
}

// muchos redis client para cada cosa
const tokenCache = new Redis({ ttl: 24 * 3600, prefix: "alias-game:token:" }); // min duracion token 1 dia
const roomCache = new Redis({ ttl: 6 * 3600, prefix: "alias-game:room:" }); // code:hSet
const gameCache = new Redis({ ttl: 6 * 3600, prefix: "alias-game:game:" }); // code:hSet
const socketCache = new Redis({
  ttl: 6 * 3600,
  prefix: "alias-game:userSocket:",
}); // userId:socketId
const healthTestCache = new Redis({ ttl: 600, prefix: "health:" });

export { tokenCache, roomCache, gameCache, socketCache, RedisClientSingleton, healthTestCache };
