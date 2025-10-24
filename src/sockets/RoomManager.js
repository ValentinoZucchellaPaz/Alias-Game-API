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

  // Crear nueva room
  // async createRoom({ hostId }) {
  async createRoom({ hostId }) {
    // puede trabajar solo http
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

    this.io.to(roomCode).emit("room:create", {
      // precindible
      hostId,
      roomCode,
      players: [hostId],
      teams: { red: [hostId], blue: [] },
    });

    return {
      id: roomId,
      ...roomData,
      players: JSON.parse(roomData.players),
      teams: JSON.parse(roomData.teams),
      globalScore: JSON.parse(roomData.globalScore),
      games: JSON.parse(roomData.games),
    };
  }

  // Traer room desde Redis o DB
  async getRoom(codeOrId, userId) {
    // puede trabajar solo http
    // problema con redis id /code, con que key lo guardo?
    let roomId = codeOrId;

    //Si no es un UUID, asumims que es un codigo
    if (roomId.length !== 36) {
      const resolveId = await this.redis.get(`roomCode:${roomId}`);
      if (resolveId) {
        roomId = resolveId;
      } else {
        //buscar en db como fallback
        const dbRoom = await Room.findOne({ where: { code: roomId } });
        if (!dbRoom) {
          // const newRoom = await this.createRoom({ hostId: userId, code: roomId });
          // return { id: newRoom.id, ...newRoom };
          return null;
        }
        roomId = dbRoom.id;
        await this.redis.set(`roomCode:${dbRoom.code}`, roomId);
      }
    }

    const room = await this.redis.hGetAll(roomId);

    if (!room || Object.keys(room).length === 0) {
      throw new Error(`Room ${roomId} not found in Redis`);
    }

    room.players = JSON.parse(room.players);
    room.teams = JSON.parse(room.teams);
    room.globalScore = JSON.parse(room.globalScore);
    room.games = JSON.parse(room.games);

    return { id: roomId, ...room };
  }

  // busca room en db y jugador, actualiza redis
  async joinRoom({ roomId, userId, isCreator = false }) {
    // puedo hacer http
    const room = await this.getRoom(roomId, userId);
    if (!room) return null;

    if (!room.players.includes(userId)) {
      room.players.push(userId);
      if (isCreator) {
        console.log(`🆕 Usuario ${userId} ha creado la sala ${roomId}`);
      } else {
        console.log(`🚪 Usuario ${userId} ingresó a sala ${roomId}`);
      }

      // this.io.to(room.code).emit("player:joined", {
      //   userId,
      //   players: room.players,
      //   code: room.code,
      // });
    } else {
      console.log(`🔁 Usuario ${userId} se reconectó a sala ${roomId}`);
      this.io.to(room.code).emit("player:reconnected", { userId }); // puedo hacer que se devuelva response para avisando que se reconecta, no que se une de nuevo
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

    // Guardar cambios en Redis
    await this.redis.hSet(roomId, {
      players: JSON.stringify(room.players),
      teams: JSON.stringify(room.teams),
    });

    return room;
  }

  // Salir de room
  async leaveRoom({ roomId, userId }) {
    // puedo hacer http
    const room = await this.getRoom(roomId);
    room.players = room.players.filter((id) => id !== userId);
    room.teams.red = room.teams.red.filter((id) => id !== userId);
    room.teams.blue = room.teams.blue.filter((id) => id !== userId);

    console.log(`🧹 Usuario ${userId} eliminado de sala ${roomId}`);

    await this.redis.hSet(roomId, {
      players: JSON.stringify(room.players),
      teams: JSON.stringify(room.teams),
    });

    this.io.to(room.code).emit("player:left", { userId, players: room.players }); // puedo devolver response http diciendo que se lo saco bien de la room

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

    this.io.to(room.code).emit("room:status", { status });
    return room;
  }

  // Enviar mensaje de chat
  sendMessage({ roomCode, user, text, socket }) {
    const message = { user, text, timestamp: new Date().toISOString() };
    socket.broadcast.to(roomCode).emit("chat:message", message);
  }
}
