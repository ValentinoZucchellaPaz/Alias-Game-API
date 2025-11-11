import { roomCache } from "../config/redis.js";
import { Room } from "../models/sequelize/index.js";
import timeManager from "../models/TimerManager.js";
import { SocketEventEmitter } from "../sockets/SocketEventEmmiter.js";
import { AppError, ConflictError } from "../utils/errors.js";
import { v4 as uuidv4 } from "uuid";
import { safeParse } from "../utils/objects.js";
import gameService from "./game.service.js";

async function createRoom({ hostId, hostName }) {
  // create room in db, save in redis and emit socket event to join room

  // si host ya esta en otra room no puede crear una nueva

  const roomCode = Math.random().toString(36).substring(2, 7).toUpperCase();
  const roomId = uuidv4();

  const roomData = {
    id: roomId,
    code: roomCode,
    hostId,
    players: [{ id: hostId, active: true }], // TODO: do i save userName too?
    teams: { red: [hostId], blue: [] }, // guardo por nombre o por id?
    globalScore: { red: 0, blue: 0 },
    games: [],
    status: "waiting",
  };

  await Room.create({ ...roomData });

  const copy = JSON.parse(JSON.stringify(roomData));
  copy.players = JSON.stringify(copy.players);
  copy.teams = JSON.stringify(copy.teams);
  copy.globalScore = JSON.stringify(copy.globalScore);
  copy.games = JSON.stringify(copy.games);

  await roomCache.hSet(roomCode, copy);

  await SocketEventEmitter.joinRoom(roomCode, hostId, hostName);
  SocketEventEmitter.teamState(roomCode, roomData.teams);

  // TODO: if socket connection failed, how do I handle info persistency?
  return roomData;
}

async function getRoom(code) {
  // get roomData from redis, or db if not found (create in redis if found)
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
    await roomCache.hSet(code, roomData, roomCache.ttl);
    room = await roomCache.hGetAll(code); // redis retry
  }

  room.players = JSON.parse(room.players);
  room.teams = JSON.parse(room.teams);
  room.globalScore = JSON.parse(room.globalScore);
  room.games = JSON.parse(room.games);

  return room;
}

async function joinRoom({ roomCode, userId, userName }) {
  // checks room players, if OK join new player and assign team, save info and emit event
  // TODO: do i have to check if player (userId) exists?
  const room = await getRoom(roomCode);

  // check if room is full -> what is max cap?
  const MAX_PLAYER_PER_ROOM = 12;
  const activePlayers = room.players.map((p) => {
    if (p.active) return p.id;
  });
  if (activePlayers.length > MAX_PLAYER_PER_ROOM) throw new AppError("This room is full");

  const playerInRoom = room.players.find((p) => p.id == userId);
  if (playerInRoom) {
    if (playerInRoom.active) {
      throw new AppError("User already in the room");
    }
    playerInRoom.active = true;
    room.reconnected = true;
  } else {
    room.players.push({ id: userId, active: true });
  }

  // auto assign team
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

  await SocketEventEmitter.joinRoom(roomCode, userId, userName);
  SocketEventEmitter.teamState(roomCode, room.teams);

  return room;
}

async function leaveRoom({ roomCode, userId, userName }) {
  // checks room players, mark as inactive, if there's no one active close room, save info and emit event
  const room = await getRoom(roomCode);

  const player = room.players.find((p) => p.id === userId); // players: [{id, active}]
  if (!player) throw new ConflictError(`User ${userId} is not in room ${roomCode}`);
  player.active = false;

  if (room.players.every((p) => p.active === false)) {
    timeManager.clearTimer(roomCode);

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

    // make all users of room leave room
    await SocketEventEmitter.closeRoom(roomCode, userId, userName, room.globalScore);

    return room;
  }

  room.teams.red = room.teams.red.filter((id) => id !== userId); // en teams se guarda solo id
  room.teams.blue = room.teams.blue.filter((id) => id !== userId);

  await roomCache.hSet(room.code, {
    players: JSON.stringify(room.players),
    teams: JSON.stringify(room.teams),
  });

  await SocketEventEmitter.leaveRoom(roomCode, userId, userName);
  SocketEventEmitter.teamState(roomCode, room.teams);

  return room;
}

/**
 * Start a new game in the specified room
 * @param {*} _roomCode
 * @returns
 */
async function startGame(_roomCode) {
  // create game instance
  const { roomCode, game } = await gameService.createGame(_roomCode);

  const room = await getRoom(roomCode);

  // update room status to playing
  room.status = "playing";

  // save updated room status in Redis
  await roomCache.hSet(roomCode, {
    status: room.status,
  });

  return { roomCode, game };
}

/**
 * Update the teams of a room, ensuring no active game is in progress
 * @param {*} roomCode
 * @param {*} team
 * @param {*} userId
 * @returns
 */
async function updateTeams(roomCode, team, userId) {
  const room = await getRoom(roomCode);

  // validaciones - agregar chequeo si se esta ingame, entonces no puede cambiar de equipo
  const player = room.players.find((p) => p.id === userId); // players: [{id, active}]
  if (!player || !player.active)
    throw new ConflictError(`User ${userId} is not in room ${roomCode}`);

  if (team == "red" && !room.teams.red.includes(userId)) {
    room.teams.blue = room.teams.blue.filter((id) => id != userId);
    room.teams.red.push(userId);
  } else if (team == "blue" && !room.teams.blue.includes(userId)) {
    room.teams.red = room.teams.red.filter((id) => id != userId);
    room.teams.blue.push(userId);
  }
  await roomCache.hSet(room.code, {
    teams: JSON.stringify(room.teams),
  });

  SocketEventEmitter.teamState(roomCode, room.teams);

  return room;
}

// Obtener las primeras `limit` rooms con status "waiting" desde la base de datos
async function getRooms(limit = 10) {
  const rooms = await Room.findAll({
    where: { status: "waiting" },
    order: [["createdAt", "ASC"]],
    limit,
  });

  return rooms.map((r) => r.get({ plain: true }));
}

async function updateRoom(roomCode, gameScore) {
  const room = await getRoom(roomCode);
  if (gameScore.red != gameScore.blue) {
    // ties doesnt sum up points
    const winner = gameScore.red > gameScore.blue ? "red" : "blue";
    room.globalScore[winner] += 1;
  }
  room.games.push(gameScore);
  await roomCache.hSet(roomCode, {
    globalScore: JSON.stringify(room.globalScore),
    games: JSON.stringify(room.games),
  });
  console.log("a punto de actualizar db con room ", room);
  await Room.update(
    {
      ...room,
    },
    { where: { code: roomCode } }
  );
  SocketEventEmitter.updateRoom(roomCode, room);
  return room;
}

export default { createRoom, getRoom, joinRoom, leaveRoom, updateTeams, getRooms, updateRoom };
