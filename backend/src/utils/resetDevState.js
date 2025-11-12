import { Room } from "../models/sequelize/index.js";
import { roomCache } from "../config/redis.js";
import { logger } from "./logger.js";

/**
 * Clear all redis keys with that given prefix
 */
export async function clearCacheByPrefix(redisInstance) {
  await redisInstance.init(); // connection ready

  const client = redisInstance.client;
  const prefix = redisInstance.prefix;

  const keys = await client.keys(`${prefix}*`);
  if (keys.length === 0) {
    logger.info(`ℹ️ No keys with prefix '${prefix}' to delete.`);
    return;
  }

  // Redis allows passing a keys array to del
  await client.del(keys);
  logger.info(`✅ Deleted ${keys.length} keys with prefix '${prefix}'.`);
}

export async function clearRoomsTable() {
  await Room.destroy({ where: {}, truncate: true });
  logger.info("✅ Room table empty.");
}

export async function resetDevState() {
  if (process.env.NODE_ENV !== "development") {
    logger.error("❌ This script can only be executed in development.");
    process.exit(1);
  }

  try {
    await clearCacheByPrefix(roomCache);
    await clearRoomsTable();
  } catch (err) {
    logger.error("❌ Error setting devState:", err);
    process.exit(1);
  }

  process.exit(0);
}

await resetDevState();
