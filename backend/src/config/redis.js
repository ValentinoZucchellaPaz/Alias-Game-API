import Redis from "ioredis";
import dotenv from "dotenv";
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

    client.on("error", (err) => console.error("❌ Redis Client Error:", err));
    client.on("end", () => {
      RedisClientSingleton.connected = false;
      console.warn("⚠️ Redis connection closed");
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
      console.log("✅ Connected to Redis (singleton, ioredis)");
      return client;
    } catch (err) {
      console.error("❌ Redis connection failed:", err.message);
      client.disconnect();
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

class RedisWrapper {
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
  // Nota: Antes usaba solo hset sin index, pero no habia forma facil de obtener todas las rooms guardadas.
  // Empeze a usar `zadd` tambien, que es basicamente un sorted set para tener un index de keys con timestamp.
  // Cada vez que se guarda un hash(por ejemplo una room), se agrega su key a este sorted set(`this._key("index")` o por ejemplo `alias-game:room:index`) con timestamp actual.
  // Despues, para obtener todas las rooms, se puede hacer un `zrange` en este index para obtener todas las keys guardadas.
  async hSet(key, data, ttl) {
    await this.init();
    console.log("redisClient.hSet (esto se esta guardando en redis):", this._key(key), data, ttl);

    // Agregar a index de room codes
    await this.client.zadd(this._key("index"), Date.now(), this._key(key));
    // Guardar informacion de la room
    await this.client.hset(this._key(key), data);
    // Establecer tiempo de expiracion
    if (ttl ?? this.ttl) await this.client.expire(this._key(key), ttl ?? this.ttl);
  }

  async hGetAll(key) {
    await this.init();
    const data = await this.client.hgetall(this._key(key));
    console.log("redisClient.hGetAll (esto se esta sacando de redis):", this._key(key), data);
    return Object.keys(data).length ? data : null;
  }

  // Obtener todos los items en el namespace(Wrapper) (ejemplo: todas las rooms)
  async getAllFromNamespace(limit = 10) {
    await this.init();

    // Obtener todas las keys del index
    const keys = await this.client.zrange(this._key("index"), 0, limit - 1);
    // Obtener todos los hashes asociados a esas keys
    const values = await Promise.all(
      keys.map(async (key) => {
        let rooms = await this.client.hgetall(key);
        return rooms;
      })
    );
    // Filtrar valores nulos o vacios y devolver
    return values.filter((value) => value && Object.keys(value).length > 0);
  }
}

// para otros modulos que necesiten el client directamente
export async function getRedisClient() {
  return await RedisClientSingleton.getInstance();
}

// muchos redis client para cada cosa
const tokenCache = new RedisWrapper({ ttl: 24 * 3600, prefix: "alias-game:token:" }); // min duracion token 1 dia
const roomCache = new RedisWrapper({ ttl: 6 * 3600, prefix: "alias-game:room:" }); // code:hSet
const gameCache = new RedisWrapper({ ttl: 6 * 3600, prefix: "alias-game:game:" }); // code:hSet
const socketCache = new RedisWrapper({
  ttl: 6 * 3600,
  prefix: "alias-game:userSocket:",
}); // userId:socketId
const healthTestCache = new RedisWrapper({ ttl: 600, prefix: "health:" });

export { tokenCache, roomCache, gameCache, socketCache, RedisClientSingleton, healthTestCache };
