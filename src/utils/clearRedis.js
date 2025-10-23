import { roomCache } from "../config/redis.js";

await roomCache.connectRedis();

const client = roomCache.client;
const prefix = roomCache.prefix;

// Buscar todas las claves de salas
const keys = await client.keys(`${prefix}*`);

if (keys.length === 0) {
  console.log("ℹ️ No hay claves de sala para borrar.");
} else {
  await client.del(keys);
  console.log(`✅ Borradas ${keys.length} claves de sala.`);
}

await roomCache.disconnect();