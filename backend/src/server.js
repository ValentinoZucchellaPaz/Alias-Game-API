import app from "./app.js";
import { Room, syncDB } from "./models/sequelize/index.js";
import { Server } from "socket.io";
import { RedisClientSingleton } from "./config/redis.js";
import { createServer } from "http";
import { SocketEventEmitter } from "./sockets/SocketEventEmmiter.js";
import { logger } from "./utils/logger.js";
import registerSocketEvents from "./sockets/registerSocketEvents.js";

const PORT = 3000;

const server = createServer(app);
const io = new Server(server, {
  cors: { origin: "*" },
});

registerSocketEvents(io);
SocketEventEmitter.init(io);

server.listen(PORT, async () => {
  try {
    await syncDB();
    const client = await RedisClientSingleton.getInstance(); // init singleton
    await cleanupInterruptedRooms(client); // clear interrupted rooms
    logger.info(`Server running on port http://localhost:${PORT}`);
  } catch (e) {
    logger.error("Couldn't start sever due to:", e);
  }
});

/**
 * Runs cleanup of interrupted rooms on server startup.
 * @param {*} client
 * @returns
 */
async function cleanupInterruptedRooms(client) {
  // Get all room codes from redis
  const roomPrefix = `alias-game:room:`;
  const keys = await client.zrange(`${roomPrefix}index`, 0, -1);

  // Get room data for every room code from redis
  let rooms = await Promise.all(keys.map((key) => client.hgetall(key)));
  rooms = rooms.filter((room) => room !== null);

  // For each room, if status is 'waiting' or 'playing', set to 'finished' and remove from redis
  let cleanedCount = 0;
  for (const room of rooms) {
    // Define the Redis key for the room
    const key = `${roomPrefix}${room.code}`;

    // Check if room was interrupted.
    if (room.status === "waiting" || room.status === "playing") {
      await client.del(key);
      await client.zrem(`${roomPrefix}index`, key);

      // Update Postgres: Set room status to finished
      await Room.update({ status: "finished" }, { where: { code: room.code } });

      cleanedCount++;
    }
  }
  logger.info(`✅ Cleaned up ${cleanedCount} interrupted rooms in Redis and Postgres`);
  return;
}
