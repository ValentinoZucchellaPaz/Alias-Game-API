// src/managers/RoomManager.js
import { v4 as uuidv4 } from "uuid";
import { Room } from "../models/sequelize/index.js";

// const roomManager = new RoomManager({ redisClient: roomCache, model: Room, io });
export default class RoomManager {
  constructor({ redisClient, model, io }) {
    this.redis = redisClient; // Redis
    this.model = model; // Sequelize model
    this.io = io; // Socket.IO instance
  }

  async createRoom({ hostId }) {
    // http only - move to controller or service
    const roomCode = Math.random().toString(36).substring(2, 7).toUpperCase();
    const roomId = uuidv4();

    const roomData = {
      code: roomCode,
      hostId,
      players: JSON.stringify([hostId]),
      teams: JSON.stringify({ red: [hostId], blue: [] }),
      globalScore: JSON.stringify({ red: 0, blue: 0 }),
      games: JSON.stringify([]),
      status: "waiting",
    };
    // Guardar en Redis usando roomId como clave principal
    await this.redis.hSet(roomId, roomData);

    // Guardar índice auxiliar para resolver code → roomId
    await this.redis.set(`roomCode:${roomCode}`, roomId);

    // await this.redis.expire(roomId, 3600); // 1 hora TTL

    // Guardar en DB
    await this.model.create({ id: roomId, ...roomData });

    // this.io.to(roomCode).emit("room:create", {
    //   // precindible
    //   hostId,
    //   roomCode,
    //   players: [hostId],
    //   teams: { red: [hostId], blue: [] },
    // });

    return {
      id: roomId,
      ...roomData,
      players: JSON.parse(roomData.players),
      teams: JSON.parse(roomData.teams),
      globalScore: JSON.parse(roomData.globalScore),
      games: JSON.parse(roomData.games),
    };
  }

  async getRoom(code) {
    // get room id from redis, or db if not found
    const codeKey = `roomCode:${code}`;
    let roomId = await this.redis.get(codeKey);
    let dbRoom = null;
    if (!roomId) {
      dbRoom = await Room.findOne({ where: { code } });
      if (!dbRoom) return null;
      roomId = dbRoom.id;
      await this.redis.set(codeKey, roomId, 24 * 3600); // save new code:id mapping (24hrs)
    }

    // get roomData from redis, or db if not found
    let room = await this.redis.hGetAll(roomId);
    if (!room || Object.keys(room).length === 0) {
      if (!dbRoom) {
        // if not search already, look db
        dbRoom = await Room.findOne({ where: { id: roomId } });
        if (!dbRoom) {
          await this.redis.del(codeKey); // delete mapping for consistency
          return null;
        }
      }

      const roomData = {
        code: dbRoom.code,
        hostId: dbRoom.hostId,
        players: JSON.stringify(dbRoom.players),
        teams: JSON.stringify(dbRoom.teams),
        globalScore: JSON.stringify(dbRoom.globalScore),
        games: JSON.stringify(dbRoom.games),
        status: dbRoom.status,
        public: dbRoom.public,
      };

      await this.redis.hSet(roomId, roomData);
      await this.redis.client.expire(this.redis._key(roomId), this.redis.ttl);
      room = roomData;
    }

    // parse fields and return info
    try {
      room.players = JSON.parse(room.players);
      room.teams = JSON.parse(room.teams);
      room.globalScore = JSON.parse(room.globalScore);
      room.games = JSON.parse(room.games);
    } catch (err) {
      console.error("⚠️ Error parsing room JSON data:", err.message);
      return null; // here I can delete and retry but there's a chance of inf loop
    }

    await this.redis.client.expire(this.redis._key(codeKey), 24 * 3600);
    await this.redis.client.expire(this.redis._key(roomId), this.redis.ttl);

    return { id: roomId, ...room };
  }

  // busca room en db y jugador, actualiza redis
  async joinRoom({ roomCode, userId }) {
    // http only
    const room = await this.getRoom(roomCode);
    if (!room) return null;

    if (!room.players.includes(userId)) {
      room.players.push(userId);
    } else {
      // console.log(`🔁 Usuario ${userId} se reconectó a sala ${roomId}`);
      //this.io.to(room.code).emit("player:reconnected", { userId }); // puedo hacer que se devuelva response para avisando que se reconecta, no que se une de nuevo
      room.reconnected = true;
    }

    // Asignar equipo automático
    if (
      room.teams &&
      Array.isArray(room.teams.red) &&
      Array.isArray(room.teams.blue) &&
      !room.teams.red.includes(userId) &&
      !room.teams.blue.includes(userId)
    ) {
      const redCount = room.teams.red.length;
      const blueCount = room.teams.blue.length;
      const team = redCount <= blueCount ? "red" : "blue";
      room.teams[team].push(userId);
    }

    await this.redis.hSet(room.id, {
      players: JSON.stringify(room.players),
      teams: JSON.stringify(room.teams),
    });

    return room;
  }

  // Salir de room
  async leaveRoom({ roomCode, userId }) {
    // http only
    const room = await this.getRoom(roomCode);
    room.players = room.players.filter((id) => id !== userId);
    room.teams.red = room.teams.red.filter((id) => id !== userId);
    room.teams.blue = room.teams.blue.filter((id) => id !== userId);

    console.log(`🧹 Usuario ${userId} eliminado de sala ${roomCode}`);

    await this.redis.hSet(room.id, {
      players: JSON.stringify(room.players),
      teams: JSON.stringify(room.teams),
    });

    // this.io.to(room.code).emit("player:left", { userId, players: room.players }); // puedo devolver response http diciendo que se lo saco bien de la room

    return room;
  }

  // Actualizar estado de room
  async updateRoomStatus({ roomId, status }) {
    // puedo hacer http como tambien exclusivo de socket
    const room = await this.getRoom(roomId);
    room.status = status;

    await this.redis.hSet(roomId, { status });

    // Si terminó la partida, sincronizar DB
    if (status === "finished") {
      await this.model.update(
        {
          players: JSON.stringify(room.players),
          teams: JSON.stringify(room.teams),
          globalScore: JSON.stringify(room.globalScore),
          games: JSON.stringify(room.games),
          status: room.status,
        },
        { where: { id: roomId } }
      );
      await this.redis.del(roomId);
    }

    // this.io.to(room.code).emit("room:status", { status });
    return room;
  }

  // Enviar mensaje de chat
  sendMessage({ roomCode, user, text, socket }) {
    // unico de socket
    const message = { user, text, timestamp: new Date().toISOString() };
    socket.broadcast.to(roomCode).emit("chat:message", message);
  }
}
