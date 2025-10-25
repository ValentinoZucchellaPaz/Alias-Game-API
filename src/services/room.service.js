import { roomCache } from "../config/redis.js";
import { Room } from "../models/sequelize/index.js";
import { AppError } from "../utils/errors.js";
import { v4 as uuidv4 } from "uuid";

async function createRoom({ hostId }) {
  // http only - move to controller or service
  const roomCode = Math.random().toString(36).substring(2, 7).toUpperCase();
  const roomId = uuidv4();

  const roomData = {
    id: roomId,
    code: roomCode,
    hostId,
    players: [{ id: hostId, active: true }],
    teams: { red: [hostId], blue: [] },
    globalScore: { red: 0, blue: 0 },
    games: [],
    status: "waiting",
  };
  // Guardar en DB
  await Room.create({ ...roomData });

  const copy = JSON.parse(JSON.stringify(roomData));
  copy.players = JSON.stringify(copy.players);
  copy.teams = JSON.stringify(copy.teams);
  copy.globalScore = JSON.stringify(copy.globalScore);
  copy.games = JSON.stringify(copy.games);

  // Guardar en Redis usando code como clave principal
  await roomCache.hSet(roomCode, copy);

  return roomData;
}

async function getRoom(code) {
  // get roomData from redis, or db if not found
  let room = await roomCache.hGetAll(code);
  let dbRoom = null;
  if (!room || Object.keys(room).length === 0) {
    dbRoom = await Room.findOne({ where: { code } });
    if (!dbRoom) throw new AppError(`There's no room created with code ${code}`);

    if (dbRoom.status == "finished") throw new AppError("This room is no longer active");
    const roomData = {
      id: dbRoom.id,
      code: dbRoom.code,
      hostId: dbRoom.hostId,
      players: JSON.stringify(dbRoom.players),
      teams: JSON.stringify(dbRoom.teams),
      globalScore: JSON.stringify(dbRoom.globalScore),
      games: JSON.stringify(dbRoom.games),
      status: dbRoom.status,
      public: dbRoom.public ? "true" : "false",
    };
    console.log("getRoom data que viene de db", dbRoom);
    await roomCache.hSet(code, roomData, roomCache.ttl);
    room = await roomCache.hGetAll(code);
  }

  room.players = JSON.parse(room.players);
  room.teams = JSON.parse(room.teams);
  room.globalScore = JSON.parse(room.globalScore);
  room.games = JSON.parse(room.games);

  console.log("getRoom (parsed): ", room);
  return room;
}

// busca room en db y jugador, actualiza redis
async function joinRoom({ roomCode, userId }) {
  const room = await getRoom(roomCode);
  const playerInRoom = room.players.find((p) => p.id == userId);
  if (playerInRoom) {
    if (playerInRoom.active) {
      throw new AppError("user already in the room");
    }
    playerInRoom.active = true;
    room.reconnected = true;
  } else {
    room.players.push({ id: userId, active: true });
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

  await roomCache.hSet(room.code, {
    players: JSON.stringify(room.players),
    teams: JSON.stringify(room.teams),
  });

  return room;
}

// Salir de room
async function leaveRoom({ roomCode, userId }) {
  const room = await getRoom(roomCode);

  // Marcar el player como inactive (no eliminarlo del array) -- mejorar
  const player = room.players.find((p) => p.id === userId); // en players se guarda {id, active}
  if (player) {
    player.active = false;
  }
  // si el que se va es host, cierra room
  if (player.id == room.hostId) {
    room.status = "finished";
    await Room.update(
      {
        players: room.players,
        teams: room.teams,
        globalScore: room.globalScore,
        games: room.games,
        status: room.status,
      },
      { where: { code: room.code } }
    );
    await roomCache.del(room.code);
    return room;
  }
  room.teams.red = room.teams.red.filter((id) => id !== userId); // en teams se guarda solo id
  room.teams.blue = room.teams.blue.filter((id) => id !== userId);

  await roomCache.hSet(room.code, {
    players: JSON.stringify(room.players),
    teams: JSON.stringify(room.teams),
  });

  return room;
}

// Actualizar estado de room
async function updateRoomStatus({ code, status }) {
  // puedo hacer http como tambien exclusivo de socket
  const room = await getRoom(code);
  room.status = status;

  // JSON.stringigy a arrays y poner active como string antes de mandar a redis
  await roomCache.hSet(code, { status });

  // Si terminó la partida, sincronizar DB
  if (status === "finished") {
    await this.model.update(
      {
        players: room.players,
        teams: room.teams,
        globalScore: room.globalScore,
        games: room.games,
        status: room.status,
      },
      { where: { code } }
    );
    await roomCache.del(code);
  }

  // this.io.to(room.code).emit("room:status", { status });
  return room;
}

export default { createRoom, getRoom, joinRoom, updateRoomStatus, leaveRoom };
