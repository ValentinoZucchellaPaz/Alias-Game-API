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
  async createRoom({ hostId }) {
    const code = Math.random().toString(36).substring(2, 7).toUpperCase();
    const roomId = uuidv4();

    const roomData = {
      code,
      hostId,
      players: JSON.stringify([hostId]),
      teams: JSON.stringify({ red: [hostId], blue: [] }),
      globalScore: JSON.stringify({ red: 0, blue: 0 }),
      games: JSON.stringify([]),
      status: "waiting",
    };

    // Guardar en Redis
    await this.redis.hSet(code, roomData);
    // await this.redis.expire(roomId, 3600); // 1 hora TTL

    // Guardar en DB
    await this.model.create({ id: roomId, ...roomData });

    return { id: roomId, ...roomData };
  }

  // Traer room desde Redis o DB
  async getRoom(codeOrId) {
    // problema con redis id /code, con que key lo guardo?
    let room = await this.redis.hGetAll(codeOrId);
    let roomId;
    console.log("room code", codeOrId);
    console.log("room de redis", room);

    if (!room || Object.keys(room).length === 0) {
      // Buscar en DB
      console.log("buscando en db");
      const dbRoom = await Room.findOne({ where: { code: codeOrId } });
      if (!dbRoom) throw new Error("Room not found"); // guarda, middleware de errores no catchea estos

      console.log("room de db", dbRoom);
      console.log("room de db id", dbRoom.dataValues.id);

      roomId = dbRoom.dataValues.id;
      room = {
        ...dbRoom.dataValues,
        players: JSON.parse(dbRoom.players),
        teams: JSON.parse(dbRoom.teams),
        globalScore: JSON.parse(dbRoom.globalScore),
        games: JSON.parse(dbRoom.games),
      };

      // Guardar en Redis
      await this.redis.hSet(room.code, {
        code: room.code,
        hostId: room.hostId,
        players: JSON.stringify(room.players),
        teams: JSON.stringify(room.teams),
        globalScore: JSON.stringify(room.globalScore),
        games: JSON.stringify(room.games),
        status: room.status,
      });
      //   await this.redis.expire(roomId, 3600);
    } else {
      room.players = JSON.parse(room.players);
      room.teams = JSON.parse(room.teams);
      room.globalScore = JSON.parse(room.globalScore);
      room.games = JSON.parse(room.games);
    }

    return { id: roomId, ...room };
  }

  // Unirse a room
  async joinRoom({ roomId, userId, socketId }) {
    const room = await this.getRoom(roomId);

    if (!room.players.includes(userId)) room.players.push(userId);

    // Asignar equipo automático
    if (!room.teams.red.includes(userId) && !room.teams.blue.includes(userId)) {
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

    // Feedback vía Socket.IO
    this.io.to(room.code).emit("player:joined", { userId, players: room.players, code: room.code });

    return room;
  }

  // Salir de room
  async leaveRoom({ roomId, userId }) {
    const room = await this.getRoom(roomId);

    room.players = room.players.filter((id) => id !== userId);
    room.teams.red = room.teams.red.filter((id) => id !== userId);
    room.teams.blue = room.teams.blue.filter((id) => id !== userId);

    await this.redis.hSet(roomId, {
      players: JSON.stringify(room.players),
      teams: JSON.stringify(room.teams),
    });

    this.io.to(room.code).emit("player:left", { userId, players: room.players });

    return room;
  }

  // Actualizar estado de room
  async updateRoomStatus({ roomId, status }) {
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
