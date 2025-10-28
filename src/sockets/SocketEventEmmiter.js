import { socketCache } from "../config/redis.js";
import { AppError } from "../utils/errors.js";

export class SocketEventEmitter {
  /** @type {import("socket.io").Server | null} */
  static io = null;

  static init(ioInstance) {
    if (SocketEventEmitter.io) {
      console.warn("⚠️ SocketEventEmitter already initialized");
      return;
    }
    SocketEventEmitter.io = ioInstance;
    console.log("✅ SocketEventEmitter initialized");
  }

  static getIO() {
    if (!SocketEventEmitter.io) {
      throw new AppError("SocketEventEmitter not initialized with io instance");
    }
    return SocketEventEmitter.io;
  }

  /**
   * Join userId's socket to room and emit join message
   * Une el socket asociado al usuario a la room y emite un evento de join.
   * @param {string} roomCode
   * @param {string|number} userId
   * @param {object} payload - optional (userName or players list)
   */
  static async joinRoom(roomCode, userId, payload = {}) {
    const io = SocketEventEmitter.getIO();

    const socket = await this.getSocketByUserId(userId);
    if (!socket) return;

    // Leave prev rooms (except socket's own)
    for (const currentRoom of socket.rooms) {
      if (currentRoom === socket.id) continue; // socket id, own
      if (currentRoom === roomCode) {
        console.log(`🔁 User ${userId} is already in room ${roomCode}, skipping rejoin`);
        return;
      }

      console.log(`🚪 Leaving previous room ${currentRoom} for user ${userId}`);
      await socket.leave(currentRoom);
      io.to(currentRoom).emit("player:left", { userId });
    }

    if (!socket.rooms.has(roomCode)) {
      socket.currentRoom = roomCode; // used to get roomCode when socket is disconnected
      await socket.join(roomCode);
    }

    io.to(roomCode).emit("player:joined", {
      userId,
      roomCode,
      ...payload,
    });

    console.log(`📢 Emitted player:joined for user=${userId} in room=${roomCode}`);
  }

  /**
   * Leave specific room and notify other sockets in the room
   * @param {string} roomCode
   * @param {string|number} userId
   * @param {object} payload - optional (userName or players list)
   */
  static async leaveRoom(roomCode, userId, payload = {}) {
    const io = SocketEventEmitter.getIO();

    const socket = await this.getSocketByUserId(userId);
    if (!socket) return;

    if (!socket.rooms.has(roomCode)) {
      console.warn(`⚠️ User ${userId} is not in room ${roomCode}`);
      return;
    }

    await socket.leave(roomCode);
    console.log(`🚪 User ${userId} left room ${roomCode}`);

    io.to(roomCode).emit("player:left", {
      userId,
      ...payload,
    });
    console.log(`📢 Emitted player:left for user=${userId} in room=${roomCode}`);
  }

  /**
   * Notify players that room is closing and disconnect their sockets to the room
   * in the future can change the behaivour if the host leaving doesnt close the room, but change the host
   * @param {string} roomCode
   * @param {string|number} hostUserId
   * @param {object} payload - optional
   */
  static async closeRoom(roomCode, hostUserId, payload = {}) {
    const io = SocketEventEmitter.getIO();

    // display feedback when kicked out of room
    io.to(roomCode).emit("room:close", {
      hostUserId,
      roomCode,
      ...payload,
    });

    console.log(`📢 Emitted room:close for room=${roomCode} by host=${hostUserId}`);

    // kick everyone out
    const roomSockets = io.sockets.adapter.rooms.get(roomCode);
    if (roomSockets) {
      for (const socketId of roomSockets) {
        const socket = io.sockets.sockets.get(socketId);
        if (socket) {
          await socket.leave(roomCode);
        }
      }
    }
  }

  static async teamState(roomCode, teams) {
    const io = SocketEventEmitter.getIO();
    io.to(roomCode).emit("team-state", teams);
    console.log(`📢 Emitted team-state for in room=${roomCode}`);
  }

  /**
   * Look for socketId in Redis w userId and retrieve socket instance
   * @param {string|number} userId
   */
  static async getSocketByUserId(userId) {
    // TODO: handle edge case: userId is active in the room (in DB and Redis) but socket failed to join
    const io = SocketEventEmitter.getIO();
    const socketId = await socketCache.get(userId);

    if (!socketId) {
      console.warn(`⚠️ No socketId found in Redis for user ${userId}`);
      // throw new AppError("must initialize socket connection");
      return null;
    }

    const socket = io.sockets.sockets.get(socketId);
    if (!socket) {
      console.warn(`⚠️ Socket instance not found for id ${socketId}`);
      // throw new AppError("must initialize socket connection");
      return null;
    }

    return socket;
  }
}
