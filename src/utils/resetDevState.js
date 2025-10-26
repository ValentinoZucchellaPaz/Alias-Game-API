import { Room } from "../models/sequelize/index.js";
import { roomCache, tokenCache } from "../config/redis.js";

/**
 * Limpia todas las keys de Redis con el prefijo de la instancia pasada
 */
export async function clearCacheByPrefix(redisInstance) {
  await redisInstance.init(); // se asegura que la conexión esté lista

  const client = redisInstance.client;
  const prefix = redisInstance.prefix;

  const keys = await client.keys(`${prefix}*`);
  if (keys.length === 0) {
    console.log(`ℹ️ No hay claves con prefijo '${prefix}' para borrar.`);
    return;
  }

  // Redis permite pasar un array de keys a del
  await client.del(keys);
  console.log(`✅ Borradas ${keys.length} claves con prefijo '${prefix}'.`);
}

export async function clearRoomsTable() {
  await Room.destroy({ where: {}, truncate: true });
  console.log("✅ Tabla Rooms vaciada.");
}

export async function resetDevState() {
  if (process.env.NODE_ENV !== "development") {
    console.error("❌ Este script solo puede ejecutarse en entorno de desarrollo.");
    process.exit(1);
  }

  try {
    await clearRedisPrefix(roomCache);
    await clearRoomsTable();
  } catch (err) {
    console.error("❌ Error al resetear estado de desarrollo:", err);
    process.exit(1);
  }

  process.exit(0);
}

// Ejecuta el reset
await resetDevState();
