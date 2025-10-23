import { roomCache } from "../config/redis.js";
import { Room } from "../models/sequelize/index.js";

if (process.env.NODE_ENV !== "development") {
  console.error("❌ Este script solo puede ejecutarse en entorno de desarrollo.");
  process.exit(1);
}

await roomCache.connectRedis();
const keys = await roomCache.client.keys(`${roomCache.prefix}*`);
if (keys.length) {
  await roomCache.client.del(keys);
  console.log(`✅ Redis: ${keys.length} claves de sala borradas.`);
} else {
  console.log("ℹ️ Redis: no hay claves de sala para borrar.");
}
await roomCache.disconnect();

await Room.destroy({ where: {}, truncate: true });
console.log("✅ Tabla Rooms vaciada.");

process.exit();